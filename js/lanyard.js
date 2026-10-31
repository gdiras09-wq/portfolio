(function () {
  'use strict';

  const stage = document.getElementById('lanyard-stage');
  const lanyard = document.getElementById('lanyard');
  const card = document.getElementById('id-card');
  const lace = document.getElementById('lace');
  const path = document.getElementById('lace-path');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const count = 20;
  const points = [];
  let anchor;
  let length;
  let segment;
  let dragging = false;
  let target;
  let grabOffset;
  let frame;
  let lastTime = 0;
  let accumulator = 0;
  let visible = true;
  let awake = 0;
  let rotation = 0;

  function reset() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    lastTime = accumulator = 0;
    dragging = false;
    card.classList.remove('dragging');
    const bounds = stage.getBoundingClientRect();
    anchor = { x: bounds.width / 2, y: -30 };
    length = window.matchMedia('(max-width: 640px)').matches ? 235 : 285;
    segment = length / count;
    lace.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    points.length = 0;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const x = anchor.x + (motion.matches ? 0 : Math.sin(t * 1.5) * 28);
      const y = anchor.y + length * t;
      points.push({ x, y, px: x, py: y });
    }
    rotation = 0;
    awake = 180;
    paint();
    start();
  }

  function pin() {
    Object.assign(points[0], anchor);
    if (dragging) Object.assign(points[count], target);
  }

  // Verlet integration preserves momentum in each section of the fabric.
  // Length constraints keep it inextensible, but never force it to stay straight.
  function simulate() {
    let movement = 0;
    points.forEach((p, i) => {
      if (i === 0 || (dragging && i === count)) return;
      const vx = (p.x - p.px) * .985;
      const vy = (p.y - p.py) * .985;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + .38;
      movement += Math.abs(vx) + Math.abs(vy);
    });
    for (let iteration = 0; iteration < 40; iteration++) {
      pin();
      for (let i = 0; i < count; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || .001;
        const correction = (distance - segment) / distance;
        const wa = i === 0 ? 0 : 1;
        // The badge is heavier than the individual lace segments.
        const wb = i + 1 === count ? (dragging ? 0 : .08) : 1;
        const total = wa + wb;
        if (!total) continue;
        a.x += dx * correction * wa / total;
        a.y += dy * correction * wa / total;
        b.x -= dx * correction * wb / total;
        b.y -= dy * correction * wb / total;
      }
    }
    pin();
    const end = points[count];
    const previous = points[count - 2];
    const tangent = -Math.atan2(end.x - previous.x, Math.max(5, end.y - previous.y)) * 180 / Math.PI;
    rotation += (Math.max(-45, Math.min(45, tangent)) - rotation) * .1;
    if (movement > .12) awake = 60;
    else awake--;
  }

  function paint() {
    // Quadratic midpoints turn the simulated chain into a smooth ribbon,
    // including loose bends and folds when the badge moves toward the anchor.
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < count; i++) {
      const p = points[i];
      const next = points[i + 1];
      d += ` Q ${p.x} ${p.y} ${(p.x + next.x) / 2} ${(p.y + next.y) / 2}`;
    }
    const end = points[count];
    d += ` L ${end.x} ${end.y}`;
    path.setAttribute('d', d);
    lanyard.style.transform = `translate3d(${end.x - card.offsetWidth / 2}px, ${end.y}px, 0) rotate(${rotation}deg)`;
  }

  function tick(time) {
    frame = undefined;
    if (!visible || document.hidden) { lastTime = 0; return; }
    accumulator += lastTime ? Math.min(time - lastTime, 50) : 16.667;
    lastTime = time;
    while (accumulator >= 16.667) {
      simulate();
      accumulator -= 16.667;
    }
    paint();
    if (dragging || (!motion.matches && awake > 0)) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function start() {
    if (!frame && visible && !document.hidden && (dragging || !motion.matches)) {
      frame = requestAnimationFrame(tick);
    }
  }

  card.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const bounds = stage.getBoundingClientRect();
    const end = points[count];
    grabOffset = { x: event.clientX - bounds.left - end.x, y: event.clientY - bounds.top - end.y };
    target = { x: end.x, y: end.y };
    dragging = true;
    card.setPointerCapture(event.pointerId);
    card.classList.add('dragging');
    start();
  });

  card.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const bounds = stage.getBoundingClientRect();
    let x = event.clientX - bounds.left - grabOffset.x;
    let y = Math.max(anchor.y + 35, event.clientY - bounds.top - grabOffset.y);
    const dx = x - anchor.x;
    const dy = y - anchor.y;
    const distance = Math.hypot(dx, dy);
    // A slack rope can fold freely; a taut one limits the badge's reach.
    if (distance > length * .995) {
      x = anchor.x + dx / distance * length * .995;
      y = anchor.y + dy / distance * length * .995;
    }
    target = { x, y };
    awake = 180;
    start();
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('dragging');
    // Preserve a small release impulse without launching the badge.
    const end = points[count];
    end.px = end.x - Math.max(-4, Math.min(4, end.x - end.px));
    end.py = end.y - Math.max(-4, Math.min(4, end.y - end.py));
    if (motion.matches) reset();
    else { awake = 180; start(); }
  }
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('lostpointercapture', release);
  card.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { reset(); return; }
    if (motion.matches) return;
    const impulse = event.key === 'ArrowLeft' ? -5 : 5;
    points.forEach((p, i) => { p.px = p.x - impulse * i / count; });
    awake = 180;
    start();
  });

  new ResizeObserver(reset).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastTime = 0;
    if (visible) start();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { lastTime = 0; start(); });
  motion.addEventListener('change', reset);
  reset();
})();
