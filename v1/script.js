/* ============================================
   KIYAS MAHMUD — PORTFOLIO SCRIPTS
   Neural network, matrix rain, particles,
   typewriter, carousel, timeline, gallery,
   custom cursor, glitch effects, and more
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ── Initialize AOS ──
    AOS.init({
        duration: 600,
        once: true,
        offset: 80,
    });

    // ============================================
    // CUSTOM CURSOR
    // ============================================
    const cursorRing = document.getElementById('cursorRing');
    const cursorDot = document.getElementById('cursorDot');
    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;

    if (window.innerWidth > 767) {
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorRing.style.left = mouseX + 'px';
            cursorRing.style.top = mouseY + 'px';
        });

        function animateDot() {
            dotX += (mouseX - dotX) * 0.15;
            dotY += (mouseY - dotY) * 0.15;
            cursorDot.style.left = dotX + 'px';
            cursorDot.style.top = dotY + 'px';
            requestAnimationFrame(animateDot);
        }
        animateDot();

        // Hover expansion on interactive elements
        const hoverTargets = document.querySelectorAll('a, button, .chip, .project-card, .masonry-item, .publication-entry, .contact-info-card');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
        });
    }

    // ============================================
    // MOBILE HAMBURGER
    // ============================================
    const hamburger = document.getElementById('hamburger');
    const mobileOverlay = document.getElementById('mobileNavOverlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
        document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // ============================================
    // SMOOTH SCROLL & ACTIVE NAV
    // ============================================
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    function setActiveNav() {
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            if (window.scrollY >= top) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href').slice(1);
            if (href === current) link.classList.add('active');
        });
    }

    window.addEventListener('scroll', setActiveNav);

    // ============================================
    // NAV LOGO GLITCH
    // ============================================
    const navLogo = document.getElementById('navLogo');
    const logoOriginal = 'KM';
    const glitchChars = '!@#$%^&*()_+-=[]{}|;:<>?';

    navLogo.addEventListener('mouseenter', () => {
        let iterations = 0;
        const interval = setInterval(() => {
            navLogo.textContent = logoOriginal.split('').map((char, i) => {
                if (i < iterations) return logoOriginal[i];
                return glitchChars[Math.floor(Math.random() * glitchChars.length)];
            }).join('');
            iterations += 0.5;
            if (iterations >= logoOriginal.length) {
                clearInterval(interval);
                navLogo.innerHTML = logoOriginal + '<span class="cursor-blink">▮</span>';
            }
        }, 30);
    });

    // ============================================
    // HERO TYPEWRITER
    // ============================================
    const heroNameEl = document.getElementById('heroName');
    const nameText = 'KIYAS MAHMUD';
    let charIndex = 0;

    function typeWriter() {
        if (charIndex < nameText.length) {
            heroNameEl.textContent = nameText.slice(0, charIndex + 1);
            heroNameEl.innerHTML += '<span class="typewriter-cursor">▮</span>';
            charIndex++;
            setTimeout(typeWriter, 80);
        } else {
            // Blink cursor 3 times then fade
            let blinks = 0;
            const blinkInterval = setInterval(() => {
                const cursor = heroNameEl.querySelector('.typewriter-cursor');
                if (cursor) {
                    cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
                    blinks++;
                    if (blinks >= 6) {
                        clearInterval(blinkInterval);
                        if (cursor) cursor.style.display = 'none';
                    }
                }
            }, 400);

            // Init Typed.js after name is done
            setTimeout(initTyped, 500);
        }
    }

    setTimeout(typeWriter, 600);

    // ============================================
    // TYPED.JS ROLE TICKER
    // ============================================
    function initTyped() {
        new Typed('#roleTicker', {
            strings: ['ML Researcher', 'AI Engineer', 'Full-Stack Developer', 'Published Author'],
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2500,
            loop: true,
            showCursor: true,
            cursorChar: '▮',
        });
    }

    // ============================================
    // FULL-PAGE ANIMATED BACKGROUND
    // ============================================

    // Neural Network Canvas
    const bgNeuralCanvas = document.getElementById('bgNeuralCanvas');
    const bgNCtx = bgNeuralCanvas.getContext('2d');
    let bgNodes = [];
    let bgRipples = [];

    function resizeBgCanvases() {
        bgNeuralCanvas.width = window.innerWidth;
        bgNeuralCanvas.height = window.innerHeight;
        bgMatrixCanvas.width = window.innerWidth;
        bgMatrixCanvas.height = window.innerHeight;
    }

    function initBgNodes() {
        if (window.innerWidth < 768) { bgNodes = []; return; }
        const count = window.innerWidth < 1200 ? 12 : 20;
        bgNodes = [];
        for (let i = 0; i < count; i++) {
            bgNodes.push({
                x: Math.random() * bgNeuralCanvas.width,
                y: Math.random() * bgNeuralCanvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: 2 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2,
                color: Math.random() < 0.6 ? '#00D9FF' : '#9D00FF',
            });
        }
    }

    function drawBgNeural() {
        if (window.innerWidth < 768) {
            requestAnimationFrame(drawBgNeural);
            return;
        }
        bgNCtx.clearRect(0, 0, bgNeuralCanvas.width, bgNeuralCanvas.height);

        // Draw connections
        for (let i = 0; i < bgNodes.length; i++) {
            for (let j = i + 1; j < bgNodes.length; j++) {
                const dx = bgNodes[i].x - bgNodes[j].x;
                const dy = bgNodes[i].y - bgNodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200) {
                    bgNCtx.beginPath();
                    bgNCtx.moveTo(bgNodes[i].x, bgNodes[i].y);
                    bgNCtx.lineTo(bgNodes[j].x, bgNodes[j].y);
                    bgNCtx.strokeStyle = `rgba(0, 217, 255, ${0.15 * (1 - dist / 200)})`;
                    bgNCtx.lineWidth = 0.5;
                    bgNCtx.stroke();
                }
            }
        }

        // Nodes
        const time = Date.now() / 1000;
        bgNodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;
            if (node.x < 0 || node.x > bgNeuralCanvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > bgNeuralCanvas.height) node.vy *= -1;

            const pulse = 1 + 0.3 * Math.sin(time * 1.5 + node.phase);
            bgNCtx.beginPath();
            bgNCtx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
            bgNCtx.fillStyle = node.color;
            bgNCtx.globalAlpha = 0.5;
            bgNCtx.fill();
            bgNCtx.globalAlpha = 1;

            // Glow
            bgNCtx.beginPath();
            bgNCtx.arc(node.x, node.y, node.radius * pulse * 3, 0, Math.PI * 2);
            const grad = bgNCtx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * pulse * 3);
            grad.addColorStop(0, node.color === '#00D9FF' ? 'rgba(0,217,255,0.08)' : 'rgba(157,0,255,0.08)');
            grad.addColorStop(1, 'transparent');
            bgNCtx.fillStyle = grad;
            bgNCtx.fill();
        });

        // Ripples
        bgRipples = bgRipples.filter(r => r.opacity > 0);
        bgRipples.forEach(r => {
            r.radius += 1;
            r.opacity -= 0.008;
            bgNCtx.beginPath();
            bgNCtx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            bgNCtx.strokeStyle = `rgba(0, 217, 255, ${r.opacity})`;
            bgNCtx.lineWidth = 0.5;
            bgNCtx.stroke();
        });

        requestAnimationFrame(drawBgNeural);
    }

    function bgScheduleRipple() {
        if (bgNodes.length > 0) {
            const node = bgNodes[Math.floor(Math.random() * bgNodes.length)];
            bgRipples.push({ x: node.x, y: node.y, radius: 0, opacity: 0.3 });
        }
        setTimeout(bgScheduleRipple, 4000 + Math.random() * 3000);
    }

    // Matrix Rain Canvas
    const bgMatrixCanvas = document.getElementById('bgMatrixCanvas');
    const bgMCtx = bgMatrixCanvas.getContext('2d');
    let bgMatrixCols = [];
    const bgMatrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';

    function initBgMatrix() {
        if (window.innerWidth < 768) { bgMatrixCols = []; return; }
        const cols = Math.floor(bgMatrixCanvas.width / 20);
        bgMatrixCols = [];
        for (let i = 0; i < cols; i++) {
            bgMatrixCols.push({
                x: i * 20,
                y: Math.random() * bgMatrixCanvas.height,
                speed: 0.2 + Math.random() * 0.4,
            });
        }
    }

    function drawBgMatrix() {
        if (window.innerWidth < 768) {
            requestAnimationFrame(drawBgMatrix);
            return;
        }
        bgMCtx.clearRect(0, 0, bgMatrixCanvas.width, bgMatrixCanvas.height);
        bgMCtx.font = '12px IBM Plex Mono, monospace';
        bgMCtx.fillStyle = 'rgba(57, 255, 20, 0.03)';

        bgMatrixCols.forEach(col => {
            const char = bgMatrixChars[Math.floor(Math.random() * bgMatrixChars.length)];
            bgMCtx.fillText(char, col.x, col.y);
            col.y += 12 * col.speed;
            if (col.y > bgMatrixCanvas.height) {
                col.y = -20 - Math.random() * 100;
            }
        });

        requestAnimationFrame(drawBgMatrix);
    }

    // Floating Particles
    function createBgParticles() {
        const container = document.getElementById('bgParticles');
        if (window.innerWidth < 768) return;
        container.innerHTML = '';
        const count = window.innerWidth < 1200 ? 15 : 30;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.classList.add('bg-particle');
            const size = 1 + Math.random() * 2;
            const duration = 12 + Math.random() * 12;
            const delay = Math.random() * duration;
            const leftPos = Math.random() * 100;
            const color = Math.random() < 0.5 ? '#00D9FF' : '#9D00FF';

            p.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${leftPos}%;
                bottom: -10px;
                background: ${color};
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
                box-shadow: 0 0 ${size * 3}px ${color};
            `;
            container.appendChild(p);
        }
    }

    // Init Background
    resizeBgCanvases();
    initBgNodes();
    initBgMatrix();
    createBgParticles();
    drawBgNeural();
    drawBgMatrix();
    bgScheduleRipple();

    window.addEventListener('resize', () => {
        resizeBgCanvases();
        initBgNodes();
        initBgMatrix();
        createBgParticles();
    });

    // ============================================
    // SKILLS CHIP STAGGER ANIMATION
    // ============================================
    const chips = document.querySelectorAll('.chip');
    const chipObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const parent = entry.target.closest('.skills-chips');
                const allChips = parent.querySelectorAll('.chip');
                allChips.forEach((chip, i) => {
                    setTimeout(() => chip.classList.add('visible'), i * 50);
                });
                chipObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.skills-chips').forEach(group => {
        chipObserver.observe(group);
    });

    // ============================================
    // TIMELINE SVG & SCROLL ANIMATION
    // ============================================
    const timelineSvg = document.getElementById('timelineSvg');
    const timelinePath = document.getElementById('timelinePath');
    const timelineDot = document.getElementById('timelineDot');
    const timelineCards = document.querySelectorAll('.timeline-card');

    function buildTimelinePath() {
        if (window.innerWidth < 768) return;
        const wrapper = document.querySelector('.timeline-wrapper');
        const wrapperHeight = wrapper.scrollHeight;
        const svgWidth = 300;
        const centerX = svgWidth / 2;
        const amplitude = 100;
        const segments = 7;
        const segmentHeight = wrapperHeight / segments;

        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${wrapperHeight}`);
        timelineSvg.style.height = wrapperHeight + 'px';

        let d = `M ${centerX} 0`;
        for (let i = 0; i < segments; i++) {
            const y1 = i * segmentHeight + segmentHeight * 0.33;
            const y2 = i * segmentHeight + segmentHeight * 0.66;
            const yEnd = (i + 1) * segmentHeight;
            const dir = i % 2 === 0 ? 1 : -1;
            d += ` C ${centerX + amplitude * dir} ${y1}, ${centerX + amplitude * dir} ${y2}, ${centerX} ${yEnd}`;
        }

        timelinePath.setAttribute('d', d);
        const pathLength = timelinePath.getTotalLength();
        timelinePath.style.strokeDasharray = pathLength;
        timelinePath.style.strokeDashoffset = pathLength;
    }

    function animateTimeline() {
        if (window.innerWidth < 768) {
            // Mobile: simple observer
            timelineCards.forEach(card => {
                const cardObserver = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            cardObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.2 });
                cardObserver.observe(card);
            });
            return;
        }

        const section = document.querySelector('.timeline-section');
        const pathLength = timelinePath.getTotalLength();

        function onScroll() {
            const rect = section.getBoundingClientRect();
            const sectionTop = rect.top;
            const sectionHeight = rect.height;
            const windowHeight = window.innerHeight;

            // Progress: 0 when section top enters viewport, 1 when section bottom is at 70% viewport
            const scrolledInto = windowHeight - sectionTop;
            const totalScrollNeeded = sectionHeight + windowHeight * 0.3;
            const progress = Math.max(0, Math.min(1, scrolledInto / totalScrollNeeded));
            const drawLength = pathLength * progress;
            timelinePath.style.strokeDashoffset = pathLength - drawLength;

            // Move dot along path
            if (drawLength > 0) {
                try {
                    const point = timelinePath.getPointAtLength(Math.min(drawLength + 20, pathLength));
                    timelineDot.setAttribute('cx', point.x);
                    timelineDot.setAttribute('cy', point.y);
                    timelineDot.style.opacity = 1;
                } catch(e) {}
            }

            // Reveal cards based on scroll
            timelineCards.forEach((card, i) => {
                const cardRect = card.getBoundingClientRect();
                if (cardRect.top < windowHeight * 0.8) {
                    card.classList.add('visible');
                }
            });
        }

        window.addEventListener('scroll', onScroll);
        onScroll();
    }

    buildTimelinePath();
    animateTimeline();

    window.addEventListener('resize', () => {
        buildTimelinePath();
    });

    // ============================================
    // SECTION HEADER GLITCH EFFECT
    // ============================================
    const glitchHeadings = document.querySelectorAll('.glitch-heading');
    const glitchObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                glitchScramble(entry.target);
                glitchObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    glitchHeadings.forEach(h => glitchObserver.observe(h));

    function glitchScramble(el) {
        const original = el.getAttribute('data-text') || el.textContent;
        let iterations = 0;
        const chars = '!@#$%^&*()_+-=[]{}|;:<>?/\\~';
        const interval = setInterval(() => {
            el.textContent = original.split('').map((char, i) => {
                if (char === ' ') return ' ';
                if (i < iterations) return original[i];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            iterations += 1;
            if (iterations >= original.length) {
                clearInterval(interval);
                el.textContent = original;
                // Re-add cursor blink if needed
                if (el.querySelector || original.includes('▮')) {
                    // handled by HTML
                }
            }
        }, 30);
    }

    // ============================================
    // PUBLICATIONS TYPING EFFECT
    // ============================================
    const pubEntries = document.querySelectorAll('.publication-entry');
    const pubObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const titleEl = entry.target.querySelector('.pub-title');
                if (titleEl && !titleEl.dataset.typed) {
                    titleEl.dataset.typed = 'true';
                    const text = titleEl.textContent;
                    titleEl.textContent = '';
                    titleEl.style.borderRight = '2px solid #39FF14';
                    let idx = 0;
                    const typeInterval = setInterval(() => {
                        titleEl.textContent += text[idx];
                        idx++;
                        if (idx >= text.length) {
                            clearInterval(typeInterval);
                            setTimeout(() => { titleEl.style.borderRight = 'none'; }, 1000);
                        }
                    }, 15);
                }
                pubObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    pubEntries.forEach(pub => pubObserver.observe(pub));

    // ============================================
    // CERTIFICATE CAROUSEL
    // ============================================
    const carouselTrack = document.getElementById('carouselTrack');
    const carouselPrev = document.getElementById('carouselPrev');
    const carouselNext = document.getElementById('carouselNext');
    const carouselDotsContainer = document.getElementById('carouselDots');
    const certCards = document.querySelectorAll('.cert-card');
    let currentSlide = 0;
    let cardsPerView = 3;
    let autoSlideInterval;

    function getCardsPerView() {
        if (window.innerWidth < 768) return 1;
        if (window.innerWidth < 1200) return 2;
        return 3;
    }

    function updateCarousel() {
        cardsPerView = getCardsPerView();
        const maxSlide = Math.max(0, certCards.length - cardsPerView);
        if (currentSlide > maxSlide) currentSlide = maxSlide;

        const slidePercent = -(currentSlide * (100 / cardsPerView));
        carouselTrack.style.transform = `translateX(${slidePercent}%)`;

        // Update dots
        carouselDotsContainer.innerHTML = '';
        const totalDots = Math.max(1, certCards.length - cardsPerView + 1);
        for (let i = 0; i < totalDots; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === currentSlide) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentSlide = i;
                updateCarousel();
                resetAutoSlide();
            });
            carouselDotsContainer.appendChild(dot);
        }
    }

    function nextSlide() {
        const maxSlide = Math.max(0, certCards.length - cardsPerView);
        currentSlide = currentSlide >= maxSlide ? 0 : currentSlide + 1;
        updateCarousel();
    }

    function prevSlide() {
        const maxSlide = Math.max(0, certCards.length - cardsPerView);
        currentSlide = currentSlide <= 0 ? maxSlide : currentSlide - 1;
        updateCarousel();
    }

    carouselNext.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
    carouselPrev.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });

    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    // Pause on hover
    const carouselWrapper = document.querySelector('.carousel-wrapper');
    carouselWrapper.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
    carouselWrapper.addEventListener('mouseleave', startAutoSlide);

    updateCarousel();
    startAutoSlide();

    window.addEventListener('resize', updateCarousel);

    // ============================================
    // GALLERY MASONRY WATERFALL REVEAL
    // ============================================
    const masonryItems = document.querySelectorAll('.masonry-item');
    const galleryObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Determine column position for stagger
                const item = entry.target;
                const grid = item.parentElement;
                const gridRect = grid.getBoundingClientRect();
                const itemRect = item.getBoundingClientRect();
                const colWidth = gridRect.width / getGalleryCols();
                const colIndex = Math.floor((itemRect.left - gridRect.left) / colWidth);
                const delay = colIndex * 100;

                setTimeout(() => item.classList.add('visible'), delay);
                galleryObserver.unobserve(item);
            }
        });
    }, { threshold: 0.1 });

    masonryItems.forEach(item => galleryObserver.observe(item));

    function getGalleryCols() {
        if (window.innerWidth < 768) return 2;
        if (window.innerWidth < 1200) return 3;
        return 4;
    }

    // ============================================
    // CONTACT FORM — RADAR PULSE
    // ============================================
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');
    const radarRings = document.getElementById('radarRings');

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Create 3 radar pulse rings
        radarRings.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const ring = document.createElement('div');
            ring.classList.add('radar-ring');
            ring.style.animationDelay = `${i * 200}ms`;
            radarRings.appendChild(ring);
        }

        // Button feedback
        const btnText = submitBtn.querySelector('.btn-text');
        btnText.textContent = '[ SIGNAL SENT ✓ ]';
        submitBtn.style.background = '#39FF14';

        setTimeout(() => {
            btnText.textContent = '[ SEND SIGNAL ]';
            submitBtn.style.background = '';
            radarRings.innerHTML = '';
            contactForm.reset();
        }, 2500);
    });

    // ============================================
    // CONTACT WAVE BACKGROUND
    // ============================================
    const contactWaveSvg = document.getElementById('contactWave');
    function drawContactWave() {
        const w = window.innerWidth;
        const h = 600;
        contactWaveSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        contactWaveSvg.innerHTML = `
            <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#00D9FF" stop-opacity="0.05"/>
                    <stop offset="50%" stop-color="#00D9FF" stop-opacity="0.08"/>
                    <stop offset="100%" stop-color="#00D9FF" stop-opacity="0.05"/>
                </linearGradient>
            </defs>
        `;
        // Animated wave path
        const amplitude = 30;
        let pathD = `M 0 ${h / 2}`;
        for (let x = 0; x <= w; x += 10) {
            const y = h / 2 + Math.sin(x * 0.01) * amplitude;
            pathD += ` L ${x} ${y}`;
        }
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathD);
        pathEl.setAttribute('stroke', 'url(#waveGrad)');
        pathEl.setAttribute('stroke-width', '2');
        pathEl.setAttribute('fill', 'none');
        contactWaveSvg.appendChild(pathEl);

        // Animate wave
        let offset = 0;
        function animateWave() {
            offset += 0.03;
            let d = `M 0 ${h / 2}`;
            for (let x = 0; x <= w; x += 10) {
                const y = h / 2 + Math.sin(x * 0.01 + offset) * amplitude;
                d += ` L ${x} ${y}`;
            }
            pathEl.setAttribute('d', d);
            requestAnimationFrame(animateWave);
        }
        animateWave();
    }
    drawContactWave();

    // ============================================
    // PAGE LOAD STAGGER ANIMATION
    // ============================================
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 400ms ease';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
});
