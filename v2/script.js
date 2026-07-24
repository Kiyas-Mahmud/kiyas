/* ============================================================
   Kiyas Mahmud · Portfolio v2
   Vanilla JS. One rAF loop drives cursor, parallax, and scroll
   effects. Everything heavy is disabled under reduced motion.
   ============================================================ */
(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ----------------------------------------------------------
     Preloader: counter, curtain lift, hero choreography
     ---------------------------------------------------------- */
  const preloader = $("#preloader");
  const preloaderCount = $("#preloaderCount");

  let loadFinished = false;
  const finishLoad = () => {
    if (loadFinished) return;
    loadFinished = true;
    if (preloader) preloader.classList.add("is-done");
    document.body.classList.add("is-loaded");
    document.body.classList.remove("is-locked");
  };

  if (reducedMotion) {
    finishLoad();
  } else {
    document.body.classList.add("is-locked");

    // Hard failsafes: never trap the visitor on the preloader,
    // even if rAF is throttled or assets hang.
    addEventListener("load", () => setTimeout(finishLoad, 1800));
    setTimeout(finishLoad, 3500);

    const start = performance.now();
    const DURATION = 1300;

    const tick = (now) => {
      if (loadFinished) return;
      const t = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      preloaderCount.textContent = String(Math.round(eased * 100)).padStart(2, "0");
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(finishLoad, 200);
      }
    };
    requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------
     Rotating role word
     ---------------------------------------------------------- */
  const roleWord = $("#roleWord");
  const roles = [
    "ML Researcher",
    "AI Engineer",
    "Full-Stack Developer",
    "Published Author",
  ];
  let roleIndex = 0;

  if (roleWord && !reducedMotion) {
    setInterval(() => {
      roleWord.classList.add("is-out");
      setTimeout(() => {
        roleIndex = (roleIndex + 1) % roles.length;
        roleWord.textContent = roles[roleIndex];
        roleWord.classList.remove("is-out");
        roleWord.classList.add("is-enter");
        requestAnimationFrame(() =>
          requestAnimationFrame(() => roleWord.classList.remove("is-enter"))
        );
      }, 560);
    }, 2800);
  }

  /* ----------------------------------------------------------
     Marquee: clone content so the -50% loop is seamless
     ---------------------------------------------------------- */
  const marqueeTrack = $("#marqueeTrack");
  if (marqueeTrack) {
    const original = marqueeTrack.innerHTML;
    marqueeTrack.innerHTML = original + original + original + original;
  }

  /* ----------------------------------------------------------
     Custom cursor (fine pointers only)
     ---------------------------------------------------------- */
  const dot = $("#cursorDot");
  const ring = $("#cursorRing");
  const cursorLabel = $("#cursorLabel");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringPos = { x: mouse.x, y: mouse.y };
  let cursorActive = false;
  let ringHalf = 19;

  if (finePointer && !reducedMotion) {
    addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      updateBlobs();
      if (!cursorActive) {
        cursorActive = true;
        document.body.classList.add("cursor-on");
        ringPos.x = mouse.x;
        ringPos.y = mouse.y;
      }
    });

    const hoverSelector = "a, button, .chip, .masonry-item, input, textarea";
    document.addEventListener("mouseover", (e) => {
      const target = e.target.closest(hoverSelector);
      ring.classList.toggle("is-hover", !!target);
      const labeled = e.target.closest("[data-cursor-label]");
      if (labeled) {
        cursorLabel.textContent = labeled.dataset.cursorLabel;
        ring.classList.add("has-label");
      } else {
        ring.classList.remove("has-label");
      }
      ringHalf = ring.classList.contains("has-label")
        ? 37
        : ring.classList.contains("is-hover")
          ? 28
          : 19;
    });
  }

  /* ----------------------------------------------------------
     Magnetic buttons
     ---------------------------------------------------------- */
  if (finePointer && !reducedMotion) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${relX * 0.25}px, ${relY * 0.25}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------
     Hero photo tilt + glare
     ---------------------------------------------------------- */
  const heroPhoto = $("#heroPhoto");
  if (heroPhoto && finePointer && !reducedMotion) {
    heroPhoto.addEventListener("mousemove", (e) => {
      const rect = heroPhoto.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotX = (0.5 - py) * 10;
      const rotY = (px - 0.5) * 10;
      heroPhoto.style.transform = `rotate(3deg) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      heroPhoto.style.setProperty("--gx", `${px * 100}%`);
      heroPhoto.style.setProperty("--gy", `${py * 100}%`);
    });
    heroPhoto.addEventListener("mouseleave", () => {
      heroPhoto.style.transform = "";
    });
  }

  /* ----------------------------------------------------------
     Spotlight hover on project panels
     ---------------------------------------------------------- */
  if (finePointer) {
    $$(".spotlight").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ----------------------------------------------------------
     Scroll-driven state (nav, progress, to-top, parallax,
     timeline fill). One rAF loop, cheap style writes.
     ---------------------------------------------------------- */
  const nav = $("#nav");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");
  const blobs = $$(".blob");
  const timeline = $("#timeline");
  const timelineFill = $("#timelineFill");
  const tlNodes = $$(".tl-node");

  const updateBlobs = () => {
    if (reducedMotion) return;
    const scrollY = window.scrollY;
    blobs.forEach((blob) => {
      const depth = parseFloat(blob.dataset.depth || "0.06");
      blob.style.translate = `${mouse.x * depth * 0.15 - 30}px ${
        scrollY * depth * -1
      }px`;
    });
  };

  const updateScrollFX = () => {
    const scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - innerHeight;

    if (progress) {
      progress.style.transform = `scaleX(${docH > 0 ? scrollY / docH : 0})`;
    }
    if (nav) nav.classList.toggle("is-scrolled", scrollY > 40);
    if (toTop) toTop.classList.toggle("is-visible", scrollY > 600);

    updateBlobs();

    if (timeline && timelineFill) {
      const rect = timeline.getBoundingClientRect();
      const visible = innerHeight * 0.75;
      const raw = (visible - rect.top) / rect.height;
      const p = Math.max(0, Math.min(1, raw));
      timelineFill.style.setProperty("--line-progress", p.toFixed(3));
      tlNodes.forEach((node) => {
        const item = node.closest(".tl-item");
        const nodeTop = item.offsetTop / timeline.offsetHeight;
        node.classList.toggle("is-lit", nodeTop <= p);
      });
    }
  };

  addEventListener("scroll", updateScrollFX, { passive: true });
  addEventListener("resize", updateScrollFX);
  updateScrollFX();

  /* ----------------------------------------------------------
     Cursor loop: the only perpetual rAF, runs when active
     ---------------------------------------------------------- */
  if (finePointer && !reducedMotion) {
    const frame = () => {
      if (cursorActive) {
        ringPos.x = lerp(ringPos.x, mouse.x, 0.16);
        ringPos.y = lerp(ringPos.y, mouse.y, 0.16);
        dot.style.transform = `translate(${mouse.x - 3.5}px, ${mouse.y - 3.5}px)`;
        ring.style.transform = `translate(${ringPos.x - ringHalf}px, ${ringPos.y - ringHalf}px)`;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reducedMotion) {
    // Stagger siblings that share a parent
    const groups = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      const i = groups.get(parent);
      el.style.setProperty("--d", `${Math.min(i * 0.08, 0.4)}s`);
      groups.set(parent, i + 1);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ----------------------------------------------------------
     Scrollspy
     ---------------------------------------------------------- */
  const navLinks = $$(".nav-link");
  const spyTargets = navLinks
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && spyTargets.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) =>
              link.classList.toggle(
                "is-active",
                link.getAttribute("href") === `#${entry.target.id}`
              )
            );
          }
        });
      },
      { rootMargin: "-38% 0px -55% 0px" }
    );
    spyTargets.forEach((section) => spy.observe(section));
  }

  /* ----------------------------------------------------------
     Mobile menu
     ---------------------------------------------------------- */
  const burger = $("#navBurger");
  const mobileMenu = $("#mobileMenu");

  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("is-locked", open);
  };

  if (burger && mobileMenu) {
    burger.addEventListener("click", () =>
      setMenu(burger.getAttribute("aria-expanded") !== "true")
    );
    $$(".mobile-link, .mobile-cv", mobileMenu).forEach((link) =>
      link.addEventListener("click", () => setMenu(false))
    );
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) {
        setMenu(false);
      }
    });
  }

  /* ----------------------------------------------------------
     Research accordion
     ---------------------------------------------------------- */
  $$(".pub").forEach((pub) => {
    const head = $(".pub-head", pub);
    head.addEventListener("click", () => {
      const isOpen = pub.classList.contains("is-open");
      $$(".pub.is-open").forEach((other) => {
        other.classList.remove("is-open");
        $(".pub-head", other).setAttribute("aria-expanded", "false");
      });
      pub.classList.toggle("is-open", !isOpen);
      head.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  /* ----------------------------------------------------------
     Certificates carousel
     ---------------------------------------------------------- */
  const carousel = $("#certCarousel");
  const dotsWrap = $("#certDots");
  if (carousel && dotsWrap) {
    const cards = $$(".cert", carousel);
    const step = () => {
      const card = cards[0];
      const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
      return card.getBoundingClientRect().width + gap;
    };

    cards.forEach((_, i) => {
      const dotBtn = document.createElement("button");
      dotBtn.setAttribute("role", "tab");
      dotBtn.setAttribute("aria-label", `Go to certificate ${i + 1}`);
      if (i === 0) dotBtn.classList.add("is-active");
      dotBtn.addEventListener("click", () =>
        carousel.scrollTo({ left: i * step(), behavior: reducedMotion ? "auto" : "smooth" })
      );
      dotsWrap.appendChild(dotBtn);
    });

    const syncDots = () => {
      const active = Math.round(carousel.scrollLeft / step());
      $$("button", dotsWrap).forEach((d, i) =>
        d.classList.toggle("is-active", i === Math.min(active, cards.length - 1))
      );
    };
    carousel.addEventListener("scroll", syncDots, { passive: true });

    $("#certPrev").addEventListener("click", () =>
      carousel.scrollBy({ left: -step(), behavior: reducedMotion ? "auto" : "smooth" })
    );
    $("#certNext").addEventListener("click", () =>
      carousel.scrollBy({ left: step(), behavior: reducedMotion ? "auto" : "smooth" })
    );
  }

  /* ----------------------------------------------------------
     Gallery lightbox
     ---------------------------------------------------------- */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxClose = $("#lightboxClose");

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
  };

  if (lightbox) {
    $$(".masonry-item").forEach((item) => {
      item.addEventListener("click", () => {
        const img = $("img", item);
        const caption = $("figcaption", item);
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption ? caption.textContent : "";
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("is-locked");
        lightboxClose.focus();
      });
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
        closeLightbox();
      }
    });
  }

  /* ----------------------------------------------------------
     Contact form: validate, animate, hand off to email client
     ---------------------------------------------------------- */
  const form = $("#contactForm");
  if (form) {
    const submitBtn = $("#submitBtn");
    const submitText = $(".btn-submit-text", submitBtn);
    const note = $("#formNote");
    const originalLabel = submitText.innerHTML;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#fieldName");
      const email = $("#fieldEmail");
      const message = $("#fieldMessage");
      let valid = true;

      [name, email, message].forEach((field) => {
        const bad =
          !field.value.trim() ||
          (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
        field.classList.toggle("is-invalid", bad);
        if (bad) valid = false;
      });

      if (!valid) {
        note.textContent = "Please fill in every field with a valid value.";
        return;
      }

      submitBtn.classList.add("is-sent");
      submitText.innerHTML = 'Message ready <i class="fas fa-check"></i>';
      note.textContent =
        "Opening your email client. You can also write to kiyasmahmud@gmail.com directly.";

      const subject = encodeURIComponent(`Portfolio message from ${name.value.trim()}`);
      const body = encodeURIComponent(
        `${message.value.trim()}\n\n— ${name.value.trim()} (${email.value.trim()})`
      );
      window.location.href = `mailto:kiyasmahmud@gmail.com?subject=${subject}&body=${body}`;

      setTimeout(() => {
        submitBtn.classList.remove("is-sent");
        submitText.innerHTML = originalLabel;
        form.reset();
      }, 4000);
    });

    ["input", "textarea"].forEach((tag) =>
      $$(tag, form).forEach((field) =>
        field.addEventListener("input", () => field.classList.remove("is-invalid"))
      )
    );
  }

  /* ----------------------------------------------------------
     Back to top + footer year
     ---------------------------------------------------------- */
  if (toTop) {
    toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" })
    );
  }

  const yearEl = $("#footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
