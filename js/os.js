/* ============================================================
   Theresa Kong — Desktop OS engine
   drag · hover-tilt · window manager · theme · corgi
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

  /* ---------- icon positions (persist + responsive) ---------- */
  const POS = LS.get('tk.iconpos.v3', {});
  // The authored coords are tuned for a ~1440px-wide canvas. Capture them once
  // (before any clamp/anchor overwrites the inline style) so layoutIcon can
  // re-anchor the right-side cluster to the live viewport on load and resize.
  const DESIGN_W = 1440;
  $$('.icon').forEach(ic => {
    ic._dx = parseFloat(ic.style.left) || 0;
    ic._dy = parseFloat(ic.style.top) || 0;
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
      if (e.target.closest('input,textarea,button,a,.sw,.lights span,.rz')) return;
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
    maxX: Math.max(4, window.innerWidth - el.offsetWidth - 4),
    maxY: Math.max(52, window.innerHeight - el.offsetHeight - 4)
  });

  // Place one icon for the current viewport. A user-dragged icon keeps its
  // saved spot; otherwise icons authored on the right half are pinned to the
  // viewport's right edge (so the folder cluster stays visible as the window
  // shrinks) and the rest keep their authored offset. Everything is clamped
  // on-screen at the end.
  function layoutIcon(ic) {
    const saved = POS[ic.id];
    if (saved) {
      ic.style.left = saved.x + 'px'; ic.style.top = saved.y + 'px';
    } else if (ic._dx > DESIGN_W * 0.5) {
      ic.style.left = (window.innerWidth - (DESIGN_W - ic._dx)) + 'px';
      ic.style.top = ic._dy + 'px';
    } else {
      ic.style.left = ic._dx + 'px'; ic.style.top = ic._dy + 'px';
    }
    const b = iconBounds(ic);
    ic.style.left = clamp(parseFloat(ic.style.left) || 0, b.minX, b.maxX) + 'px';
    ic.style.top = clamp(parseFloat(ic.style.top) || 0, b.minY, b.maxY) + 'px';
  }

  $$('.icon').forEach(ic => {
    layoutIcon(ic);

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
  // shared open/close timings (seconds) — open and close mirror each other;
  // kept snappy. `fly`/`shoot` are the directional travel, `pop`/`settle` the
  // small overshoot beat on either end.
  const ANIM = { fly: 0.30, settle: 0.07, pop: 0.07, shoot: 0.30 };
  const WIN_SIZE = {
    about:     { w: 540, h: 480 },
    work:      { w: 760, h: 620 },
    photo:     { w: 720, h: 600 },
    dotb:      { w: 760, h: 600 },
    resume:    { w: 700, h: 860 },
    'proj-tourhero': { w: 720, h: 680 },
    'proj-errunds':  { w: 720, h: 680 },
    'proj-figma':    { w: 680, h: 600 },
    'proj-3dme':     { w: 680, h: 560 },
  };
  const WIN_TITLE = {
    about: 'About', work: 'Work', photo: 'Photography', dotb: 'Do Outside the Box',
    resume: 'resume.pdf',
    'proj-tourhero': 'Work / TourHero', 'proj-errunds': 'Work / Errunds',
    'proj-figma': 'Work / Figma Plugin', 'proj-3dme': 'Work / 3D Me',
  };
  // these open big — 90% of the viewport, centered
  const LARGE = new Set(['work', 'photo', 'dotb', 'proj-tourhero', 'proj-errunds', 'proj-figma', 'proj-3dme']);

  function openWindow(key, originEl) {
    if (openWins.has(key)) {
      const w = openWins.get(key);
      if (w && document.body.contains(w)) {
        if (w.dataset.min) restoreWindow(w); // bring a minimized window back
        bump(w); pulse(w); return;
      }
      openWins.delete(key); // stale ref — fall through and recreate
    }
    const tmpl = $('#tmpl-' + key);
    if (!tmpl) return;
    const size = WIN_SIZE[key] || { w: 700, h: 600 };
    const large = LARGE.has(key);
    let w, h, left, top;
    if (large) {
      // narrower, responsive, centred — capped so it never sprawls on wide screens
      const MB = 48, GAP = 22;
      w = clamp(Math.round(window.innerWidth * 0.74), 560, 1060);
      h = clamp(Math.round(window.innerHeight * 0.84), 420, window.innerHeight - MB - GAP * 2);
      left = Math.round((window.innerWidth - w) / 2);
      top = clamp(Math.round((window.innerHeight - h) / 2), MB + GAP, window.innerHeight - h - GAP);
    } else if (key === 'about') {
      w = Math.min(size.w, window.innerWidth - 32);
      h = Math.min(size.h, window.innerHeight - 80);
      left = 24;
      top = 68;
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

    // remember the icon that opened this window (fall back to the desktop icon
    // for this key — e.g. About opens on load with no originEl) so both the
    // open and close animations can fly to/from the folder's position.
    let orig = originEl || document.querySelector('.icon[data-open="' + key + '"]');
    win._originEl = orig || null;

    const titleLabel = WIN_TITLE[key] || '';
    const pathHtml = titleLabel.includes(' / ')
      ? `<span class="path">${titleLabel.split(' / ')[0]} / </span>${titleLabel.split(' / ')[1]}`
      : titleLabel;

    win.innerHTML =
      `<div class="bar">
         <div class="lights"><span class="c" title="Close"></span><span class="y" title="Minimize"></span><span class="g" title="Zoom"></span></div>
         <div class="wt">${pathHtml}</div>
       </div>
       <div class="body"></div>
       <div class="rz rz-n"></div><div class="rz rz-s"></div><div class="rz rz-e"></div><div class="rz rz-w"></div>
       <div class="rz rz-ne"></div><div class="rz rz-nw"></div><div class="rz rz-se"></div><div class="rz rz-sw"></div>`;
    $('.body', win).appendChild(tmpl.content.cloneNode(true));
    host.appendChild(win);
    openWins.set(key, win);
    bump(win);
    setRunning(key, true);

    // Directional open — the inverse of close: the window springs out FROM its
    // folder, flying in along the folder→window vector while enlarging, then a
    // tiny settle. Mirrors closeWindow() so open/close feel like one motion.
    if (orig && document.body.contains(orig) && window.gsap) {
      const ir = orig.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      const dx = (ir.left + ir.width / 2) - (wr.left + wr.width / 2);
      const dy = (ir.top + ir.height / 2) - (wr.top + wr.height / 2);
      win.style.animation = 'none'; // disable the CSS winIn so GSAP owns transform
      win.style.transformOrigin = '50% 50%';
      gsap.killTweensOf(win);
      gsap.timeline()
        .fromTo(win,
          { x: dx, y: dy, scale: 0.04, opacity: 0 },
          { x: 0, y: 0, scale: 1.03, opacity: 1, duration: ANIM.fly, ease: 'power3.out' })
        .to(win, { scale: 1, duration: ANIM.settle, ease: 'power2.out' });
    }

    // traffic lights: close / minimize / zoom
    $('.lights .c', win).addEventListener('click', (e) => { e.stopPropagation(); closeWindow(key); });
    $('.lights .y', win).addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(win); });
    $('.lights .g', win).addEventListener('click', (e) => { e.stopPropagation(); toggleZoom(win); });
    makeResizable(win);
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
    openWins.delete(key);
    setRunning(key, false);

    // Prefer the icon that opened this window; otherwise fall back to the
    // desktop icon for this key (e.g. About, which opens on load) so the
    // window still shoots toward its folder.
    let orig = win._originEl;
    if (!orig || !document.body.contains(orig)) {
      orig = document.querySelector('.icon[data-open="' + key + '"]');
    }
    if (orig && document.body.contains(orig) && window.gsap) {
      // Shoot the window toward its folder: a tiny anticipatory pop, then it
      // shrinks and flies in the direction of the folder's position, landing
      // right where the folder sits — the inverse of the open-from-folder pop.
      const ir = orig.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      const dx = (ir.left + ir.width / 2) - (wr.left + wr.width / 2);
      const dy = (ir.top + ir.height / 2) - (wr.top + wr.height / 2);
      win.style.transition = 'none';
      // Clear the winIn keyframe animation — with fill:both it locks the final
      // transform and would override GSAP's inline transform otherwise.
      win.style.animation = 'none';
      win.style.transformOrigin = '50% 50%';
      gsap.killTweensOf(win);
      gsap.timeline({ onComplete: () => win.remove() })
        .to(win, { scale: 1.03, duration: ANIM.pop, ease: 'power2.out' })
        .to(win, { x: dx, y: dy, scale: 0.04, opacity: 0,
                   duration: ANIM.shoot, ease: 'power3.in' });
    } else {
      win.classList.add('closing');
      setTimeout(() => win.remove(), 440);
    }
  }
  function pulse(win) {
    win.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }],
      { duration: 240, easing: 'ease-out' }
    );
  }

  /* ---------- minimize / restore (yellow light) ---------- */
  function minimizeWindow(win) {
    win.dataset.min = '1';
    win.style.transition = 'transform .3s var(--ease), opacity .3s var(--ease)';
    win.style.transformOrigin = '50% 100%';
    win.style.transform = 'scale(.35) translateY(70vh)';
    win.style.opacity = '0';
    win.style.pointerEvents = 'none';
    setTimeout(() => { if (win.dataset.min) win.style.visibility = 'hidden'; }, 300);
  }
  function restoreWindow(win) {
    delete win.dataset.min;
    win.style.visibility = '';
    win.style.pointerEvents = '';
    win.style.transition = 'transform .34s var(--spring), opacity .3s var(--ease)';
    win.style.transform = '';
    win.style.opacity = '1';
    setTimeout(() => { win.style.transition = ''; }, 360);
  }

  /* ---------- zoom: toggle maximize / restore (green light) ---------- */
  function toggleZoom(win) {
    const MB = 48, GAP = 14;
    win.style.transition = 'left .3s var(--ease), top .3s var(--ease), width .3s var(--ease), height .3s var(--ease)';
    if (win.dataset.zoom) {
      win.style.left = win.dataset.pl; win.style.top = win.dataset.pt;
      win.style.width = win.dataset.pw; win.style.height = win.dataset.ph;
      delete win.dataset.zoom;
    } else {
      win.dataset.pl = win.style.left; win.dataset.pt = win.style.top;
      win.dataset.pw = win.style.width; win.dataset.ph = win.style.height;
      win.style.left = GAP + 'px'; win.style.top = (MB + GAP) + 'px';
      win.style.width = (window.innerWidth - GAP * 2) + 'px';
      win.style.height = (window.innerHeight - MB - GAP * 2) + 'px';
      win.dataset.zoom = '1';
    }
    setTimeout(() => { win.style.transition = ''; }, 320);
  }

  /* ---------- drag-the-edges to resize ---------- */
  function makeResizable(win) {
    const MIN_W = 360, MIN_H = 260;
    $$('.rz', win).forEach(handle => {
      const dir = (handle.className.match(/rz-([a-z]+)/) || [])[1] || '';
      const E = dir.includes('e'), W = dir.includes('w'), S = dir.includes('s'), N = dir.includes('n');
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        bump(win);
        delete win.dataset.zoom; // a manual resize ends the zoomed state
        try { handle.setPointerCapture(e.pointerId); } catch {}
        const r = win.getBoundingClientRect();
        const sx = e.clientX, sy = e.clientY, x0 = r.left, y0 = r.top, w0 = r.width, h0 = r.height;
        win.style.transition = 'none';
        const move = ev => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          let nx = x0, ny = y0, nw = w0, nh = h0;
          if (E) nw = Math.max(MIN_W, w0 + dx);
          if (W) { nw = Math.max(MIN_W, w0 - dx); nx = x0 + (w0 - nw); }
          if (S) nh = Math.max(MIN_H, h0 + dy);
          if (N) { nh = Math.max(MIN_H, h0 - dy); ny = y0 + (h0 - nh); }
          win.style.left = nx + 'px'; win.style.top = ny + 'px';
          win.style.width = nw + 'px'; win.style.height = nh + 'px';
        };
        const up = () => {
          try { handle.releasePointerCapture(e.pointerId); } catch {}
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', up);
          handle.removeEventListener('pointercancel', up);
          win.style.transition = '';
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', up);
        handle.addEventListener('pointercancel', up);
      });
    });
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
  // Author-set cover URLs, read once from the window templates so a folder can
  // show its authored covers on the desktop before any window is ever opened.
  const SLOT_SRC = (() => {
    const map = {};
    document.querySelectorAll('template').forEach(t => {
      t.content.querySelectorAll('image-slot[id][src]').forEach(s => { map[s.id] = s.getAttribute('src'); });
    });
    return map;
  })();
  // Filled covers for a folder, front-to-back in slot order. A user drop (data
  // URL in the store) wins; otherwise the slot's authored src is used. Empty
  // slots are skipped, so the first slot that HAS a cover becomes the front
  // card on the desktop folder.
  function folderImages(ids) {
    const out = [];
    const get = window.ImageSlots && window.ImageSlots.get;
    ids.forEach(id => {
      const v = get && get(id);
      const dropped = (v && v.u && /^data:image\//i.test(v.u)) ? v.u : null;
      const url = dropped || SLOT_SRC[id] || null;
      if (url) out.push(url);
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

  /* ---------- "hello" welcome veil ---------- */
  // Hand-draws the script word via stroke-dashoffset, holds, fades the word,
  // then splits the glass panes apart to uncover the desktop. Click skips.
  (function helloIntro() {
    const intro = $('#helloIntro');
    if (!intro) return;
    const DRAW = 2600, HOLD = 650, FADE = 550, SPLIT = 1000;
    const timers = [];
    let phase = 0;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const fadeWord = () => { phase = 1; intro.classList.add('hi-fade'); };
    const split = () => { phase = 2; intro.classList.add('hi-split'); };
    const done = () => { phase = 3; timers.forEach(clearTimeout); intro.classList.add('hi-done'); };
    // Safety net: no matter what, never let the veil trap the desktop.
    const safety = setTimeout(done, DRAW + HOLD + FADE + SPLIT + 2500);
    try {
      const inks = $$('.hi-ink', intro); // one path per letter, writing order
      if (reduceMotion || !inks.length) {
        // skip the write-on — letters are fully drawn (word shown), then fade
        later(() => intro.classList.add('hi-out'), 1100);
        later(done, 2000);
      } else {
        // Draw each letter in turn: the next starts as the previous finishes, so
        // the pen sweeps across the word h→e→l→l→o — a true sequential write-on.
        const lens = inks.map((p) => p.getTotalLength());
        const total = lens.reduce((a, b) => a + b, 0) || 1;
        let acc = 0;
        const plan = inks.map((p, idx) => {
          const dur = DRAW * lens[idx] / total, delay = acc; acc += dur;
          p.style.strokeDasharray = lens[idx];
          p.style.strokeDashoffset = lens[idx];
          return { p, dur, delay };
        });
        intro.getBoundingClientRect(); // commit the start state before transitioning
        requestAnimationFrame(() => {
          plan.forEach(({ p, dur, delay }) => {
            p.style.transition = 'stroke-dashoffset ' + dur + 'ms linear ' + delay + 'ms';
            p.style.strokeDashoffset = '0';
          });
        });
        later(fadeWord, DRAW + HOLD);
        later(split, DRAW + HOLD + FADE);
        later(() => { done(); clearTimeout(safety); }, DRAW + HOLD + FADE + SPLIT + 80);
      }
    } catch (e) { done(); clearTimeout(safety); }
    intro.addEventListener('pointerdown', () => {
      if (phase >= 2) { done(); return; }
      timers.forEach(clearTimeout);
      fadeWord(); split();
      later(done, SPLIT + 60);
    });
  })();

  /* ---------- macOS desktop: icons stay put on resize ----------
     Icons are placed once on load (layoutIcon) and only move when dragged, so
     resizing the window never shuffles them. The wallpaper is a CSS `cover`
     background, so it keeps filling the whole screen on its own. */

  /* ---------- About opens by default ---------- */
  // The bio + "how I think" notes now live inside About, so it greets the
  // visitor already open (behind the hello veil, revealed when it splits).
  openWindow('about');
})();
