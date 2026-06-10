/* timeline.js — the scrubbable "path". Each era is a rich milestone: drag the
   rail or click a year and the era's story + visual crossfades in. Red marks
   the active moment and its measurable impact (consistent meaning page-wide). */
(function () {
  const eras = [
    {
      pos: 0.10, year: '2020 — 2021', kicker: 'Where it started',
      role: 'UX / UI Designer', co: 'Errunds', slot: 'era0',
      moves: [
        'Designed + launched 3 core MVPs across mobile and web',
        'Built a scalable grocery taxonomy and component library',
        'Validated multi-SKU navigation through usability testing',
      ],
      impact: '100% task success · −50% completion time', tick: "'20—'21 · Errunds",
    },
    {
      pos: 0.55, year: '2021 — 2025', kicker: 'Founding designer',
      role: 'Product Designer', co: 'TourHero', slot: 'era1',
      moves: [
        'Led 0 → 1 consumer strategy as the founding designer',
        'Architected the end-to-end journey + post-purchase readiness portal',
        'Turned multi-sided feasibility into centralized ops dashboards',
      ],
      impact: '0 → scale over four years', tick: "'21—'25 · TourHero",
    },
    {
      pos: 0.93, year: '2025 — 2026', kicker: 'Most recent',
      role: 'Senior Product Designer', co: 'TourHero', slot: 'era2',
      moves: [
        'Directed end-to-end design for a three-sided marketplace',
        'Built AI-assisted customization that turns intent into deliverables',
        "Defined the autonomous \u201CSelf-Launch\u201D ecosystem",
      ],
      impact: 'Same-day publishing · −25 hrs / week', tick: "'25—'26 · Senior",
    },
  ];

  const stage = document.getElementById('eraStage');
  const track = document.getElementById('track');
  const rail = track.querySelector('.rail');
  const prog = document.getElementById('prog');
  const ticks = document.getElementById('ticks');

  // build era panels
  eras.forEach((e, i) => {
    const el = document.createElement('div');
    el.className = 'era';
    el.dataset.era = i;
    el.innerHTML = `
      <div class="era-info">
        <div class="yr">${e.year} · ${e.kicker}</div>
        <h3>${e.role}</h3>
        <div class="co">${e.co}</div>
        <ul class="moves">${e.moves.map((m) => `<li>${m}</li>`).join('')}</ul>
        <div class="imp"><span class="imp-dot"></span>${e.impact}</div>
      </div>
      <div class="vis">
        <div class="frame">
          <div class="bar"><i></i><i></i><i></i><div class="url">${e.co.toLowerCase()} · ${e.year.replace(/\s/g, '')}</div></div>
          <div class="stage"><image-slot id="${e.slot}" placeholder="Drop a snapshot from ${e.co}" radius="0"></image-slot></div>
        </div>
      </div>`;
    stage.appendChild(el);
  });
  const panels = [...stage.querySelectorAll('.era')];

  // nodes + tick labels on the rail
  eras.forEach((e, i) => {
    const node = document.createElement('button');
    node.className = 'node'; node.dataset.era = i;
    node.style.left = (e.pos * 100) + '%';
    rail.appendChild(node);
    node.addEventListener('click', () => activate(i, true));

    const lab = document.createElement('div');
    lab.className = 'ticklabel'; lab.dataset.era = i;
    lab.style.left = (e.pos * 100) + '%';
    lab.textContent = e.tick;
    lab.addEventListener('click', () => activate(i, true));
    ticks.appendChild(lab);
  });
  const nodes = [...rail.querySelectorAll('.node')];
  const labs = [...ticks.querySelectorAll('.ticklabel')];

  let cur = -1;
  function activate(i, smooth) {
    if (i === cur) return; cur = i;
    panels.forEach((p, k) => p.classList.toggle('show', k === i));
    nodes.forEach((n, k) => n.classList.toggle('on', k === i));
    labs.forEach((l, k) => l.classList.toggle('on', k === i));
    prog.style.width = (eras[i].pos * 100) + '%';
  }

  // scrub the rail → nearest era
  function nearestAt(clientX) {
    const r = rail.getBoundingClientRect();
    const v = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    let best = 0, bd = Infinity;
    eras.forEach((e, i) => { const d = Math.abs(e.pos - v); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  let drag = false;
  rail.addEventListener('pointerdown', (e) => { drag = true; rail.setPointerCapture(e.pointerId); activate(nearestAt(e.clientX)); });
  rail.addEventListener('pointermove', (e) => { if (drag) activate(nearestAt(e.clientX)); });
  const up = () => { drag = false; };
  rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', up);

  // default to most recent; reveal when section enters view
  activate(eras.length - 1);
})();
