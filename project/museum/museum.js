/* ============================================================
   A MIND, ON EXHIBIT — interactions
   ============================================================ */
(function(){
'use strict';
const R='211,85,85', I='33,25,19', CREAM='243,236,221';
const AMBER='217,142,56', SAGE='78,148,106', PLUM='170,110,152';

/* ---------- custom cursor ---------- */
const cur=document.querySelector('.cur'), curR=document.querySelector('.cur-r');
let cx=innerWidth/2, cy=innerHeight/2, rx=cx, ry=cy;
addEventListener('mousemove',e=>{
  cx=e.clientX; cy=e.clientY;
  cur.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`;
  const hot=e.target.closest('a,button,.gcard,.exhibit,.toy,.swatch,.ptool,[data-case],.room-close,.next');
  curR.classList.toggle('hot',!!hot);
});
(function ring(){ rx+=(cx-rx)*.18; ry+=(cy-ry)*.18;
  curR.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
  requestAnimationFrame(ring); })();

/* ---------- entrance spotlight ---------- */
const entrance=document.querySelector('.entrance');
const spot=entrance.querySelector('.spot'), dust=entrance.querySelector('.dust');
entrance.addEventListener('mousemove',e=>{
  const x=e.clientX+'px', y=e.clientY+'px';
  spot.style.setProperty('--mx',x); spot.style.setProperty('--my',y);
  dust.style.setProperty('--mx',x); dust.style.setProperty('--my',y);
});

/* ---------- nav theme by scroll position over light/dark sections ---------- */
const nav=document.querySelector('.nav');
const lightZones=[...document.querySelectorAll('.foyer,.gallery.bright')];
function navTheme(){
  const y=42; let light=false;
  for(const z of lightZones){const r=z.getBoundingClientRect(); if(r.top<=y&&r.bottom>=y){light=true;break;}}
  nav.classList.toggle('light',light);
  document.body.classList.toggle('on-dark',!light);
}
addEventListener('scroll',navTheme,{passive:true}); navTheme();

/* ---------- reveal on scroll ---------- */
const io=new IntersectionObserver((es)=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
},{threshold:.16});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ============================================================
   CANVAS ART  — generative "exhibit pieces"
   ============================================================ */
function setup(cv,w,h){
  const d=Math.min(devicePixelRatio||1,2);
  cv.width=w*d; cv.height=h*d;
  const g=cv.getContext('2d'); g.setTransform(d,0,0,d,0,0);
  return g;
}
function wash(g,w,h,c1,c2){
  const grad=g.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,c1); grad.addColorStop(1,c2);
  g.fillStyle=grad; g.fillRect(0,0,w,h);
}

/* piece 0 — SELF-LAUNCH: network/system (hub + spokes) */
function artSystem(g,w,h,dark){
  wash(g,w,h, dark?'#16100d':'#efe7d6', dark?'#1d1411':'#e6ddc9');
  const cxp=w*.5, cyp=h*.46;
  const ns=[[.5,.46,17],[.2,.2,8],[.8,.2,8],[.16,.74,7],[.84,.74,7],[.5,.86,6],[.36,.12,5],[.66,.86,5]];
  for(let i=1;i<ns.length;i++){
    g.strokeStyle=`rgba(${R},${dark?.4:.26})`; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(cxp,cyp); g.lineTo(ns[i][0]*w,ns[i][1]*h); g.stroke();
  }
  g.strokeStyle=`rgba(${R},.16)`; g.lineWidth=9;
  g.beginPath(); g.arc(cxp,cyp,30,0,7); g.stroke();
  ns.forEach((n,i)=>{ g.fillStyle=i===0?`rgba(${R},.95)`:`rgba(${dark?CREAM:I},${i===0?1:.42})`;
    g.beginPath(); g.arc(n[0]*w,n[1]*h,n[2],0,7); g.fill(); });
}
/* piece 1 — 0→1 JOURNEY: funnel/flow */
function artFlow(g,w,h,dark){
  wash(g,w,h, dark?'#16100d':'#efe7d6', dark?'#1d1411':'#e6ddc9');
  for(let i=0;i<9;i++){const x=.08+i*.105, sp=.56-i*.05;
    for(let j=0;j<6;j++){const y=.16+j*sp/5, mid=j===3;
      g.fillStyle=i===8?`rgba(${R},${mid?.8:.32})`:`rgba(${dark?CREAM:I},${(mid?.5:.18)})`;
      g.beginPath(); g.arc(x*w,y*h,3+j*.4,0,7); g.fill(); }}
  g.strokeStyle=`rgba(${R},.45)`; g.lineWidth=2.2;
  g.beginPath(); g.moveTo(.08*w,.5*h); g.bezierCurveTo(.4*w,.02*h,.6*w,.98*h,.93*w,.5*h); g.stroke();
}
/* piece 2 — TAXONOMY: tree */
function artTree(g,w,h,dark){
  wash(g,w,h, dark?'#16100d':'#efe7d6', dark?'#1d1411':'#e6ddc9');
  (function br(x,y,dx,dy,d){ if(d<1)return;
    const nx=x+dx*w, ny=y+dy*h;
    g.strokeStyle=`rgba(${dark?CREAM:I},${d*.14})`; g.lineWidth=d*.85;
    g.beginPath(); g.moveTo(x,y); g.lineTo(nx,ny); g.stroke();
    g.fillStyle=d===3?`rgba(${R},.82)`:`rgba(${dark?CREAM:I},${.36})`;
    g.beginPath(); g.arc(nx,ny,2+d,0,7); g.fill();
    br(nx,ny,-dx*.52,dy*.82,d-1); br(nx,ny,dx*.52,dy*.82,d-1);
    if(d===3)br(nx,ny,0,dy*.82,d-1);
  })(w*.5,h*.08,0,.2,3);
}
const ART=[artSystem,artFlow,artTree];

/* gallery scene backgrounds for directory cards */
function gscene(cv, kind){
  const w=cv.clientWidth||600, h=cv.clientHeight||340, g=setup(cv,w,h);
  if(kind==='product'){
    wash(g,w,h,'#241a13','#16100d'); artSystemTint(g,w,h);
  } else if(kind==='photo'){
    // soft light study
    wash(g,w,h,'#2a1d18','#140d0b');
    for(let i=0;i<5;i++){ const gx=g.createRadialGradient(w*(.2+i*.16),h*(.3+(i%2)*.3),0,w*(.2+i*.16),h*(.3+(i%2)*.3),160);
      const cols=[AMBER,R,SAGE,PLUM,AMBER];
      gx.addColorStop(0,`rgba(${cols[i]},.5)`); gx.addColorStop(1,'transparent');
      g.fillStyle=gx; g.fillRect(0,0,w,h);}
  } else {
    wash(g,w,h,'#221813','#140d0b');
    const cols=[R,AMBER,SAGE,PLUM];
    for(let i=0;i<10;i++){ g.fillStyle=`rgba(${cols[i%4]},${.5})`;
      const s=12+Math.random()*30, x=Math.random()*w, y=Math.random()*h;
      if(i%3===0){g.beginPath();g.arc(x,y,s/2,0,7);g.fill();}
      else if(i%3===1){g.fillRect(x,y,s,s);}
      else{g.beginPath();g.moveTo(x,y);g.lineTo(x+s,y);g.lineTo(x+s/2,y-s);g.closePath();g.fill();}}
  }
}
function artSystemTint(g,w,h){
  const cxp=w*.7, cyp=h*.5;
  const ns=[[.7,.5,18],[.4,.24,9],[.92,.26,8],[.46,.78,8],[.86,.8,7],[.3,.6,6]];
  for(let i=1;i<ns.length;i++){ g.strokeStyle=`rgba(${R},.4)`; g.lineWidth=1.3;
    g.beginPath(); g.moveTo(cxp,cyp); g.lineTo(ns[i][0]*w,ns[i][1]*h); g.stroke(); }
  ns.forEach((n,i)=>{ g.fillStyle=i===0?`rgba(${R},.95)`:`rgba(${CREAM},.5)`;
    g.beginPath(); g.arc(n[0]*w,n[1]*h,n[2],0,7); g.fill(); });
}

/* toy tiles for Do Outside the Box (playful generative) */
function toyArt(cv,kind){
  const w=cv.clientWidth||220,h=cv.clientHeight||220,g=setup(cv,w,h);
  wash(g,w,h,'#f3ecdd','#e7dcc6');
  g.save();
  if(kind==='donut'){
    g.translate(w/2,h/2);
    g.fillStyle=`rgba(${PLUM},.92)`; g.beginPath(); g.arc(0,0,w*.3,0,7); g.fill();
    g.fillStyle='#f3ecdd'; g.beginPath(); g.arc(0,0,w*.12,0,7); g.fill();
    for(let i=0;i<18;i++){const a=i/18*7, r=w*.22; g.save(); g.translate(Math.cos(a)*r,Math.sin(a)*r); g.rotate(a);
      g.fillStyle=[`rgba(${R},.9)`,`rgba(${AMBER},.9)`,`rgba(${SAGE},.9)`][i%3]; g.fillRect(-1.6,-5,3.2,10); g.restore();}
  } else if(kind==='sushi'){
    g.translate(w/2,h/2);
    g.fillStyle='#f6f1e7'; g.beginPath(); g.arc(0,0,w*.3,0,7); g.fill();
    g.fillStyle=`rgba(${R},.88)`; g.beginPath(); g.arc(0,0,w*.17,0,7); g.fill();
    g.strokeStyle=`rgba(${I},.85)`; g.lineWidth=7; g.beginPath(); g.arc(0,0,w*.3,0,7); g.stroke();
  } else if(kind==='stairs'){
    const cols=[R,AMBER,SAGE,PLUM,'%'];
    for(let i=0;i<5;i++){ g.fillStyle=`rgba(${[R,AMBER,SAGE,PLUM,R][i]},.9)`;
      g.fillRect(w*.14*i, h-(i+1)*h*.16, w*.18, (i+1)*h*.16); }
  } else if(kind==='pigeon'){
    g.translate(w/2,h/2);
    g.fillStyle=`rgba(${R},.92)`;
    g.beginPath(); g.ellipse(0,0,w*.26,h*.17,0,0,7); g.fill();
    g.beginPath(); g.arc(w*.2,-h*.06,w*.1,0,7); g.fill();
    g.beginPath(); g.moveTo(w*.28,-h*.05); g.lineTo(w*.4,-h*.02); g.lineTo(w*.28,h*.02); g.closePath();
    g.fillStyle=`rgba(${AMBER},.95)`; g.fill();
  } else if(kind==='heart'){
    g.translate(w/2,h*.46); const s=w*.013;
    g.fillStyle=`rgba(${R},.92)`; g.beginPath();
    for(let t=0;t<7;t+=.05){const X=16*Math.pow(Math.sin(t),3);
      const Y=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));
      if(t===0)g.moveTo(X*s,Y*s); else g.lineTo(X*s,Y*s);} g.closePath(); g.fill();
  } else { /* slider */
    g.strokeStyle=`rgba(${I},.3)`; g.lineWidth=4; g.beginPath(); g.moveTo(w*.18,h/2); g.lineTo(w*.82,h/2); g.stroke();
    g.strokeStyle=`rgba(${R},.9)`; g.beginPath(); g.moveTo(w*.18,h/2); g.lineTo(w*.6,h/2); g.stroke();
    g.fillStyle=`rgba(${R},.95)`; g.beginPath(); g.arc(w*.6,h/2,w*.07,0,7); g.fill();
  }
  g.restore();
}

/* ---------- render all canvases ---------- */
function renderArt(){
  document.querySelectorAll('canvas[data-art]').forEach(cv=>{
    const w=cv.clientWidth||520, h=cv.clientHeight||340;
    const g=setup(cv,w,h); ART[+cv.dataset.art](g,w,h, cv.dataset.dark==='1');
  });
  document.querySelectorAll('canvas[data-scene]').forEach(cv=>gscene(cv,cv.dataset.scene));
  document.querySelectorAll('canvas[data-toy]').forEach(cv=>toyArt(cv,cv.dataset.toy));
}
renderArt();
let rt; addEventListener('resize',()=>{clearTimeout(rt); rt=setTimeout(renderArt,180);});

/* ============================================================
   VISITORS' WALL — paint canvas (persists in localStorage)
   ============================================================ */
const pc=document.getElementById('paint');
if(pc){
  const g=pc.getContext('2d');
  let color='#d35555', painting=false, last=null, strokes=0;
  const KEY='tk_visitors_wall_v1', CNT='tk_visitors_count_v1';
  function fit(){
    const r=pc.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2);
    const data=pc.width? g.getImageData(0,0,pc.width,pc.height):null;
    pc.width=r.width*d; pc.height=r.height*d; g.setTransform(d,0,0,d,0,0);
    g.fillStyle='#fbf7ee'; g.fillRect(0,0,r.width,r.height);
    restore();
  }
  function save(){ try{ localStorage.setItem(KEY,pc.toDataURL('image/png')); }catch(e){} }
  function restore(){
    const data=localStorage.getItem(KEY);
    if(data){ const img=new Image(); img.onload=()=>{
      const r=pc.getBoundingClientRect(); g.drawImage(img,0,0,r.width,r.height); }; img.src=data; }
  }
  function pos(e){ const r=pc.getBoundingClientRect();
    const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left, y:t.clientY-r.top}; }
  function down(e){ painting=true; last=pos(e); dot(last); e.preventDefault(); }
  function move(e){ if(!painting)return; const p=pos(e);
    g.strokeStyle=color; g.lineWidth=11; g.lineCap='round'; g.lineJoin='round';
    g.beginPath(); g.moveTo(last.x,last.y); g.lineTo(p.x,p.y); g.stroke(); last=p; e.preventDefault(); }
  function dot(p){ g.fillStyle=color; g.beginPath(); g.arc(p.x,p.y,5.5,0,7); g.fill(); }
  function up(){ if(!painting)return; painting=false;
    strokes++; if(strokes===1){ const n=(+localStorage.getItem(CNT)||284)+1;
      localStorage.setItem(CNT,n); countEl.textContent=n.toLocaleString(); }
    save(); }
  pc.addEventListener('mousedown',down); addEventListener('mousemove',move); addEventListener('mouseup',up);
  pc.addEventListener('touchstart',down,{passive:false}); pc.addEventListener('touchmove',move,{passive:false});
  pc.addEventListener('touchend',up);
  // palette
  document.querySelectorAll('.swatch').forEach(s=>{
    s.style.background=s.dataset.c;
    s.addEventListener('click',()=>{ color=s.dataset.c;
      document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('on')); s.classList.add('on'); });
  });
  document.querySelector('.swatch')?.classList.add('on');
  document.getElementById('clearWall')?.addEventListener('click',()=>{
    const r=pc.getBoundingClientRect(); g.fillStyle='#fbf7ee'; g.fillRect(0,0,r.width,r.height);
    localStorage.removeItem(KEY); save();
  });
  const countEl=document.getElementById('vcount');
  countEl.textContent=(+localStorage.getItem(CNT)||284).toLocaleString();
  fit(); addEventListener('resize',()=>{ clearTimeout(window.__pf); window.__pf=setTimeout(fit,200); });
}

/* ============================================================
   IMMERSIVE CASE ROOMS
   ============================================================ */
const CASES={
  errunds:{
    co:'TourHero · 2025 — 2026', title:'A self-launch ecosystem for a three-sided marketplace',
    tagline:'How do you collapse a 29-day, human-run quoting cycle into something that publishes the same day — without taking judgment out of human hands?',
    facts:[['Role','Senior Product Designer'],['Scope','End-to-end · AI workflow'],['Team','3 PMs · 6 engineers'],['Year','2025 — 2026']],
    steps:[
      {no:'01',name:'Empathize',h:'Three sides, three clocks, one bottleneck',
       p:['TourHero is a marketplace with <b>three stakeholders</b> — travelers who want a trip, hosts who design it, and an operations team brokering between them. Every trip took up to <b>29 days</b> to quote because a human coordinator sat in the middle of every exchange.',
          'I shadowed coordinators for two weeks and mapped where time actually went. The bottleneck wasn\u2019t the work — it was the <b>waiting</b> between three parties who were never online at the same time.'],
       art:0},
      {no:'02',name:'Define',hmw:'How might we let a host publish a sellable trip the same day they imagine it — while keeping a human in the approval loop?',
       p:['I reframed the problem away from \u201cmake coordinators faster\u201d toward \u201cremove the coordinator from the critical path.\u201d The constraint that mattered: trust. Hosts and ops both needed to feel the system was <b>drafting</b>, never <b>deciding</b>.']},
      {no:'03',name:'Ideate',h:'Let the machine draft; let the human judge',
       p:['I sketched a dozen flows, then converged on an <b>intent-capture layer</b>: the host answers a short, structured brief, AI assembles a first-pass itinerary and quote, and ops approves or nudges before it goes live.',
          'I weighed each idea against the real user flow — where does it reduce waiting, and where does it quietly remove agency? The winning flow added <b>one</b> approval gate, not five.'],
       chips:['User flow mapping','AI intent capture','Human-in-the-loop','Service blueprint'],art:1},
      {no:'04',name:'Prototype',h:'A draft you can trust at a glance',
       p:['The hi-fi prototype made the AI\u2019s reasoning <b>legible</b>: every generated line item showed where it came from, so ops could approve with confidence instead of re-checking everything from scratch.']},
      {no:'05',name:'Test',h:'Approve, don\u2019t re-author',
       p:['In testing with the ops team, the signal I watched for was whether reviewers <b>edited</b> or <b>re-authored</b>. By the final round they were approving drafts in minutes — the system had earned the handoff.']},
    ],
    impact:[['Same-day','publish, from 29 days'],['\u221225 hrs','coordinator time / week'],['3-sided','alignment, one surface']]
  },
  journey:{
    co:'TourHero · 2021 — 2025', title:'Building the 0 → 1 consumer journey',
    tagline:'No product, no design system, three competing surfaces. As founding designer, how do you make discovery, booking, and the messy middle feel like one calm experience?',
    facts:[['Role','Founding Product Designer'],['Scope','0 → 1 · whole journey'],['Span','Four years to scale'],['Year','2021 — 2025']],
    steps:[
      {no:'01',name:'Empathize',h:'A journey that fell apart after \u201cbook\u201d',
       p:['Travelers booked with excitement, then dropped into a <b>void</b> — weeks of logistics with no sense of progress. I interviewed travelers and hosts to map where confidence leaked out of the journey.'],art:1},
      {no:'02',name:'Define',hmw:'How might we turn the anxious gap between booking and departure into a place travelers actually want to return to?',
       p:['I defined the spine of the whole experience: <b>discover \u2192 book \u2192 prepare</b>. The third stage barely existed, yet it held the most anxiety — so that\u2019s where founding effort went.']},
      {no:'03',name:'Ideate',h:'A readiness portal for the messy middle',
       p:['I designed a <b>post-purchase readiness portal</b> that turns logistics into a trackable, reassuring checklist — flights, visas, group chats, payments — all in one calm surface.'],
       chips:['0 \u2192 1 product','Design system','Consumer flows','Ops dashboards'],art:0},
      {no:'04',name:'Prototype',h:'One system, three surfaces',
       p:['I built the first design system from zero so traveler, host, and ops surfaces shared one language — the same component meaning the same thing everywhere.']},
      {no:'05',name:'Test',h:'Calm is a measurable thing',
       p:['I watched for the moment travelers stopped emailing \u201cwhat happens next?\u201d The readiness portal absorbed those questions before they were asked.']},
    ],
    impact:[['0 \u2192 1','founding design'],['4 yrs','journey to scale'],['1 system','three surfaces']]
  },
  taxonomy:{
    co:'Errunds · 2020 — 2021', title:'Grocery taxonomy & multi-SKU navigation',
    tagline:'A grocery marketplace where shoppers couldn\u2019t find anything. How do you make a thousand SKUs feel like walking a well-organized aisle?',
    facts:[['Role','Product Designer'],['Scope','IA · navigation · components'],['Method','Tree-jack · usability'],['Year','2020 — 2021']],
    steps:[
      {no:'01',name:'Empathize',h:'Everything in the store, nothing findable',
       p:['Errunds wanted to help people rediscover local bodegas — shops with <b>thousands of items</b> and no coherent structure. I interviewed <b>5</b> regular bodega shoppers to learn how they actually hunt for things.'],art:2},
      {no:'02',name:'Define',hmw:'How might we help shoppers find what they need as quickly as they would walking their own neighborhood aisle?',
       p:['The real problem was <b>information architecture</b>, not visual design. I balanced what product owners wanted to feature against what users desperately needed: fast, reliable finding.']},
      {no:'03',name:'Ideate',h:'Mimic the physical aisle',
       p:['Why invent a new mental model when the store already has one? I organized items into a <b>tree hierarchy</b> mirroring how categories sit at the top of each physical aisle — then validated it with <b>tree-jack testing</b>.'],
       chips:['Tree hierarchy','Tree-jack testing','Original iconography','Component library'],art:2},
      {no:'04',name:'Prototype',h:'Designed down to the icon',
       p:['I drew an <b>original deli iconography set</b> in Figma so categories were recognizable at a glance, then systematized every pattern into reusable components.']},
      {no:'05',name:'Test',h:'Find it every time',
       p:['I ran <b>unmoderated usability testing</b> on 15 users in Maze, iterating the structure until task success hit 100% — finding worked every single time.']},
    ],
    impact:[['100%','task success rate'],['\u221250%','time to complete'],['1 library','reusable components']]
  }
};
const ORDER=['errunds','journey','taxonomy'];

const room=document.getElementById('room');
const roomBody=document.getElementById('roomBody');
const roomProgress=document.getElementById('roomProgress');

function buildRoom(key){
  const c=CASES[key]; if(!c)return;
  const steps=c.steps.map(s=>`
    <div class="step reveal">
      <div class="smark"><div class="sno">STEP ${s.no}</div><div class="sname">${s.name}</div></div>
      <div class="sbody">
        ${s.hmw?`<div class="hmw">${s.hmw}</div>`:''}
        ${s.h?`<h4>${s.h}</h4>`:''}
        ${s.p.map(p=>`<p>${p}</p>`).join('')}
        ${s.art!=null?`<div class="vis"><canvas data-art="${s.art}" data-dark="1" style="height:260px"></canvas></div>`:''}
        ${s.chips?`<div class="chips">${s.chips.map(t=>`<span>${t}</span>`).join('')}</div>`:''}
      </div>
    </div>`).join('');
  const facts=c.facts.map(f=>`<div class="fact"><div class="k">${f[0]}</div><div class="v">${f[1]}</div></div>`).join('');
  const imp=c.impact.map(m=>`<div class="ic"><div class="n">${m[0]}</div><div class="l">${m[1]}</div></div>`).join('');
  const i=ORDER.indexOf(key), next=ORDER[(i+1)%ORDER.length];
  roomBody.innerHTML=`
    <section class="room-open">
      <div class="inner">
        <div class="co">${c.co}</div>
        <h2>${c.title}</h2>
        <p class="tagline">${c.tagline}</p>
        <div class="facts">${facts}</div>
        <div class="scrollcue"><span class="ln"></span>Walk through the process</div>
      </div>
    </section>
    <section class="spine">${steps}</section>
    <section class="room-impact reveal">
      <div class="k">◆ &nbsp;What changed</div>
      <div class="grid">${imp}</div>
      <div class="next" data-next="${next}">Next exhibit — ${CASES[next].title.split(' ').slice(0,3).join(' ')}… <span class="arw">→</span></div>
    </section>`;
  // render new canvases
  roomBody.querySelectorAll('canvas[data-art]').forEach(cv=>{
    const w=cv.clientWidth||600,h=260,d=Math.min(devicePixelRatio||1,2);
    cv.width=w*d; cv.height=h*d; const g=cv.getContext('2d'); g.setTransform(d,0,0,d,0,0);
    ART[+cv.dataset.art](g,w,h,true);
  });
  // reveal observer for room
  const rio=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);} }),{threshold:.12,root:room});
  roomBody.querySelectorAll('.reveal').forEach(el=>rio.observe(el));
  roomBody.querySelector('.next').addEventListener('click',()=>{ buildRoom(next); room.scrollTo(0,0); });
}

function openRoom(key){
  buildRoom(key);
  room.classList.add('open'); document.body.style.overflow='hidden'; room.scrollTo(0,0);
}
function closeRoom(){ room.classList.remove('open'); document.body.style.overflow=''; }
document.querySelectorAll('[data-case]').forEach(el=>el.addEventListener('click',()=>openRoom(el.dataset.case)));
document.getElementById('roomClose').addEventListener('click',closeRoom);
addEventListener('keydown',e=>{ if(e.key==='Escape'&&room.classList.contains('open'))closeRoom(); });
room.addEventListener('scroll',()=>{ const max=room.scrollHeight-room.clientHeight;
  roomProgress.style.width=(max>0?room.scrollTop/max*100:0)+'%'; });

/* ---------- gallery directory + nav anchors smooth ---------- */
document.querySelectorAll('[data-scroll]').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault(); const t=document.querySelector(a.dataset.scroll);
  if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
}));
})();
