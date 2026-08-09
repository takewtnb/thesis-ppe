import {
  C,
  ChartTooltip,
  axisTitleStyle,
  clear,
  fadeIn,
  fmt,
  loadChartData,
  onReveal,
  prefersReducedMotion,
  styleSheet,
  svgEl,
} from './shared.js';

export async function renderTreatmentIntensity(mount, lang, t) {
  const data = await loadChartData('treatment-intensity');
  clear(mount);
  mount.classList.add('chart', 'chart--histogram');

  const W = 880;
  const H = 460;
  const m = { t: 36, r: 28, b: 64, l: 56 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const { bins, xMax, density, yMax, binWidth } = data;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'presentation',
    class: 'chart__svg',
  });
  svg.appendChild(styleSheet(axisTitleStyle()));
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: C.parchment }));

  for (let y = 0; y <= yMax; y += 2) {
    const py = m.t + plotH - (y / yMax) * plotH;
    svg.appendChild(
      svgEl('line', {
        x1: m.l - 6,
        y1: py,
        x2: m.l,
        y2: py,
        stroke: C.inkMuted,
      })
    );
    svg.appendChild(
      svgEl('line', {
        x1: m.l,
        y1: py,
        x2: m.l + plotW,
        y2: py,
        stroke: C.parchmentDeep,
        'stroke-width': 1,
      })
    );
    const tick = svgEl('text', {
      x: m.l - 12,
      y: py + 4,
      'text-anchor': 'end',
      class: 'tick',
    });
    tick.textContent = String(y);
    svg.appendChild(tick);
  }

  const barsG = svgEl('g', { class: 'hist-bars' });
  const barMeta = [];
  bins.forEach((b, idx) => {
    if (b.n === 0) return;
    const x = m.l + (b.x0 / xMax) * plotW;
    const w = Math.max((binWidth / xMax) * plotW - 2, 1);
    const hTarget = (b.n / yMax) * plotH;
    const yBase = m.t + plotH;
    const isRotterdam = b.cities.includes('Rotterdam');
    const fill = isRotterdam ? C.ochre : C.seaSoft;
    const rect = svgEl('rect', {
      x,
      y: yBase - hTarget,
      width: w,
      height: hTarget,
      fill,
      rx: 2,
      class: 'hist-bar chart-hit',
      'data-i': String(idx),
      tabindex: '0',
      role: 'img',
      'aria-label': `${fmt(b.x0, lang, 1)}–${fmt(b.x1, lang, 1)}: ${b.n}`,
    });
    // Grow from baseline via scaleY (SVG attr height does not CSS-transition reliably).
    rect.style.transform = prefersReducedMotion() ? 'scaleY(1)' : 'scaleY(0)';
    barsG.appendChild(rect);
    barMeta.push({ rect, hTarget, yBase, bin: b, idx });
  });
  svg.appendChild(barsG);

  const densPath = density.x
    .map((x, i) => {
      const px = m.l + (x / xMax) * plotW;
      const py = m.t + plotH - (density.y[i] / yMax) * plotH;
      return `${i === 0 ? 'M' : 'L'}${px},${py}`;
    })
    .join(' ');
  const dens = svgEl('path', {
    d: densPath,
    fill: 'none',
    stroke: C.sea,
    'stroke-width': 2.4,
    'stroke-linejoin': 'round',
    class: 'hist-density',
  });
  if (!prefersReducedMotion()) dens.style.opacity = '0';
  svg.appendChild(dens);

  svg.appendChild(
    svgEl('line', {
      x1: m.l,
      y1: m.t + plotH,
      x2: m.l + plotW,
      y2: m.t + plotH,
      stroke: C.sea,
      'stroke-width': 1.5,
    })
  );
  svg.appendChild(
    svgEl('line', {
      x1: m.l,
      y1: m.t,
      x2: m.l,
      y2: m.t + plotH,
      stroke: C.sea,
      'stroke-width': 1.5,
    })
  );

  for (let x = 0; x <= xMax + 1e-9; x += 0.2) {
    const px = m.l + (x / xMax) * plotW;
    svg.appendChild(
      svgEl('line', {
        x1: px,
        y1: m.t + plotH,
        x2: px,
        y2: m.t + plotH + 6,
        stroke: C.inkMuted,
      })
    );
    const tick = svgEl('text', {
      x: px,
      y: m.t + plotH + 24,
      'text-anchor': 'middle',
      class: 'tick',
    });
    tick.textContent = fmt(x, lang, 1);
    svg.appendChild(tick);
  }

  const xTitle = svgEl('text', {
    class: 'axis-title',
    x: m.l + plotW / 2,
    y: H - 14,
    'text-anchor': 'middle',
  });
  xTitle.textContent = t('histX');
  svg.appendChild(xTitle);
  const yTitle = svgEl('text', {
    class: 'axis-title',
    x: 18,
    y: m.t + plotH / 2,
    'text-anchor': 'middle',
    transform: `rotate(-90 18 ${m.t + plotH / 2})`,
  });
  yTitle.textContent = t('histY');
  svg.appendChild(yTitle);

  const legend = svgEl('g', { transform: `translate(${m.l + plotW - 220}, ${m.t + 8})` });
  legend.appendChild(svgEl('rect', { x: 0, y: 0, width: 14, height: 14, fill: C.seaSoft, rx: 2 }));
  const l1 = svgEl('text', { class: 'tick', x: 20, y: 12 });
  l1.textContent = t('histCities');
  legend.appendChild(l1);
  legend.appendChild(svgEl('rect', { x: 90, y: 0, width: 14, height: 14, fill: C.ochre, rx: 2 }));
  const l2 = svgEl('text', { class: 'tick', x: 110, y: 12 });
  l2.textContent = t('histRotterdam');
  legend.appendChild(l2);
  svg.appendChild(legend);

  mount.appendChild(svg);
  const tip = new ChartTooltip(mount);

  const cityName = (key) => (data.labels?.[lang] || data.labels?.en || {})[key] || key;

  const showTip = (meta, evt) => {
    barMeta.forEach((b) => {
      b.rect.classList.toggle('is-active', b === meta);
      b.rect.setAttribute('opacity', b === meta ? '1' : '0.45');
    });
    const names = meta.bin.cities
      .filter((key) => key !== 'Harlingen')
      .map(cityName)
      .join(', ');
    tip.show(
      `<strong>${fmt(meta.bin.x0, lang, 1)}–${fmt(meta.bin.x1, lang, 1)}</strong><br/>${t('histTooltipCount')}: ${meta.bin.n}<br/>${names}`,
      evt.clientX,
      evt.clientY
    );
  };

  const clearTip = () => {
    barMeta.forEach((b) => {
      b.rect.classList.remove('is-active');
      b.rect.setAttribute('opacity', '1');
    });
    tip.hide();
  };

  barMeta.forEach((meta) => {
    meta.rect.addEventListener('pointerenter', (e) => showTip(meta, e));
    meta.rect.addEventListener('pointermove', (e) => showTip(meta, e));
    meta.rect.addEventListener('pointerleave', clearTip);
    meta.rect.addEventListener('focus', (e) => {
      const rect = meta.rect.getBoundingClientRect();
      showTip(meta, { clientX: rect.left + rect.width / 2, clientY: rect.top });
    });
    meta.rect.addEventListener('blur', clearTip);
  });

  onReveal(mount, () => {
    barMeta.forEach((meta, i) => {
      if (prefersReducedMotion()) {
        meta.rect.style.transform = 'scaleY(1)';
        return;
      }
      meta.rect.style.transition = `transform 0.55s ease-out ${i * 35}ms`;
      requestAnimationFrame(() => {
        meta.rect.style.transform = 'scaleY(1)';
      });
    });
    fadeIn(dens, 900);
  });

  return () => tip.destroy();
}
