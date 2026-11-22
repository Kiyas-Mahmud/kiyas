import { SECTIONS } from "./schema.js";

/* ============================================================
   Tiny DOM helpers
   ============================================================ */
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
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
};
const icon = (name, extra = "") => h("i", { class: `fa-solid ${name} ${extra}`.trim(), "aria-hidden": "true" });

/* ============================================================
   State
   ============================================================ */
let content = {};
let updated = {};
let current = SECTIONS[0].key;
let draft = null;
let dirty = false;
let uid = 0;

/* ============================================================
   API
   ============================================================ */
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
    throw new Error("Your session ended. Please sign in again.");
  }
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Shrink photos in the browser before upload: max 1800px, WebP.
async function compressImage(file) {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const MAX = 1800;
    const scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const hgt = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = hgt;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, hgt);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

async function uploadFile(file, { compress = true } = {}) {
  const f = compress ? await compressImage(file) : file;
  const fd = new FormData();
  fd.append("file", f);
  const { url } = await api("/api/admin/upload", { method: "POST", body: fd });
  return url;
}


function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

/* ============================================================
   Toasts
   ============================================================ */
function toast(message, kind = "info", ms = 3200) {
  const icons = { ok: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info", warn: "fa-triangle-exclamation" };
  const el = h("div", { class: `toast toast-${kind}`, role: kind === "error" ? "alert" : "status" }, icon(icons[kind] || icons.info), h("span", {}, message));
  $("#toasts").append(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  setTimeout(() => {
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 300);
  }, ms);
}

/* ============================================================
   Views
   ============================================================ */
function showLogin() {
  $("#bootView").hidden = true;
  $("#appView").hidden = true;
  $("#loginView").hidden = false;
  setTimeout(() => $("#password").focus(), 50);
}

async function showApp() {
  const data = await api("/api/admin/content");
  content = data.sections;
  updated = data.updated || {};
  $("#bootView").hidden = true;
  $("#loginView").hidden = true;
  $("#appView").hidden = false;
  const fromHash = location.hash.slice(1);
  openSection(SECTIONS.some((s) => s.key === fromHash) ? fromHash : current, true);
}

const GROUP_LABEL = { Settings: "Settings", Page: "Page sections", Media: "Media" };

function renderNav() {
  const groups = {};
  for (const s of SECTIONS) (groups[s.group || "Page"] ||= []).push(s);
  const order = ["Settings", "Page", "Media"];
  $("#sideNav").replaceChildren(
    ...order
      .filter((g) => groups[g])
      .map((g) =>
        h(
          "div",
          { class: "side-group" },
          h("p", { class: "side-group-label mono" }, GROUP_LABEL[g]),
          ...groups[g].map((s) =>
            h(
              "button",
              {
                type: "button",
                class: `side-item${s.key === current ? " is-active" : ""}`,
                "aria-current": s.key === current ? "page" : null,
                onclick: () => {
                  openSection(s.key);
                  closeMenu();
                },
              },
              icon(s.icon || "fa-file", "side-icon"),
              h("span", {}, s.title),
              s.key === current && dirty ? h("span", { class: "dot", title: "Unsaved changes" }) : null
            )
          )
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
  dirty = false;
  $("#crumb").textContent = GROUP_LABEL[section.group || "Page"];
  $("#sectionTitle").textContent = section.title;
  $("#sectionHint").textContent = section.hint || "";
  $("#previewBtn").href = `/${section.anchor || ""}`;
  buildForm(section);
  refreshSaveState();
  renderNav();
  window.scrollTo(0, 0);
}

function buildForm(section) {
  const simple = section.fields.filter((f) => f.type !== "list");
  const lists = section.fields.filter((f) => f.type === "list");
  const cards = [];
  if (simple.length) {
    cards.push(
      h(
        "section",
        { class: "card" },
        h("header", { class: "card-head" }, h("h2", {}, icon("fa-pen-to-square"), " Details")),
        h("div", { class: "card-body grid-2" }, ...simple.map((f) => field(f, draft)))
      )
    );
  }
  for (const f of lists) cards.push(f.display === "grid" ? imageGrid(f, draft) : listCard(f, draft));
  $("#sectionForm").replaceChildren(...cards);
}

function markDirty() {
  if (!dirty) {
    dirty = true;
    renderNav();
  }
  refreshSaveState();
}

function refreshSaveState() {
  const btn = $("#saveBtn");
  btn.disabled = !dirty;
  btn.classList.toggle("is-dirty", dirty);
  btn.querySelector("i").className = `fa-solid ${dirty ? "fa-floppy-disk" : "fa-check"}`;
  $("#saveLabel").textContent = dirty ? "Save changes" : "Saved";
  const ts = updated[current];
  $("#savedAt").textContent = dirty ? "Unsaved changes" : ts ? `Saved ${timeAgo(ts)}` : "";
  $("#savedAt").classList.toggle("is-warn", dirty);
}

/* ============================================================
   Fields
   ============================================================ */
const WIDE = new Set(["textarea", "lines", "image", "file"]);

function wrap(f, id, control, { wide = WIDE.has(f.type), extra = null } = {}) {
  return h(
    "div",
    { class: `f${wide ? " f-wide" : ""}` },
    h("label", { for: id, class: "f-label" }, f.label),
    control,
    f.help || extra ? h("div", { class: "f-foot" }, f.help ? h("p", { class: "f-help" }, f.help) : h("span"), extra) : null
  );
}

function autosize(el) {
  const fit = () => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  el.addEventListener("input", fit);
  requestAnimationFrame(fit);
}

function field(f, obj) {
  const id = `f${++uid}`;

  switch (f.type) {
    case "textarea": {
      const el = h("textarea", { id, rows: 3 });
      el.value = obj[f.key] ?? "";
      autosize(el);
      let counter = null;
      if (f.maxHint) {
        counter = h("span", { class: "f-count mono" });
        const paint = () => {
          counter.textContent = `${el.value.length} / ${f.maxHint}`;
          counter.classList.toggle("is-over", el.value.length > f.maxHint);
        };
        el.addEventListener("input", paint);
        paint();
      }
      el.addEventListener("input", () => ((obj[f.key] = el.value), markDirty()));
      return wrap(f, id, el, { extra: counter });
    }
    case "lines": {
      const el = h("textarea", { id, rows: 3, placeholder: "One item per line" });
      el.value = (obj[f.key] || []).join("\n");
      autosize(el);
      el.addEventListener("input", () => {
        obj[f.key] = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
        markDirty();
      });
      return wrap(f, id, el);
    }
    case "checkbox": {
      const el = h("input", { id, type: "checkbox", class: "switch-input" });
      el.checked = !!obj[f.key];
      el.addEventListener("change", () => {
        obj[f.key] = el.checked;
        markDirty();
        el.dispatchEvent(new CustomEvent("item-change", { bubbles: true }));
      });
      return h(
        "div",
        { class: "f f-wide f-switch" },
        h("label", { for: id, class: "switch" }, el, h("span", { class: "switch-track", "aria-hidden": "true" }), h("span", { class: "switch-text" }, f.label)),
        f.help ? h("p", { class: "f-help" }, f.help) : null
      );
    }
    case "select": {
      const el = h("select", { id }, f.options.map(([v, t]) => h("option", { value: v }, t)));
      el.value = obj[f.key] || f.options[0][0];
      if (!obj[f.key]) obj[f.key] = el.value;
      el.addEventListener("change", () => {
        obj[f.key] = el.value;
        markDirty();
        el.dispatchEvent(new CustomEvent("item-change", { bubbles: true }));
      });
      return wrap(f, id, h("div", { class: "select-wrap" }, el, icon("fa-chevron-down", "select-caret")));
    }
    case "image":
    case "file":
      return uploadField(f, obj, id);
    case "list":
      return listCard(f, obj, true);
    default: {
      const isUrl = f.type === "url";
      const el = h("input", { id, type: isUrl ? "url" : "text", placeholder: isUrl ? "https://" : null, spellcheck: isUrl ? "false" : null });
      el.value = obj[f.key] ?? "";
      el.addEventListener("input", () => {
        obj[f.key] = el.value.trim();
        markDirty();
        el.dispatchEvent(new CustomEvent("item-change", { bubbles: true }));
      });
      const control = isUrl ? h("div", { class: "input-icon" }, icon("fa-link"), el) : el;
      return wrap(f, id, control);
    }
  }
}

/* ---------- single image / PDF ---------- */
function uploadField(f, obj, id) {
  const isImage = f.type === "image";
  const preview = h("div", { class: `up-preview${isImage ? "" : " up-file"}` });
  const url = h("input", { id, type: "text", class: "up-url", spellcheck: "false", placeholder: "…or paste a link" });
  url.value = obj[f.key] ?? "";
  const picker = h("input", { type: "file", accept: f.accept || "image/jpeg,image/png,image/webp,image/gif,image/avif", hidden: true });
  const uploadBtn = h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => picker.click() });
  const removeBtn = h("button", { type: "button", class: "btn btn-text btn-sm", onclick: () => set("") }, icon("fa-xmark"), " Remove");
  const meta = h("p", { class: "up-meta" });

  function set(v) {
    url.value = v;
    obj[f.key] = v;
    paint();
    markDirty();
  }

  function paint() {
    const v = url.value.trim();
    uploadBtn.replaceChildren(icon(v ? "fa-arrows-rotate" : "fa-upload"), v ? " Replace" : isImage ? " Upload image" : " Upload PDF");
    removeBtn.hidden = !v;
    if (!v) {
      preview.replaceChildren(h("div", { class: "up-empty" }, icon(isImage ? "fa-image" : "fa-file-pdf"), h("span", {}, isImage ? "Drop an image here" : "Drop a PDF here")));
    } else if (isImage) {
      preview.replaceChildren(h("img", { src: v, alt: "" }));
    } else {
      preview.replaceChildren(h("a", { class: "up-pdf", href: v, target: "_blank", rel: "noopener" }, icon("fa-file-pdf"), h("span", {}, v.split("/").pop()), h("small", {}, "Open")));
    }
  }

  async function handle(file) {
    if (!file) return;
    preview.classList.add("is-busy");
    uploadBtn.disabled = true;
    try {
      const u = await uploadFile(file, { compress: isImage && !f.noCompress });
      set(u);
      meta.textContent = `Uploaded ${file.name}`;
      toast("Uploaded. Click Save changes to publish it.", "ok");
    } catch (e) {
      toast(e.message, "error", 5000);
    } finally {
      preview.classList.remove("is-busy");
      uploadBtn.disabled = false;
      picker.value = "";
    }
  }

  picker.addEventListener("change", () => handle(picker.files[0]));
  url.addEventListener("input", () => ((obj[f.key] = url.value.trim()), paint(), markDirty()));
  dropTarget(preview, (files) => handle(files[0]));
  preview.addEventListener("click", (e) => {
    if (!e.target.closest("a")) picker.click();
  });
  paint();

  return h(
    "div",
    { class: "f f-wide" },
    h("label", { for: id, class: "f-label" }, f.label),
    h("div", { class: "up" }, preview, h("div", { class: "up-side" }, h("div", { class: "up-actions" }, uploadBtn, removeBtn), url, meta, f.help ? h("p", { class: "f-help" }, f.help) : null, picker))
  );
}

function dropTarget(el, onFiles) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("is-drop");
  });
  el.addEventListener("dragleave", () => el.classList.remove("is-drop"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("is-drop");
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) onFiles(files);
  });
}

/* ---------- repeatable list ---------- */
function blankItem(f) {
  const o = {};
  for (const sub of f.fields) o[sub.key] = sub.type === "list" || sub.type === "lines" ? [] : sub.type === "checkbox" ? false : "";
  return o;
}

function chipsFor(item) {
  const chips = [];
  if ("status" in item && item.status) {
    const label = { accepted: "Accepted", published: "Published", presented: "Presented", review: "Under review" }[item.status];
    if (label) chips.push(h("span", { class: `chip chip-${item.status}` }, label));
  }
  if ("liveUrl" in item || "gitUrl" in item) {
    if (item.liveUrl) chips.push(h("span", { class: "chip chip-live" }, icon("fa-globe"), " Live"));
    if (item.gitUrl) chips.push(h("span", { class: "chip" }, h("i", { class: "fab fa-github", "aria-hidden": "true" }), " GitHub"));
    if (item.private) chips.push(h("span", { class: "chip" }, icon("fa-lock"), " Private"));
    if (!item.liveUrl && !item.gitUrl && !item.private) chips.push(h("span", { class: "chip chip-bad" }, icon("fa-triangle-exclamation"), " Needs a link"));
  } else if ("private" in item && item.private) {
    chips.push(h("span", { class: "chip" }, icon("fa-lock"), " Private"));
  }
  return chips;
}

function listCard(f, obj, nested = false) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const items = obj[f.key];
  const body = h("div", { class: "list" });
  const count = h("span", { class: "count" });
  const titleOf = (item, i) => String(item[f.itemLabel] || "").trim().slice(0, 90) || `New item ${i + 1}`;

  const add = () => {
    if (f.newestFirst) items.unshift(blankItem(f));
    else items.push(blankItem(f));
    markDirty();
    paint(f.newestFirst ? 0 : items.length - 1, true);
  };

  function paint(openIndex = -1, focus = false) {
    count.textContent = items.length;
    if (!items.length) {
      body.replaceChildren(h("div", { class: "empty" }, icon("fa-inbox"), h("p", {}, "Nothing here yet."), h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: add }, icon("fa-plus"), " Add the first one")));
      return;
    }
    body.replaceChildren(
      ...items.map((item, i) => {
        const title = h("span", { class: "li-title" }, titleOf(item, i));
        const chipBox = h("span", { class: "li-chips" }, ...chipsFor(item));
        const fields = h("div", { class: "li-body grid-2" }, ...f.fields.map((sub) => field(sub, item)));
        const refresh = () => {
          title.textContent = titleOf(item, i);
          chipBox.replaceChildren(...chipsFor(item));
        };
        fields.addEventListener("input", refresh);
        fields.addEventListener("item-change", refresh);

        const move = (d) => {
          const j = i + d;
          if (j < 0 || j >= items.length) return;
          [items[i], items[j]] = [items[j], items[i]];
          markDirty();
          paint(j);
        };
        const del = () => {
          if (!confirm(`Delete “${titleOf(item, i)}”?`)) return;
          items.splice(i, 1);
          markDirty();
          paint();
          toast("Item removed. Click Save changes to publish.", "info");
        };
        const stop = (fn) => (e) => {
          e.preventDefault();
          e.stopPropagation();
          fn();
        };
        const thumb = f.fields.some((s) => s.type === "image") && item.image ? h("img", { class: "li-thumb", src: item.image, alt: "" }) : null;

        const det = h(
          "details",
          { class: "li", open: i === openIndex ? true : null },
          h(
            "summary",
            {},
            h("span", { class: "li-num mono" }, String(i + 1).padStart(2, "0")),
            thumb,
            h("span", { class: "li-main" }, title, chipBox),
            h(
              "span",
              { class: "li-actions" },
              h("button", { type: "button", class: "icon-btn", title: "Move up", "aria-label": "Move up", disabled: i === 0 ? true : null, onclick: stop(() => move(-1)) }, icon("fa-arrow-up")),
              h("button", { type: "button", class: "icon-btn", title: "Move down", "aria-label": "Move down", disabled: i === items.length - 1 ? true : null, onclick: stop(() => move(1)) }, icon("fa-arrow-down")),
              h("button", { type: "button", class: "icon-btn icon-danger", title: "Delete", "aria-label": "Delete", onclick: stop(del) }, icon("fa-trash-can"))
            ),
            icon("fa-chevron-down", "li-caret")
          ),
          fields
        );
        if (focus && i === openIndex) requestAnimationFrame(() => det.querySelector("input, textarea, select")?.focus());
        return det;
      })
    );
  }

  paint();
  const addBtn = h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: add }, icon("fa-plus"), f.newestFirst ? " Add new (shows first)" : " Add");

  if (nested) {
    return h("div", { class: "f f-wide sublist" }, h("div", { class: "sublist-head" }, h("span", { class: "f-label" }, f.label, " ", count), addBtn), body);
  }
  return h("section", { class: "card" }, h("header", { class: "card-head" }, h("h2", {}, f.label, " ", count), addBtn), h("div", { class: "card-body" }, body));
}

/* ---------- image grid (gallery, certificates) ---------- */
function imageGrid(f, obj) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const items = obj[f.key];
  const grid = h("div", { class: "tiles" });
  const count = h("span", { class: "count" });
  const picker = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif,image/avif", multiple: true, hidden: true });
  const progress = h("p", { class: "drop-progress" });

  const zone = h(
    "div",
    { class: "dropzone", tabindex: "0", role: "button", "aria-label": "Upload photos", onclick: () => picker.click(), onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), picker.click()) },
    icon("fa-cloud-arrow-up", "dz-icon"),
    h("strong", {}, "Drop photos here or click to upload"),
    h("span", {}, "You can pick several at once. New photos appear first. Large photos are resized automatically."),
    progress
  );

  async function addFiles(files) {
    const imgs = files.filter((x) => x.type.startsWith("image/"));
    if (!imgs.length) return toast("Please choose image files.", "warn");
    zone.classList.add("is-busy");
    let done = 0;
    const added = [];
    for (const file of imgs) {
      progress.textContent = `Uploading ${done + 1} of ${imgs.length}…`;
      try {
        const url = await uploadFile(file);
        const alt = file.name.replace(/\.\w+$/, "").replace(/[-_]+/g, " ").trim();
        added.push({ image: url, alt });
      } catch (e) {
        toast(`${file.name}: ${e.message}`, "error", 5000);
      }
      done++;
    }
    items.unshift(...added.reverse());
    zone.classList.remove("is-busy");
    progress.textContent = "";
    picker.value = "";
    if (added.length) {
      markDirty();
      paint();
      toast(`${added.length} photo${added.length > 1 ? "s" : ""} added. Add a short description, then click Save changes.`, "ok", 5000);
    }
  }

  picker.addEventListener("change", () => addFiles([...picker.files]));
  dropTarget(zone, addFiles);

  function paint() {
    count.textContent = items.length;
    grid.replaceChildren(
      ...items.map((item, i) => {
        const alt = h("input", { type: "text", value: item.alt || "", placeholder: "Short description", "aria-label": `Description for photo ${i + 1}` });
        alt.addEventListener("input", () => ((item.alt = alt.value), markDirty()));
        const replace = h("input", { type: "file", accept: "image/*", hidden: true });
        replace.addEventListener("change", async () => {
          const file = replace.files[0];
          if (!file) return;
          try {
            item.image = await uploadFile(file);
            markDirty();
            paint();
            toast("Photo replaced. Click Save changes to publish.", "ok");
          } catch (e) {
            toast(e.message, "error", 5000);
          }
        });
        const move = (d) => {
          const j = i + d;
          if (j < 0 || j >= items.length) return;
          [items[i], items[j]] = [items[j], items[i]];
          markDirty();
          paint();
        };
        return h(
          "figure",
          { class: "tile" },
          h(
            "div",
            { class: "tile-img" },
            item.image ? h("img", { src: item.image, alt: "", loading: "lazy" }) : h("div", { class: "up-empty" }, icon("fa-image")),
            i === 0 && f.newestFirst ? h("span", { class: "tile-badge mono" }, "First") : null,
            h(
              "div",
              { class: "tile-tools" },
              h("button", { type: "button", class: "icon-btn", title: "Move earlier", "aria-label": "Move earlier", disabled: i === 0 ? true : null, onclick: () => move(-1) }, icon("fa-arrow-left")),
              h("button", { type: "button", class: "icon-btn", title: "Move later", "aria-label": "Move later", disabled: i === items.length - 1 ? true : null, onclick: () => move(1) }, icon("fa-arrow-right")),
              h("button", { type: "button", class: "icon-btn", title: "Replace photo", "aria-label": "Replace photo", onclick: () => replace.click() }, icon("fa-arrows-rotate")),
              h(
                "button",
                {
                  type: "button",
                  class: "icon-btn icon-danger",
                  title: "Delete",
                  "aria-label": "Delete photo",
                  onclick: () => {
                    if (!confirm("Delete this photo from the site?")) return;
                    items.splice(i, 1);
                    markDirty();
                    paint();
                  },
                },
                icon("fa-trash-can")
              )
            )
          ),
          h("figcaption", {}, alt),
          replace
        );
      })
    );
  }

  paint();
  return h(
    "section",
    { class: "card" },
    h("header", { class: "card-head" }, h("h2", {}, f.label, " ", count)),
    h("div", { class: "card-body" }, zone, picker, grid)
  );
}

/* ============================================================
   Save
   ============================================================ */
function clientCheck() {
  if (current === "projects") {
    for (const p of draft.items || []) {
      if (!p.private && !p.liveUrl && !p.gitUrl) return `“${p.title || "Untitled project"}” needs a live link, a GitHub link, or Private ticked.`;
    }
  }
  return null;
}

async function save() {
  if (!dirty) return;
  const problem = clientCheck();
  if (problem) return toast(problem, "error", 6000);
  const btn = $("#saveBtn");
  btn.disabled = true;
  $("#saveLabel").textContent = "Saving…";
  try {
    const res = await api(`/api/admin/content/${current}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    content[current] = res.data;
    updated[current] = res.updated || Date.now();
    dirty = false;
    renderNav();
    toast("Saved. The live site is updated.", "ok");
  } catch (e) {
    toast(e.message, "error", 6000);
  } finally {
    refreshSaveState();
  }
}

/* ============================================================
   Mobile menu
   ============================================================ */
function openMenu() {
  $("#side").classList.add("is-open");
  $("#scrim").hidden = false;
}
function closeMenu() {
  $("#side").classList.remove("is-open");
  $("#scrim").hidden = true;
}

/* ============================================================
   Boot
   ============================================================ */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginBtn");
  $("#loginError").textContent = "";
  btn.disabled = true;
  btn.classList.add("is-busy");
  try {
    await api("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: $("#password").value }),
    });
    $("#password").value = "";
    await showApp();
    toast("Signed in.", "ok", 2000);
  } catch (err) {
    $("#loginError").textContent = err.message;
    $("#password").select();
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-busy");
  }
});

$("#pwToggle").addEventListener("click", () => {
  const pw = $("#password");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  $("#pwToggle").innerHTML = `<i class="fa-regular ${show ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
  $("#pwToggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
});

$("#logoutBtn").addEventListener("click", async () => {
  if (dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
  await fetch("/api/logout", { method: "POST" });
  dirty = false;
  closeMenu();
  showLogin();
});

$("#saveBtn").addEventListener("click", save);
$("#menuBtn").addEventListener("click", openMenu);
$("#sideClose").addEventListener("click", closeMenu);
$("#scrim").addEventListener("click", closeMenu);

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !$("#appView").hidden) {
    e.preventDefault();
    save();
  }
  if (e.key === "Escape") closeMenu();
});
window.addEventListener("hashchange", () => {
  const key = location.hash.slice(1);
  if (key !== current && SECTIONS.some((s) => s.key === key) && !$("#appView").hidden) openSection(key);
});
window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});
setInterval(() => !$("#appView").hidden && refreshSaveState(), 30000);

api("/api/admin/me")
  .then(showApp)
  .catch(() => showLogin());
