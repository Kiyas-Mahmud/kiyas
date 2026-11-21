/* Server-side renderer: content JSON (from D1, merged over the seed)
   → the full portfolio page. Markup and class names match style.css
   and script.js. Every string is escaped; every URL is checked. */

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Allow http(s), mailto, tel, site-relative paths and #anchors only.
export function safeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (s.startsWith("#")) return s;
  return "";
}

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => String(v ?? "").trim() !== "";

const ext = (url, cls, icon, label) => {
  const href = safeUrl(url);
  if (!href) return "";
  return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener"><i class="${icon}" aria-hidden="true"></i> ${esc(label)}</a>`;
};

const LINK_ICON = {
  github: "fab fa-github",
  live: "fa-solid fa-arrow-up-right-from-square",
  dataset: "fa-solid fa-database",
  paper: "fa-solid fa-file-lines",
  scholar: "fa-solid fa-graduation-cap",
  other: "fa-solid fa-link",
};

function linkRow(links) {
  const items = arr(links)
    .map((l) =>
      ext(
        l.url,
        l.type === "live" ? "link-btn link-live" : "link-btn",
        LINK_ICON[l.type] || LINK_ICON.other,
        l.label || "Link"
      )
    )
    .filter(Boolean);
  return items.length ? `<div class="link-row">${items.join("")}</div>` : "";
}

const points = (list) =>
  arr(list).filter(has).length
    ? `<ul class="points">${arr(list).filter(has).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : "";

const tech = (list) =>
  arr(list).filter(has).length
    ? `<p class="tech mono">${arr(list).filter(has).map(esc).join(" · ")}</p>`
    : "";

const lock = (text) =>
  `<span class="private-note mono"><i class="fa-solid fa-lock" aria-hidden="true"></i> ${esc(text)}</span>`;

/* ---------------- sections ---------------- */

function hero(h, site) {
  const cv = safeUrl(site.cvUrl);
  const social = [
    [h.scholar, "fa-solid fa-graduation-cap", "Google Scholar"],
    [h.github, "fab fa-github", "GitHub"],
    [h.linkedin, "fab fa-linkedin-in", "LinkedIn"],
  ]
    .filter(([u]) => safeUrl(u))
    .map(
      ([u, i, l]) =>
        `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener" aria-label="${l}" title="${l}"><i class="${i}" aria-hidden="true"></i></a>`
    );
  if (has(h.email))
    social.push(
      `<a href="mailto:${esc(h.email)}" aria-label="Email" title="Email"><i class="fa-solid fa-envelope" aria-hidden="true"></i></a>`
    );

  const stats = arr(h.stats);
  return `
      <section class="hero" id="hero">
        <div class="hero-inner">
          <div class="hero-copy">
            ${has(h.eyebrow) ? `<p class="eyebrow" data-reveal><span class="eyebrow-dot"></span>${esc(h.eyebrow)}</p>` : ""}
            <h1 class="hero-name" data-reveal>${esc(h.name)}</h1>
            ${has(h.role) ? `<p class="hero-role" data-reveal>${esc(h.role)}</p>` : ""}
            ${has(h.lede) ? `<p class="hero-lede" data-reveal>${esc(h.lede)}</p>` : ""}
            <div class="hero-cta" data-reveal>
              ${cv ? `<a class="btn btn-solid" href="${esc(cv)}" download="${esc(site.cvFileName || "CV.pdf")}"><i class="fa-solid fa-download" aria-hidden="true"></i> Download CV</a>` : ""}
              <a class="btn btn-glass" href="#publications">View publications <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
            </div>
            ${social.length ? `<div class="hero-social" data-reveal>${social.join("")}</div>` : ""}
          </div>
          ${
            safeUrl(h.portrait)
              ? `<figure class="hero-portrait glass" data-reveal>
            <img src="${esc(safeUrl(h.portrait))}" alt="${esc(h.portraitAlt)}" width="900" height="1200" decoding="async" fetchpriority="high" />
            ${has(h.portraitCaption) ? `<figcaption class="mono">${esc(h.portraitCaption)}</figcaption>` : ""}
          </figure>`
              : ""
          }
        </div>
        ${
          stats.length
            ? `<dl class="hero-stats" data-reveal>${stats
                .map(
                  (s) =>
                    `<div><dt class="mono">${esc(s.label)}</dt><dd>${esc(s.value)}${has(s.suffix) ? `<span>${esc(s.suffix)}</span>` : ""}</dd>${has(s.note) ? `<p>${esc(s.note)}</p>` : ""}</div>`
                )
                .join("")}</dl>`
            : ""
        }
      </section>`;
}

const head = (n, label, title) => `
        <header class="section-head" data-reveal>
          <p class="section-idx mono">${String(n).padStart(2, "0")} / ${esc(label)}</p>
          <h2>${esc(title)}</h2>
        </header>`;

function about(a) {
  const edu = arr(a.education);
  return `
        <div class="about-grid">
          <div class="about-copy">
            ${has(a.lead) ? `<p class="about-lead" data-reveal>${esc(a.lead)}</p>` : ""}
            ${has(a.body) ? `<p data-reveal>${esc(a.body)}</p>` : ""}
            ${
              arr(a.interests).filter(has).length
                ? `<div class="interests" data-reveal><h3 class="sub-head mono">Research interests</h3><ul class="chips">${arr(a.interests).filter(has).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
                : ""
            }
          </div>
          <div class="edu panel glass" data-reveal>
            <h3 class="sub-head mono">Education</h3>
            <ol class="edu-list">${edu
              .map(
                (e) => `<li><div class="edu-top"><strong>${esc(e.degree)}</strong><span class="edu-year mono">${esc(e.year)}</span></div><span>${esc(e.school)}</span>${has(e.score) ? `<span class="edu-score">${esc(e.score)}</span>` : ""}</li>`
              )
              .join("")}</ol>
            ${has(a.languages) ? `<p class="edu-langs mono">${esc(a.languages)}</p>` : ""}
          </div>
        </div>`;
}

function research(r) {
  const metrics = arr(r.metrics);
  return `
        <article class="thesis panel glass" data-reveal>
          <div class="thesis-head">
            ${has(r.thesisTag) ? `<p class="tag-line mono">${esc(r.thesisTag)}</p>` : ""}
            <h3>${esc(r.thesisTitle)}</h3>
            ${has(r.thesisSupervisor) ? `<p class="thesis-sup">${esc(r.thesisSupervisor)}</p>` : ""}
          </div>
          <div class="thesis-body">
            ${points(r.thesisPoints)}
            ${
              metrics.length
                ? `<dl class="metrics">${metrics.map((m) => `<div><dt class="mono">${esc(m.label)}</dt><dd>${esc(m.value)}${has(m.unit) ? `<span>${esc(m.unit)}</span>` : ""}</dd></div>`).join("")}</dl>`
                : ""
            }
            ${has(r.metricsNote) ? `<p class="metrics-note">${esc(r.metricsNote)}</p>` : ""}
          </div>
          ${linkRow(r.links)}
        </article>
        ${arr(r.roles)
          .map(
            (x) => `
        <article class="ra-row" data-reveal>
          <div>
            ${has(x.period) ? `<p class="tag-line mono">${esc(x.period)}</p>` : ""}
            <h3>${esc(x.title)}</h3>
          </div>
          <p>${esc(x.text)}</p>
        </article>`
          )
          .join("")}`;
}

const STATUS = {
  accepted: "Accepted",
  published: "Published",
  presented: "Presented",
  review: "Under review",
};

function publications(p) {
  return `
        <ol class="pub-list">${arr(p.items)
          .map(
            (it, i) => `
          <li class="pub" data-reveal>
            <span class="pub-idx mono">[${i + 1}]</span>
            <div class="pub-body">
              <h3>${esc(it.title)}</h3>
              <p class="pub-venue">${STATUS[it.status] ? `<span class="status status-${it.status === "review" ? "presented" : esc(it.status)}">${STATUS[it.status]}</span> ` : ""}${esc(it.venue)}</p>
              ${has(it.note) ? `<p class="pub-note">${esc(it.note)}</p>` : ""}
              ${linkRow(it.links)}
            </div>
          </li>`
          )
          .join("")}
        </ol>`;
}

function experience(x) {
  return `
        <div class="xp-list">${arr(x.items)
          .map(
            (it) => `
          <article class="xp panel glass" data-reveal>
            <div class="xp-meta">
              ${has(it.tag) ? `<p class="tag-line mono">${esc(it.tag)}</p>` : ""}
              <h3>${esc(it.title)}</h3>
              ${has(it.org) ? `<p class="xp-org">${esc(it.org)}</p>` : ""}
              ${has(it.kind) ? `<p class="xp-kind">${esc(it.kind)}</p>` : ""}
              ${it.private ? lock("Client project · private") : ""}
            </div>
            <div>${points(it.points)}${tech(it.tech)}</div>
          </article>`
          )
          .join("")}
        </div>`;
}

function projects(p) {
  const cards = arr(p.items)
    .map((it) => {
      const links = [
        ext(it.liveUrl, "link-btn link-live", LINK_ICON.live, "Live site"),
        ext(it.gitUrl, "link-btn", LINK_ICON.github, "GitHub"),
      ].filter(Boolean);
      const row = links.length
        ? `<div class="link-row">${links.join("")}</div>`
        : it.private
          ? `<div class="link-row">${lock("Private repository")}</div>`
          : "";
      return `
          <article class="proj panel glass" data-reveal>
            ${has(it.badge) ? `<p class="proj-badge mono"><i class="fa-solid fa-trophy" aria-hidden="true"></i> ${esc(it.badge)}</p>` : ""}
            <h3>${esc(it.title)}</h3>
            ${has(it.tagline) ? `<p class="proj-tag">${esc(it.tagline)}</p>` : ""}
            ${points(it.points)}
            ${tech(it.tech)}
            ${row}
          </article>`;
    })
    .join("");
  const more = safeUrl(p.moreUrl);
  return `
        <div class="proj-grid">${cards}
        </div>
        ${more ? `<p class="more-link" data-reveal><a href="${esc(more)}" target="_blank" rel="noopener">More projects on GitHub <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></p>` : ""}`;
}

function skills(s) {
  return `
        <dl class="skill-table panel glass" data-reveal>${arr(s.items)
          .map((it) => `<div><dt class="mono">${esc(it.label)}</dt><dd>${esc(it.value)}</dd></div>`)
          .join("")}
        </dl>`;
}

const imgButton = (cls, it) => {
  const src = safeUrl(it.image);
  if (!src) return "";
  return `<button class="${cls}" data-reveal data-lightbox><img src="${esc(src)}" alt="${esc(it.alt)}" loading="lazy" decoding="async" /></button>`;
};

function honors(h) {
  const awards = arr(h.awards);
  const courses = arr(h.courses);
  const certs = arr(h.certificates);
  return `
        ${
          awards.length
            ? `<ul class="award-list" data-reveal>${awards
                .map(
                  (a) => `<li><i class="fa-solid fa-${esc(a.icon || "award")}" aria-hidden="true"></i><div><strong>${esc(a.title)}</strong>${has(a.note) ? `<span>${esc(a.note)}</span>` : ""}</div></li>`
                )
                .join("")}</ul>`
            : ""
        }
        ${
          courses.length
            ? `<div class="cert-courses" data-reveal>${courses
                .map(
                  (c) => `<article class="cert-course panel glass"><i class="fa-solid fa-certificate" aria-hidden="true"></i><div><h3>${esc(c.title)}</h3><p>${esc(c.issuer)}</p></div></article>`
                )
                .join("")}</div>`
            : ""
        }
        ${certs.length ? `<div class="cert-grid">${certs.map((c) => imgButton("cert-item", c)).join("")}</div>` : ""}`;
}

function leadership(l) {
  return `
        <div class="lead-grid">${arr(l.items)
          .map(
            (it) => `
          <article class="lead panel glass" data-reveal>
            ${has(it.role) ? `<p class="tag-line mono">${esc(it.role)}</p>` : ""}
            <h3>${esc(it.org)}</h3>
            <p>${esc(it.text)}</p>
          </article>`
          )
          .join("")}
        </div>`;
}

function gallery(g) {
  return `
        <div class="gallery-grid">${arr(g.items).map((it) => imgButton("g-item", it)).join("")}
        </div>`;
}

function contact(c, site, h) {
  const cv = safeUrl(site.cvUrl);
  const refs = arr(c.references);
  const meta = [];
  if (has(c.phone))
    meta.push(`<li><i class="fa-solid fa-phone" aria-hidden="true"></i><a href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ""))}">${esc(c.phone)}</a></li>`);
  if (has(c.location))
    meta.push(`<li><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${esc(c.location)}</li>`);
  const socials = [
    [h.scholar, "fa-solid fa-graduation-cap", "Google Scholar"],
    [h.github, "fab fa-github", String(h.github || "").replace(/^https?:\/\/(www\.)?/, "")],
    [h.linkedin, "fab fa-linkedin-in", "LinkedIn"],
  ];
  for (const [u, i, l] of socials) {
    if (safeUrl(u))
      meta.push(`<li><i class="${i}" aria-hidden="true"></i><a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">${esc(l)}</a></li>`);
  }
  return `
        <div class="contact-panel panel glass" data-reveal>
          ${has(c.lede) ? `<p class="contact-lede">${esc(c.lede)}</p>` : ""}
          <div class="contact-actions">
            ${has(c.email) ? `<a class="btn btn-solid" href="mailto:${esc(c.email)}"><i class="fa-solid fa-envelope" aria-hidden="true"></i> ${esc(c.email)}</a>` : ""}
            ${cv ? `<a class="btn btn-glass" href="${esc(cv)}" download="${esc(site.cvFileName || "CV.pdf")}"><i class="fa-solid fa-download" aria-hidden="true"></i> Download CV</a>` : ""}
          </div>
          ${meta.length ? `<ul class="contact-meta">${meta.join("")}</ul>` : ""}
          ${
            refs.length
              ? `<div class="refs">
            <p class="refs-title mono">References</p>
            <div class="refs-grid">${refs.map((r) => `<div><strong>${esc(r.name)}</strong><span>${esc(r.title)}</span></div>`).join("")}</div>
            ${has(c.refsNote) ? `<p class="refs-note">${esc(c.refsNote)}</p>` : ""}
          </div>`
              : ""
          }
        </div>`;
}

/* ---------------- page ---------------- */

// [key, nav label, renderer, inDesktopNav, isEmpty]
const BODY = [
  ["about", "About", about, true, (d) => !has(d.body) && !arr(d.education).length],
  ["research", "Research", research, true, (d) => !has(d.thesisTitle) && !arr(d.roles).length],
  ["publications", "Publications", publications, true, (d) => !arr(d.items).length],
  ["experience", "Experience", experience, true, (d) => !arr(d.items).length],
  ["projects", "Projects", projects, true, (d) => !arr(d.items).length],
  ["skills", "Skills", skills, false, (d) => !arr(d.items).length],
  ["honors", "Honors", honors, true, (d) => !arr(d.awards).length && !arr(d.courses).length && !arr(d.certificates).length],
  ["leadership", "Leadership", leadership, false, (d) => !arr(d.items).length],
  ["gallery", "Gallery", gallery, false, (d) => !arr(d.items).length],
  ["contact", "Contact", null, true, () => false],
];

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='7' fill='%230b0f1c' stroke='%23f0a64b' stroke-width='1.5'/%3E%3Cpath d='M10 8v16M10 16l9-8M13 13.5L21 24' fill='none' stroke='%23f0a64b' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export function renderPage(c, origin) {
  const site = c.site || {};
  const h = c.hero || {};
  const abs = (u) => {
    const s = safeUrl(u);
    return s.startsWith("/") ? origin + s : s;
  };
  const cv = safeUrl(site.cvUrl);
  const cvName = esc(site.cvFileName || "CV.pdf");

  const shown = BODY.filter(([key, , , , empty]) => !empty(c[key] || {}));
  let n = 0;
  const sections = shown
    .map(([key, label, fn]) => {
      n += 1;
      const d = c[key] || {};
      const inner = key === "contact" ? contact(d, site, h) : fn(d);
      const cls = key === "contact" ? "section section-contact" : "section";
      return `
      <section class="${cls}" id="${key}">${head(n, label, d.heading || label)}${inner}
      </section>`;
    })
    .join("\n");

  const desktopNav = shown
    .filter(([, , , desk]) => desk)
    .map(([key, label]) => `<li><a href="#${key}">${label}</a></li>`)
    .join("");
  const mobileNav = shown.map(([key, label]) => `<a href="#${key}">${label}</a>`).join("");

  const title = esc(site.title || h.name || "Portfolio");
  const desc = esc(site.description || "");
  const og = esc(abs(site.ogImage));
  const name = esc(h.name || "");
  const [first, ...rest] = String(h.name || "").toLowerCase().split(" ");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(origin)}/" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    ${og ? `<meta property="og:image" content="${og}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    ${og ? `<meta name="twitter:image" content="${og}" />` : ""}
    <link rel="icon" href="${FAVICON}" />
    <script>document.documentElement.classList.add("js");</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;700&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=Martian+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    <link rel="stylesheet" href="/style.css" />
  </head>

  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>

    <div class="grid-bg" id="gridBg" aria-hidden="true">
      <div class="grid-lines"></div>
      <canvas id="gridCanvas"></canvas>
      <div class="grid-glow"></div>
    </div>

    <header class="nav-wrap">
      <nav class="nav glass" id="nav" aria-label="Primary">
        <a class="nav-brand" href="#hero">
          <span class="nav-brand-mark" aria-hidden="true"></span>
          ${esc(first || "")}${rest.length ? `<span class="nav-brand-dot">·</span>${esc(rest.join(" "))}` : ""}
        </a>
        <ul class="nav-links">${desktopNav}</ul>
        ${cv ? `<a class="btn btn-solid nav-cv" href="${esc(cv)}" download="${cvName}"><i class="fa-solid fa-download" aria-hidden="true"></i> CV</a>` : ""}
        <button class="nav-burger" id="navBurger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
          <span></span><span></span>
        </button>
      </nav>
    </header>

    <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
      <nav aria-label="Mobile">
        ${mobileNav}
        ${cv ? `<a class="btn btn-solid" href="${esc(cv)}" download="${cvName}"><i class="fa-solid fa-download" aria-hidden="true"></i> Download CV</a>` : ""}
      </nav>
    </div>

    <main id="main">${hero(h, site)}
${sections}
    </main>

    <footer class="footer">
      <p class="footer-name">${name}</p>
      ${has(site.footerRole) ? `<p class="footer-role">${esc(site.footerRole)}</p>` : ""}
      <p class="mono">© ${new Date().getUTCFullYear()} ${name}. All rights reserved.</p>
    </footer>

    <div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-label="Image preview">
      <button class="lightbox-close" id="lightboxClose" aria-label="Close">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
      <img src="" alt="" id="lightboxImg" />
    </div>

    <script src="/script.js"></script>
  </body>
</html>`;
}
