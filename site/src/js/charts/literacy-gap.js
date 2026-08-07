import {
  C,
  ChartTooltip,
  animateStrokeDraw,
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

export async function renderLiteracyGap(mount, lang, t) {
  const data = await loadChartData('literacy-gap');
  clear(mount);
  mount.classList.add('chart', 'chart--literacy-gap');

  const W = 880;
  const H = 480;
  const m = { t: 48, r: 168, b: 64, l: 64 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const yMin = 20;
  const yMax = 90;
  const { years, female, male, gaps } = data;
  const xOf = (i) => m.l + (i / (years.length - 1)) * plotW;
  const yOf = (v) => m.t + ((yMax - v) / (yMax - yMin)) * plotH;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'presentation',
    class: 'chart__svg',
  });
  svg.appendChild(styleSheet(axisTitleStyle()));
  svg.appendChild(svgEl('rect', { width: W, height: H, fill: C.parchment }));

  for (let y = 20; y <= 80; y += 20) {
    const py = yOf(y);
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
    const label = svgEl('text', {
      x: m.l - 12,
      y: py + 4,
      'text-anchor': 'end',
      class: 'tick',
    });
    label.textContent = String(y);
    svg.appendChild(label);
  }

  const malePts = male.map((v, i) => [xOf(i), yOf(v)]);
  const femalePts = female.map((v, i) => [xOf(i), yOf(v)]);
  const bandD = [
    ...malePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`),
    ...femalePts
      .slice()
      .reverse()
      .map(([x, y]) => `L${x},${y}`),
    'Z',
  ].join(' ');
  const maleLineD = malePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const femaleLineD = femalePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  const band = svgEl('path', {
    d: bandD,
    fill: C.seaSoft,
    'fill-opacity': 0.22,
    class: 'gap-band',
  });
  svg.appendChild(band);

  const maleLine = svgEl('path', {
    d: maleLineD,
    fill: 'none',
    stroke: C.ochre,
    'stroke-width': 2.6,
    'stroke-linejoin': 'round',
    class: 'gap-line gap-line--male',
  });
  const femaleLine = svgEl('path', {
    d: femaleLineD,
    fill: 'none',
    stroke: C.sea,
    'stroke-width': 2.6,
    'stroke-linejoin': 'round',
    class: 'gap-line gap-line--female',
  });
  svg.appendChild(maleLine);
  svg.appendChild(femaleLine);

  const pointsG = svgEl('g', { class: 'gap-points' });
  years.forEach((year, i) => {
    const yTop = Math.min(yOf(male[i]), yOf(female[i]));
    const yBot = Math.max(yOf(male[i]), yOf(female[i]));
    const hitPad = 18;
    const hitW = 56;
    const hit = svgEl('rect', {
      x: xOf(i) - hitW / 2,
      y: yTop - hitPad,
      width: hitW,
      height: yBot - yTop + hitPad * 2,
      fill: 'transparent',
      class: 'chart-hit',
      'data-i': String(i),
      tabindex: '0',
      role: 'img',
      'aria-label': `${year}`,
    });
    hit.style.pointerEvents = 'all';
    pointsG.appendChild(hit);

    pointsG.appendChild(
      svgEl('circle', {
        cx: malePts[i][0],
        cy: malePts[i][1],
        r: 6,
        fill: C.ochre,
        stroke: C.parchment,
        'stroke-width': 1.5,
        class: 'gap-dot gap-dot--male',
        'data-i': String(i),
      })
    );
    pointsG.appendChild(
      svgEl('circle', {
        cx: femalePts[i][0],
        cy: femalePts[i][1],
        r: 6,
        fill: C.sea,
        stroke: C.parchment,
        'stroke-width': 1.5,
        class: 'gap-dot gap-dot--female',
        'data-i': String(i),
      })
    );
  });
  svg.appendChild(pointsG);

  // Gap annotations sit on the year so bracket height matches the shaded gap.
  const anns = [
    { i: 0, label: t('gap1600'), labelSide: 1 },
    { i: 2, label: t('gap1750'), labelSide: -1 },
  ];
  const annG = svgEl('g', { class: 'gap-ann-group' });
  for (const a of anns) {
    const gx = xOf(a.i);
    const y1 = yOf(male[a.i]);
    const y2 = yOf(female[a.i]);
    const labelW = 78;
    const labelX = a.labelSide > 0 ? gx + 14 : gx - 14 - labelW;
    const textX = a.labelSide > 0 ? gx + 18 : gx - 18 - labelW + 4;
    const g = svgEl('g');
    g.appendChild(
      svgEl('line', {
        x1: gx,
        y1,
        x2: gx,
        y2,
        stroke: C.inkMuted,
        'stroke-width': 1.4,
      })
    );
    g.appendChild(
      svgEl('line', {
        x1: gx - 5,
        y1,
        x2: gx + 5,
        y2: y1,
        stroke: C.inkMuted,
        'stroke-width': 1.4,
      })
    );
    g.appendChild(
      svgEl('line', {
        x1: gx - 5,
        y1: y2,
        x2: gx + 5,
        y2,
        stroke: C.inkMuted,
        'stroke-width': 1.4,
      })
    );
    g.appendChild(
      svgEl('rect', {
        x: labelX,
        y: (y1 + y2) / 2 - 11,
        width: labelW,
        height: 22,
        rx: 3,
        fill: C.white,
        'fill-opacity': 0.92,
      })
    );
    const tx = svgEl('text', {
      class: 'ann',
      x: textX,
      y: (y1 + y2) / 2 + 5,
    });
    tx.textContent = a.label;
    g.appendChild(tx);
    annG.appendChild(g);
  }
  svg.appendChild(annG);

  const note = svgEl('text', {
    class: 'note',
    x: xOf(1),
    y: yOf(28),
    'text-anchor': 'middle',
  });
  note.textContent = t('gapNote');
  svg.appendChild(note);

  const maleLbl = svgEl('text', {
    class: 'series',
    fill: C.ochre,
    x: malePts[2][0] + 14,
    y: malePts[2][1] + 4,
  });
  maleLbl.textContent = t('gapMale');
  svg.appendChild(maleLbl);
  const femaleLbl = svgEl('text', {
    class: 'series',
    fill: C.sea,
    x: femalePts[2][0] + 14,
    y: femalePts[2][1] + 4,
  });
  femaleLbl.textContent = t('gapFemale');
  svg.appendChild(femaleLbl);

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

  years.forEach((yr, i) => {
    svg.appendChild(
      svgEl('line', {
        x1: xOf(i),
        y1: m.t + plotH,
        x2: xOf(i),
        y2: m.t + plotH + 7,
        stroke: C.sea,
        'stroke-width': 1.5,
      })
    );
    const tick = svgEl('text', {
      x: xOf(i),
      y: m.t + plotH + 28,
      'text-anchor': 'middle',
      class: 'tick',
    });
    tick.textContent = String(yr);
    svg.appendChild(tick);
  });

  const xTitle = svgEl('text', {
    class: 'axis-title',
    x: m.l + plotW / 2,
    y: H - 14,
    'text-anchor': 'middle',
  });
  xTitle.textContent = t('gapX');
  svg.appendChild(xTitle);
  const yTitle = svgEl('text', {
    class: 'axis-title',
    x: 18,
    y: m.t + plotH / 2,
    'text-anchor': 'middle',
    transform: `rotate(-90 18 ${m.t + plotH / 2})`,
  });
  yTitle.textContent = t('gapY');
  svg.appendChild(yTitle);

  mount.appendChild(svg);

  if (!prefersReducedMotion()) {
    band.style.opacity = '0';
    pointsG.style.opacity = '0';
    annG.style.opacity = '0';
    for (const path of [maleLine, femaleLine]) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    }
  }

  const tip = new ChartTooltip(mount);

  const highlight = (i) => {
    pointsG.querySelectorAll('.gap-dot').forEach((dot) => {
      const on = Number(dot.getAttribute('data-i')) === i;
      dot.setAttribute('r', on ? '8' : '6');
      dot.classList.toggle('is-active', on);
    });
  };

  const clearHighlight = () => {
    pointsG.querySelectorAll('.gap-dot').forEach((dot) => {
      dot.setAttribute('r', '6');
      dot.classList.remove('is-active');
    });
  };

  const showTip = (i, evt) => {
    highlight(i);
    tip.show(
      `<strong>${years[i]}</strong><br/>${t('gapMale')}: ${fmt(male[i], lang)}%<br/>${t('gapFemale')}: ${fmt(female[i], lang)}%<br/>${t('gapTooltipGap')}: ${fmt(gaps[i], lang)} pp`,
      evt.clientX,
      evt.clientY
    );
  };

  pointsG.querySelectorAll('.chart-hit').forEach((hit) => {
    const i = Number(hit.getAttribute('data-i'));
    hit.addEventListener('pointerenter', (e) => showTip(i, e));
    hit.addEventListener('pointermove', (e) => showTip(i, e));
    hit.addEventListener('pointerleave', () => {
      clearHighlight();
      tip.hide();
    });
    hit.addEventListener('focus', (e) => {
      const rect = hit.getBoundingClientRect();
      showTip(i, { clientX: rect.left + rect.width / 2, clientY: rect.top });
    });
  });

  onReveal(mount, () => {
    fadeIn(band, 800);
    animateStrokeDraw(maleLine, 1000);
    animateStrokeDraw(femaleLine, 1000);
    if (!prefersReducedMotion()) {
      fadeIn(pointsG, 900);
      fadeIn(annG, 1100);
    }
  });

  return () => tip.destroy();
}
