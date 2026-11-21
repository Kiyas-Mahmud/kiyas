import { SECTIONS } from "./schema.js";

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
};

let content = {};
let current = SECTIONS[0].key;
let draft = null;
let dirty = false;
let uid = 0;

/* ---------------- API ---------------- */

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...opts });
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  if (res.status === 401 && path !== "/api/login") {
    showLogin();
    throw new Error("Signed out");
  }
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { url } = await api("/api/admin/upload", { method: "POST", body: fd });
  return url;
}

/* ---------------- views ---------------- */

function showLogin() {
  $("#appView").hidden = true;
  $("#loginView").hidden = false;
  $("#password").focus();
}

async function showApp() {
  const data = await api("/api/admin/content");
  content = data.sections;
  $("#loginView").hidden = true;
  $("#appView").hidden = false;
  const fromHash = location.hash.slice(1);
  openSection(SECTIONS.some((s) => s.key === fromHash) ? fromHash : current, true);
}

function renderNav() {
  const nav = $("#sideNav");
  nav.replaceChildren(
    ...SECTIONS.map((s) =>
      h(
        "button",
        {
          type: "button",
          class: `side-item${s.key === current ? " is-active" : ""}`,
          "aria-current": s.key === current ? "page" : null,
          onclick: () => openSection(s.key),
        },
        s.title
      )
    )
  );
}

function openSection(key, force = false) {
  if (!force && dirty && !confirm("You have unsaved changes. Leave this section without saving?")) return;
  current = key;
  history.replaceState(null, "", `#${key}`);
  const section = SECTIONS.find((s) => s.key === key);
  draft = structuredClone(content[key] || {});
  setDirty(false);
  status("");
  $("#sectionTitle").textContent = section.title;
  $("#sectionHint").textContent = section.hint || "";
  const form = $("#sectionForm");
  form.replaceChildren(...section.fields.map((f) => field(f, draft)));
  renderNav();
  $(".editor").scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

function setDirty(v) {
  dirty = v;
  $("#saveBtn").classList.toggle("is-dirty", v);
  if (v) status("Unsaved changes", "warn");
}

function status(text, kind = "") {
  const el = $("#saveStatus");
  el.textContent = text;
  el.dataset.kind = kind;
}

/* ---------------- form builder ---------------- */

function field(f, obj) {
  const id = `f${++uid}`;
  const label = h("label", { for: id, class: "f-label" }, f.label);
  const changed = () => setDirty(true);

  switch (f.type) {
    case "textarea": {
      const el = h("textarea", { id, rows: 4 });
      el.value = obj[f.key] ?? "";
      el.addEventListener("input", () => ((obj[f.key] = el.value), changed()));
      return h("div", { class: "f" }, label, el);
    }
    case "lines": {
      const el = h("textarea", { id, rows: Math.max(3, (obj[f.key] || []).length + 1) });
      el.value = (obj[f.key] || []).join("\n");
      el.addEventListener("input", () => {
        obj[f.key] = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
        changed();
      });
      return h("div", { class: "f" }, label, el);
    }
    case "checkbox": {
      const el = h("input", { id, type: "checkbox" });
      el.checked = !!obj[f.key];
      el.addEventListener("change", () => ((obj[f.key] = el.checked), changed(), el.dispatchEvent(new Event("refresh", { bubbles: true }))));
      return h("div", { class: "f f-check" }, el, h("label", { for: id }, f.label));
    }
    case "select": {
      const el = h(
        "select",
        { id },
        f.options.map(([v, t]) => h("option", { value: v }, t))
      );
      el.value = obj[f.key] ?? f.options[0][0];
      if (!obj[f.key]) obj[f.key] = el.value;
      el.addEventListener("change", () => ((obj[f.key] = el.value), changed()));
      return h("div", { class: "f" }, label, el);
    }
    case "image":
    case "file":
      return uploadField(f, obj, id, label, changed);
    case "list":
      return listField(f, obj);
    default: {
      const el = h("input", {
        id,
        type: f.type === "url" ? "url" : "text",
        placeholder: f.type === "url" ? "https://…" : null,
        spellcheck: f.type === "url" ? "false" : null,
      });
      el.value = obj[f.key] ?? "";
      el.addEventListener("input", () => ((obj[f.key] = el.value.trim()), changed()));
      return h("div", { class: "f" }, label, el);
    }
  }
}

function uploadField(f, obj, id, label, changed) {
  const isImage = f.type === "image";
  const preview = h("div", { class: "up-preview" });
  const url = h("input", { id, type: "text", placeholder: isImage ? "/media/… or https://…" : "/pdf/… or /media/…", spellcheck: "false" });
  url.value = obj[f.key] ?? "";
  const paint = () => {
    const v = url.value.trim();
    preview.replaceChildren(
      v
        ? isImage
          ? h("img", { src: v, alt: "" })
          : h("a", { href: v, target: "_blank", rel: "noopener" }, h("i", { class: "fa-solid fa-file-pdf", "aria-hidden": "true" }), " Open file")
        : h("span", { class: "muted" }, isImage ? "No image" : "No file")
    );
  };
  url.addEventListener("input", () => ((obj[f.key] = url.value.trim()), paint(), changed()));
  const picker = h("input", { type: "file", accept: f.accept || "image/jpeg,image/png,image/webp,image/gif,image/avif", hidden: true });
  const btn = h(
    "button",
    { type: "button", class: "btn btn-ghost", onclick: () => picker.click() },
    h("i", { class: "fa-solid fa-upload", "aria-hidden": "true" }),
    isImage ? " Upload image" : " Upload PDF"
  );
  picker.addEventListener("change", async () => {
    const file = picker.files[0];
    if (!file) return;
    btn.disabled = true;
    status(`Uploading ${file.name}…`);
    try {
      const u = await uploadFile(file);
      url.value = u;
      obj[f.key] = u;
      paint();
      changed();
      status("Uploaded. Save the section to publish it.", "warn");
    } catch (e) {
      status(e.message, "error");
    } finally {
      btn.disabled = false;
      picker.value = "";
    }
  });
  paint();
  return h("div", { class: "f f-upload" }, label, h("div", { class: "up-row" }, preview, h("div", { class: "up-ctl" }, url, btn, picker)));
}

function listField(f, obj) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const items = obj[f.key];
  const wrap = h("div", { class: "list" });

  const blank = () => {
    const o = {};
    for (const sub of f.fields) o[sub.key] = sub.type === "list" || sub.type === "lines" ? [] : sub.type === "checkbox" ? false : "";
    return o;
  };

  const titleOf = (item, i) => {
    const t = String(item[f.itemLabel] || "").trim();
    return t ? t.slice(0, 80) : `Item ${i + 1}`;
  };

  const paint = (openIndex = -1) => {
    const cards = items.map((item, i) => {
      const title = h("span", { class: "li-title" }, titleOf(item, i));
      const body = h("div", { class: "li-body" }, ...f.fields.map((sub) => field(sub, item)));
      body.addEventListener("input", () => (title.textContent = titleOf(item, i)));
      const move = (d) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        [items[i], items[j]] = [items[j], items[i]];
        setDirty(true);
        paint(j);
      };
      const details = h(
        "details",
        { class: "li", open: i === openIndex ? true : null },
        h(
          "summary",
          {},
          h("i", { class: "fa-solid fa-chevron-right li-caret", "aria-hidden": "true" }),
          f.fields.some((s) => s.type === "image") && item.image ? h("img", { class: "li-thumb", src: item.image, alt: "" }) : null,
          title,
          h(
            "span",
            { class: "li-actions" },
            h("button", { type: "button", class: "icon-btn", title: "Move up", "aria-label": "Move up", disabled: i === 0 ? true : null, onclick: (e) => (e.preventDefault(), move(-1)) }, h("i", { class: "fa-solid fa-arrow-up" })),
            h("button", { type: "button", class: "icon-btn", title: "Move down", "aria-label": "Move down", disabled: i === items.length - 1 ? true : null, onclick: (e) => (e.preventDefault(), move(1)) }, h("i", { class: "fa-solid fa-arrow-down" })),
            h(
              "button",
              {
                type: "button",
                class: "icon-btn icon-danger",
                title: "Delete",
                "aria-label": "Delete",
                onclick: (e) => {
                  e.preventDefault();
                  if (!confirm(`Delete “${titleOf(item, i)}”?`)) return;
                  items.splice(i, 1);
                  setDirty(true);
                  paint();
                },
              },
              h("i", { class: "fa-solid fa-trash" })
            )
          )
        ),
        body
      );
      return details;
    });

    const add = h(
      "button",
      {
        type: "button",
        class: "btn btn-ghost list-add",
        onclick: () => {
          if (f.newestFirst) {
            items.unshift(blank());
            setDirty(true);
            paint(0);
          } else {
            items.push(blank());
            setDirty(true);
            paint(items.length - 1);
          }
        },
      },
      h("i", { class: "fa-solid fa-plus", "aria-hidden": "true" }),
      f.newestFirst ? " Add new (shows first)" : " Add item"
    );
    wrap.replaceChildren(...(f.newestFirst ? [add, ...cards] : [...cards, add]));
  };

  paint();
  return h("fieldset", { class: "f f-list" }, h("legend", { class: "f-label" }, f.label, h("span", { class: "count" }, ` · ${items.length}`)), wrap);
}

/* ---------------- save ---------------- */

function clientCheck() {
  if (current === "projects") {
    for (const p of draft.items || []) {
      if (!p.private && !p.liveUrl && !p.gitUrl)
        return `“${p.title || "Untitled project"}” needs a live link, a GitHub link, or Private ticked.`;
    }
  }
  return null;
}

async function save() {
  const problem = clientCheck();
  if (problem) return status(problem, "error");
  const btn = $("#saveBtn");
  btn.disabled = true;
  status("Saving…");
  try {
    const { data } = await api(`/api/admin/content/${current}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    content[current] = data;
    setDirty(false);
    status("Saved. The live site is updated.", "ok");
  } catch (e) {
    status(e.message, "error");
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- boot ---------------- */

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginError").textContent = "";
  try {
    await api("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: $("#password").value }),
    });
    $("#password").value = "";
    await showApp();
  } catch (err) {
    $("#loginError").textContent = err.message;
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  if (dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
  await fetch("/api/logout", { method: "POST" });
  dirty = false;
  showLogin();
});

$("#saveBtn").addEventListener("click", save);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s" && !$("#appView").hidden) {
    e.preventDefault();
    save();
  }
});
window.addEventListener("hashchange", () => {
  const key = location.hash.slice(1);
  if (key !== current && SECTIONS.some((s) => s.key === key) && !$("#appView").hidden) openSection(key);
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});

api("/api/admin/me")
  .then(showApp)
  .catch(() => showLogin());
