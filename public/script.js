/* ============================================================
   KIYAS MAHMUD · academic portfolio
   Grid background (parallax + signal pulses), reveals, nav,
   lightbox. No libraries.
   ============================================================ */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ==========================================================
     Grid background
     The CSS draws the grid lines; the canvas draws short amber
     pulses that travel along those same lines. Both share one
     vertical offset so pulses stay locked to the grid while it
     drifts gently with scroll.
     ========================================================== */
  const gridLines = document.querySelector(".grid-lines");
  const canvas = document.getElementById("gridCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const progressBar = document.getElementById("scrollProgress");

  const PARALLAX = 0.18; // grid moves at 18% of scroll speed
  const MAX_PULSES = 6;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let cell = 56;
  let pulses = [];
  let nextPulseAt = 600;
  let lastT = 0;
  let scrollY = window.scrollY;
  let running = true;

  function readCell() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--grid-cell")
      .trim();
    cell = parseFloat(v) || 56;
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    readCell();
    fadeGrad = null;
    if (!ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const gridOffset = () => -scrollY * PARALLAX;

  function spawnPulse() {
    const horizontal = Math.random() < 0.6;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const speed = 70 + Math.random() * 90; // px per second
    const len = cell * (1.5 + Math.random() * 2);
    const off = gridOffset();
    if (horizontal) {
      // pick a visible horizontal line, stored in grid space
      const rows = Math.ceil(H / cell);
      const screenRow = Math.floor(Math.random() * rows);
      const gy = Math.round((screenRow * cell - off) / cell) * cell;
      pulses.push({
        h: true,
        line: gy,
        pos: dir > 0 ? -len : W + len,
        dir,
        speed,
        len,
        end: dir > 0 ? W + len : -len,
      });
    } else {
      const cols = Math.ceil(W / cell);
      const x = Math.floor(Math.random() * cols) * cell;
      const startY = dir > 0 ? -len - off : H + len - off;
      pulses.push({
        h: false,
        line: x,
        pos: startY,
        dir,
        speed,
        len,
        end: dir > 0 ? H + len - off : -len - off,
      });
    }
  }

  function drawPulse(p, off) {
    let x0, y0, x1, y1;
    if (p.h) {
      const y = p.line + off + 0.5;
      x0 = p.pos;
      x1 = p.pos - p.dir * p.len;
      y0 = y1 = y;
    } else {
      const x = p.line + 0.5;
      y0 = p.pos + off;
      y1 = y0 - p.dir * p.len;
      x0 = x1 = x;
    }
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(240, 166, 75, 0.75)");
    g.addColorStop(0.25, "rgba(240, 166, 75, 0.35)");
    g.addColorStop(1, "rgba(240, 166, 75, 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // small square head, like a node on a circuit
    ctx.fillStyle = "rgba(245, 190, 120, 0.9)";
    ctx.fillRect(x0 - 1.5, y0 - 1.5, 3, 3);
  }

  // Pulses stay bright in the margins but fade to a whisper behind the
  // text column, so they never compete with what visitors are reading.
  let fadeGrad = null;
  function fadeContentColumn() {
    if (!fadeGrad) {
      const col = Math.min(1080, W);
      const l = (W - col) / 2 / W;
      const r = 1 - l;
      fadeGrad = ctx.createLinearGradient(0, 0, W, 0);
      fadeGrad.addColorStop(0, "rgba(0,0,0,0)");
      fadeGrad.addColorStop(Math.max(l - 0.04, 0), "rgba(0,0,0,0)");
      fadeGrad.addColorStop(Math.min(l + 0.06, 0.5), "rgba(0,0,0,0.78)");
      fadeGrad.addColorStop(Math.max(r - 0.06, 0.5), "rgba(0,0,0,0.78)");
      fadeGrad.addColorStop(Math.min(r + 0.04, 1), "rgba(0,0,0,0)");
      fadeGrad.addColorStop(1, "rgba(0,0,0,0)");
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    const off = gridOffset();
    if (gridLines) gridLines.style.setProperty("--gy", `${off}px`);

    const docH = document.documentElement.scrollHeight - H;
    const progress = docH > 0 ? Math.min(Math.max(scrollY / docH, 0), 1) : 0;
    progressBar.style.transform = `scaleX(${progress})`;

    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      if (t > nextPulseAt && pulses.length < MAX_PULSES) {
        spawnPulse();
        nextPulseAt = t + 900 + Math.random() * 1800;
      }
      pulses = pulses.filter((p) => {
        p.pos += p.dir * p.speed * dt;
        drawPulse(p, off);
        return p.dir > 0 ? p.pos < p.end : p.pos > p.end;
      });
      if (pulses.length) fadeContentColumn();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener(
    "scroll",
    () => {
      scrollY = window.scrollY;
      if (reducedMotion) {
        const docH = document.documentElement.scrollHeight - H;
        progressBar.style.transform = `scaleX(${docH > 0 ? scrollY / docH : 0})`;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", resize);
  resize();

  if (!reducedMotion) {
    requestAnimationFrame((t) => {
      lastT = t;
      frame(t);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        requestAnimationFrame((t) => {
          lastT = t;
          frame(t);
        });
      }
    });
  }

  /* ==========================================================
     Reveals: one quiet fade per element as it enters view
     ========================================================== */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const groups = new Map();
    revealEls.forEach((el) => {
      const section = el.closest("section") || document.body;
      const n = groups.get(section) || 0;
      el.style.transitionDelay = `${Math.min(n * 50, 250)}ms`;
      groups.set(section, n + 1);
    });

    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealIO.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" }
    );
    revealEls.forEach((el) => revealIO.observe(el));
  }

  /* ==========================================================
     Nav: scrolled state, active link, mobile menu
     ========================================================== */
  const nav = document.getElementById("nav");
  const onScrollNav = () =>
    nav.classList.toggle("is-scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  const navLinks = document.querySelectorAll(".nav-links a");
  const linkFor = new Map();
  navLinks.forEach((a) => linkFor.set(a.getAttribute("href").slice(1), a));
  const activeIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach((a) => a.classList.remove("is-active"));
        const link = linkFor.get(entry.target.id);
        if (link) link.classList.add("is-active");
      }
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  document
    .querySelectorAll("main section[id]")
    .forEach((s) => activeIO.observe(s));

  const burger = document.getElementById("navBurger");
  const mobileMenu = document.getElementById("mobileMenu");

  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("is-locked", open);
  }

  burger.addEventListener("click", () =>
    setMenu(burger.getAttribute("aria-expanded") !== "true")
  );
  mobileMenu
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ==========================================================
     Lightbox
     ========================================================== */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxClose = document.getElementById("lightboxClose");
  let lastTrigger = null;

  function openLightbox(img, trigger) {
    lastTrigger = trigger;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (lastTrigger) lastTrigger.focus();
  }

  document.querySelectorAll("[data-lightbox]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const img = btn.querySelector("img");
      if (img) openLightbox(img, btn);
    });
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (lightbox.classList.contains("is-open")) closeLightbox();
    else if (burger.getAttribute("aria-expanded") === "true") setMenu(false);
  });
})();
