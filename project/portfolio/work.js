/* work.js — guided case studies: stepping through ①②③ lights the matching
   pin on the framed visual, so a visitor "gets" each product by walking it. */
(function () {
  document.querySelectorAll('[data-case]').forEach((caseEl) => {
    const steps = [...caseEl.querySelectorAll('.step')];
    const pins = [...caseEl.querySelectorAll('.pin')];
    if (!steps.length) return;
    let active = 0, hovering = false, inView = false;

    function set(i) {
      active = i;
      steps.forEach((s, k) => s.classList.toggle('active', k === i));
      pins.forEach((p, k) => p.classList.toggle('active', k === i));
    }
    set(0);

    steps.forEach((s, i) => {
      s.addEventListener('mouseenter', () => { hovering = true; set(i); });
      s.addEventListener('mouseleave', () => { hovering = false; });
      s.addEventListener('click', () => set(i));
    });
    pins.forEach((p, i) => {
      p.addEventListener('mouseenter', () => { hovering = true; set(i); });
      p.addEventListener('mouseleave', () => { hovering = false; });
    });

    // auto-walk while in view and idle (respects Tweaks toggle)
    setInterval(() => {
      if (inView && !hovering && document.documentElement.dataset.autowalk !== '0') set((active + 1) % steps.length);
    }, 2800);

    new IntersectionObserver((e) => { inView = e[0].isIntersecting; }, { threshold: 0.4 })
      .observe(caseEl);
  });

  // pinnable tags (satisfying, not fleeing)
  document.querySelectorAll('.tag').forEach((t) => {
    t.addEventListener('click', () => t.classList.toggle('pinned'));
  });

  // gentle entrance for cases
  document.querySelectorAll('[data-case]').forEach((el) => {
    el.style.opacity = '0'; el.style.transform = 'translateY(26px)';
    el.style.transition = 'opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1)';
  });
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; obs.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-case]').forEach((el) => io.observe(el));
})();
