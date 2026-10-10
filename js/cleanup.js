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
  const lerp = (a, b, k) => a + (b - a) * k;

  const TRAIL = 20;
  const STEP = 1 / 60;
  const CELL = 28;
  const BUCKETS = 5;
  const MUD_BG = [58, 47, 30], CLEAN_BG = [16, 44, 34];
  const MUD_LINE = [152, 122, 70], CLEAN_LINE = [244, 236, 220];
  // The cleanup front starts after a beat and crosses the field in a few seconds.
  const DELAY = 1.4, SWEEP = 6.5;

  // state "mud": starts broken and slow, then a cleanup front turns it into flow; the cursor cleans too.
  // state "clean": already flowing.
  AM.createCleanup = function (canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const startClean = opts.state === 'clean';
    const bg = document.createElement('canvas');
    const bgx = bg.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, grid = null, img = null;
    let parts = [], t = 0, sweep = 0;
    const ptr = { x: 0, y: 0, on: false };

    const lineStyles = Array.from({ length: BUCKETS }, (_, i) => {
      const k = i / (BUCKETS - 1);
      const c = MUD_LINE.map((m, j) => Math.round(lerp(m, CLEAN_LINE[j], k)));
      return { stroke: `rgb(${c[0]} ${c[1]} ${c[2]} / ${lerp(0.5, 0.6, k).toFixed(2)})`, width: lerp(2.1, 1.05, k) };
    });

    function cleanAt(x, y) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / CELL)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / CELL)));
      return grid[cy * cols + cx];
    }

    function spawn(p, anywhere) {
      p.x = anywhere ? Math.random() * W : Math.random() * W * 0.6;
      p.y = Math.random() * H;
      p.age = 0;
      p.life = 6 + Math.random() * 12;
      p.n = 0;
      p.c = cleanAt(p.x, p.y);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (w === W && h === H) return true;
      const prev = grid ? grid.reduce((a, b) => a + b, 0) / grid.length : null;
      W = w; H = h;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cols = Math.ceil(W / CELL) + 1;
      rows = Math.ceil(H / CELL) + 1;
      grid = new Float32Array(cols * rows).fill(startClean ? 1 : prev ?? 0);
      bg.width = cols; bg.height = rows;
      img = bgx.createImageData(cols, rows);
      const want = Math.min(1500, Math.round((W * H) / 700));
      while (parts.length < want) {
        const p = { hx: new Float32Array(TRAIL), hy: new Float32Array(TRAIL), o: Math.random() * Math.PI * 2, ph: Math.random() * Math.PI * 2 };
        spawn(p, true);
        p.age = Math.random() * p.life;
        parts.push(p);
      }
      parts.length = want;
      return true;
    }

    // Reduced motion and first paint: one still frame. Mud first, unless the visitor asked for no motion,
    // in which case they get the whole story at once: broken on the left, flowing on the right.
    function setSplit() {
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) grid[cy * cols + cx] = smooth(0.3, 0.7, (cx * CELL) / W);
    }

    function updateGrid(dt) {
      if (!startClean && sweep < DELAY + SWEEP + 1) {
        sweep += dt;
        const prog = smooth(0, 1, (sweep - DELAY) / SWEEP);
        const band = W * 0.22;
        const front = -band + prog * (W + band * 2.2);
        for (let cy = 0; cy < rows; cy++) {
          const jitter = (noise(cy * 0.22, 4.7) - 0.5) * W * 0.16;
          for (let cx = 0; cx < cols; cx++) {
            const i = cy * cols + cx;
            const target = smooth(0, 1, (front - (cx * CELL + jitter)) / band);
            if (target > grid[i]) grid[i] += (target - grid[i]) * Math.min(1, dt * 4);
          }
        }
      }
      if (ptr.on) {
        const R = 150, r0x = Math.floor((ptr.x - R) / CELL), r1x = Math.ceil((ptr.x + R) / CELL);
        const r0y = Math.floor((ptr.y - R) / CELL), r1y = Math.ceil((ptr.y + R) / CELL);
        for (let cy = Math.max(0, r0y); cy <= Math.min(rows - 1, r1y); cy++) {
          for (let cx = Math.max(0, r0x); cx <= Math.min(cols - 1, r1x); cx++) {
            const d = Math.hypot(cx * CELL - ptr.x, cy * CELL - ptr.y);
            if (d < R) { const i = cy * cols + cx; grid[i] = Math.min(1, grid[i] + dt * 2.4 * (1 - d / R)); }
          }
        }
      }
    }

    function step(dt) {
      t += dt;
      updateGrid(dt);
      for (const p of parts) {
        const c = cleanAt(p.x, p.y);
        p.c = c;
        // Broken: tangled, stop-and-go, sometimes backwards.
        const a = noise(p.x * 0.016 + t * 0.05, p.y * 0.016) * Math.PI * 6 + p.o;
        const burst = Math.pow(Math.max(0, Math.sin(t * 1.5 + p.ph)), 3);
        const ms = 38 * burst;
        const mx = Math.cos(a) * ms + 2, my = Math.sin(a) * ms;
        // Working: fast, orderly lanes with a gentle wave.
        const fa = 0.12 * Math.sin(p.y * 0.012 + p.x * 0.002 + t * 0.5);
        const fx = Math.cos(fa) * 130, fy = Math.sin(fa) * 130;
        p.x += lerp(mx, fx, c) * dt;
        p.y += lerp(my, fy, c) * dt;
        p.age += dt;
        for (let i = TRAIL - 1; i > 0; i--) { p.hx[i] = p.hx[i - 1]; p.hy[i] = p.hy[i - 1]; }
        p.hx[0] = p.x; p.hy[0] = p.y;
        if (p.n < TRAIL) p.n++;
        if (p.x > W + 30 || p.x < -30 || p.y < -30 || p.y > H + 30 || p.age > p.life) spawn(p, false);
      }
    }

    function drawBg() {
      const d = img.data;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx, c = grid[i];
          // Mud carries blotchy texture; clean ground is even.
          const blot = (noise(cx * 0.16 + 3.3, cy * 0.16) - 0.5) * 34 * (1 - c);
          const o = i * 4;
          d[o] = lerp(MUD_BG[0], CLEAN_BG[0], c) + blot;
          d[o + 1] = lerp(MUD_BG[1], CLEAN_BG[1], c) + blot * 0.8;
          d[o + 2] = lerp(MUD_BG[2], CLEAN_BG[2], c) + blot * 0.4;
          d[o + 3] = 255;
        }
      }
      bgx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bg, 0, 0, cols, rows, -CELL / 2, -CELL / 2, cols * CELL, rows * CELL);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBg();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let k = 0; k < BUCKETS; k++) {
        ctx.beginPath();
        let any = false;
        for (const p of parts) {
          if (p.n < 2 || p.age < 0.4 || p.life - p.age < 0.4) continue;
          if (Math.min(BUCKETS - 1, Math.floor(p.c * BUCKETS)) !== k) continue;
          ctx.moveTo(p.hx[0], p.hy[0]);
          for (let i = 1; i < p.n; i++) ctx.lineTo(p.hx[i], p.hy[i]);
          any = true;
        }
        if (any) { ctx.strokeStyle = lineStyles[k].stroke; ctx.lineWidth = lineStyles[k].width; ctx.stroke(); }
      }
    }

    if (opts.pointerTarget) {
      opts.pointerTarget.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
      });
      opts.pointerTarget.addEventListener('pointerleave', () => { ptr.on = false; });
    }

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

    function still() {
      if (!resize()) return;
      if (opts.reduced && !startClean) setSplit();
      // Settle particle trails without advancing the cleanup.
      const keep = sweep;
      const saved = grid.slice();
      for (let i = 0; i < 60; i++) step(STEP);
      grid.set(saved);
      sweep = keep;
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
