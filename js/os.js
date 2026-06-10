/* ============================================================
   Theresa Kong — Desktop OS engine
   drag · hover-tilt · window manager · guest book · theme · corgi
   ============================================================ */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- clock ---------- */
  const clockEl = $('#clock');
  function tick() {
    const d = new Date();
    let h = d.getHours(), m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    clockEl.textContent = `${h}:${String(m).padStart(2, '0')} ${ap}`;
  }
  tick(); setInterval(tick, 10000);

  /* ---------- icon positions (persist) ---------- */
  const POS = LS.get('tk.iconpos.v3', {});
  $$('.icon').forEach(ic => {
    const p = POS[ic.id];
    if (p) { ic.style.left = p.x + 'px'; ic.style.top = p.y + 'px'; }
  });
  function saveIconPos(ic) {
    POS[ic.id] = { x: parseFloat(ic.style.left), y: parseFloat(ic.style.top) };
    LS.set('tk.iconpos.v3', POS);
  }

  /* ---------- z-order ---------- */
  let zTop = 1000;
  const bump = el => { el.style.zIndex = ++zTop; };

  /* ---------- generic drag (pointer) ---------- */
  // returns true if a real drag happened (so click can be suppressed)
  function makeDraggable(el, handle, { onStart, onMove, onEnd, bounds } = {}) {
    handle = handle || el;
    let sx, sy, ox, oy, moved, dragging = false;
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('input,textarea,button,a,.sw,.lights .c')) return;
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.style.left) || el.offsetLeft;
      oy = parseFloat(el.style.top) || el.offsetTop;
      handle.setPointerCapture(e.pointerId);
      onStart && onStart();
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (!moved) return;
      let nx = ox + dx, ny = oy + dy;
      if (bounds) {
        const b = bounds(el);
        nx = clamp(nx, b.minX, b.maxX); ny = clamp(ny, b.minY, b.maxY);
      }
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
      onMove && onMove(nx, ny);
    });
    const up = e => {
      if (!dragging) return;
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      onEnd && onEnd(moved, e.type);
    };
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
    return () => moved;
  }

  /* ---------- icons: drag + hover tilt + open ---------- */
  const iconBounds = el => ({
    minX: 4, minY: 52,
    maxX: window.innerWidth - el.offsetWidth - 4,
    maxY: window.innerHeight - el.offsetHeight - 4
  });

  $$('.icon').forEach(ic => {
    // keep newly-defaulted positions on-screen for narrower viewports
    const b0 = iconBounds(ic);
    ic.style.left = clamp(parseFloat(ic.style.left) || 0, b0.minX, b0.maxX) + 'px';
    ic.style.top = clamp(parseFloat(ic.style.top) || 0, b0.minY, b0.maxY) + 'px';

    const openable = !ic.hasAttribute('data-noopen');
    makeDraggable(ic, ic, {
      bounds: iconBounds,
      onStart: () => { bump(ic); ic.style.transition = 'none'; },
      onEnd: (moved, type) => {
        ic.style.transition = '';
        if (moved) { saveIconPos(ic); return; }
        // a clean tap (no real drag, not a cancel) opens the icon's window.
        // Driven off pointerup rather than a synthesized click — pointer
        // capture during drag makes the click event unreliable.
        if (openable && type !== 'pointercancel') handleOpen(ic);
      }
    });
  });

  function handleOpen(ic) {
    const key = ic.getAttribute('data-open');
    if (key) openWindow(key, ic);
  }

  /* ---------- window manager ---------- */
  const host = $('#winHost');
  const openWins = new Map(); // key -> el
  const WIN_SIZE = {
    about:     { w: 600, h: 540 },
    work:      { w: 760, h: 620 },
    photo:     { w: 720, h: 600 },
    dotb:      { w: 760, h: 600 },
    guestbook: { w: 820, h: 560 },
    resume:    { w: 640, h: 560 },
    'proj-tourhero': { w: 720, h: 680 },
    'proj-errunds':  { w: 720, h: 680 },
    'proj-figma':    { w: 680, h: 600 },
    'proj-3dme':     { w: 680, h: 560 },
  };
  const WIN_TITLE = {
    about: 'About', work: 'Work', photo: 'Photography', dotb: 'Do Outside the Box',
    guestbook: 'Guest Book', resume: 'resume.pdf',
    'proj-tourhero': 'Work / TourHero', 'proj-errunds': 'Work / Errunds',
    'proj-figma': 'Work / Figma Plugin', 'proj-3dme': 'Work / 3D Me',
  };
  // these open big — 90% of the viewport, centered
  const LARGE = new Set(['work', 'photo', 'dotb', 'proj-tourhero', 'proj-errunds', 'proj-figma', 'proj-3dme']);

  function openWindow(key, originEl) {
    if (openWins.has(key)) {
      const w = openWins.get(key);
      if (w && document.body.contains(w)) { bump(w); pulse(w); return; }
      openWins.delete(key); // stale ref — fall through and recreate
    }
    const tmpl = $('#tmpl-' + key);
    if (!tmpl) return;
    const size = WIN_SIZE[key] || { w: 700, h: 600 };
    const large = LARGE.has(key);
    let w, h, left, top;
    if (large) {
      w = Math.round(window.innerWidth * 0.9);
      h = Math.round(window.innerHeight * 0.9);
      left = Math.round((window.innerWidth - w) / 2);
      top = Math.round((window.innerHeight - h) / 2);
    } else {
      w = Math.min(size.w, window.innerWidth - 32);
      h = Math.min(size.h, window.innerHeight - 80);
      const off = openWins.size * 26;
      left = clamp(Math.round((window.innerWidth - w) / 2 + off), 12, window.innerWidth - w - 12);
      top = clamp(Math.round((window.innerHeight - h) / 2 - 10 + off), 54, window.innerHeight - h - 12);
    }

    const win = document.createElement('div');
    win.className = 'win';
    win.dataset.key = key;
    win.style.left = left + 'px'; win.style.top = top + 'px';
    win.style.width = w + 'px'; win.style.height = h + 'px';

    // transform origin toward the icon that opened it
    if (originEl) {
      const r = originEl.getBoundingClientRect();
      win.style.setProperty('--ox', clamp(r.left + r.width / 2 - left, 0, w) + 'px');
      win.style.setProperty('--oy', clamp(r.top + r.height / 2 - top, 0, h) + 'px');
    }

    const titleLabel = WIN_TITLE[key] || '';
    const pathHtml = titleLabel.includes(' / ')
      ? `<span class="path">${titleLabel.split(' / ')[0]} / </span>${titleLabel.split(' / ')[1]}`
      : titleLabel;

    win.innerHTML =
      `<div class="bar">
         <div class="lights"><span class="c" title="Close"></span><span class="y"></span><span class="g"></span></div>
         <div class="wt">${pathHtml}</div>
       </div>
       <div class="body"></div>`;
    $('.body', win).appendChild(tmpl.content.cloneNode(true));
    host.appendChild(win);
    openWins.set(key, win);
    bump(win);
    setRunning(key, true);

    // close
    $('.lights .c', win).addEventListener('click', () => closeWindow(key));
    win.addEventListener('pointerdown', () => bump(win));

    // drag by titlebar
    makeDraggable(win, $('.bar', win), {
      bounds: el => ({ minX: -el.offsetWidth + 90, minY: 48,
        maxX: window.innerWidth - 90, maxY: window.innerHeight - 44 }),
      onStart: () => { bump(win); win.style.transition = 'none'; },
      onEnd: () => { win.style.transition = ''; }
    });

    // inner project cards open nested windows
    $$('[data-open]', win).forEach(card => {
      card.addEventListener('click', e => {
        e.stopPropagation();
        openWindow(card.getAttribute('data-open'), card);
      });
    });

    // back buttons close this window (revealing the one beneath)
    $$('[data-back]', win).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      closeWindow(key);
    }));

    // guest book wiring
    if (key === 'guestbook') initGuestbook(win);
    // work covers: cursor-tracked 3D tilt
    if (key === 'work') initWorkTilt(win);
    // case-study hero: mirror the project cover as a removable default
    if (CASE_HERO_COVER[key]) initCaseHero(win, key);
  }

  /* ---------- Case-study hero mirrors its project cover ---------- */
  // The big 2:1 hero defaults to the same photo as the project's cover card,
  // so dropping a cover in Work also fills the case study. The hero has its own
  // slot on top though — replacing or clearing it never touches the cover.
  const CASE_HERO_COVER = {
    'proj-tourhero': 'th-tourhero', 'proj-errunds': 'th-errunds',
    'proj-figma': 'th-figma', 'proj-3dme': 'th-3dme',
  };
  function initCaseHero(win, key) {
    const slotId = CASE_HERO_COVER[key];
    const hero = $('.case-hero', win);
    if (!slotId || !hero) return;
    const apply = () => {
      const get = window.ImageSlots && window.ImageSlots.get;
      const v = get && get(slotId);
      const url = (v && v.u && /^data:image\//i.test(v.u)) ? v.u : null;
      if (url) { hero.style.backgroundImage = 'url("' + url + '")'; hero.classList.add('has-cover'); }
      else { hero.style.backgroundImage = ''; hero.classList.remove('has-cover'); }
    };
    apply();
    if (window.ImageSlots && window.ImageSlots.subscribe) {
      win._heroUnsub = window.ImageSlots.subscribe(apply);
    }
  }

  /* ---------- Work cover: cursor-tracked 3D tilt ---------- */
  // The cover tilts in 3D toward wherever the cursor is over it — the point
  // under the pointer presses away (rotateX/rotateY about the thumb centre).
  // The deck's CSS transition smooths the follow so it feels fluid, not twitchy.
  function initWorkTilt(win) {
    $$('.proj-thumb', win).forEach(thumb => {
      const deck = $('.thumb-deck', thumb);
      if (!deck) return;
      thumb.addEventListener('pointermove', e => {
        const r = thumb.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        const t = 20;
        // keep the card-hover pop (scale + Z rotate) as the base so moving onto
        // the image continues from it; tilt AWAY from the cursor (point under
        // the pointer rises toward the viewer, the far side recedes).
        deck.style.transform =
          'scale(1.12) rotate(-4deg) rotateX(' + (-py * t).toFixed(2) + 'deg) rotateY(' + (px * t).toFixed(2) + 'deg)';
        // dynamic shadow falls toward the receding (cursor) side
        deck.style.setProperty('--shx', (px * 38).toFixed(1) + 'px');
        deck.style.setProperty('--shy', (24 + py * 22).toFixed(1) + 'px');
      });
      thumb.addEventListener('pointerleave', () => {
        deck.style.transform = '';
        deck.style.removeProperty('--shx');
        deck.style.removeProperty('--shy');
      });
    });
  }

  function closeWindow(key) {
    const win = openWins.get(key);
    if (!win) return;
    if (win._heroUnsub) { win._heroUnsub(); win._heroUnsub = null; }
    win.classList.add('closing');
    openWins.delete(key);
    setRunning(key, false);
    setTimeout(() => win.remove(), 440);
  }
  function pulse(win) {
    win.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }],
      { duration: 240, easing: 'ease-out' }
    );
  }

  // Esc closes top window
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && openWins.size) {
      let top = null, z = -1;
      openWins.forEach(w => { const wz = +w.style.zIndex; if (wz > z) { z = wz; top = w; } });
      if (top) closeWindow(top.dataset.key);
    }
  });

  // click on empty desktop dismisses open windows
  document.addEventListener('pointerdown', e => {
    if (!openWins.size) return;
    if (e.target.closest('.win, .icon, .menubar, .hint')) return;
    [...openWins.keys()].forEach(closeWindow);
  }, true);

  /* ---------- running indicator on desktop icons ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setRunning(key, on) {
    const ic = document.querySelector('.icon[data-open="' + key + '"]');
    if (ic) ic.classList.toggle('running', on);
  }

  /* ---------- aurora cursor parallax ---------- */
  const aurora = $('#aurora');
  if (aurora && !reduceMotion) {
    let px = 0, py = 0, pending = false;
    window.addEventListener('pointermove', e => {
      px = e.clientX; py = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const dx = (px / window.innerWidth - 0.5) * -26;
        const dy = (py / window.innerHeight - 0.5) * -26;
        aurora.style.transform = `translate(${dx}px,${dy}px)`;
      });
    });
  }

  /* ---------- Guest Book ---------- */
  const GB_COLORS = ['#d35555', '#e8943b', '#e9c64a', '#6fae6f', '#4f93c4', '#7a6fc4', '#c46fa8', '#454545'];
  const SEED = [
    { name: 'Maya', msg: 'Wandered in, started dragging everything around. Delightful.', color: '#6fae6f', t: Date.now() - 864e5 * 5 },
    { name: 'Dev', msg: 'The guest book got me. Signing in cobalt ✦', color: '#4f93c4', t: Date.now() - 864e5 * 2 },
    { name: 'Priya', msg: 'Found Breadloaf. Stayed for the work.', color: '#e8943b', t: Date.now() - 864e5 },
  ];
  function gbAll() { return LS.get('tk.guestbook', SEED.slice()); }

  function initGuestbook(win) {
    const swWrap = $('#gb-swatches', win);
    let chosen = GB_COLORS[0];
    GB_COLORS.forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'sw' + (i === 0 ? ' on' : '');
      s.style.background = c; s.dataset.c = c;
      s.addEventListener('click', () => {
        chosen = c;
        $$('.sw', swWrap).forEach(x => x.classList.toggle('on', x === s));
      });
      swWrap.appendChild(s);
    });

    const sigsEl = $('#gb-sigs', win), nEl = $('#gb-n', win);
    function render() {
      const all = gbAll();
      nEl.textContent = all.length;
      sigsEl.innerHTML = '';
      all.slice().reverse().forEach(s => {
        const el = document.createElement('div');
        el.className = 'sig'; el.style.setProperty('--sig', s.color);
        const date = new Date(s.t);
        el.innerHTML =
          `<div class="sig-top"><span class="sig-dot"></span><span class="sig-name"></span></div>
           ${s.msg ? '<div class="sig-msg"></div>' : ''}
           <div class="sig-date mono">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>`;
        $('.sig-name', el).textContent = s.name;
        if (s.msg) $('.sig-msg', el).textContent = s.msg;
        sigsEl.appendChild(el);
      });
    }
    render();

    $('#gb-submit', win).addEventListener('click', () => {
      const name = $('#gb-name', win).value.trim();
      if (!name) { const i = $('#gb-name', win); i.focus(); i.style.borderColor = chosen; shake(i); return; }
      const msg = $('#gb-msg', win).value.trim();
      const all = gbAll();
      all.push({ name, msg, color: chosen, t: Date.now() });
      LS.set('tk.guestbook', all);
      $('#gb-name', win).value = ''; $('#gb-msg', win).value = '';
      render();
      // celebratory paint splash near the button
      splash(chosen, $('#gb-submit', win));
    });
  }
  function shake(el) {
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 240 });
  }
  function splash(color, btn) {
    const r = btn.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('span');
      const sz = 6 + Math.random() * 10;
      d.style.cssText = `position:fixed;z-index:99999;border-radius:50%;pointer-events:none;
        width:${sz}px;height:${sz}px;background:${color};left:${r.left + r.width / 2}px;top:${r.top}px;`;
      document.body.appendChild(d);
      const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 70;
      d.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist - 50}%,${Math.sin(ang) * dist - 50}%) scale(0)`, opacity: 0 }],
        { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' })
        .onfinish = () => d.remove();
    }
  }

  /* ---------- hint auto-hide ---------- */
  const hint = $('#hint');
  let hintHidden = false;
  function hideHint() { if (!hintHidden) { hintHidden = true; hint.style.opacity = '0'; setTimeout(() => hint.remove(), 600); } }
  window.addEventListener('pointerdown', () => setTimeout(hideHint, 2500), { once: true });
  setTimeout(hideHint, 9000);

  /* ---------- folder covers derived from interior photos ---------- */
  // Each folder's stacked squircle is painted from the images dropped INSIDE
  // it: 1st filled slot -> front cover, 2nd -> middle card, 3rd -> back card.
  // Falls back to the card's tint gradient when a layer has no photo yet.
  const FOLDER_SLOTS = {
    'ic-work':  ['th-tourhero', 'th-errunds', 'th-figma', 'th-3dme'],
    'ic-photo': ['ph-1', 'ph-2', 'ph-3', 'ph-4', 'ph-5', 'ph-6'],
    'ic-dotb':  ['d-1', 'd-2', 'd-3', 'd-4', 'd-5', 'd-6'],
  };
  function folderImages(ids) {
    const out = [];
    const get = window.ImageSlots && window.ImageSlots.get;
    if (!get) return out;
    ids.forEach(id => {
      const v = get(id);
      if (v && v.u && /^data:image\//i.test(v.u)) out.push(v.u);
    });
    return out;
  }
  function paintLayer(card, url) {
    if (!card) return;
    const ph = card.querySelector('.ph');
    if (!ph) return;
    if (url) { ph.style.backgroundImage = 'url("' + url + '")'; card.classList.add('has-photo'); }
    else { ph.style.backgroundImage = ''; card.classList.remove('has-photo'); }
  }
  function updateFolder(iconId) {
    const ic = document.getElementById(iconId);
    if (!ic) return;
    const imgs = folderImages(FOLDER_SLOTS[iconId]);
    paintLayer($('.fc-front', ic), imgs[0]);
    paintLayer($('.fc-b1', ic), imgs[1]);
    paintLayer($('.fc-b2', ic), imgs[2]);
  }
  // single-app icons whose cover mirrors one slot dropped inside their window
  const SINGLE_COVERS = { 'ic-about': 'about-photo' };
  function updateSingles() {
    const get = window.ImageSlots && window.ImageSlots.get;
    if (!get) return;
    Object.keys(SINGLE_COVERS).forEach(iconId => {
      const ic = document.getElementById(iconId);
      if (!ic) return;
      const v = get(SINGLE_COVERS[iconId]);
      const url = (v && v.u && /^data:image\//i.test(v.u)) ? v.u : null;
      paintLayer($('.scard', ic), url);
    });
  }
  function updateAllFolders() { Object.keys(FOLDER_SLOTS).forEach(updateFolder); updateSingles(); }
  if (window.ImageSlots) {
    window.ImageSlots.whenLoaded().then(updateAllFolders);
    window.ImageSlots.subscribe(updateAllFolders);
    updateAllFolders();
  }

  /* ---------- keep things on-screen on resize ---------- */
  window.addEventListener('resize', () => {
    $$('.icon').forEach(ic => {
      const b = iconBounds(ic);
      ic.style.left = clamp(parseFloat(ic.style.left) || 0, b.minX, b.maxX) + 'px';
      ic.style.top = clamp(parseFloat(ic.style.top) || 0, b.minY, b.maxY) + 'px';
    });
  });
})();
