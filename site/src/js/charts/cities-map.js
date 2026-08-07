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

function project(lon, lat, box) {
  const { minLon, maxLon, minLat, maxLat, w, h, pad } = box;
  const x = pad + ((lon - minLon) / (maxLon - minLon)) * (w - 2 * pad);
  const y = pad + ((maxLat - lat) / (maxLat - minLat)) * (h - 2 * pad);
  return [x, y];
}

export async function renderCitiesMap(mount, lang, t) {
  const data = await loadChartData('cities-map');
  clear(mount);
  mount.classList.add('chart', 'chart--cities-map');

  const { land, cities, labels, box, labelOffset } = data;
  const W = box.w;
  const H = box.h;
  const maxI = Math.max(...cities.map((c) => c.intensity));
  const labeled = new Set(Object.keys(labels[lang] || labels.en));
  const nameOf = (key) => (labels[lang] || labels.en)[key] || key;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    role: 'presentation',
    class: 'chart__svg',
  });

  const defs = svgEl('defs');
  defs.appendChild(styleSheet(axisTitleStyle()));
  const hatch = svgEl('pattern', {
    id: 'hatch',
    width: 12,
    height: 12,
    patternUnits: 'userSpaceOnUse',
    patternTransform: 'rotate(35)',
  });
  hatch.appendChild(
    svgEl('line', {
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 12,
      stroke: C.ochre,
      'stroke-opacity': 0.12,
      'stroke-width': 2,
    })
  );
  defs.appendChild(hatch);
  svg.appendChild(defs);

  svg.appendChild(svgEl('rect', { width: W, height: H, fill: C.white }));

  const pathD = land
    .map((ring) => {
      const pts = ring.map(([lon, lat]) => project(lon, lat, box));
      return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
    })
    .join(' ');
  svg.appendChild(
    svgEl('path', {
      'fill-rule': 'evenodd',
      d: pathD,
      fill: C.parchment,
      stroke: C.seaSoft,
      'stroke-width': 1.5,
    })
  );
  svg.appendChild(
    svgEl('path', {
      'fill-rule': 'evenodd',
      d: pathD,
      fill: 'url(#hatch)',
    })
  );

  const citiesG = svgEl('g', { class: 'map-cities' });
  const sorted = cities.slice().sort((a, b) => a.intensity - b.intensity);
  const cityEls = [];

  for (const c of sorted) {
    const [x, y] = project(c.lon, c.lat, box);
    const r = 5 + (c.intensity / maxI) * 18;
    const isRotterdam = c.cityKey === 'Rotterdam';
    const fill = isRotterdam ? C.ochre : C.seaMid;
    const opacity = 0.55 + (c.intensity / maxI) * 0.4;
    const g = svgEl('g', {
      class: 'map-city',
      'data-city': c.cityKey,
      tabindex: '0',
      role: 'img',
      'aria-label': `${nameOf(c.cityKey)}: ${fmt(c.intensity, lang, 2)}`,
    });
    const circle = svgEl('circle', {
      cx: x.toFixed(1),
      cy: y.toFixed(1),
      r: r.toFixed(1),
      fill,
      'fill-opacity': opacity.toFixed(2),
      stroke: C.white,
      'stroke-width': 1.2,
      class: 'map-dot',
    });
    circle.style.transform = prefersReducedMotion() ? 'scale(1)' : 'scale(0)';
    g.appendChild(circle);
    // Invisible hit target at least 20px
    g.appendChild(
      svgEl('circle', {
        cx: x.toFixed(1),
        cy: y.toFixed(1),
        r: Math.max(r, 14).toFixed(1),
        fill: 'transparent',
        class: 'chart-hit',
      })
    );
    if (labeled.has(c.cityKey)) {
      const [dx, dy] = labelOffset[c.cityKey] || [r + 4, 4];
      const label = svgEl('text', {
        x: (x + dx).toFixed(1),
        y: (y + dy).toFixed(1),
        class: 'label',
      });
      label.textContent = nameOf(c.cityKey);
      g.appendChild(label);
    }
    citiesG.appendChild(g);
    cityEls.push({ g, circle, r, city: c });
  }
  svg.appendChild(citiesG);

  const legend = svgEl('g', { transform: `translate(48, ${H - 58})` });
  const lt = svgEl('text', { class: 'legend-t', x: 0, y: 0 });
  lt.textContent = t('intensityLegend');
  legend.appendChild(lt);
  legend.appendChild(
    svgEl('circle', {
      cx: 14,
      cy: 26,
      r: 5,
      fill: C.seaMid,
      'fill-opacity': 0.7,
      stroke: C.white,
      'stroke-width': 1,
    })
  );
  const ll = svgEl('text', { class: 'legend-t', x: 28, y: 30 });
  ll.textContent = t('mapLower');
  legend.appendChild(ll);
  legend.appendChild(
    svgEl('circle', {
      cx: 100,
      cy: 26,
      r: 14,
      fill: C.seaMid,
      'fill-opacity': 0.85,
      stroke: C.white,
      'stroke-width': 1,
    })
  );
  const lh = svgEl('text', { class: 'legend-t', x: 122, y: 30 });
  lh.textContent = t('mapHigher');
  legend.appendChild(lh);
  legend.appendChild(
    svgEl('circle', {
      cx: 210,
      cy: 26,
      r: 14,
      fill: C.ochre,
      'fill-opacity': 0.95,
      stroke: C.white,
      'stroke-width': 1,
    })
  );
  const lr = svgEl('text', { class: 'legend-t', x: 232, y: 30 });
  lr.textContent = nameOf('Rotterdam');
  legend.appendChild(lr);
  svg.appendChild(legend);

  mount.appendChild(svg);
  const tip = new ChartTooltip(mount);

  const highlight = (active) => {
    cityEls.forEach(({ g }) => {
      const on = g === active;
      g.classList.toggle('chart-dim', active && !on);
      g.classList.toggle('chart-focus', on);
    });
  };

  const showTip = (item, evt) => {
    highlight(item.g);
    tip.show(
      `<strong>${nameOf(item.city.cityKey)}</strong><br/>${t('mapTooltipIntensity')}: ${fmt(item.city.intensity, lang, 3)}`,
      evt.clientX,
      evt.clientY
    );
  };

  const clearTip = () => {
    highlight(null);
    tip.hide();
  };

  cityEls.forEach((item) => {
    item.g.addEventListener('pointerenter', (e) => showTip(item, e));
    item.g.addEventListener('pointermove', (e) => showTip(item, e));
    item.g.addEventListener('pointerleave', clearTip);
    item.g.addEventListener('focus', () => {
      const rect = item.g.getBoundingClientRect();
      showTip(item, { clientX: rect.left + rect.width / 2, clientY: rect.top });
    });
    item.g.addEventListener('blur', clearTip);
  });

  onReveal(mount, () => {
    cityEls.forEach((item, i) => {
      if (prefersReducedMotion()) {
        item.circle.style.transform = 'scale(1)';
        return;
      }
      item.circle.style.transition = `transform 0.5s ease-out ${i * 18}ms`;
      requestAnimationFrame(() => {
        item.circle.style.transform = 'scale(1)';
      });
    });
    fadeIn(legend, 700);
  });

  return () => tip.destroy();
}
