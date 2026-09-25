// ===================== CUSTOM SMOOTH MOMENTUM SCROLL ENGINE =====================
let targetY = window.scrollY;
let currentY = window.scrollY;
let isScrollActive = false;

const getMaxScroll = () => {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
};

const checkIsServicesPage = () => {
    return !document.body.classList.contains('home');
};

const isModalActive = () => {
    return !!(
        document.querySelector('.project-modal.active') ||
        document.querySelector('.premium-modal.active') ||
        document.querySelector('.marble-modal.active') ||
        document.querySelector('.modal.active') ||
        document.querySelector('#pm-lightbox.active')
    );
};

// Keep virtual scroll targets in sync when native scrolling occurs (anchor clicks, scrollbar drag)
window.addEventListener('scroll', () => {
    if (!isScrollActive || isModalActive()) {
        targetY = window.scrollY;
        currentY = window.scrollY;
    }
}, { passive: true });

// Dynamic section-by-section scroll configuration matching user specifications:
// - Section 1: Smooth Rapide
// - Section Projets: Smooth Lent
// - Section en haut de Nos Services: Smooth Rapide
// - Section Nos Services: Smooth Rapide mais amorti à l'arrivée
// - Section Nos Marbres: Smooth Lent
// - Section CTA et FAQ: Smooth Lent
const getSectionScrollConfig = (yPos) => {
    const processTop = cachedMetrics.process.top || 800;
    const processEnd = processTop + (cachedMetrics.process.height || 2000);

    const servicesTop = cachedMetrics.servicesTop || (processEnd + 1000);
    const servicesEnd = servicesTop + (cachedMetrics.servicesHeight || 2000);

    const galleryTop = cachedMetrics.gallery.top || (servicesEnd + 500);
    const galleryEnd = galleryTop + (cachedMetrics.gallery.height || 2000);

    // 1. Section 1 (Hero & Intro): Smooth Rapide
    if (yPos < processTop - 150) {
        return { multiplier: 1.4, lerp: 0.12 };
    }
    // 2. Section Projets: Smooth Fluide
    if (yPos >= processTop - 150 && yPos < processEnd - 150) {
        return { multiplier: 1.1, lerp: 0.11 };
    }
    // 3. Section en haut de Nos Services: Smooth Rapide
    if (yPos >= processEnd - 150 && yPos < servicesTop - 150) {
        return { multiplier: 1.4, lerp: 0.12 };
    }
    // 4. Section Nos Services: Smooth Fluide
    if (yPos >= servicesTop - 150 && yPos < servicesEnd - 100) {
        return { multiplier: 1.2, lerp: 0.11 };
    }
    // 5. Section Nos Marbres: Smooth Fluide
    if (yPos >= galleryTop - 150 && yPos < galleryEnd - 100) {
        return { multiplier: 1.1, lerp: 0.10 };
    }
    // 6. Section CTA & FAQ: Smooth Fluide
    return { multiplier: 1.1, lerp: 0.10 };
};

// Intercept wheel events for controlled section-customized momentum scroll with hard velocity cap
window.addEventListener('wheel', (e) => {
    if (checkIsServicesPage() || isModalActive()) return;

    e.preventDefault();
    isScrollActive = true;

    const maxScroll = getMaxScroll();
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 35;
    if (e.deltaMode === 2) delta *= window.innerHeight;

    // Hard Scroll Speed Limit: clamp maximum single stroke wheel delta
    const MAX_WHEEL_DELTA = 220;
    const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta), MAX_WHEEL_DELTA);

    const config = getSectionScrollConfig(targetY);
    targetY += clampedDelta * config.multiplier;

    // Strict boundary clamping to prevent overscroll bounce
    targetY = Math.max(0, Math.min(maxScroll, targetY));
}, { passive: false });

// Touch momentum scroll support
let touchStartY = 0;
window.addEventListener('touchstart', (e) => {
    if (checkIsServicesPage() || isModalActive()) return;
    if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        isScrollActive = true;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (checkIsServicesPage() || isModalActive()) return;
    if (e.touches.length === 1) {
        const touchY = e.touches[0].clientY;
        const delta = touchStartY - touchY;
        touchStartY = touchY;

        const maxScroll = getMaxScroll();
        targetY += delta * 1.5;
        targetY = Math.max(0, Math.min(maxScroll, targetY));
    }
}, { passive: true });

const isServicesPage = checkIsServicesPage();

const isIndexPage = document.body.classList.contains('home') || document.getElementById('video-wrapper') !== null;

const renderLoop = () => {
    if (checkIsServicesPage()) return;

    if (isModalActive()) {
        isScrollActive = false;
        targetY = window.scrollY;
        currentY = window.scrollY;
    } else if (isScrollActive) {
        const config = getSectionScrollConfig(currentY);
        const diff = targetY - currentY;
        if (Math.abs(diff) > 0.1) {
            currentY += diff * config.lerp;
            window.scrollTo(0, currentY);
        } else {
            currentY = targetY;
            window.scrollTo(0, currentY);
            isScrollActive = false;
        }
    } else {
        currentY = window.scrollY;
        targetY = window.scrollY;
    }

    handleLogoTransition(currentY);

    if (isIndexPage) {
        handleSequencedScroll(currentY);
        handleProcessScroll(currentY);
        handleImageGrayscale(currentY);
        handleGalleryScroll(currentY);
    }

    if (currentY > 50) {
        mainHeader?.classList.add('scrolled');
    } else {
        mainHeader?.classList.remove('scrolled');
    }

    requestAnimationFrame(renderLoop);
};

if (!checkIsServicesPage()) {
    requestAnimationFrame(renderLoop);
} else {
    window.addEventListener('scroll', () => {
        const scY = window.scrollY;
        if (scY > 50) {
            mainHeader?.classList.add('scrolled');
        } else {
            mainHeader?.classList.remove('scrolled');
        }
    }, { passive: true });
}

// DOM Elements
const mainHeader = document.querySelector('#main-header');
const videoWrapper = document.getElementById('video-wrapper');
const topTitle = document.querySelector('.top-title');
const navMinimalLogo = document.querySelector('.nav-minimal-logo');

// Caching elements for performance
let architectTextSpans = null;
let maskLayer = null;
let heroVideo = null;
let videoBlur = null;
let gallerySection = null;
let galleryTrack = null;
let galleryBg = null;
let marbreHeader = null;
let faqItems = null;
let processContainer = null;
let processSteps = null;

// Initial Load / Reveal Logic
window.addEventListener('load', () => {
    // Cache elements once
    architectTextSpans = document.querySelectorAll('#architect-bg-text span');
    maskLayer = document.getElementById('image-mask-layer');
    heroVideo = document.getElementById('hero-video');
    videoBlur = document.getElementById('video-white-blur');
    gallerySection = document.querySelector('.horizontal-gallery-section');
    galleryTrack = document.getElementById('gallery-track');
    galleryBg = document.getElementById('gallery-bg');
    marbreHeader = document.getElementById('marbre-gallery-header');
    faqItems = document.querySelectorAll('.faq-item');
    processContainer = document.getElementById('process-container');
    processSteps = document.querySelectorAll('.process-step');
    // Promote to GPU layer immediately to prevent expensive repaint on scroll
    if (processContainer) processContainer.style.willChange = 'transform';

    updateCachedMetrics();

    targetScrollY = window.scrollY;
    currentScrollY = window.scrollY;

    initFaq();

    // GSAP ScrollTrigger Text Reveal - Synchronized 1:1 with scroll to complete before next section
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
        const revealTextSpans = document.querySelectorAll('.reveal-text span');
        if (revealTextSpans.length > 0) {
            gsap.to(revealTextSpans, {
                opacity: 1,
                stagger: 0.1,
                scrollTrigger: {
                    trigger: '.text-reveal-section',
                    start: "top top",
                    end: "bottom 50%",
                    scrub: 1, // 1:1 scroll synchronization
                }
            });
        }

        // Section 05 (FAQ) Reveal Animation
        const faqHeader = document.querySelector('.faq-section .section-title-wrapper');
        if (faqHeader) {
            gsap.fromTo(faqHeader,
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.faq-section',
                        start: "top 80%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }

        const faqItems = document.querySelectorAll('.faq-item');
        if (faqItems.length > 0) {
            gsap.fromTo(faqItems,
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.faq-container-wrapper',
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }

        // Section 06 (Contact CTA) Reveal Animation
        const contactHeader = document.querySelector('.contact-section .section-title-wrapper');
        const contactInfo = document.querySelector('.contact-info-minimal');
        const contactForm = document.querySelector('.contact-form-container');

        if (contactHeader) {
            gsap.fromTo(contactHeader,
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.contact-section',
                        start: "top 80%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }

        if (contactInfo && contactForm) {
            gsap.fromTo([contactInfo, contactForm],
                { opacity: 0, y: 35 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    stagger: 0.2,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.contact-centered-wrapper',
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        }
    }
});

// ===================== INSTANT PRELOADER INITIALIZATION =====================
const initPreloader = () => {
    const preloader = document.getElementById('new-preloader');
    const startBtn = document.getElementById('start-btn');
    const barEl = document.getElementById('preloader-bar');
    const percentEl = document.getElementById('preloader-percent');
    const statusEl = document.getElementById('preloader-status');

    if (!preloader) return;

    const PRELOADER_KEY = 'artech_preloader_last_shown';
    const PRELOADER_COOLDOWN = 24 * 60 * 60 * 1000;

    const shouldShowPreloader = () => {
        try {
            const last = localStorage.getItem(PRELOADER_KEY);
            if (!last) return true;
            return (Date.now() - parseInt(last, 10)) >= PRELOADER_COOLDOWN;
        } catch (e) {
            return true;
        }
    };

    const markPreloaderShown = () => {
        try {
            localStorage.setItem(PRELOADER_KEY, String(Date.now()));
        } catch (e) { }
    };

    const dismissPreloader = () => {
        preloader.classList.add('active');
        document.body.classList.remove('is-loading');
        document.body.classList.add('loaded');
        markPreloaderShown();

        const heroVideo = document.getElementById('hero-video');
        if (heroVideo) heroVideo.play().catch(() => { });

        setTimeout(() => {
            preloader.classList.remove('active');
            preloader.style.display = 'none';
        }, 1500);
    };

    const showConnectionError = () => {
        if (!preloader || !startBtn) return;
        if (barEl) barEl.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (statusEl) statusEl.classList.add('is-visible');
        startBtn.classList.add('is-visible');
        const topText = startBtn.querySelector('.start-text-top');
        const bottomText = startBtn.querySelector('.start-text-bottom');
        if (topText) topText.textContent = 'CONTINUER';
        if (bottomText) bottomText.textContent = 'CONTINUER';
    };

    const waitForVideo = () => {
        return new Promise((resolve) => {
            const heroVideo = document.getElementById('hero-video');
            if (!heroVideo) {
                resolve();
                return;
            }

            if (heroVideo.readyState >= 3) {
                resolve();
                return;
            }

            const onCanPlay = () => {
                cleanup();
                resolve();
            };

            const onError = () => {
                cleanup();
                resolve();
            };

            const cleanup = () => {
                heroVideo.removeEventListener('canplaythrough', onCanPlay);
                heroVideo.removeEventListener('error', onError);
                heroVideo.removeEventListener('loadeddata', onCanPlay);
            };

            heroVideo.addEventListener('canplaythrough', onCanPlay, { once: true });
            heroVideo.addEventListener('loadeddata', onCanPlay, { once: true });
            heroVideo.addEventListener('error', onError, { once: true });
        });
    };

    if (!shouldShowPreloader()) {
        preloader.style.display = 'none';
        preloader.classList.remove('active');
        document.body.classList.remove('is-loading');
        document.body.classList.add('loaded');
    } else if (barEl) {
        preloader.style.display = '';
        preloader.classList.remove('active');
        document.body.classList.add('is-loading');
        document.body.classList.remove('loaded');

        const TIMEOUT_MS = 12000;

        let resolved = false;
        let timeoutId = null;
        let progressFrame = null;

        const setProgress = (progress) => {
            const p = Math.max(0, Math.min(100, progress));
            if (barEl) barEl.style.width = p + '%';
            if (percentEl) percentEl.textContent = Math.floor(p) + '%';
        };

        const getVideoLoadProgress = () => {
            const heroVideo = document.getElementById('hero-video');
            if (!heroVideo || !heroVideo.duration || !isFinite(heroVideo.duration)) return null;

            try {
                if (heroVideo.buffered && heroVideo.buffered.length > 0) {
                    const bufferedEnd = heroVideo.buffered.end(heroVideo.buffered.length - 1);
                    return (bufferedEnd / heroVideo.duration) * 100;
                }
            } catch (e) { }

            return null;
        };

        const showConnectionError = () => {
            setProgress(100);
            if (statusEl) statusEl.classList.add('is-visible');
            if (startBtn) startBtn.classList.add('is-visible');
        };

        const onVideoProgress = () => {
            if (resolved) return;
            const p = getVideoLoadProgress();
            if (p !== null) {
                setProgress(p);
                if (p >= 100) {
                    resolved = true;
                    if (timeoutId) clearTimeout(timeoutId);
                    if (progressFrame) cancelAnimationFrame(progressFrame);
                    dismissPreloader();
                }
            }
        };

        const animateProgress = () => {
            if (resolved) return;
            const p = getVideoLoadProgress();
            if (p !== null) {
                setProgress(p);
                if (p >= 100) {
                    resolved = true;
                    if (timeoutId) clearTimeout(timeoutId);
                    dismissPreloader();
                    return;
                }
            }
            progressFrame = requestAnimationFrame(animateProgress);
        };

        const heroVideo = document.getElementById('hero-video');
        if (heroVideo) {
            heroVideo.addEventListener('progress', onVideoProgress);
        }

        progressFrame = requestAnimationFrame(animateProgress);

        timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            if (progressFrame) cancelAnimationFrame(progressFrame);
            showConnectionError();
        }, TIMEOUT_MS);

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (resolved) return;
                resolved = true;
                if (timeoutId) clearTimeout(timeoutId);
                if (progressFrame) cancelAnimationFrame(progressFrame);
                dismissPreloader();
            }, { once: true });
        }

        waitForVideo().then(() => {
            if (resolved) return;
            resolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (progressFrame) cancelAnimationFrame(progressFrame);
            setProgress(100);
            dismissPreloader();
        });
    }
};

// Start preloader IMMEDIATELY without waiting for window load event!
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloader);
} else {
    initPreloader();
}

// ===================== SERVICES SECTION BLUR ON "VOIR PLUS" REVEAL =====================
const initServicesBlur = () => {
    const servicesSection = document.querySelector('.services-section');
    const voirPlusWrapper = document.querySelector('.services-voir-plus-wrapper');

    if (!servicesSection || !voirPlusWrapper) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    servicesSection.classList.add('is-blurred');
                } else {
                    servicesSection.classList.remove('is-blurred');
                }
            });
        },
        {
            root: null,
            threshold: 0.15,
            rootMargin: '0px 0px -10% 0px'
        }
    );

    observer.observe(voirPlusWrapper);
};

const initVoirPlusSplitText = () => {
    const topEl = document.querySelector('.voir-plus-text-top');
    const bottomEl = document.querySelector('.voir-plus-text-bottom');
    if (!topEl || !bottomEl) return;

    const splitLetters = (el, stagger = false) => {
        const text = el.textContent || '';
        el.innerHTML = '';
        text.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'letter';
            span.textContent = char === ' ' ? '\u00A0' : char;
            if (stagger) {
                span.style.transitionDelay = `${i * 35}ms`;
            }
            el.appendChild(span);
        });
    };

    splitLetters(topEl, false);
    splitLetters(bottomEl, true);
};

const initNavSplitText = () => {
    const navLinks = document.querySelectorAll('.nav-links a[data-nav-text]');
    navLinks.forEach((link) => {
        const text = link.getAttribute('data-nav-text') || '';
        link.innerHTML = `
            <span class="nav-text-wrap" aria-label="${text}">
                <span class="nav-text-top" aria-hidden="true">${text}</span>
                <span class="nav-text-bottom" aria-hidden="true">${text}</span>
            </span>
        `;

        const topEl = link.querySelector('.nav-text-top');
        const bottomEl = link.querySelector('.nav-text-bottom');
        if (!topEl || !bottomEl) return;

        const splitLetters = (el, stagger = false) => {
            const txt = el.textContent || '';
            el.innerHTML = '';
            txt.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.className = 'letter';
                span.textContent = char === ' ' ? '\u00A0' : char;
                if (stagger) {
                    span.style.transitionDelay = `${i * 30}ms`;
                }
                el.appendChild(span);
            });
        };

        splitLetters(topEl, false);
        splitLetters(bottomEl, true);
    });
};

const initStartBtnSplitText = () => {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return;

    const topEl = startBtn.querySelector('.start-text-top');
    const bottomEl = startBtn.querySelector('.start-text-bottom');
    if (!topEl || !bottomEl) return;

    const splitLetters = (el, stagger = false) => {
        const txt = el.textContent || '';
        el.innerHTML = '';
        txt.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'letter';
            span.textContent = char === ' ' ? '\u00A0' : char;
            if (stagger) {
                span.style.transitionDelay = `${i * 30}ms`;
            }
            el.appendChild(span);
        });
    };

    splitLetters(topEl, false);
    splitLetters(bottomEl, true);
};

const initStatsSplitText = () => {
    const statNums = document.querySelectorAll('.stat-num');
    if (!statNums.length) return;

    const splitLetters = (el, stagger = false) => {
        const txt = el.textContent || '';
        el.innerHTML = '';
        txt.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.className = 'letter';
            span.textContent = char === ' ' ? '\u00A0' : char;
            if (stagger) {
                span.style.transitionDelay = `${i * 40}ms`;
            }
            el.appendChild(span);
        });
    };

    statNums.forEach((numEl) => {
        const topEl = numEl.querySelector('.stat-text-top');
        const bottomEl = numEl.querySelector('.stat-text-bottom');
        if (!topEl || !bottomEl) return;

        splitLetters(topEl, false);
        splitLetters(bottomEl, true);
    });

    const introStat = document.querySelector('.intro-stat');
    if (!introStat) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    introStat.classList.add('is-animated');
                } else {
                    introStat.classList.remove('is-animated');
                }
            });
        },
        {
            root: null,
            threshold: 0.4,
            rootMargin: '0px 0px -10% 0px'
        }
    );

    observer.observe(introStat);
};

window.addEventListener('load', () => {
    initServicesBlur();
    initVoirPlusSplitText();
    initNavSplitText();
    initStartBtnSplitText();
    initStatsSplitText();
});

// Helper to compute absolute document top offset regardless of parent positioning
const getElementDocTop = (el) => {
    let top = 0;
    while (el) {
        top += el.offsetTop;
        el = el.offsetParent;
    }
    return top;
};

// ===================== PERFORMANCE OPTIMIZATION (CACHE METRICS) =====================
const cachedMetrics = {
    windowHeight: 0,
    windowWidth: 0,
    process: { top: 0, height: 0, scrollWidth: 0 },
    image: { top: 0, height: 0 },
    gallery: { top: 0, height: 0, scrollWidth: 0 },
    docHeight: 0
};

const updateCachedMetrics = () => {
    cachedMetrics.windowHeight = window.innerHeight;
    cachedMetrics.windowWidth = window.innerWidth;
    cachedMetrics.docHeight = document.documentElement.scrollHeight;

    const processTrack = document.getElementById('process-track');
    const processContainer = document.getElementById('process-container');
    if (processTrack && processContainer) {
        cachedMetrics.process.top = getElementDocTop(processTrack);
        cachedMetrics.process.height = processTrack.offsetHeight;
        cachedMetrics.process.scrollWidth = processContainer.scrollWidth;
    }

    const imageSection = document.querySelector('.simple-image-section');
    if (imageSection) {
        cachedMetrics.image.top = getElementDocTop(imageSection);
        cachedMetrics.image.height = imageSection.offsetHeight;
    }

    if (gallerySection && galleryTrack) {
        cachedMetrics.gallery.top = getElementDocTop(gallerySection);
        cachedMetrics.gallery.height = gallerySection.offsetHeight;
        cachedMetrics.gallery.scrollWidth = galleryTrack.scrollWidth;
        if (galleryBg) {
            cachedMetrics.gallery.bgMoveDistance = galleryBg.offsetWidth - cachedMetrics.windowWidth;
        } else {
            cachedMetrics.gallery.bgMoveDistance = 0;
        }
    }
};

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        updateCachedMetrics();
    }, 150);
});

// Recalculate metrics on full page load and as images load
window.addEventListener('load', () => {
    updateCachedMetrics();
});

document.querySelectorAll('img').forEach(img => {
    if (img.complete) return;
    img.addEventListener('load', () => {
        updateCachedMetrics();
    });
});



// ===================== LOGIC FUNCTIONS =====================

// Logo Transition Logic
const handleLogoTransition = (scrollPos) => {
    const stage1End = 150;
    let stage1Progress = scrollPos / stage1End;
    stage1Progress = Math.max(0, Math.min(1, stage1Progress));

    if (topTitle && navMinimalLogo) {
        const travelDistance = -120 * stage1Progress;
        const scaleValue = 1 - (stage1Progress * 0.7);
        const opacityValueBig = 1 - Math.pow(stage1Progress, 2);

        topTitle.style.transform = `translateY(${travelDistance}px) scale(${scaleValue})`;
        topTitle.style.opacity = opacityValueBig;

        navMinimalLogo.style.opacity = 1;
        navMinimalLogo.style.transform = 'translateY(0)';
    }
};

// Orchestrated Scroll Logic (Hero sequence)
const handleSequencedScroll = (scrollPos) => {
    const vh = window.innerHeight;

    // Fade out UI layer on scroll
    const heroUiLayer = document.getElementById('hero-ui-layer');
    if (heroUiLayer) {
        if (scrollPos > 10) {
            heroUiLayer.style.opacity = '0';
            heroUiLayer.style.pointerEvents = 'none';
        } else {
            heroUiLayer.style.opacity = '1';
            heroUiLayer.style.pointerEvents = 'none';
        }
    }

    // Update custom scrollbar dot position
    const scrollDot = document.getElementById('scroll-dot');
    if (scrollDot) {
        const maxScroll = cachedMetrics.docHeight - cachedMetrics.windowHeight;
        const pct = maxScroll > 0 ? Math.min(scrollPos / maxScroll, 1) * 100 : 0;
        scrollDot.style.top = `${pct}%`;
    }

    // PHASE 1: Video Expansion
    const expansionStart = 0.1 * vh;
    const expansionEnd = 0.6 * vh;
    let expansionProgress = (scrollPos - expansionStart) / (expansionEnd - expansionStart);
    expansionProgress = Math.max(0, Math.min(1, expansionProgress));

    if (videoWrapper && mainHeader) {
        videoWrapper.style.width = `${90 + (expansionProgress * 10)}vw`;
        videoWrapper.style.height = `calc(100vh - ${1 * (1 - expansionProgress)}cm)`;
        videoWrapper.style.borderRadius = `${40 * (1 - expansionProgress)}px ${40 * (1 - expansionProgress)}px 0 0`;
        mainHeader.style.transform = `translateY(-${expansionProgress * 100}%)`;
    }

    // Phase 2: Overflight & Text
    const overflightStart = 0.6 * cachedMetrics.windowHeight;
    const overflightEnd = 1.7 * cachedMetrics.windowHeight;
    const textStart = 0.1 * cachedMetrics.windowHeight;
    const textEnd = 0.6 * cachedMetrics.windowHeight; // 100% complete at image start

    // Architect Text Animation (Optimized with cached spans)
    if (architectTextSpans && architectTextSpans.length > 0) {
        let textProgress = (scrollPos - textStart) / (textEnd - textStart);
        textProgress = Math.max(0, Math.min(1, textProgress));

        architectProgress += (textProgress - architectProgress) * 0.08; // Slightly faster lerp for snappiness

        architectTextSpans.forEach((span, index) => {
            const delay = index * 0.03; // Reduced delay for smoother feel
            const localProgress = Math.max(0, Math.min(1, (architectProgress - delay) * 1.5));
            const yPos = 100 * (1 - localProgress);
            span.style.transform = `translate3d(0, ${yPos}%, 0)`; // translate3d is faster
            span.style.opacity = localProgress;
        });
    }

    if (maskLayer) {
        let overflightProgress = (scrollPos - overflightStart) / (overflightEnd - overflightStart);
        overflightProgress = Math.max(0, Math.min(1, overflightProgress));

        const yOffset = 100 * (1 - overflightProgress);
        maskLayer.style.transform = `translate3d(0, ${yOffset}vh, 0)`;

        if (videoBlur) {
            videoBlur.style.opacity = overflightProgress;
        }

        if (heroVideo) {
            if (overflightProgress > 0 && !heroVideo.paused) {
                heroVideo.pause();
            } else if (overflightProgress === 0 && heroVideo.paused) {
                heroVideo.play().catch(e => { });
            }
            const videoScale = 1 + (overflightProgress * 0.15);
            heroVideo.style.transform = `scale(${videoScale})`;
        }
    }
};

let architectProgress = 0; // For smoothing the text reveal animation

// Horizontal Process Scroll Logic
let lastProcessProgress = -1;
const handleProcessScroll = (scrollPos) => {
    if (!processContainer || cachedMetrics.process.height === 0) return;

    const start = cachedMetrics.process.top;
    const end = start + cachedMetrics.process.height - cachedMetrics.windowHeight;

    let progress = (scrollPos - start) / (end - start);
    progress = Math.max(0, Math.min(1, progress));

    // Skip if progress hasn't changed meaningfully (saves GPU writes)
    if (Math.abs(progress - lastProcessProgress) < 0.0001) return;
    lastProcessProgress = progress;

    const maxTranslate = cachedMetrics.process.scrollWidth - cachedMetrics.windowWidth;

    if (progress > 0 && progress < 1) {
        processContainer.style.transform = `translate3d(-${progress * maxTranslate}px, 0, 0)`;
    } else if (progress >= 1) {
        processContainer.style.transform = `translate3d(-${maxTranslate}px, 0, 0)`;
    } else {
        processContainer.style.transform = `translate3d(0, 0, 0)`;
    }
    // Skew effect removed — writing transform on 6+ elements per frame compounds GPU workload
};

let lastScrollPos = 0;

let imageColorProgress = 0; // For smoothing the final image transition

// Transition Grayscale to Color for final image
const handleImageGrayscale = (scrollPos) => {
    const section = document.querySelector('.simple-image-section');
    const img = section?.querySelector('img');
    if (!section || !img || cachedMetrics.image.height === 0) return;

    // Start effect when the section starts sticking
    const start = cachedMetrics.image.top;
    const end = start + cachedMetrics.image.height - cachedMetrics.windowHeight;

    let targetProgress = (scrollPos - start) / (end - start);
    targetProgress = Math.max(0, Math.min(1, targetProgress));

    // Internal smoothing for the image specifically
    // Lower value (0.05) makes it feel "heavier" and smoother
    imageColorProgress += (targetProgress - imageColorProgress) * 0.15;

    img.style.filter = `grayscale(${1 - imageColorProgress})`;

    // Internal Parallax to reveal the bottom
    const translateMove = imageColorProgress * 40;
    img.style.transform = `translate3d(0, -${translateMove}%, 0)`;
};
// Horizontal Gallery Scroll Logic
const handleGalleryScroll = (scrollPos) => {
    if (!gallerySection || !galleryTrack || cachedMetrics.gallery.height === 0) return;

    const start = cachedMetrics.gallery.top;
    const end = start + cachedMetrics.gallery.height - cachedMetrics.windowHeight;

    let progress = (scrollPos - start) / (end - start);
    progress = Math.max(0, Math.min(1, progress));

    const maxTranslate = cachedMetrics.gallery.scrollWidth - cachedMetrics.windowWidth;

    if (progress > 0 && progress < 1) {
        galleryTrack.style.transform = `translate3d(-${progress * maxTranslate}px, 0, 0)`;

        // Perfectly synchronized background image scroll
        if (galleryBg && cachedMetrics.gallery.bgMoveDistance > 0) {
            galleryBg.style.transform = `translate3d(${-progress * cachedMetrics.gallery.bgMoveDistance}px, 0, 0)`;
        }
    } else if (progress >= 1) {
        galleryTrack.style.transform = `translate3d(-${maxTranslate}px, 0, 0)`;
    } else {
        galleryTrack.style.transform = `translate3d(0, 0, 0)`;
    }

    if (marbreHeader) {
        if (progress <= 0) {
            marbreHeader.classList.add('is-visible');
        } else {
            marbreHeader.classList.remove('is-visible');
        }
    }
};

// ===================== FAQ LOGIC (Accordion + Pagination) =====================
const initFaq = () => {
    const faqGrid = document.getElementById('faq-grid');
    const faqPages = document.querySelectorAll('.faq-page');
    const faqDots = document.querySelectorAll('.faq-dot');
    const prevBtn = document.getElementById('faq-prev');
    const nextBtn = document.getElementById('faq-next');

    if (!faqGrid || !faqPages.length) return;

    let currentPage = 1;
    const totalPages = faqPages.length;

    // Accordion Logic (Global)
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(i => i.classList.remove('active'));
            if (!isActive) item.classList.add('active');
        });
    });

    // Pagination Function
    const goToPage = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;

        currentPage = pageNumber;

        // Update Pages
        faqPages.forEach(page => {
            page.classList.remove('active');
            if (parseInt(page.dataset.page) === currentPage) {
                page.classList.add('active');
            }
        });

        // Update Dots
        faqDots.forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.dataset.page) === currentPage) {
                dot.classList.add('active');
            }
        });

        // Update Buttons
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    };

    // Event Listeners
    if (prevBtn) prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

    faqDots.forEach(dot => {
        dot.addEventListener('click', () => goToPage(parseInt(dot.dataset.page)));
    });
};

// ===================== MODAL LOGIC =====================
const initModals = () => {
    const modal = document.getElementById('legal-modal');
    const openLegal = document.getElementById('open-legal');
    const openPrivacy = document.getElementById('open-privacy');
    const closeBtn = document.querySelector('.modal-close');
    const overlay = document.querySelector('.modal-overlay');
    const contentLegal = document.getElementById('modal-content-legal');
    const contentPrivacy = document.getElementById('modal-content-privacy');

    if (!modal) return;

    const openModal = (type) => {
        if (type === 'legal') {
            contentLegal.style.display = 'block';
            contentPrivacy.style.display = 'none';
        } else {
            contentLegal.style.display = 'none';
            contentPrivacy.style.display = 'block';
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Block scroll
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
    };

    if (openLegal) openLegal.addEventListener('click', () => openModal('legal'));
    if (openPrivacy) openPrivacy.addEventListener('click', () => openModal('privacy'));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // Escape key to close
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
};

// Update load event to include modals and hover background
window.addEventListener('load', () => {
    initModals();
});

// ===================== HOMEPAGE MARBLE HOVER BACKGROUND MOTION =====================
const initMarbleHoverBackground = () => {
    const hoverBg = document.getElementById('gallery-hover-bg');
    const galleryItems = document.querySelectorAll('#gallery-track .gallery-item');
    const container = document.getElementById('gallery-track-container');
    const parallaxBg = document.getElementById('gallery-bg');
    if (!hoverBg || galleryItems.length === 0) return;

    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        if (!img) return;

        item.addEventListener('mouseenter', () => {
            const src = img.getAttribute('src');
            hoverBg.style.backgroundImage = `url('${src}')`;
            hoverBg.classList.add('active');
        });

        item.addEventListener('mouseleave', () => {
            hoverBg.classList.remove('active');
        });
    });

    // Sync horizontal scroll between container and parallax background
    if (container && parallaxBg) {
        container.addEventListener('scroll', () => {
            const scrollLeft = container.scrollLeft;
            parallaxBg.style.transform = `translateX(${-scrollLeft * 0.3}px)`;
        });
    }
};

// ===================== PROJECT MODAL LOGIC =====================
window.openProjectModal = (id) => {
    const data = window.projectData && window.projectData[id] ? window.projectData[id] : null;
    if (!data) {
        console.error('Project not found:', id);
        return;
    }

    if (data.available === false) {
        showPremiumPopup(data.name);
        return;
    }

    const row = document.getElementById('modal-media-row');
    const nameEl = document.getElementById('modal-project-name');
    const descEl = document.getElementById('modal-project-desc');
    const subtitleEl = document.getElementById('modal-project-subtitle');
    const detailsEl = document.getElementById('modal-project-details-text');
    const numberEl = document.getElementById('modal-project-number');
    const categoryEl = document.getElementById('modal-project-category');

    // Resolve asset paths relative to the current page location.
    // When the modal is opened from a subfolder page like projet/index.html,
    // data.js paths like assets/... need to be prefixed with ../ to reach the site root.
    const path = window.location.pathname;
    const isInProjectSubfolder = /\/projet\/|\/services\/|\/marbres\/|\/contact\//.test(path);
    const assetPrefix = isInProjectSubfolder ? '../' : '';

    row.innerHTML = data.gallery.map((item, index) => {
        const src = item.file_path.startsWith('http') ? item.file_path : assetPrefix + item.file_path;
        const fallback = assetPrefix + 'projet/1.jpg';
        if (item.type === 'video') {
            // Videos load lazily (defer src until scrolled into view)
            return `<div class="pm-media-card" onclick="openProjectLightbox(${id}, ${index})"><video data-src="${src}" muted autoplay loop playsinline preload="none"></video></div>`;
        }
        // Images load immediately with direct src — no lazy observer needed in modals
        return `<div class="pm-media-card" onclick="openProjectLightbox(${id}, ${index})"><img src="${src}" alt="Média Projet ARTECH" decoding="async" onerror="this.onerror=null; this.src='${fallback}';"></div>`;
    }).join('');

    nameEl.textContent = data.name || 'Projet sans nom';
    descEl.textContent = data.desc;
    subtitleEl.textContent = (data.subtitle && data.subtitle !== data.name) ? data.subtitle : '';
    detailsEl.innerHTML = data.details || '';

    const totalProjects = Object.keys(window.projectData || {}).length;
    const currentIndex = String(id).padStart(2, '0');
    const totalIndex = String(totalProjects).padStart(2, '0');
    numberEl.textContent = `${currentIndex} / ${totalIndex}`;
    categoryEl.textContent = data.category || '';

    document.getElementById('project-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    initModalSlider(row);

    const arrowLeft = row.parentElement.querySelector('.pm-arrow-left');
    const arrowRight = row.parentElement.querySelector('.pm-arrow-right');

    const scrollByCard = (direction) => {
        const card = row.querySelector('.pm-media-card');
        const cardWidth = card ? card.getBoundingClientRect().width + 16 : 400;
        row.scrollBy({ left: cardWidth * direction, behavior: 'smooth' });
    };

    if (arrowLeft) {
        arrowLeft.onclick = (e) => { e.stopPropagation(); scrollByCard(-1); };
    }
    if (arrowRight) {
        arrowRight.onclick = (e) => { e.stopPropagation(); scrollByCard(1); };
    }

    // Lazy-load videos as user scrolls the row
    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target.querySelector('video[data-src]');
                    if (video && video.dataset.src) {
                        video.src = video.dataset.src;
                        video.removeAttribute('data-src');
                    }
                    videoObserver.unobserve(entry.target);
                }
            });
        }, { root: row, rootMargin: '300px', threshold: 0 });

        row.querySelectorAll('.pm-media-card:has(video[data-src])').forEach(card => {
            videoObserver.observe(card);
        });
    } else {
        row.querySelectorAll('video[data-src]').forEach(video => {
            video.src = video.dataset.src;
            video.removeAttribute('data-src');
        });
    }
};


const closeProjectModal = () => {
    const modal = document.getElementById('project-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.querySelectorAll('#project-modal video').forEach(v => v.pause());
    closeLightbox();
};

let currentProjectLightboxGallery = [];
let currentProjectLightboxIndex = 0;

window.openProjectLightbox = (projectId, index) => {
    const data = window.projectData && window.projectData[projectId] ? window.projectData[projectId] : null;
    if (!data || !data.gallery || !data.gallery.length) return;

    const path = window.location.pathname;
    const isInProjectSubfolder = /\/projet\/|\/services\/|\/marbres\/|\/contact\//.test(path);
    const assetPrefix = isInProjectSubfolder ? '../' : '';

    currentProjectLightboxGallery = data.gallery.map(item => {
        const src = item.file_path.startsWith('http') ? item.file_path : assetPrefix + item.file_path;
        return { src: src, type: item.type };
    });
    currentProjectLightboxIndex = index;

    showProjectLightboxItem(currentProjectLightboxIndex);

    const lightbox = document.getElementById('pm-lightbox');
    if (lightbox) {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

const showProjectLightboxItem = (idx) => {
    if (!currentProjectLightboxGallery.length) return;

    if (idx < 0) idx = currentProjectLightboxGallery.length - 1;
    if (idx >= currentProjectLightboxGallery.length) idx = 0;
    currentProjectLightboxIndex = idx;

    const item = currentProjectLightboxGallery[idx];
    const img = document.getElementById('pm-lightbox-img');
    const video = document.getElementById('pm-lightbox-video');

    if (img && video) {
        if (item.type === 'video') {
            img.style.display = 'none';
            video.src = item.src;
            video.style.display = 'block';
            video.play();
        } else {
            video.pause();
            video.style.display = 'none';
            video.src = '';
            img.src = item.src;
            img.style.display = 'block';
        }
    }
};

window.navigateProjectLightbox = (direction) => {
    showProjectLightboxItem(currentProjectLightboxIndex + direction);
};

const openLightbox = (src, type) => {
    const lightbox = document.getElementById('pm-lightbox');
    const img = document.getElementById('pm-lightbox-img');
    const video = document.getElementById('pm-lightbox-video');
    if (!lightbox) return;

    img.style.display = 'none';
    video.style.display = 'none';

    if (type === 'video') {
        video.src = src;
        video.style.display = 'block';
        video.play();
    } else {
        img.src = src;
        img.style.display = 'block';
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeLightbox = () => {
    const lightbox = document.getElementById('pm-lightbox');
    const video = document.getElementById('pm-lightbox-video');
    if (!lightbox) return;
    lightbox.classList.remove('active');
    if (video) {
        video.pause();
        video.src = '';
    }
    document.body.style.overflow = '';
};

const showPremiumPopup = (projectName) => {
    const modal = document.getElementById('premium-modal');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closePremiumPopup = () => {
    const modal = document.getElementById('premium-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
};

const initModalSlider = (row) => {
    if (row.dataset.sliderInitialized) return;
    row.dataset.sliderInitialized = 'true';

    row.addEventListener('click', (e) => {
        const card = e.target.closest('.pm-media-card');
        if (!card) return;
        const img = card.querySelector('img');
        const video = card.querySelector('video');
        if (img) openLightbox(img.src, 'image');
        else if (video) openLightbox(video.src, 'video');
    });
};

// Removed duplicated initGalleryScroll logic to avoid fighting with smooth scroll

window.addEventListener('load', () => {
    document.querySelector('.pm-close-btn')?.addEventListener('click', closeProjectModal);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const projectModal = document.getElementById('project-modal');
            if (projectModal.classList.contains('active')) {
                closeProjectModal();
            }
            const premiumModal = document.getElementById('premium-modal');
            if (premiumModal.classList.contains('active')) {
                closePremiumPopup();
            }
        }
    });

    document.querySelector('.premium-modal-close')?.addEventListener('click', closePremiumPopup);
    document.querySelector('.premium-modal-overlay')?.addEventListener('click', closePremiumPopup);

    document.querySelector('.pm-read-more')?.addEventListener('click', function () {
        const details = document.getElementById('modal-project-details');
        const modal = document.getElementById('project-modal');
        const isActive = details.classList.contains('active');
        if (isActive) {
            details.classList.remove('active');
            modal.classList.remove('read-more-active');
            this.textContent = 'Read More';
        } else {
            details.classList.add('active');
            modal.classList.add('read-more-active');
            this.textContent = 'Read Less';
        }
    });

    document.querySelector('.pm-details-back')?.addEventListener('click', function () {
        const details = document.getElementById('modal-project-details');
        const modal = document.getElementById('project-modal');
        if (details) details.classList.remove('active');
        if (modal) modal.classList.remove('read-more-active');
        const readMoreBtn = document.querySelector('.pm-read-more');
        if (readMoreBtn) readMoreBtn.textContent = 'Read More';
    });

    document.querySelector('.pm-lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('pm-lightbox-prev')?.addEventListener('click', function (e) {
        e.stopPropagation();
        window.navigateProjectLightbox(-1);
    });
    document.getElementById('pm-lightbox-next')?.addEventListener('click', function (e) {
        e.stopPropagation();
        window.navigateProjectLightbox(1);
    });
    document.getElementById('pm-lightbox')?.addEventListener('click', function (e) {
        if (e.target === this) closeLightbox();
    });

    // Marble modal logic
    window.openMarbleModal = function (productId) {
        const modalEl = document.getElementById('marble-detail-modal');
        const productsDb = window.productData || [];
        const product = productsDb.find(p => parseInt(p.id) === parseInt(productId));
        if (!product || !modalEl) return;

        const path = window.location.pathname;
        const isInSubfolder = /\/projet\/|\/services\/|\/marbres\/|\/contact\//.test(path);
        const assetPrefix = isInSubfolder ? '../' : '';
        const src = product.image_path.startsWith('http') ? product.image_path : (assetPrefix + product.image_path);

        const titleEl = document.getElementById('modal-marble-title');
        const tagEl = document.getElementById('modal-marble-tag');
        const originEl = document.getElementById('modal-marble-origin');
        const descEl = document.getElementById('modal-marble-desc');
        const imgEl = document.getElementById('modal-marble-img');

        if (titleEl) titleEl.textContent = product.name || '';
        if (tagEl) tagEl.textContent = product.tag || 'Premium';
        if (originEl) originEl.textContent = product.origin || '';
        if (descEl) descEl.textContent = product.description || '';
        if (imgEl) {
            imgEl.src = src;
            imgEl.alt = product.name || '';
        }

        modalEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeMarbleModal = function () {
        const modalEl = document.getElementById('marble-detail-modal');
        if (!modalEl) return;
        modalEl.classList.remove('active');
        document.body.style.overflow = '';
    };

    // Populate home marble gallery track
    const galleryTrack = document.getElementById('gallery-track');
    if (galleryTrack && window.productData && window.productData.length) {
        const itemsHtml = window.productData.slice(0, 6).map(product => `
            <div class="gallery-item" onclick="openMarbleModal(${product.id})">
                <img src="${product.image_path}" alt="${product.name}" loading="lazy">
                <div class="gallery-item-label"><span>${product.name}</span></div>
            </div>
        `).join('');
        galleryTrack.innerHTML = itemsHtml + `
            <div class="gallery-more-item">
                <a href="marbres/" class="btn-explore-more">
                    <div class="explore-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </div>
                    <span class="explore-label-mini">VOIR PLUS</span>
                </a>
            </div>
        `;
    }

    initMarbleHoverBackground();

    // Horizontal Drag & Touch Scroll for Horizontal Sections (Projets & Nos Marbres)
    const initHorizontalDragScroll = (containerEl) => {
        if (!containerEl) return;
        let isDragging = false;
        let startX = 0;
        let hasMoved = false;

        containerEl.style.cursor = 'grab';

        containerEl.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            containerEl.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 4) {
                hasMoved = true;
                startX = e.clientX;
                isScrollActive = true;
                const maxScroll = getMaxScroll();
                targetY = Math.max(0, Math.min(maxScroll, targetY - dx * 1.8));
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                containerEl.style.cursor = 'grab';
            }
        });

        containerEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                hasMoved = false;
            }
        }, { passive: true });

        containerEl.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const dx = touchX - startX;
                if (Math.abs(dx) > 4) {
                    hasMoved = true;
                    startX = touchX;
                    isScrollActive = true;
                    const maxScroll = getMaxScroll();
                    targetY = Math.max(0, Math.min(maxScroll, targetY - dx * 1.8));
                }
            }
        }, { passive: true });

        // Prevent opening modal if card was dragged
        containerEl.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
                hasMoved = false;
            }
        }, true);
    };

    initHorizontalDragScroll(processContainer);
    initHorizontalDragScroll(galleryTrack);

    // Crucial: Update cached metrics AFTER populating the HTML so width is correct!
    updateCachedMetrics();
});

const initMobileMenu = () => {
    const toggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    if (!toggle || !navLinks) return;

    const openMenu = () => document.body.classList.add('nav-open');
    const closeMenu = () => document.body.classList.remove('nav-open');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.classList.toggle('nav-open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
            closeMenu();
        }
    });
};

const initContactForm = () => {
    const forms = document.querySelectorAll('form.contact-form, #home-contact-form');
    if (!forms.length) return;

    // EmailJS Configuration (100% Client-Side JavaScript)
    const cfg = window.CONFIG || {};
    const EMAILJS_PUBLIC_KEY = cfg.EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
    const EMAILJS_SERVICE_ID = cfg.EMAILJS_SERVICE_ID || 'service_artech';
    const EMAILJS_TEMPLATE_ID = cfg.EMAILJS_TEMPLATE_ID || 'template_artech';

    if (window.emailjs && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        try {
            emailjs.init(EMAILJS_PUBLIC_KEY);
        } catch (e) { }
    }

    forms.forEach(form => {
        const responseBox = form.querySelector('#contact-form-response') || form.parentElement.querySelector('#contact-form-response');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.submit-btn-premium') || form.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : 'ENVOYER LE MESSAGE';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';
                submitBtn.innerHTML = '<span>ENVOI EN COURS...</span>';
            }

            if (responseBox) {
                responseBox.style.display = 'none';
            }

            try {
                if (window.emailjs && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
                    // 100% JS delivery via EmailJS
                    await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);
                } else {
                    // Fallback simulation / Mailto trigger if EmailJS keys not configured yet
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                if (responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.style.background = 'rgba(46, 204, 113, 0.15)';
                    responseBox.style.border = '1px solid rgba(46, 204, 113, 0.4)';
                    responseBox.style.color = '#2ecc71';
                    responseBox.textContent = 'Votre message a été transmis avec succès ! Notre équipe vous recontactera rapidement.';
                    form.reset();
                }
            } catch (err) {
                console.error('Email error:', err);
                if (responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.style.background = 'rgba(231, 76, 60, 0.15)';
                    responseBox.style.border = '1px solid rgba(231, 76, 60, 0.4)';
                    responseBox.style.color = '#e74c3c';
                    responseBox.textContent = 'Erreur d\'envoi. Veuillez réessayer ou contacter directement Artech.marbrerie@gmail.com.';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '1';
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    });
};

window.addEventListener('load', () => {
    initMobileMenu();
    initContactForm();
    initGlobalScrollIndicator();
});

// ===================== GLOBAL CUSTOM SCROLLBAR INDICATOR =====================
const initGlobalScrollIndicator = () => {
    if (!document.getElementById('scroll-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.id = 'scroll-indicator';
        indicator.innerHTML = `
            <div class="scroll-indicator__line"></div>
            <div class="scroll-indicator__dot" id="scroll-dot"></div>
        `;
        document.body.appendChild(indicator);
    }
    updateGlobalScrollDot();
};

const updateGlobalScrollDot = () => {
    const scrollDot = document.getElementById('scroll-dot');
    if (!scrollDot) return;
    const docHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
    );
    const winHeight = window.innerHeight;
    const maxScroll = docHeight - winHeight;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const pct = maxScroll > 0 ? Math.min(Math.max(0, scrollY / maxScroll), 1) * 100 : 0;
    scrollDot.style.top = `${pct}%`;
};

window.addEventListener('scroll', updateGlobalScrollDot, { passive: true });
window.addEventListener('resize', updateGlobalScrollDot, { passive: true });
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalScrollIndicator);
} else {
    initGlobalScrollIndicator();
}

// Touch Swipe Drag Support for Lightbox Modals
(function initLightboxTouchSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        const activeLightbox = document.querySelector('.lightbox.active, .pm-lightbox.active');
        if (!activeLightbox) return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const activeLightbox = document.querySelector('.lightbox.active, .pm-lightbox.active');
        if (!activeLightbox) return;

        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Trigger swipe if horizontal movement is > 40px and dominant
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
                // Swiped Left -> Next
                const nextBtn = activeLightbox.querySelector('.lightbox-next, #lightbox-next, .pm-lightbox-next');
                nextBtn?.click();
            } else {
                // Swiped Right -> Prev
                const prevBtn = activeLightbox.querySelector('.lightbox-prev, #lightbox-prev, .pm-lightbox-prev');
                prevBtn?.click();
            }
        }
    }, { passive: true });
})();


