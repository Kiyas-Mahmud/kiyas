/* kiyas.me Worker
   GET  /                    → page rendered from D1 (seed as fallback)
   GET  /media/<key>         → uploaded files from R2
   POST /api/login           → password → signed session cookie
   POST /api/logout
   GET  /api/admin/me        → 200 if signed in
   GET  /api/admin/content   → all sections (merged over seed)
   PUT  /api/admin/content/<section>
   POST /api/admin/upload    → multipart "file" → R2 → { url }
   everything else           → static assets (public/)

   Secrets: ADMIN_PASSWORD, SESSION_SECRET  (wrangler secret put …) */

import seed from "./seed.json";
import { renderPage, safeUrl } from "./render.js";
import { SECTIONS, SECTION_KEYS } from "../public/admin/schema.js";

const COOKIE = "kiyas_admin";
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_SECTION_BYTES = 256 * 1024;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

const enc = new TextEncoder();

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

/* ---------------- crypto helpers ---------------- */

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, enc.encode(msg));
}

// Compare two strings in constant time by comparing their HMACs.
async function safeEqual(a, b, secret) {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  return crypto.subtle.timingSafeEqual(x, y);
}

async function makeSession(env) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${exp}.${b64url(await hmac(env.SESSION_SECRET, `session:${exp}`))}`;
}

async function validSession(req, env) {
  if (!env.SESSION_SECRET) return false;
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = b64url(await hmac(env.SESSION_SECRET, `session:${exp}`));
  return safeEqual(sig, expected, env.SESSION_SECRET);
}

const cookie = (value, maxAge) =>
  `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

// Mutating admin requests must come from this site (CSRF guard on top of SameSite=Strict).
function sameOrigin(req) {
  const origin = req.headers.get("origin");
  return origin === new URL(req.url).origin;
}

/* ---------------- content ---------------- */

async function loadContent(env) {
  const content = structuredClone(seed);
  try {
    const { results } = await env.DB.prepare("SELECT key, data FROM sections").all();
    for (const row of results) {
      try {
        content[row.key] = JSON.parse(row.data);
      } catch {
        /* keep seed for a corrupt row */
      }
    }
  } catch (err) {
    console.error("D1 read failed, serving seed content", err);
  }
  return content;
}

// Keep only fields the schema knows, coerced to the right type.
function clean(fields, input) {
  const out = {};
  const src = input && typeof input === "object" ? input : {};
  for (const f of fields) {
    const v = src[f.key];
    switch (f.type) {
      case "checkbox":
        out[f.key] = v === true;
        break;
      case "lines":
        out[f.key] = (Array.isArray(v) ? v : []).map((s) => String(s).slice(0, 2000)).filter((s) => s.trim());
        break;
      case "list":
        out[f.key] = (Array.isArray(v) ? v : []).slice(0, 200).map((item) => clean(f.fields, item));
        break;
      case "select":
        out[f.key] = f.options.some(([val]) => val === v) ? v : f.options[0][0];
        break;
      case "url":
      case "image":
      case "file":
        out[f.key] = v ? safeUrl(v) : "";
        break;
      default:
        out[f.key] = String(v ?? "").slice(0, 5000);
    }
  }
  return out;
}

function validate(key, data) {
  if (key === "projects") {
    for (const p of data.items) {
      if (!p.private && !p.liveUrl && !p.gitUrl)
        return `Project “${p.title || "untitled"}” needs a live link, a GitHub link, or Private ticked.`;
    }
  }
  return null;
}

/* ---------------- handlers ---------------- */

async function login(req, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET)
    return json({ error: "Admin is not configured (missing secrets)." }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad origin" }, 403);

  const ip = req.headers.get("cf-connecting-ip") || "local";
  const since = Date.now() - FAIL_WINDOW_MS;
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND ts > ?")
    .bind(ip, since)
    .first();
  if (row && row.n >= MAX_FAILS)
    return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);

  let password = "";
  try {
    password = String((await req.json()).password || "");
  } catch {
    /* empty */
  }
  if (password && (await safeEqual(password, env.ADMIN_PASSWORD, env.SESSION_SECRET))) {
    await env.DB.prepare("DELETE FROM login_failures WHERE ip = ?").bind(ip).run();
    return json({ ok: true }, 200, { "set-cookie": cookie(await makeSession(env), SESSION_DAYS * 86400) });
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO login_failures (ip, ts) VALUES (?, ?)").bind(ip, Date.now()),
    env.DB.prepare("DELETE FROM login_failures WHERE ts < ?").bind(since),
  ]);
  return json({ error: "Wrong password." }, 401);
}

async function saveSection(req, env, key) {
  const section = SECTIONS.find((s) => s.key === key);
  if (!section) return json({ error: "Unknown section" }, 404);
  const body = await req.text();
  if (body.length > MAX_SECTION_BYTES) return json({ error: "Section is too large." }, 413);
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const data = clean(section.fields, input);
  const problem = validate(key, data);
  if (problem) return json({ error: problem }, 422);
  await env.DB.prepare(
    "INSERT INTO sections (key, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
  )
    .bind(key, JSON.stringify(data), Date.now())
    .run();
  return json({ ok: true, data });
}

async function upload(req, env) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file" }, 400);
  const ext = UPLOAD_TYPES[file.type];
  if (!ext) return json({ error: "Only JPG, PNG, WebP, GIF, AVIF or PDF files." }, 415);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "File is larger than 10 MB." }, 413);
  const d = new Date();
  const key = `uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ ok: true, url: `/media/${key}` });
}

async function media(env, key) {
  if (!/^uploads\/[\w./-]+$/.test(key) || key.includes("..")) return new Response("Not found", { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(obj.body, { headers });
}

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "SAMEORIGIN",
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    try {
      if ((pathname === "/" || pathname === "/index.html") && (method === "GET" || method === "HEAD")) {
        const html = renderPage(await loadContent(env), url.origin);
        return new Response(method === "HEAD" ? null : html, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SECURITY_HEADERS },
        });
      }

      if (pathname.startsWith("/media/") && method === "GET") return media(env, pathname.slice(7));

      if (pathname === "/api/login" && method === "POST") return login(req, env);

      if (pathname === "/api/logout" && method === "POST")
        return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });

      if (pathname.startsWith("/api/admin/")) {
        if (!(await validSession(req, env))) return json({ error: "Not signed in" }, 401);
        if (method !== "GET" && !sameOrigin(req)) return json({ error: "Bad origin" }, 403);

        if (pathname === "/api/admin/me") return json({ ok: true });
        if (pathname === "/api/admin/content" && method === "GET")
          return json({ sections: await loadContent(env), keys: SECTION_KEYS });
        const m = pathname.match(/^\/api\/admin\/content\/([a-z]+)$/);
        if (m && method === "PUT") return saveSection(req, env, m[1]);
        if (pathname === "/api/admin/upload" && method === "POST") return upload(req, env);
        return json({ error: "Not found" }, 404);
      }

      if (pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

      return env.ASSETS.fetch(req);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  },
};
