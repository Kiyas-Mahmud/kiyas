/* ============================================================
   KIYAS MAHMUD · v3 "DEEP SPACE"
   One rAF loop drives the starfield, parallax, and progress.
   No libraries.
   ============================================================ */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ==========================================================
     Preloader. Double failsafe: a visitor is never trapped,
     even if an asset hangs (regression history: commit 898e7ff).
     ========================================================== */
  const preloader = document.getElementById("preloader");
  const preloaderCount = document.getElementById("preloaderCount");
  let loadFinished = false;

  function finishLoad() {
    if (loadFinished) return;
    loadFinished = true;
    preloader.classList.add("is-done");
    document.body.classList.add("is-loaded");
    document.body.classList.remove("is-locked");
  }

  if (reducedMotion) {
    finishLoad();
  } else {
    document.body.classList.add("is-locked");
    window.addEventListener("load", () => setTimeout(finishLoad, 1200));
    setTimeout(finishLoad, 3500); // unconditional failsafe

    const t0 = performance.now();
    const COUNT_MS = 1100;
    (function tick(now) {
      const p = Math.min((now - t0) / COUNT_MS, 1);
      preloaderCount.textContent = String(Math.round(p * 100)).padStart(2, "0");
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finishLoad, 250);
      }
    })(t0);
  }

  /* ==========================================================
     Starfield canvas
     ========================================================== */
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  const fxCanvas = document.getElementById("fxCanvas");
  const fx = fxCanvas && ctx ? fxCanvas.getContext("2d") : null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let stars = [];
  let shooting = null;
  let nextShootAt = 0;

  if (!ctx) document.documentElement.classList.add("no-canvas");

  function buildStars() {
    const count = Math.min(240, Math.round((W * H) / 6500));
    stars = [];
    for (let i = 0; i < count; i++) {
      const depth = [0.3, 0.6, 1][Math.floor(Math.random() * 3)];
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: depth,
        r: (0.4 + Math.random() * 1.1) * depth,
        base: 0.35 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 1.2,
        hue: Math.random() < 0.12 ? "warm" : Math.random() < 0.2 ? "cool" : "white",
      });
    }
  }

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 768 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (fx) {
      fxCanvas.width = Math.round(W * dpr);
      fxCanvas.height = Math.round(H * dpr);
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    buildStars();
  }

  const STAR_COLORS = {
    white: "233, 235, 245",
    warm: "240, 186, 120",
    cool: "150, 175, 235",
  };

  function drawStars(t, scroll, warp, px, py) {
    ctx.clearRect(0, 0, W, H);
    const drift = t * 0.03 * warp;
    const fall = t * 0.009 * warp;
    for (const s of stars) {
      const x =
        (((s.x + drift * s.z + px * 9 * s.z) % W) + W) % W;
      const y =
        (((s.y - fall * s.z - scroll * 0.06 * s.z + py * 6 * s.z) % H) + H) % H;
      const tw = s.base * (0.55 + 0.45 * Math.sin(t * 0.0016 * s.freq + s.phase));
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${STAR_COLORS[s.hue]}, ${tw})`;
      ctx.fill();
    }

    // Shooting star: rare, quick, quiet.
    if (!shooting && t > nextShootAt) {
      shooting = {
        x: Math.random() * W * 0.7,
        y: Math.random() * H * 0.35,
        vx: 7 + Math.random() * 5,
        vy: 2.5 + Math.random() * 2,
        life: 1,
      };
      nextShootAt = t + 3500 + Math.random() * 5500;
    }
    if (shooting) {
      const sh = shooting;
      ctx.strokeStyle = `rgba(233, 235, 245, ${0.7 * sh.life})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 6, sh.y - sh.vy * 6);
      ctx.stroke();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.02;
      if (sh.life <= 0 || sh.x > W + 80 || sh.y > H + 80) shooting = null;
    }
  }

  /* ==========================================================
     Meteor strikes: falling stars dive into the moon, kick up
     a dust bloom, and leave a fading ember at the impact site.
     Impact points are stored relative to the moon's center so
     the scars ride along with its drift and sway.
     ========================================================== */
  let meteors = [];
  let impacts = [];
  let nextMeteorAt = 2600;

  function moonGeom() {
    const sphere = document.querySelector("#bodyMoon .sphere");
    const r = sphere.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
  }

  function spawnMeteor(g) {
    // aim at a random point on the visible (left-facing) hemisphere
    const ang = (100 + Math.random() * 150) * (Math.PI / 180);
    const dist = g.r * (0.12 + Math.random() * 0.5);
    const offset = { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist };
    const fromLeft = Math.random() < 0.7;
    meteors.push({
      x: fromLeft ? -100 - Math.random() * 140 : Math.random() * W * 0.5,
      y: fromLeft ? Math.random() * H * 0.35 : -100,
      offset,
      speed: 11 + Math.random() * 6,
      trail: [],
    });
  }

  function updateFx(t) {
    if (!fx) return;
    fx.clearRect(0, 0, W, H);
    const sceneMoon = document.body.dataset.scene === "moon";
    if (sceneMoon && t > nextMeteorAt && meteors.length < 3) {
      const g0 = moonGeom();
      if (g0.r > 40) spawnMeteor(g0);
      nextMeteorAt = t + 2600 + Math.random() * 4000;
    }
    if (meteors.length === 0 && impacts.length === 0) return;
    const g = moonGeom();

    meteors = meteors.filter((mt) => {
      const tx = g.cx + mt.offset.x;
      const ty = g.cy + mt.offset.y;
      const dx = tx - mt.x;
      const dy = ty - mt.y;
      const d = Math.hypot(dx, dy);
      if (d < mt.speed) {
        // touchdown: dust fans back out along the approach direction
        const back = Math.atan2(dy, dx) + Math.PI;
        impacts.push({
          offset: mt.offset,
          t0: t,
          parts: Array.from({ length: 24 }, () => ({
            a: back + (Math.random() - 0.5) * 2.7,
            sp: 0.4 + Math.random() * 2.4,
            life: 1050 + Math.random() * 850,
            size: 1.2 + Math.random() * 3,
            warm: Math.random() < 0.35,
          })),
        });
        if (impacts.length > 6) impacts.shift();
        return false;
      }
      mt.x += (dx / d) * mt.speed;
      mt.y += (dy / d) * mt.speed;
      mt.trail.unshift({ x: mt.x, y: mt.y });
      if (mt.trail.length > 14) mt.trail.pop();
      for (let i = 0; i < mt.trail.length - 1; i++) {
        const p = mt.trail[i];
        const a = 0.95 * (1 - i / mt.trail.length);
        fx.strokeStyle = `rgba(255, 226, 178, ${a})`;
        fx.lineWidth = Math.max(0.8, 3.4 * (1 - i / mt.trail.length));
        fx.beginPath();
        fx.moveTo(p.x, p.y);
        fx.lineTo(mt.trail[i + 1].x, mt.trail[i + 1].y);
        fx.stroke();
      }
      const hg = fx.createRadialGradient(mt.x, mt.y, 0, mt.x, mt.y, 10);
      hg.addColorStop(0, "rgba(255, 246, 228, 0.95)");
      hg.addColorStop(0.35, "rgba(255, 226, 178, 0.5)");
      hg.addColorStop(1, "rgba(255, 226, 178, 0)");
      fx.fillStyle = hg;
      fx.beginPath();
      fx.arc(mt.x, mt.y, 10, 0, Math.PI * 2);
      fx.fill();
      return true;
    });

    impacts = impacts.filter((im) => {
      const age = t - im.t0;
      if (age > 4600) return false;
      const ix = g.cx + im.offset.x;
      const iy = g.cy + im.offset.y;
      if (age < 320) {
        const a = 0.9 * (1 - age / 320);
        const rad = (8 + age * 0.12) * 3;
        const grad = fx.createRadialGradient(ix, iy, 0, ix, iy, rad);
        grad.addColorStop(0, `rgba(255, 240, 214, ${a})`);
        grad.addColorStop(1, "rgba(255, 240, 214, 0)");
        fx.fillStyle = grad;
        fx.beginPath();
        fx.arc(ix, iy, rad, 0, Math.PI * 2);
        fx.fill();
      }
      if (age < 900) {
        const p = age / 900;
        fx.strokeStyle = `rgba(240, 214, 170, ${0.5 * (1 - p)})`;
        fx.lineWidth = 1.4;
        fx.beginPath();
        fx.arc(ix, iy, 4 + p * g.r * 0.3, 0, Math.PI * 2);
        fx.stroke();
      }
      for (const pt of im.parts) {
        const p = age / pt.life;
        if (p >= 1) continue;
        const reach = pt.sp * age * 0.055;
        const px2 = ix + Math.cos(pt.a) * reach;
        const py2 = iy + Math.sin(pt.a) * reach - age * 0.008;
        const a = 0.8 * (1 - p);
        fx.fillStyle = pt.warm
          ? `rgba(244, 204, 152, ${a})`
          : `rgba(222, 218, 208, ${a})`;
        fx.beginPath();
        fx.arc(px2, py2, pt.size * (1 + p * 1.6), 0, Math.PI * 2);
        fx.fill();
      }
      const ea = age < 600 ? 0.7 : 0.7 * (1 - (age - 600) / 4000);
      if (ea > 0) {
        const eg = fx.createRadialGradient(ix, iy, 0, ix, iy, 14);
        eg.addColorStop(0, `rgba(255, 196, 128, ${ea})`);
        eg.addColorStop(1, "rgba(255, 196, 128, 0)");
        fx.fillStyle = eg;
        fx.beginPath();
        fx.arc(ix, iy, 14, 0, Math.PI * 2);
        fx.fill();
      }
      return true;
    });
  }

  /* ==========================================================
     Scroll engine: lerped scroll + pointer parallax feed the
     starfield, celestial bodies, and progress bar.
     ========================================================== */
  const progressBar = document.getElementById("scrollProgress");
  const bodyMoon = document.getElementById("bodyMoon");
  const bodyNeptune = document.getElementById("bodyNeptune");
  const bodyBlackhole = document.getElementById("bodyBlackhole");

  const bodies = [
    { el: bodyMoon, depth: 0.2, anchorSel: "#hero", anchor: 0, sway: 0 },
    { el: bodyNeptune, depth: 0.13, anchorSel: "#experience", anchor: 0, sway: 2 },
    { el: bodyBlackhole, depth: 0.11, anchorSel: "#research", anchor: 0, sway: 4 },
  ];

  function measureAnchors() {
    for (const b of bodies) {
      const sec = document.querySelector(b.anchorSel);
      b.anchor = sec ? sec.offsetTop : 0;
    }
  }

  let scrollTarget = window.scrollY;
  let scrollCurrent = scrollTarget;
  let pxTarget = 0;
  let pyTarget = 0;
  let px = 0;
  let py = 0;
  let running = true;

  window.addEventListener("scroll", () => {
    scrollTarget = window.scrollY;
  }, { passive: true });

  if (finePointer && !reducedMotion) {
    window.addEventListener("pointermove", (e) => {
      pxTarget = (e.clientX / W - 0.5) * 2;
      pyTarget = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function frame(t) {
    if (!running) return;
    scrollCurrent += (scrollTarget - scrollCurrent) * 0.08;
    px += (pxTarget - px) * 0.05;
    py += (pyTarget - py) * 0.05;

    const docH = document.documentElement.scrollHeight - H;
    const progress = docH > 0 ? clamp(scrollCurrent / docH, 0, 1) : 0;
    progressBar.style.transform = `scaleX(${progress})`;

    const inBlackhole = document.body.dataset.scene === "blackhole";
    const warp = (1 + progress * progress * 0.9) * (inBlackhole ? 1.4 : 1);

    if (ctx && !reducedMotion) {
      drawStars(t, scrollCurrent, warp, px, py);
      updateFx(t);
    }

    if (!reducedMotion) {
      for (const b of bodies) {
        const drift = clamp((scrollCurrent - b.anchor) * b.depth, -420, 420);
        const swayX = Math.sin(t * 0.00042 + b.sway) * 18 + px * 24;
        const swayY = Math.cos(t * 0.00034 + b.sway) * 14 + py * 18;
        b.el.style.transform = `translate3d(${swayX}px, ${-drift + swayY}px, 0)`;
      }
    }

    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  });

  if (ctx) {
    resizeCanvas();
    window.addEventListener("resize", () => {
      resizeCanvas();
      measureAnchors();
    });
  }
  measureAnchors();
  window.addEventListener("load", measureAnchors);
  requestAnimationFrame(frame);

  // Static single paint for reduced-motion visitors: stars, no drift.
  if (ctx && reducedMotion) {
    resizeCanvas();
    drawStars(0, 0, 1, 0, 0);
  }

  /* ==========================================================
     Scene switching (which celestial body is on stage)
     ========================================================== */
  const sceneSections = document.querySelectorAll("[data-scene]");
  const sceneIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          document.body.dataset.scene = entry.target.dataset.scene;
        }
      }
    },
    { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
  );
  sceneSections.forEach((s) => {
    if (s.tagName === "SECTION") sceneIO.observe(s);
  });

  /* ==========================================================
     3D reveals
     ========================================================== */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reducedMotion) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    // Stagger siblings within the same parent section.
    const groups = new Map();
    revealEls.forEach((el) => {
      const section = el.closest("section") || document.body;
      const n = groups.get(section) || 0;
      el.style.transitionDelay = `${Math.min(n * 70, 420)}ms`;
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
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" }
    );
    revealEls.forEach((el) => revealIO.observe(el));
  }

  /* ==========================================================
     Role rotator
     ========================================================== */
  const roleWord = document.getElementById("roleWord");
  const ROLES = [
    "ML Researcher",
    "AI Engineer",
    "Full-Stack Developer",
    "Published Author",
  ];
  if (!reducedMotion && roleWord) {
    let roleIdx = 0;
    setInterval(() => {
      roleIdx = (roleIdx + 1) % ROLES.length;
      roleWord.textContent = ROLES[roleIdx];
      roleWord.classList.remove("is-swapping");
      void roleWord.offsetWidth; // restart animation
      roleWord.classList.add("is-swapping");
    }, 3000);
  }

  /* ==========================================================
     Nav: scrolled state, active link, mobile menu
     ========================================================== */
  const nav = document.getElementById("nav");
  window.addEventListener(
    "scroll",
    () => nav.classList.toggle("is-scrolled", window.scrollY > 40),
    { passive: true }
  );

  const navLinks = document.querySelectorAll(".nav-links a");
  const linkFor = new Map();
  navLinks.forEach((a) => linkFor.set(a.getAttribute("href").slice(1), a));
  const activeIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && linkFor.has(entry.target.id)) {
          navLinks.forEach((a) => a.classList.remove("is-active"));
          linkFor.get(entry.target.id).classList.add("is-active");
        }
      }
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
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
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => setMenu(false))
  );

  /* ==========================================================
     Magnetic buttons + specular sheen + tilt (fine pointer only)
     ========================================================== */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });

    document.querySelectorAll(".proj").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });

    document.querySelectorAll("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        if (!el.classList.contains("is-in")) return;
        const r = el.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

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
    if (e.key === "Escape") {
      if (lightbox.classList.contains("is-open")) closeLightbox();
      else if (burger.getAttribute("aria-expanded") === "true") setMenu(false);
    }
  });
})();
