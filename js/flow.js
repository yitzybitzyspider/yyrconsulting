(function () {
  const AM = (window.AM = window.AM || {});

  function hash(x, y) {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  const TRAIL = 22;
  // Lines are drawn in a few color buckets so the canvas changes stroke style rarely.
  const BUCKETS = 5;
  const MUD = [156, 140, 86], CLEAR = [246, 238, 222];

  // mode "stuck": tangled mud on the left that works free into clean flow on the right.
  // mode "flow": everything already flowing.
  AM.createFlow = function (canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const mode = opts.mode || 'stuck';
    let W = 0, H = 0, dpr = 1, parts = [], t = Math.random() * 50;
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };

    const colors = Array.from({ length: BUCKETS }, (_, i) => {
      const k = i / (BUCKETS - 1);
      const c = MUD.map((m, j) => Math.round(m + (CLEAR[j] - m) * k));
      return { stroke: `rgb(${c[0]} ${c[1]} ${c[2]} / ${(0.5 + 0.12 * k).toFixed(2)})`, width: 1.8 - 0.75 * k };
    });

    function freedom(x, y) {
      let b = mode === 'flow' ? 1 : smooth(0.2, 0.8, x / W);
      if (ptr.on) {
        const d = Math.hypot(x - ptr.x, y - ptr.y);
        b = Math.max(b, 1 - smooth(40, 190, d));
      }
      return b;
    }

    function spawn(p, anywhere) {
      p.x = anywhere ? Math.random() * W : Math.random() * W * (mode === 'flow' ? 0.15 : 0.55);
      p.y = Math.random() * H;
      p.age = 0;
      p.life = 7 + Math.random() * 14;
      p.n = 0;
      for (let i = 0; i < TRAIL; i++) { p.hx[i] = p.x; p.hy[i] = p.y; }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (w !== W || h !== H) {
        W = w; H = h;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        const want = Math.min(1600, Math.round((W * H) / (mode === 'flow' ? 1100 : 650)));
        while (parts.length < want) { const p = { hx: new Float32Array(TRAIL), hy: new Float32Array(TRAIL) }; spawn(p, true); p.age = Math.random() * p.life; parts.push(p); }
        parts.length = want;
      }
      return true;
    }

    function step(dt) {
      t += dt;
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 6);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 6);
      for (const p of parts) {
        const b = freedom(p.x, p.y);
        // Mud: slow swirl from a drifting noise field, with a faint pull to the right.
        const a = noise(p.x * 0.018 + t * 0.06, p.y * 0.018) * Math.PI * 6;
        const mx = Math.cos(a) * 30 + 5, my = Math.sin(a) * 30;
        // Flow: fast, nearly straight streams with a gentle wave.
        const fa = 0.14 * Math.sin(p.y * 0.011 + p.x * 0.003 + t * 0.5);
        const fx = Math.cos(fa) * 120, fy = Math.sin(fa) * 120;
        const vx = mx + (fx - mx) * b, vy = my + (fy - my) * b;
        p.x += vx * dt; p.y += vy * dt;
        p.age += dt;
        p.b = b;
        for (let i = TRAIL - 1; i > 0; i--) { p.hx[i] = p.hx[i - 1]; p.hy[i] = p.hy[i - 1]; }
        p.hx[0] = p.x; p.hy[0] = p.y;
        if (p.n < TRAIL) p.n++;
        if (p.x > W + 30 || p.y < -30 || p.y > H + 30 || p.age > p.life) spawn(p, false);
      }
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let k = 0; k < BUCKETS; k++) {
        ctx.beginPath();
        let any = false;
        for (const p of parts) {
          if (Math.min(BUCKETS - 1, Math.floor((p.b || 0) * BUCKETS)) !== k || p.n < 2) continue;
          // Fade in at birth and out near the end of life so nothing pops.
          if (p.age < 0.5 || p.life - p.age < 0.5) continue;
          ctx.moveTo(p.hx[0], p.hy[0]);
          for (let i = 1; i < p.n; i++) ctx.lineTo(p.hx[i], p.hy[i]);
          any = true;
        }
        if (any) { ctx.strokeStyle = colors[k].stroke; ctx.lineWidth = colors[k].width; ctx.stroke(); }
      }
    }

    if (opts.pointerTarget) {
      opts.pointerTarget.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
        if (!ptr.on) { ptr.x = ptr.tx; ptr.y = ptr.ty; ptr.on = true; }
      });
      opts.pointerTarget.addEventListener('pointerleave', () => { ptr.on = false; });
    }

    const STEP = 1 / 60;
    let raf = 0, last = 0, acc = 0;
    function frame(now) {
      acc += Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      if (resize()) {
        let n = 0;
        while (acc >= STEP && n < 4) { step(STEP); acc -= STEP; n++; }
        if (n === 4) acc = 0;
        draw();
      }
      raf = requestAnimationFrame(frame);
    }

    // A settled still frame for first paint, reduced motion, and paused states.
    function still() {
      if (!resize()) return;
      for (let i = 0; i < 90; i++) step(1 / 60);
      draw();
    }
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (!raf) still(); }).observe(canvas);
    else requestAnimationFrame(still);

    return {
      start() { if (!raf) { last = 0; acc = 0; raf = requestAnimationFrame(frame); } },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  };
})();
