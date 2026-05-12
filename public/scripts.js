/* =============================================================
   CyberNovate — vanilla JS interactions
   Strict mode, no eval, no inline handlers
   ============================================================= */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Footer year ------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --- Sticky header ---------------------------------------- */
  const header = $('#siteHeader');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Mobile hamburger ------------------------------------- */
  const hamburger = $('#hamburger');
  const mobileNav = $('#mobileNav');
  if (hamburger && mobileNav) {
    const close = () => {
      hamburger.classList.remove('is-open');
      mobileNav.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-label', 'Open menu');
    };
    const open = () => {
      hamburger.classList.add('is-open');
      mobileNav.classList.add('is-open');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileNav.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-label', 'Close menu');
    };
    hamburger.addEventListener('click', () =>
      hamburger.classList.contains('is-open') ? close() : open()
    );
    $$('a', mobileNav).forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && hamburger.classList.contains('is-open')) close();
    });
    const mq = window.matchMedia('(min-width: 1025px)');
    const handleMq = () => { if (mq.matches) close(); };
    if (mq.addEventListener) mq.addEventListener('change', handleMq);
    else if (mq.addListener) mq.addListener(handleMq);
  }

  /* --- Smooth scroll with header offset -------------------- */
  const OFFSET = 80;
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', href);
    });
  });

  /* --- Hero slider ------------------------------------------ */
  (function initSlider() {
    const slider = $('#heroSlider');
    if (!slider) return;
    const slides = $$('.slide', slider);
    const dots = $$('.slider__dot', slider);
    if (!slides.length || !dots.length) return;

    let active = 0;
    let timer = null;
    const ROTATE_MS = 6500;

    const goTo = (idx) => {
      if (idx === active) return;
      const next = ((idx % slides.length) + slides.length) % slides.length;
      slides.forEach((s, i) => {
        if (i === next) { s.classList.add('slide--active'); s.removeAttribute('hidden'); }
        else { s.classList.remove('slide--active'); s.setAttribute('hidden', ''); }
      });
      dots.forEach((d, i) => {
        if (i === next) { d.classList.add('slider__dot--active'); d.setAttribute('aria-selected', 'true'); }
        else { d.classList.remove('slider__dot--active'); d.setAttribute('aria-selected', 'false'); }
      });
      active = next;
    };

    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => {
      if (prefersReducedMotion) return;
      stop();
      timer = setInterval(() => goTo(active + 1), ROTATE_MS);
    };

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        goTo(parseInt(dot.getAttribute('data-go') || '0', 10));
        start();
      });
    });
    slider.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { goTo(active + 1); start(); }
      else if (e.key === 'ArrowLeft') { goTo(active - 1); start(); }
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    start();
  })();

  /* --- Reveal on scroll ------------------------------------- */
  (function initReveal() {
    const els = $$('.reveal');
    if (!els.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  })();

  /* --- Stat counters ---------------------------------------- */
  (function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      counters.forEach(el => { el.textContent = el.getAttribute('data-count') || '0'; });
      return;
    }
    const animate = (el) => {
      const target = parseInt(el.getAttribute('data-count') || '0', 10);
      const duration = 1400;
      const start = performance.now();
      const ease = t => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(ease(t) * target));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animate(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(el => io.observe(el));
  })();

  /* --- Contact form validation ------------------------------ */
  (function initForm() {
    const form = $('#contactForm');
    if (!form) return;
    const successEl = $('#formSuccess');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const setError = (field, msg) => {
      if (!field) return;
      field.classList.add('field--error');
      const errEl = $('.field__error', field);
      if (errEl) errEl.textContent = msg || '';
    };
    const clearError = (field) => {
      if (!field) return;
      field.classList.remove('field--error');
      const errEl = $('.field__error', field);
      if (errEl) errEl.textContent = '';
    };
    const fieldOf = el => el.closest('.field');

    $$('input, textarea, select', form).forEach(el => {
      el.addEventListener('input', () => clearError(fieldOf(el)));
      el.addEventListener('change', () => clearError(fieldOf(el)));
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      let firstInvalid = null;
      let valid = true;

      const hp = form.querySelector('input[name="website"]');
      if (hp && hp.value.trim() !== '') {
        form.reset();
        if (successEl) { successEl.hidden = false; }
        return;
      }

      const nameInput    = form.querySelector('input[name="name"]');
      const emailInput   = form.querySelector('input[name="email"]');
      const messageInput = form.querySelector('textarea[name="message"]');
      const consentInput = form.querySelector('input[name="consent"]');

      if (nameInput) {
        const v = nameInput.value.trim();
        if (!v) { setError(fieldOf(nameInput), 'Please tell us your name.'); valid = false; firstInvalid = firstInvalid || nameInput; }
        else if (v.length < 2) { setError(fieldOf(nameInput), 'Name looks too short.'); valid = false; firstInvalid = firstInvalid || nameInput; }
      }
      if (emailInput) {
        const v = emailInput.value.trim();
        if (!v) { setError(fieldOf(emailInput), 'A work email is required.'); valid = false; firstInvalid = firstInvalid || emailInput; }
        else if (!EMAIL_RE.test(v)) { setError(fieldOf(emailInput), 'Please enter a valid email address.'); valid = false; firstInvalid = firstInvalid || emailInput; }
      }
      if (messageInput) {
        const v = messageInput.value.trim();
        if (!v) { setError(fieldOf(messageInput), 'Please share a few details about your needs.'); valid = false; firstInvalid = firstInvalid || messageInput; }
        else if (v.length < 10) { setError(fieldOf(messageInput), 'A little more detail will help us route your request.'); valid = false; firstInvalid = firstInvalid || messageInput; }
      }
      if (consentInput && !consentInput.checked) {
        const wrap = consentInput.closest('label') || consentInput.closest('.field');
        if (wrap) wrap.classList.add('field--error');
        valid = false; firstInvalid = firstInvalid || consentInput;
      } else if (consentInput) {
        const wrap = consentInput.closest('label') || consentInput.closest('.field');
        if (wrap) wrap.classList.remove('field--error');
      }

      if (!valid) {
        if (firstInvalid && typeof firstInvalid.focus === 'function') firstInvalid.focus();
        return;
      }

      /* TODO: Connect to Netlify Forms or preferred API endpoint */
      form.reset();
      if (successEl) {
        successEl.hidden = false;
        successEl.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
    });
  })();

})();
