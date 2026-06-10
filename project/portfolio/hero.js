/* hero.js — global custom cursor + nav theming, magnetic headline,
   catchable verb chips, and the attractive constellation field. */
(function () {
  const mq = window.matchMedia('(hover:hover)');
  const cursor = document.getElementById('cursor');
  let mx = innerWidth / 2, my = innerHeight * 0.4, cxp = mx, cyp = my;
  let hasMouse = false;

  // ---------- global cursor ----------
  if (mq.matches) {
    addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY; hasMouse = true;
      const el = e.target;
      const hot = el.closest && el.closest('a,button,.verb,.tag,.step,.pin,.track .node,.ticklabel,image-slot,.frame');
      cursor.classList.toggle('hot', !!hot);
      const deep = el.closest && el.closest('.case.deep,.timeline,.footer');
      cursor.classList.toggle('on-deep', !!deep);
    });
    (function loop() {
      cxp += (mx - cxp) * 0.28; cyp += (my - cyp) * 0.28;
      cursor.style.transform = `translate(${cxp - 6}px,${cyp - 6}px)`;
      requestAnimationFrame(loop);
    })();
  }

  // ---------- nav theme on scroll ----------
  const nav = document.getElementById('nav');
  const navblur = document.getElementById('navblur');
  const deepSections = [...document.querySelectorAll('.case.deep, .timeline, .footer')];
  function navTheme() {
    const y = 52;
    let deep = false;
    for (const s of deepSections) {
      if (!s) continue;
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) deep = true;
    }
    nav.classList.toggle('deep', deep);
    if (navblur) {
      navblur.classList.toggle('deep', deep);
      navblur.classList.toggle('on', scrollY > 16);
    }
  }
  addEventListener('scroll', navTheme, { passive: true });
  navTheme();

  // ---------- magnetic headline ----------
  document.querySelectorAll('h1.kin .line').forEach((line) => {
    const t = line.dataset.text; line.innerHTML = '';
    [...t].forEach((ch) => {
      const s = document.createElement('span');
      s.className = 'ltr'; s.textContent = ch === ' ' ? '\u00A0' : ch;
      line.appendChild(s);
    });
  });
  const letters = [...document.querySelectorAll('h1.kin .ltr')];
  (function magnet() {
    if (hasMouse) for (const L of letters) {
      const r = L.getBoundingClientRect();
      const dx = (r.left + r.width / 2) - mx, dy = (r.top + r.height / 2) - my;
      const d = Math.hypot(dx, dy), R = 150;
      if (d < R) { const f = (1 - d / R) * 16; L.style.transform = `translate(${dx / d * f}px,${dy / d * f}px)`; }
      else L.style.transform = '';
    }
    requestAnimationFrame(magnet);
  })();

  // ---------- catchable verbs: hover = preview, click = lock ----------
  const reveal = document.getElementById('verbReveal');
  const def = reveal.innerHTML;
  const verbEls = [...document.querySelectorAll('.verb')];
  let pinned = null;
  const msg = (v) => `<span class="vk">${v.dataset.k}</span>${v.dataset.r}`;
  function setReveal(html) {
    reveal.innerHTML = html;
    reveal.classList.remove('in'); void reveal.offsetWidth; reveal.classList.add('in');
  }
  verbEls.forEach((v) => {
    v.addEventListener('mouseenter', () => setReveal(msg(v)));
    v.addEventListener('mouseleave', () => setReveal(pinned ? msg(pinned) : def));
    v.addEventListener('click', () => {
      pinned = (pinned === v) ? null : v;
      verbEls.forEach((x) => x.classList.toggle('sel', x === pinned));
      setReveal(pinned ? msg(pinned) : def);
    });
  });

  // ---------- constellation ----------
  const cv = document.getElementById('constellation');
  const ctx = cv.getContext('2d');
  let W, H, parts = [];
  function hexRGB(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex || '888888', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  let COL = window.TKcolors();
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth = innerWidth; H = cv.clientHeight = document.querySelector('.hero').offsetHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seed() {
    const n = Math.min(72, Math.round(W * H / 22000));
    parts = [];
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      parts.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, ph: Math.random() * 6.28, sp: 0.2 + Math.random() * 0.5 });
    }
  }
  size(); seed();
  addEventListener('resize', () => { size(); seed(); });
  window.addEventListener('tk-palette', () => { COL = window.TKcolors(); });

  let t = 0;
  (function draw() {
    t += 0.005;
    ctx.clearRect(0, 0, W, H);
    const faint = hexRGB(COL.inkFaint), acc = hexRGB(COL.c10);
    // update
    for (const p of parts) {
      // gentle wander around home
      p.hx += Math.cos(p.ph + t * p.sp) * 0.15;
      p.hy += Math.sin(p.ph * 1.3 + t * p.sp) * 0.15;
      let ax = (p.hx - p.x) * 0.02, ay = (p.hy - p.y) * 0.02;
      if (hasMouse) {
        const dx = mx - p.x, dy = my - p.y, d = Math.hypot(dx, dy), R = 230;
        if (d < R) { const f = (1 - d / R) * 0.9; ax += dx / d * f; ay += dy / d * f; }
      }
      p.vx = (p.vx + ax) * 0.9; p.vy = (p.vy + ay) * 0.9;
      p.x += p.vx; p.y += p.vy;
    }
    // links
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 116) {
          ctx.strokeStyle = `rgba(${faint[0]},${faint[1]},${faint[2]},${(1 - d / 116) * 0.5})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // dots, tinted toward accent near cursor
    for (const p of parts) {
      let near = 0;
      if (hasMouse) { const d = Math.hypot(mx - p.x, my - p.y); near = Math.max(0, 1 - d / 230); }
      const r = Math.round(faint[0] + (acc[0] - faint[0]) * near);
      const g = Math.round(faint[1] + (acc[1] - faint[1]) * near);
      const bl = Math.round(faint[2] + (acc[2] - faint[2]) * near);
      ctx.fillStyle = `rgba(${r},${g},${bl},${0.5 + near * 0.5})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + near * 2.2, 0, 6.2832); ctx.fill();
    }
    requestAnimationFrame(draw);
  })();
})();
