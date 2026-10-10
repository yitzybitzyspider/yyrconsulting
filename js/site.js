(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each flow animates only while on screen and the tab is visible; otherwise it holds a still frame.
  const flows = [];
  document.querySelectorAll('canvas.flow').forEach((c) => {
    const f = window.AM && window.AM.createFlow(c, {
      mode: c.dataset.mode,
      pointerTarget: c.hasAttribute('data-pointer') ? c.parentElement : null,
    });
    if (f) flows.push({ c, f, visible: false, running: false });
  });
  if (reduce || !flows.length) return;

  const sync = (r) => {
    const on = r.visible && !document.hidden;
    if (on && !r.running) { r.f.start(); r.running = true; }
    else if (!on && r.running) { r.f.stop(); r.running = false; }
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const r = flows.find((x) => x.c === e.target); if (r) { r.visible = e.isIntersecting; sync(r); } });
  });
  flows.forEach((r) => io.observe(r.c));
  document.addEventListener('visibilitychange', () => flows.forEach(sync));
})();
