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
  // Three systems that disagree about the count, before they become one dashboard.
  const SYSTEMS = [
    { x: 56, y: 104, r: -3, title: 'Sheets', n: '14' },
    { x: 134, y: 99, r: 2.5, title: 'ERP', n: '9' },
    { x: 212, y: 106, r: -2, title: 'CRM', n: '11' },
  ];
  const WIN = { w: 64, h: 44 };
  const DASH = { x: 56, y: 98, w: 232, h: 78 };
  const DASH_C = { x: DASH.x + DASH.w / 2, y: DASH.y + DASH.h / 2 };
  // Each team lives in its own tool before; all three share the dashboard after.
  const TEAMS = ['Warehouse', 'Accounting', 'Sales'];
  const PILL = { w: 70, h: 15 };

  function create(host) {
    const svg = el('svg', { viewBox: '34 90 690 186', class: 'sb', role: 'img', 'aria-label': 'Animation: a small robot shelves and labels scattered boxes. Then three systems that disagree, used by the warehouse, accounting and sales teams, merge into one dashboard that shows where every unit is.' });
    host.prepend(svg);
    el('line', { x1: 40, y1: GROUND, x2: 718, y2: GROUND, class: 'sb-floor' }, svg);

    const shelf = el('g', { class: 'sb-line' }, svg);
    el('line', { x1: SHELF.x0, y1: GROUND, x2: SHELF.x0, y2: SHELF.top }, shelf);
    el('line', { x1: SHELF.x1, y1: GROUND, x2: SHELF.x1, y2: SHELF.top }, shelf);
    LEVELS.forEach((y) => el('line', { x1: SHELF.x0, y1: y, x2: SHELF.x1, y2: y }, shelf));
    el('line', { x1: SHELF.x0, y1: SHELF.top, x2: SHELF.x1, y2: SHELF.top }, shelf);

    const text = (parent, x, y, str, size, anchor) => {
      const t = el('text', { x, y, 'font-size': size, 'text-anchor': anchor || 'start', class: 'sb-text' }, parent);
      t.textContent = str;
      return t;
    };

    const wins = SYSTEMS.map((w) => {
      const g = el('g', { class: 'sb-line sb-mud' }, svg);
      el('rect', { x: 0, y: 0, width: WIN.w, height: WIN.h, rx: 3, class: 'sb-fill' }, g);
      el('line', { x1: 0, y1: 11, x2: WIN.w, y2: 11 }, g);
      text(g, 5, 8.6, w.title, 7.5);
      text(g, WIN.w / 2, 35, w.n, 17, 'middle');
      return { g, ...w };
    });

    const dash = el('g', { class: 'sb-line sb-good', opacity: 0 }, svg);
    el('rect', { x: DASH.x, y: DASH.y, width: DASH.w, height: DASH.h, rx: 4, class: 'sb-fill' }, dash);
    el('line', { x1: DASH.x, y1: DASH.y + 12, x2: DASH.x + DASH.w, y2: DASH.y + 12 }, dash);
    [7, 13, 19].forEach((dx) => el('circle', { cx: DASH.x + dx, cy: DASH.y + 6, r: 1.6 }, dash));
    text(dash, DASH.x + 28, DASH.y + 9.2, 'Live inventory', 7.5);
    const cells = [];
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = i < 3 ? 1 : 0;
      const cx = DASH.x + 14 + col * 26, cy = DASH.y + 22 + row * 24;
      el('rect', { x: cx, y: cy, width: 22, height: 18, rx: 1.5 }, dash);
      cells.push(el('rect', { x: cx + 3, y: cy + 3, width: 16, height: 12, rx: 1, class: 'sb-cell', opacity: 0 }, dash));
    }
    text(dash, DASH.x + 172, DASH.y + 50, '6', 26, 'middle');
    text(dash, DASH.x + 172, DASH.y + 66, 'units, all located', 8.5, 'middle');

    const teams = TEAMS.map((name, i) => {
      const g = el('g', { class: 'sb-line sb-team sb-mud' }, svg);
      el('rect', { x: 0, y: 0, width: PILL.w, height: PILL.h, rx: PILL.h / 2, class: 'sb-fill' }, g);
      const check = el('path', { d: 'M 7 7.6 L 9.6 10.2 L 14 5', class: 'sb-check' }, g);
      const label = text(g, PILL.w / 2, 10.6, name, 7.5, 'middle');
      const w = SYSTEMS[i];
      return { g, check, label, from: { x: w.x + (WIN.w - PILL.w) / 2, y: w.y + WIN.h + 6, r: w.r }, to: { x: DASH.x + 6 + i * (PILL.w + 6), y: DASH.y + DASH.h + 7 } };
    });

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
    const sys = { merge: 0, dash: 0, lit: 0, mood: 0 };
    const FINAL = 'Three systems, one dashboard. Every unit located.';
    let run = 0;

    function draw() {
      robot.setAttribute('transform', `translate(${state.rx.toFixed(1)} 0)`);
      fork.setAttribute('transform', `translate(0 ${state.lift.toFixed(1)})`);
      for (const b of boxes) b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.r.toFixed(1)} ${BW / 2} ${-BH / 2})`);
      for (const w of wins) {
        const m = sys.merge;
        const cx = lerp(w.x + WIN.w / 2, DASH_C.x, m), cy = lerp(w.y + WIN.h / 2, DASH_C.y, m);
        w.g.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${lerp(w.r, 0, m).toFixed(2)}) scale(${lerp(1, 0.6, m).toFixed(3)}) translate(${-WIN.w / 2} ${-WIN.h / 2})`);
        w.g.setAttribute('opacity', (1 - Math.max(0, (m - 0.55) / 0.45)).toFixed(3));
      }
      const ds = lerp(0.94, 1, sys.dash);
      dash.setAttribute('opacity', sys.dash.toFixed(3));
      dash.setAttribute('transform', `translate(${DASH_C.x} ${DASH_C.y}) scale(${ds.toFixed(3)}) translate(${-DASH_C.x} ${-DASH_C.y})`);
      cells.forEach((c, i) => c.setAttribute('opacity', Math.min(1, Math.max(0, sys.lit - i)).toFixed(3)));
      // Teams ride along with their systems, then line up under the dashboard and go green.
      teams.forEach((t) => {
        const m = sys.merge;
        const x = lerp(t.from.x, t.to.x, m), y = lerp(t.from.y, t.to.y, m), r = lerp(t.from.r, 0, m);
        t.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(2)} ${PILL.w / 2} ${PILL.h / 2})`);
        const ok = sys.mood > 0.5;
        t.g.classList.toggle('sb-good', ok);
        t.g.classList.toggle('sb-mud', !ok);
        t.check.setAttribute('opacity', Math.max(0, sys.mood * 2 - 1).toFixed(3));
        t.label.setAttribute('x', lerp(PILL.w / 2, PILL.w / 2 + 5, sys.mood).toFixed(2));
      });
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
      boxes.forEach((b, i) => { Object.assign(b, MESS[i]); b.label.classList.remove('on', 'ping'); svg.insertBefore(b.g, robot); });
      state.rx = REST; state.lift = GROUND;
      Object.assign(sys, { merge: 0, dash: 0, lit: 0, mood: 0 });
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
      Object.assign(sys, { merge: 1, dash: 1, lit: 6, mood: 1 });
      setCount(boxes.length);
      if (status) status.textContent = FINAL;
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
        if (!(await tween(id, Math.max(220, Math.abs(to - from) * 1.1), (k) => { state.rx = lerp(from, to, k); }))) return;
        // Scoop it up and square it.
        const x0 = b.x, y0 = b.y, r0 = b.r;
        svg.appendChild(b.g);
        if (!(await tween(id, 200, (k) => { state.lift = lerp(GROUND, GROUND - 8, k); b.x = lerp(x0, state.rx + 28, k); b.y = lerp(y0, state.lift, k); b.r = lerp(r0, 0, k); }, easeOut))) return;
        // Carry it to its slot, raising the fork on the way.
        const cx = state.rx, tx = slot.x - 28, l0 = state.lift, l1 = slot.y - 6;
        if (!(await tween(id, Math.max(360, Math.abs(tx - cx) * 1.05), (k) => { state.rx = lerp(cx, tx, k); state.lift = lerp(l0, l1, k); b.x = state.rx + 28; b.y = state.lift; }))) return;
        // Set it down, label it, back away.
        if (!(await tween(id, 160, (k) => { state.lift = lerp(l1, slot.y, k); b.y = state.lift; b.x = state.rx + 28; }))) return;
        svg.insertBefore(b.g, robot);
        b.label.classList.add('on');
        setCount(i + 1);
        const bx = state.rx, bl = state.lift;
        if (!(await tween(id, 220, (k) => { state.rx = lerp(bx, bx - 34, k); state.lift = lerp(bl, GROUND, k); }))) return;
      }
      const ex = state.rx;
      if (!(await tween(id, 700, (k) => { state.rx = lerp(ex, REST, k); }))) return;
      // Act two: the three systems merge into one dashboard that knows where every unit is.
      if (status) status.textContent = 'Merging three systems into one dashboard';
      if (!(await tween(id, 750, (k) => { sys.merge = k; }))) return;
      if (!(await tween(id, 320, (k) => { sys.dash = k; }, easeOut))) return;
      for (let i = 0; i < 6; i++) {
        const lbl = boxes[ORDER[i]].label;
        lbl.classList.remove('ping'); void lbl.getBBox(); lbl.classList.add('ping');
        if (!(await tween(id, 150, (k) => { sys.lit = i + k; }, easeOut))) return;
      }
      if (!(await tween(id, 500, (k) => { sys.mood = k; }))) return;
      if (status) status.textContent = FINAL;
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
