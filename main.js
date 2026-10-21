(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!window.gsap;
  document.documentElement.classList.add(hasGsap && !reduce ? 'js' : 'nojs');
  window.labelProgress = 0;

  if (!hasGsap) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 3), smoothTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      lenis ? lenis.scrollTo(t, { offset: -10 }) : t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- nav ---------- */
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: () => innerHeight * 0.85, end: 'max',
    onToggle: s => nav.classList.toggle('solid', s.isActive)
  });

  /* ---------- hero intro: the first stitch ---------- */
  if (!reduce) {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.hero-media img', { scale: 1.18, opacity: 0, duration: 2.2, ease: 'power2.out' })
      .from('.hero-title .line > span', { yPercent: 110, duration: 1.3, stagger: 0.12 }, 0.2)
      .from('.hero .tag, .hero-sub, .hero-cta, .hero-proof li, .hero-spec', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.7);
    gsap.to('.hero-media img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- reveals: pieces placed calmly ---------- */
  if (!reduce) {
    ScrollTrigger.batch('.reveal', {
      start: 'top 88%', once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, overwrite: true })
    });
  }

  /* ---------- the switch: color comes back on your side ---------- */
  const youImg = document.querySelector('.you .switch-img img');
  if (youImg && !reduce) {
    gsap.fromTo(youImg, { filter: 'grayscale(1)' }, {
      filter: 'grayscale(0)', ease: 'none',
      scrollTrigger: { trigger: '.switch-grid', start: 'top 70%', end: 'center 45%', scrub: true }
    });
  }

  /* ---------- process: crossing the Pacific ---------- */
  const route = document.getElementById('routeLine');
  const rLen = route.getTotalLength();
  gsap.set(route, { strokeDasharray: rLen, strokeDashoffset: rLen });
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const steps = document.getElementById('steps');
    const dist = () => steps.scrollWidth - innerWidth;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#process', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true }
    });
    tl.to(steps, { x: () => -dist(), ease: 'none' }, 0)
      .to(route, { strokeDashoffset: 0, ease: 'none' }, 0)
      .to('.step-img img', { scale: 1, ease: 'none' }, 0);
  });
  mm.add('(max-width: 760px)', () => {
    gsap.to(route, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 70%', end: 'bottom 70%', scrub: true } });
    gsap.utils.toArray('.step-img img').forEach(img =>
      gsap.to(img, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom 40%', scrub: true } }));
  });

  /* ---------- label: cut, stitch, label ---------- */
  const phases = [
    { at: 0, name: 'CUT', tag: 'Chapter 04 / Cut', title: 'Flat pieces on a cutting table&hellip;' },
    { at: 0.32, name: 'STITCH', tag: 'Chapter 04 / Stitch', title: '&hellip;stitched together by <em>vetted</em> factories&hellip;' },
    { at: 0.6, name: 'LABEL', tag: 'Chapter 04 / Label', title: '&hellip;and finished with <em>your</em> label.' }
  ];
  const tagEl = document.getElementById('labelTag');
  const titleEl = document.getElementById('labelTitle');
  const tools = document.getElementById('labelTools');
  const bar = document.getElementById('phaseBar');
  const phaseName = document.getElementById('phaseName');
  let cur = 0, toolsOn = false;
  const setPhase = i => {
    if (i === cur) return;
    cur = i;
    gsap.to([tagEl, titleEl], {
      opacity: 0, y: -10, duration: 0.25, onComplete: () => {
        tagEl.textContent = phases[i].tag; titleEl.innerHTML = phases[i].title; phaseName.textContent = phases[i].name;
        gsap.fromTo([tagEl, titleEl], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      }
    });
  };
  ScrollTrigger.create({
    trigger: '#label', start: 'top top', end: () => '+=' + innerHeight * 2.6, pin: true, scrub: true,
    onUpdate: s => {
      const p = s.progress;
      window.labelProgress = p;
      bar.style.width = (p * 100).toFixed(1) + '%';
      let i = 0; phases.forEach((ph, k) => { if (p >= ph.at) i = k; });
      setPhase(i);
      const on = p > 0.72;
      if (on !== toolsOn) {
        toolsOn = on;
        gsap.to(tools, { autoAlpha: on ? 1 : 0, y: on ? 0 : 20, duration: 0.6, ease: 'power3.out' });
      }
    }
  });
  const brand = document.getElementById('brandInput');
  const woven = document.getElementById('wovenText');
  brand.addEventListener('input', () => {
    const v = brand.value.trim().toUpperCase() || 'YOUR BRAND';
    woven.textContent = v;
    window.dispatchEvent(new CustomEvent('brand', { detail: v }));
  });
  document.querySelectorAll('.sw').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sw').forEach(x => x.classList.toggle('active', x === b));
    window.dispatchEvent(new CustomEvent('fabric', { detail: b.dataset.color }));
  }));

  /* ---------- stats ---------- */
  document.querySelectorAll('[data-count]').forEach(el => {
    const n = +el.dataset.count, suf = el.dataset.suffix || '';
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => gsap.to(o, { v: n, duration: reduce ? 0 : 1.6, ease: 'power2.out', onUpdate: () => el.textContent = Math.round(o.v) + suf })
    });
  });

  /* ---------- FAQ: tags swing open ---------- */
  document.querySelectorAll('.hangtag').forEach(d => d.addEventListener('toggle', () => {
    if (d.open && !reduce) gsap.fromTo(d.querySelector('p'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }));

  /* ---------- the thread ---------- */
  const svg = document.getElementById('thread');
  const path = document.getElementById('threadPath');
  const needle = document.getElementById('needle');
  let samples = [], total = 0;
  const docPt = (el, fx = 0.5, fy = 0.5) => {
    const r = el.getBoundingClientRect();
    return [r.left + r.width * fx, r.top + window.scrollY + r.height * fy];
  };
  const buildThread = () => {
    svg.setAttribute('height', 0);
    const W = document.documentElement.clientWidth;
    const mobile = W < 761;
    const edgeL = mobile ? 8 : W * 0.035, edgeR = mobile ? W - 8 : W * 0.965;
    const q = s => document.querySelector(s);
    const pts = [
      docPt(q('.hero-spec'), mobile ? 0.5 : 0.85, -2),
      docPt(q('.hero'), 0.93, 1.02),
      docPt(q('.switch .h2'), mobile ? 1.0 : 0.92, 0.5),
      mobile ? [edgeR, docPt(q('.switch-arrow'))[1] - 40] : docPt(q('.switch-arrow'), 0.05, 0.5),
      docPt(q('.switch-arrow'), 0.95, 0.5),
      [edgeR, docPt(q('.switch-grid'), 0, 1)[1] + 60],
      [edgeL, docPt(q('.services .sec-head'), 0, 0.5)[1]],
      [edgeL, docPt(q('.pieces'), 0, 0.5)[1]],
      [W * 0.5, docPt(q('.pieces'), 0, 1)[1] + 70],
      docPt(q('#process'), 0.7, 0.05),
      docPt(q('.trust .sec-head'), 0.98, 0.5),
      [edgeR, docPt(q('.stats'), 0, 1)[1] + 40],
      [edgeL, docPt(q('.trust-grid'), 0, 0.5)[1]],
      [edgeL, docPt(q('.faq'), 0, 0.2)[1]],
      docPt(q('.faq .tags'), 0.5, 0.6),
      docPt(q('#quote'), 0.65, 0.02)
    ];
    // catmull-rom -> cubic bezier
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    svg.setAttribute('height', document.documentElement.scrollHeight);
    svg.setAttribute('width', W);
    path.setAttribute('d', d);
    total = path.getTotalLength();
    path.style.strokeDasharray = total;
    samples = [];
    let maxY = -Infinity;
    for (let l = 0; l <= total; l += 6) {
      const p = path.getPointAtLength(l);
      maxY = Math.max(maxY, p.y);
      samples.push({ l, y: maxY });
    }
    updateThread();
  };
  const updateThread = () => {
    if (!samples.length) return;
    const target = window.scrollY + innerHeight * 0.62;
    let lo = 0, hi = samples.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; samples[m].y < target ? lo = m + 1 : hi = m; }
    const len = samples[lo].l;
    path.style.strokeDashoffset = total - len;
    const a = path.getPointAtLength(len), b = path.getPointAtLength(Math.max(0, len - 4));
    const ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI - 90;
    needle.setAttribute('transform', `translate(${a.x},${a.y}) rotate(${ang})`);
    needle.style.opacity = len >= total - 1 || len < 2 ? 0 : 1;
  };
  ScrollTrigger.addEventListener('refresh', buildThread);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateThread });
  window.addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------- sticky CTA (mobile) ---------- */
  const sticky = document.getElementById('stickyCta');
  sticky.classList.add('hide');
  ScrollTrigger.create({
    start: () => innerHeight * 0.6, endTrigger: '#quote', end: 'top bottom',
    onToggle: s => sticky.classList.toggle('hide', !s.isActive)
  });

  /* ---------- tech pack form ---------- */
  const form = document.getElementById('techpack');
  const msg = document.getElementById('formMsg');
  document.getElementById('tpNo').textContent = 'NO. ' + String(Math.floor(Math.random() * 9000) + 1000);
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach(f => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    const chips = form.querySelector('.chips');
    const anySvc = form.querySelectorAll('input[name=svc]:checked').length > 0;
    chips.classList.toggle('invalid', !anySvc);
    if (!anySvc) ok = false;
    if (!ok) { msg.textContent = 'Please fill in the fields marked in red.'; return; }
    const name = form.elements['name'].value.trim().split(' ')[0];
    form.classList.add('sent');
    msg.innerHTML = `Thank you, ${name.replace(/</g, '&lt;')}.<br>Your tech pack is in. We will reply within one business day.`;
    lenis ? lenis.scrollTo('#quote') : form.scrollIntoView({ behavior: 'smooth' });
    ScrollTrigger.refresh();
  });
  form.addEventListener('input', e => e.target.classList && e.target.classList.remove('invalid'));
})();
