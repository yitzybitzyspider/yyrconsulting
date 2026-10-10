(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each field renders only while it is on screen and the tab is visible.
  const fields = [];
  document.querySelectorAll('canvas.field[data-palette]').forEach((c) => {
    const f = window.AM && window.AM.createField(c, {
      palette: c.dataset.palette,
      focus: c.hasAttribute('data-focus'),
      pointerTarget: c.hasAttribute('data-pointer') ? c.parentElement : null,
      scale: 0.3,
      zoom: 1.05,
      seed: 11,
    });
    if (f) fields.push({ c, f, visible: false, running: false });
  });
  if (reduce || !fields.length) return;

  const sync = (r) => {
    const on = r.visible && !document.hidden;
    if (on && !r.running) { r.f.start(); r.running = true; }
    else if (!on && r.running) { r.f.stop(); r.running = false; }
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const r = fields.find((x) => x.c === e.target); if (r) { r.visible = e.isIntersecting; sync(r); } });
  });
  fields.forEach((r) => io.observe(r.c));
  document.addEventListener('visibilitychange', () => fields.forEach(sync));
})();
