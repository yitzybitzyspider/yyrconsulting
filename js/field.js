(function () {
  const AM = (window.AM = window.AM || {});

  const PALETTES = {
    ember: ['#7e2f1d', '#b84a2f', '#d9714f', '#efa47d'],
    dusk: ['#1f2b45', '#3a5079', '#6f88b3', '#e3a3b4'],
    blush: ['#9a3f3a', '#c8573b', '#e48f86', '#f2c2b8'],
    moss: ['#2c3524', '#55623d', '#97a06a', '#e2c98f'],
    forest: ['#0e2219', '#1b4232', '#3b7054', '#e8cf96'],
  };

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

  const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

  // Domain-warped fbm: soft, dappled light moving through color.
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_focus;
uniform float u_zoom;
uniform vec3 c0, c1, c2, c3;

// Sin-free hash: stable on mobile GPUs where fract(sin()) bands into stripes.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(min(u_res.x / u_res.y, 1.8), 1.0) * u_zoom;
  float t = u_time * 0.045;
  vec2 m = (u_mouse - 0.5) * 0.9;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.6 * t + m), fbm(p + 3.2 * q + vec2(8.3, 2.8) - 0.5 * t - m));
  float f = fbm(p + 3.0 * r);
  vec3 col = mix(c0, c1, smoothstep(0.2, 0.75, f));
  col = mix(col, c2, smoothstep(0.5, 1.1, length(q)) * 0.9);
  // Dappled light: soft bright pools drifting through the field.
  float dapple = fbm(p * 0.85 + r * 1.6 + vec2(t * 0.8, -t * 0.5));
  col = mix(col, c3, smoothstep(0.52, 0.78, dapple) * 0.85);
  col = mix(col, c0, smoothstep(0.45, 0.2, dapple) * 0.35);
  // Keep the reading area deep so cream type holds contrast.
  float d = length((uv - vec2(0.5, 0.5)) * vec2(1.0, 1.6));
  col = mix(col, mix(c0, c1, 0.6), u_focus * (1.0 - smoothstep(0.12, 0.62, d)) * 0.7);
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  AM.createField = function (canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return null;

    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
    } catch (e) {
      return null;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    ['u_res', 'u_time', 'u_mouse', 'u_focus', 'u_zoom', 'c0', 'c1', 'c2', 'c3'].forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    const pal = (PALETTES[opts.palette] || PALETTES.ember).map(hex);
    ['c0', 'c1', 'c2', 'c3'].forEach((n, i) => gl.uniform3fv(u[n], pal[i]));
    gl.uniform1f(u.u_focus, opts.focus ? 1 : 0);
    gl.uniform1f(u.u_zoom, opts.zoom || 1.5);

    // Soft field: render under-resolution and let the browser upscale.
    const scale = opts.scale || 0.5;
    function resize() {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(u.u_res, w, h);
    }

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0 };
    if (opts.pointerTarget) {
      opts.pointerTarget.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = (e.clientX - r.left) / r.width;
        mouse.ty = 1 - (e.clientY - r.top) / r.height;
      });
      opts.pointerTarget.addEventListener('pointerleave', () => { mouse.tx = 0.5; mouse.ty = 0.5; });
    }

    let raf = 0;
    let last = 0;
    let time = opts.seed || Math.random() * 100;

    function frame(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      time += dt;
      // Spring the pointer so the field drifts toward it instead of snapping.
      const k = 18, damp = 0.86;
      mouse.vx = (mouse.vx + (mouse.tx - mouse.x) * k * dt) * damp;
      mouse.vy = (mouse.vy + (mouse.ty - mouse.y) * k * dt) * damp;
      mouse.x += mouse.vx;
      mouse.y += mouse.vy;
      resize();
      gl.uniform1f(u.u_time, time);
      gl.uniform2f(u.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    function drawOnce() {
      resize();
      gl.uniform1f(u.u_time, time);
      gl.uniform2f(u.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // The canvas may be created before it is laid out; redraw whenever its size changes.
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (!raf) drawOnce(); }).observe(canvas);
    else requestAnimationFrame(drawOnce);

    return {
      start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } },
      stop() { cancelAnimationFrame(raf); raf = 0; drawOnce(); },
    };
  };

  AM.PALETTES = PALETTES;
})();
