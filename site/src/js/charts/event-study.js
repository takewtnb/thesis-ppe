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

export async function renderEventStudy(mount, lang, t) {
  const data = await loadChartData('event-study');
  clear(mount);
  mount.classList.add('chart', 'chart--event-study');

  const { points, yMin, yMax } = data;
  const W = 880;
  const H = 500;
  const m = { t: 64, r: 36, b: 70, l: 64 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const years = points.map((p) => p.year);
  const xOf = (year) => m.l + (years.indexOf(year) / (years.length - 1)) * plotW;
  const yOf = (v) => m.t + ((yMax - v) / (yMax - yMin)) * plotH;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'presentation',
    class: 'chart__svg',
  });
  svg.appendChild(styleSheet(axisTitleStyle()));
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: C.parchment }));

  for (let y = yMin; y <= yMax; y += 4) {
    const py = yOf(y);
    svg.appendChild(
      svgEl('line', {
        x1: m.l,
        y1: py,
        x2: m.l + plotW,
        y2: py,
        stroke: C.parchmentDeep,
        'stroke-width': y === 0 ? 1.8 : 1,
        'stroke-dasharray': y === 0 ? '0' : '4 5',
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

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.year)},${yOf(p.coef)}`).join(' ');
  const connect = svgEl('path', {
    d: lineD,
    fill: 'none',
    stroke: C.seaSoft,
    'stroke-width': 2,
    'stroke-dasharray': '6 5',
    class: 'es-connect',
  });
  if (!prefersReducedMotion()) connect.style.opacity = '0';
  svg.appendChild(connect);

  const seriesG = svgEl('g', { class: 'es-series' });
  points.forEach((p, idx) => {
    const x = xOf(p.year);
    const y = yOf(p.coef);
    const yLo = yOf(p.lo);
    const yHi = yOf(p.hi);
    const color = p.year === 1750 ? C.ochre : C.seaMid;
    const g = svgEl('g', {
      class: 'es-point',
      'data-i': String(idx),
      opacity: prefersReducedMotion() ? '1' : '0',
    });
    g.appendChild(
      svgEl('line', {
        x1: x,
        y1: yLo,
        x2: x,
        y2: yHi,
        stroke: color,
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      })
    );
    g.appendChild(
      svgEl('line', {
        x1: x - 8,
        y1: yLo,
        x2: x + 8,
        y2: yLo,
        stroke: color,
        'stroke-width': 2,
      })
    );
    g.appendChild(
      svgEl('line', {
        x1: x - 8,
        y1: yHi,
        x2: x + 8,
        y2: yHi,
        stroke: color,
        'stroke-width': 2,
      })
    );
    g.appendChild(
      svgEl('circle', {
        cx: x,
        cy: y,
        r: p.baseline ? 6 : 8,
        fill: p.baseline ? C.parchment : color,
        stroke: color,
        'stroke-width': 2.5,
      })
    );
    const yearLbl = svgEl('text', {
      x,
      y: m.t + plotH + 28,
      'text-anchor': 'middle',
      class: 'tick',
    });
    yearLbl.textContent = `${p.year}${p.baseline ? t('esBase') : ''}`;
    g.appendChild(yearLbl);
    const labelOnLeft = idx === points.length - 1;
    const coefLbl = svgEl('text', {
      x: x + (labelOnLeft ? -14 : 14),
      y: y - 13,
      'text-anchor': labelOnLeft ? 'end' : 'start',
      class: 'coef',
    });
    coefLbl.textContent = p.coef.toFixed(2);
    g.appendChild(coefLbl);

    const hit = svgEl('circle', {
      cx: x,
      cy: y,
      r: 22,
      fill: 'transparent',
      class: 'chart-hit',
      tabindex: '0',
      role: 'img',
      'aria-label': `${p.year}: ${p.coef.toFixed(2)}`,
    });
    g.appendChild(hit);
    seriesG.appendChild(g);
  });
  svg.appendChild(seriesG);

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

  const xTitle = svgEl('text', {
    class: 'axis-title',
    x: m.l + plotW / 2,
    y: H - 16,
    'text-anchor': 'middle',
  });
  xTitle.textContent = t('esX');
  svg.appendChild(xTitle);
  const yTitle = svgEl('text', {
    class: 'axis-title',
    x: 20,
    y: m.t + plotH / 2,
    'text-anchor': 'middle',
    transform: `rotate(-90 20 ${m.t + plotH / 2})`,
  });
  yTitle.textContent = t('esY');
  svg.appendChild(yTitle);

  const note = svgEl('g');
  const noteT = svgEl('text', { x: m.l, y: 30, class: 'chart-note' });
  noteT.textContent = t('esNote');
  note.appendChild(noteT);
  svg.appendChild(note);

  mount.appendChild(svg);
  const tip = new ChartTooltip(mount);

  const showTip = (p, g, evt) => {
    seriesG.querySelectorAll('.es-point').forEach((el) => {
      el.classList.toggle('chart-dim', el !== g);
      el.classList.toggle('chart-focus', el === g);
    });
    tip.show(
      `<strong>${p.year}${p.baseline ? t('esBase') : ''}</strong><br/>${t('esTooltipCoef')}: ${fmt(p.coef, lang, 2)}<br/>95% CI: [${fmt(p.lo, lang, 2)}, ${fmt(p.hi, lang, 2)}]`,
      evt.clientX,
      evt.clientY
    );
  };

  const clearTip = () => {
    seriesG.querySelectorAll('.es-point').forEach((el) => {
      el.classList.remove('chart-dim', 'chart-focus');
    });
    tip.hide();
  };

  points.forEach((p, idx) => {
    const g = seriesG.querySelector(`.es-point[data-i="${idx}"]`);
    const hit = g.querySelector('.chart-hit');
    hit.addEventListener('pointerenter', (e) => showTip(p, g, e));
    hit.addEventListener('pointermove', (e) => showTip(p, g, e));
    hit.addEventListener('pointerleave', clearTip);
    hit.addEventListener('focus', () => {
      const rect = hit.getBoundingClientRect();
      showTip(p, g, { clientX: rect.left + rect.width / 2, clientY: rect.top });
    });
    hit.addEventListener('blur', clearTip);
  });

  onReveal(mount, () => {
    fadeIn(connect, 700);
    seriesG.querySelectorAll('.es-point').forEach((g, i) => {
      if (prefersReducedMotion()) {
        g.setAttribute('opacity', '1');
        return;
      }
      g.style.transition = `opacity 0.55s ease-out ${120 + i * 140}ms, transform 0.55s ease-out ${120 + i * 140}ms`;
      g.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        g.setAttribute('opacity', '1');
        g.style.transform = 'translateY(0)';
      });
    });
    fadeIn(note, 900);
  });

  return () => tip.destroy();
}
