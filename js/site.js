(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each field animates only while on screen and the tab is visible; otherwise it holds a still frame.
  const fields = [];
  document.querySelectorAll('canvas.flow').forEach((c) => {
    const f = window.AM && window.AM.createCleanup(c, {
      state: c.dataset.state,
      reduced: reduce,
      pointerTarget: c.hasAttribute('data-pointer') ? c.parentElement : null,
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
