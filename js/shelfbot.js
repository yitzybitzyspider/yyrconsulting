(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);

  const GROUND = 262, BW = 36, BH = 30;
  // Shelf: three levels, three columns. Box bottoms rest on these plank heights.
  const LEVELS = [GROUND - 6, 188];
  const COLS = [544, 596, 648];
  const SHELF = { x0: 530, x1: 698, top: 150 };
  // Where the mess starts: scattered, tipped, some piled on others.
  const MESS = [
    { x: 70, y: GROUND, r: -14 },
    { x: 128, y: GROUND, r: 9 },
    { x: 98, y: GROUND - 30, r: 22 },
    { x: 232, y: GROUND, r: -28 },
    { x: 304, y: GROUND, r: 6 },
    { x: 388, y: GROUND, r: 15 },
  ];
  // A tipped box on the floor rests on its lowest corner, not through the floor.
  MESS.forEach((m) => {
    if (m.y !== GROUND) return;
    const t = Math.abs((m.r * Math.PI) / 180);
    m.y = GROUND - ((BW / 2) * Math.sin(t) + (BH / 2) * Math.cos(t) - BH / 2);
  });
  const ORDER = [5, 4, 3, 2, 1, 0];
  const REST = 478;

  function create(host) {
    const svg = el('svg', { viewBox: '34 126 690 150', class: 'sb', role: 'img', 'aria-label': 'Animation: a small robot picks up scattered boxes, places each one on a shelf, and labels it.' });
    host.prepend(svg);
    el('line', { x1: 40, y1: GROUND, x2: 718, y2: GROUND, class: 'sb-floor' }, svg);

    const shelf = el('g', { class: 'sb-line' }, svg);
    el('line', { x1: SHELF.x0, y1: GROUND, x2: SHELF.x0, y2: SHELF.top }, shelf);
    el('line', { x1: SHELF.x1, y1: GROUND, x2: SHELF.x1, y2: SHELF.top }, shelf);
    LEVELS.forEach((y) => el('line', { x1: SHELF.x0, y1: y, x2: SHELF.x1, y2: y }, shelf));
    el('line', { x1: SHELF.x0, y1: SHELF.top, x2: SHELF.x1, y2: SHELF.top }, shelf);

    const boxes = MESS.map(() => {
      const g = el('g', { class: 'sb-line sb-box' }, svg);
      el('rect', { x: 0, y: -BH, width: BW, height: BH, rx: 2, class: 'sb-fill' }, g);
      el('line', { x1: BW / 2, y1: -BH, x2: BW / 2, y2: -BH + 9 }, g);
      el('line', { x1: 0, y1: -BH + 6, x2: BW, y2: -BH + 6, class: 'sb-faint' }, g);
      const label = el('g', { class: 'sb-label' }, g);
      el('rect', { x: 7, y: -16, width: 22, height: 11, rx: 1.5 }, label);
      [11, 13.5, 15, 18, 20, 22.5, 25].forEach((x) => el('line', { x1: x, y1: -13.5, x2: x, y2: -7.5 }, label));
      return { g, label, x: 0, y: 0, r: 0 };
    });

    const robot = el('g', { class: 'sb-line sb-robot' }, svg);
    el('line', { x1: 26, y1: GROUND - 12, x2: 26, y2: 168 }, robot);
    el('line', { x1: 22, y1: GROUND - 40, x2: 26, y2: GROUND - 40 }, robot);
    el('rect', { x: -24, y: GROUND - 58, width: 46, height: 40, rx: 8, class: 'sb-fill' }, robot);
    el('rect', { x: -15, y: GROUND - 51, width: 28, height: 13, rx: 6.5 }, robot);
    const eyes = el('g', { class: 'sb-eyes' }, robot);
    el('circle', { cx: -6, cy: GROUND - 44.5, r: 1.8 }, eyes);
    el('circle', { cx: 4, cy: GROUND - 44.5, r: 1.8 }, eyes);
    el('line', { x1: -1, y1: GROUND - 58, x2: -1, y2: GROUND - 68 }, robot);
    el('circle', { cx: -1, cy: GROUND - 71, r: 3, class: 'sb-fill' }, robot);
    el('circle', { cx: -13, cy: GROUND - 9, r: 9, class: 'sb-fill' }, robot);
    el('circle', { cx: 12, cy: GROUND - 9, r: 9, class: 'sb-fill' }, robot);
    el('circle', { cx: -13, cy: GROUND - 9, r: 2 }, robot);
    el('circle', { cx: 12, cy: GROUND - 9, r: 2 }, robot);
    const fork = el('g', {}, robot);
    el('line', { x1: 26, y1: -16, x2: 26, y2: 0, class: 'sb-thick' }, fork);
    el('line', { x1: 26, y1: 0, x2: 66, y2: 0, class: 'sb-thick' }, fork);

    const status = host.querySelector('.shelfbot__count');
    const replay = host.querySelector('.shelfbot__replay');
    const state = { rx: REST, lift: GROUND, tracked: 0 };
    let run = 0;

    function draw() {
      robot.setAttribute('transform', `translate(${state.rx.toFixed(1)} 0)`);
      fork.setAttribute('transform', `translate(0 ${state.lift.toFixed(1)})`);
      for (const b of boxes) b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(1)} ${BW / 2} ${-BH / 2})`);
    }
    function setCount(n) {
      state.tracked = n;
      if (status) status.textContent = n === boxes.length ? `All ${n} units received, labeled and shelved` : `Units tracked: ${n} of ${boxes.length}`;
    }
    function tween(id, dur, fn, ease = easeInOut) {
      return new Promise((resolve) => {
        const t0 = performance.now();
        const frame = (now) => {
          if (id !== run) return resolve(false);
          const k = Math.min(1, (now - t0) / dur);
          fn(ease(k));
          draw();
          if (k < 1) requestAnimationFrame(frame); else resolve(true);
        };
        requestAnimationFrame(frame);
      });
    }
    const slotOf = (n) => ({ x: COLS[n % 3], y: LEVELS[Math.floor(n / 3)] });

    function reset() {
      boxes.forEach((b, i) => { Object.assign(b, MESS[i]); b.label.classList.remove('on'); svg.insertBefore(b.g, robot); });
      state.rx = REST; state.lift = GROUND;
      setCount(0);
      draw();
    }
    function finish() {
      boxes.forEach((b, n) => {
        const i = ORDER.indexOf(n);
        const s = slotOf(i);
        Object.assign(b, { x: s.x, y: s.y, r: 0 });
        b.label.classList.add('on');
      });
      state.rx = REST; state.lift = GROUND;
      setCount(boxes.length);
      draw();
    }

    async function play() {
      const id = ++run;
      reset();
      if (replay) replay.hidden = true;
      for (let i = 0; i < ORDER.length; i++) {
        const b = boxes[ORDER[i]];
        const slot = slotOf(i);
        // Drive to the box.
        const from = state.rx, to = b.x - 28;
        if (!(await tween(id, Math.max(260, Math.abs(to - from) * 1.4), (k) => { state.rx = lerp(from, to, k); }))) return;
        // Scoop it up and square it.
        const x0 = b.x, y0 = b.y, r0 = b.r;
        svg.appendChild(b.g);
        if (!(await tween(id, 240, (k) => { state.lift = lerp(GROUND, GROUND - 8, k); b.x = lerp(x0, state.rx + 28, k); b.y = lerp(y0, state.lift, k); b.r = lerp(r0, 0, k); }, easeOut))) return;
        // Carry it to its slot, raising the fork on the way.
        const cx = state.rx, tx = slot.x - 28, l0 = state.lift, l1 = slot.y - 6;
        if (!(await tween(id, Math.max(420, Math.abs(tx - cx) * 1.35), (k) => { state.rx = lerp(cx, tx, k); state.lift = lerp(l0, l1, k); b.x = state.rx + 28; b.y = state.lift; }))) return;
        // Set it down, label it, back away.
        if (!(await tween(id, 160, (k) => { state.lift = lerp(l1, slot.y, k); b.y = state.lift; b.x = state.rx + 28; }))) return;
        svg.insertBefore(b.g, robot);
        b.label.classList.add('on');
        setCount(i + 1);
        const bx = state.rx, bl = state.lift;
        if (!(await tween(id, 260, (k) => { state.rx = lerp(bx, bx - 34, k); state.lift = lerp(bl, GROUND, k); }))) return;
      }
      const ex = state.rx;
      await tween(id, 700, (k) => { state.rx = lerp(ex, REST, k); });
      if (replay && id === run) replay.hidden = false;
    }

    if (replay) replay.addEventListener('click', () => play());
    return { play, reset, finish };
  }

  const host = document.querySelector('[data-shelfbot]');
  if (!host) return;
  const bot = create(host);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { bot.finish(); return; }
  bot.reset();
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { bot.play(); io.disconnect(); }
  }, { threshold: 0.45 });
  io.observe(host);
})();
