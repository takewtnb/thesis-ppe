#!/usr/bin/env node
/**
 * Build website-native SVG figures from thesis analysis data.
 * Palette matches site/src/css/styles.css
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const outDir = join(__dirname, '../public/figures');
mkdirSync(outDir, { recursive: true });

const C = {
  sea: '#23443e',
  seaMid: '#315b53',
  seaSoft: '#6e8a82',
  parchment: '#f5f2eb',
  parchmentDeep: '#cbc7bd',
  ink: '#1a1a17',
  inkMuted: '#56564f',
  ochre: '#9b4d35',
  ochreSoft: '#918d83',
  white: '#fbfaf6',
};

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else cur += ch;
    }
    cols.push(cur);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i];
    });
    return row;
  });
}

const rows = parseCsv(
  readFileSync(join(root, 'data/literacy/Female_literacy_with_recruitment_intensity.csv'), 'utf8')
);

const cities = rows
  .filter((r) => r.treatment_intensity && r.treatment_intensity !== 'NA')
  .map((r) => ({
    cityKey: r.city === 's-Gravenhage' ? 'The Hague' : r.city,
    intensity: Number(r.treatment_intensity),
    lon: Number(r.longitude),
    lat: Number(r.latitude),
  }))
  .filter((c) => Number.isFinite(c.intensity) && Number.isFinite(c.lon));

if (cities.length !== 32) {
  console.warn(`Expected 32 cities, got ${cities.length}`);
}

const CITY_LABELS = {
  en: {
    Rotterdam: 'Rotterdam',
    'The Hague': 'The Hague',
    Leiden: 'Leiden',
    Haarlem: 'Haarlem',
    Harlingen: 'Harlingen',
    Groningen: 'Groningen',
    Leeuwarden: 'Leeuwarden',
    Deventer: 'Deventer',
    Zwolle: 'Zwolle',
    Nijmegen: 'Nijmegen',
    Enkhuizen: 'Enkhuizen',
    Terschelling: 'Terschelling',
    Hoorn: 'Hoorn',
  },
  nl: {
    Rotterdam: 'Rotterdam',
    'The Hague': 'Den Haag',
    Leiden: 'Leiden',
    Haarlem: 'Haarlem',
    Harlingen: 'Harlingen',
    Groningen: 'Groningen',
    Leeuwarden: 'Leeuwarden',
    Deventer: 'Deventer',
    Zwolle: 'Zwolle',
    Nijmegen: 'Nijmegen',
    Enkhuizen: 'Enkhuizen',
    Terschelling: 'Terschelling',
    Hoorn: 'Hoorn',
  },
};

const FIG_COPY = {
  en: {
    mapTitle: 'Dutch cities in the literacy sample',
    mapDesc: 'Stylized Dutch Republic from the thesis GIS outline, with Zuiderzee and Zeeland islands; circle size reflects VOC departure intensity. Rotterdam is highlighted.',
    intensityLegend: 'VOC departure intensity',
    lower: 'Lower',
    higher: 'Higher',
    histTitle: 'Distribution of VOC departure intensity',
    histDesc: 'Histogram of treatment intensity across 32 Dutch cities, with Rotterdam in the right tail.',
    histX: 'VOC departure intensity (departures ÷ 1600 population)',
    histY: 'Number of cities',
    histCities: 'Cities',
    histRotterdam: 'Rotterdam bin',
    esTitle: 'Event-study estimates for the literacy gender gap',
    esDesc:
      'Point estimates and 95% confidence intervals for VOC departure intensity interactions in 1600, 1675, and 1750 under geography controls.',
    esX: 'Year',
    esY: 'Literacy gender gap (pp)',
    esNote: 'Preferred flexible TWFE · lon/lat × year FE · city-clustered 95% CIs',
    base: ' (base)',
    gapTitle: 'Average literacy by gender, 1600–1750',
    gapDesc:
      'Mean city-level male and female literacy over time; the shaded gap narrows from 33.2 to 25.6 percentage points.',
    gapX: 'Year',
    gapY: 'Mean literacy (%)',
    gapMale: 'Male literacy',
    gapFemale: 'Female literacy',
    gap1600: '33.2 pp gap',
    gap1750: '25.6 pp gap',
    gapNote: 'The shaded gap narrows over time',
  },
  nl: {
    mapTitle: 'Nederlandse steden in de geletterdheidssteekproef',
    mapDesc: 'Gestileerde Republiek naar de thesis-GIS-contour, met Zuiderzee en Zeeuwse eilanden; cirkelgrootte weerspiegelt VOC-vertrekintensiteit. Rotterdam is gemarkeerd.',
    intensityLegend: 'VOC-vertrekintensiteit',
    lower: 'Lager',
    higher: 'Hoger',
    histTitle: 'Verdeling van VOC-vertrekintensiteit',
    histDesc: 'Histogram van behandelingsintensiteit over 32 Nederlandse steden, met Rotterdam in de rechterstaart.',
    histX: 'VOC-vertrekintensiteit (vertrekken ÷ bevolking 1600)',
    histY: 'Aantal steden',
    histCities: 'Steden',
    histRotterdam: 'Rotterdam-bin',
    esTitle: 'Event-study-schattingen voor de geletterdheidskloof',
    esDesc:
      'Puntschattingen en 95%-betrouwbaarheidsintervallen voor interacties van VOC-vertrekintensiteit in 1600, 1675 en 1750 onder geografische controles.',
    esX: 'Jaar',
    esY: 'Geletterdheidskloof (pp)',
    esNote: 'Voorkeur-flexibele TWFE · lon/lat × jaar-FE · stad-geclusterde 95%-BI’s',
    base: ' (basis)',
    gapTitle: 'Gemiddelde geletterdheid naar geslacht, 1600–1750',
    gapDesc:
      'Gemiddelde stadsgewijze mannelijke en vrouwelijke geletterdheid over tijd; de gearceerde kloof vernauwt van 33,2 naar 25,6 procentpunten.',
    gapX: 'Jaar',
    gapY: 'Gemiddelde geletterdheid (%)',
    gapMale: 'Mannelijke geletterdheid',
    gapFemale: 'Vrouwelijke geletterdheid',
    gap1600: '33,2 pp kloof',
    gap1750: '25,6 pp kloof',
    gapNote: 'De gearceerde kloof vernauwt over tijd',
  },
};



// Dutch Republic land rings (lon, lat), derived from thesis GIS mint-authority
// polygons (Holland, Zeeland, Utrecht, …) with a stylized Zuiderzee cut and
// separate Zeeland / Wadden islands. Regenerate with:
//   site/.venv-gis/bin/python scripts/build-nl-land.py
const NL_LAND = JSON.parse(readFileSync(join(__dirname, 'nl-land-rings.json'), 'utf8'));

function project(lon, lat, box) {
  const { minLon, maxLon, minLat, maxLat, x0, y0, w, h, pad } = box;
  const x = x0 + pad + ((lon - minLon) / (maxLon - minLon)) * (w - 2 * pad);
  const y = y0 + pad + ((maxLat - lat) / (maxLat - minLat)) * (h - 2 * pad);
  return [x, y];
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildMap(lang) {
  const copy = FIG_COPY[lang];
  const labels = CITY_LABELS[lang];
  const W = 900, H = 720, pad = 48;
  const box = { minLon: 3.2, maxLon: 7.2, minLat: 50.95, maxLat: 53.55, x0: 0, y0: 0, w: W, h: H, pad };
  const pathD = NL_LAND.map((ring) => {
    const pts = ring.map(([lon, lat]) => project(lon, lat, box));
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
  }).join(' ');
  const maxI = Math.max(...cities.map((c) => c.intensity));
  const labeled = new Set(Object.keys(labels));
  // Nudge a few coastal labels so they sit on land / clear of Zuiderzee water
  const labelOffset = {
    Terschelling: [8, -10],
    Harlingen: [8, 4],
    Enkhuizen: [8, 4],
    Hoorn: [8, 4],
    Haarlem: [8, -2],
    Nijmegen: [8, 4],
    Leeuwarden: [8, 4],
    Zwolle: [8, 4],
  };
  const dots = cities.slice().sort((a, b) => a.intensity - b.intensity).map((c) => {
    const [x, y] = project(c.lon, c.lat, box);
    const r = 5 + (c.intensity / maxI) * 18;
    const isRotterdam = c.cityKey === 'Rotterdam';
    const fill = isRotterdam ? C.ochre : C.seaMid;
    const opacity = 0.55 + (c.intensity / maxI) * 0.4;
    const [dx, dy] = labelOffset[c.cityKey] || [r + 4, 4];
    const label = labeled.has(c.cityKey) && c.cityKey !== 'Harlingen'
      ? `<text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" class="label">${esc(labels[c.cityKey])}</text>`
      : '';
    return `<g class="city"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}" stroke="${C.white}" stroke-width="1.2"/>${label}</g>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="mapTitle mapDesc">
  <title id="mapTitle">${esc(copy.mapTitle)}</title>
  <desc id="mapDesc">${esc(copy.mapDesc)}</desc>
  <defs>
    <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="12" stroke="${C.ochre}" stroke-opacity="0.12" stroke-width="2"/></pattern>
    <style>
      .label { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.ink}; font-weight: 600; paint-order: stroke fill; stroke: ${C.parchment}; stroke-width: 3px; stroke-linejoin: round; }
      .legend-t { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; fill: ${C.inkMuted}; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.white}"/>
  <path fill-rule="evenodd" d="${pathD}" fill="${C.parchment}" stroke="${C.seaSoft}" stroke-width="1.5"/>
  <path fill-rule="evenodd" d="${pathD}" fill="url(#hatch)"/>
  ${dots}
  <g transform="translate(48, ${H - 58})">
    <text class="legend-t" x="0" y="0">${esc(copy.intensityLegend)}</text>
    <circle cx="14" cy="26" r="5" fill="${C.seaMid}" fill-opacity="0.7" stroke="${C.white}" stroke-width="1"/>
    <text class="legend-t" x="28" y="30">${esc(copy.lower)}</text>
    <circle cx="100" cy="26" r="14" fill="${C.seaMid}" fill-opacity="0.85" stroke="${C.white}" stroke-width="1"/>
    <text class="legend-t" x="122" y="30">${esc(copy.higher)}</text>
    <circle cx="210" cy="26" r="14" fill="${C.ochre}" fill-opacity="0.95" stroke="${C.white}" stroke-width="1"/>
    <text class="legend-t" x="232" y="30">${esc(labels.Rotterdam)}</text>
  </g>
</svg>`;
}

function buildHeroMap(lang) {
  const copy = FIG_COPY[lang];
  const labels = CITY_LABELS[lang];
  const W = 900, H = 720, pad = 38;
  const box = { minLon: 3.2, maxLon: 7.2, minLat: 50.95, maxLat: 53.55, x0: 0, y0: 0, w: W, h: H, pad };
  const pathD = NL_LAND.map((ring) => {
    const pts = ring.map(([lon, lat]) => project(lon, lat, box));
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z';
  }).join(' ');
  const maxI = Math.max(...cities.map((c) => c.intensity));
  const labeled = new Set(Object.keys(labels));
  const labelOffset = {
    Terschelling: [8, -10],
    Harlingen: [8, 4],
    Enkhuizen: [8, 4],
    Hoorn: [8, 4],
    Haarlem: [8, -2],
    Nijmegen: [8, 4],
    Leeuwarden: [8, 4],
    Zwolle: [8, 4],
  };
  const dots = cities.slice().sort((a, b) => a.intensity - b.intensity).map((c) => {
    const [x, y] = project(c.lon, c.lat, box);
    const r = 4 + (c.intensity / maxI) * 17;
    const isRotterdam = c.cityKey === 'Rotterdam';
    const fill = isRotterdam ? C.ochre : C.parchment;
    const opacity = isRotterdam ? 0.92 : 0.52 + (c.intensity / maxI) * 0.28;
    const [dx, dy] = labelOffset[c.cityKey] || [r + 4, 4];
    const label = labeled.has(c.cityKey) && c.cityKey !== 'Harlingen'
      ? `<text x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" class="label">${esc(labels[c.cityKey])}</text>`
      : '';
    return `<g><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity="${opacity.toFixed(2)}" stroke="${C.sea}" stroke-width="1.2"/>${label}</g>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="heroMapTitle heroMapDesc">
  <title id="heroMapTitle">${esc(copy.mapTitle)}</title>
  <desc id="heroMapDesc">${esc(copy.mapDesc)}</desc>
  <defs>
    <pattern id="heroHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="14" stroke="${C.parchment}" stroke-opacity="0.08" stroke-width="1"/></pattern>
    <style>
      .label { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.parchment}; fill-opacity: 0.66; font-weight: 500; paint-order: stroke fill; stroke: ${C.sea}; stroke-width: 3px; stroke-linejoin: round; }
    </style>
  </defs>
  <path fill-rule="evenodd" d="${pathD}" fill="${C.parchment}" fill-opacity="0.12" stroke="${C.seaSoft}" stroke-opacity="0.82" stroke-width="1.5"/>
  <path fill-rule="evenodd" d="${pathD}" fill="url(#heroHatch)"/>
  ${dots}
</svg>`;
}

function buildHistogram(lang) {
  const copy = FIG_COPY[lang];
  const W = 880, H = 460;
  const m = { t: 36, r: 28, b: 64, l: 56 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const binWidth = 0.1;
  const xMax = Math.ceil(Math.max(...cities.map((c) => c.intensity)) / 0.2) * 0.2;
  const bins = [];
  for (let x = 0; x < xMax; x += binWidth) bins.push({ x0: x, n: 0, cities: [] });
  for (const c of cities) {
    const i = Math.min(bins.length - 1, Math.floor(c.intensity / binWidth));
    bins[i].n += 1;
    bins[i].cities.push(c.cityKey);
  }
  const yMax = Math.max(16, ...bins.map((b) => b.n));
  const bars = bins.map((b) => {
    const x = m.l + (b.x0 / xMax) * plotW;
    const w = (binWidth / xMax) * plotW - 2;
    const h = (b.n / yMax) * plotH;
    const y = m.t + plotH - h;
    const fill = b.cities.includes('Rotterdam') ? C.ochre : C.seaSoft;
    return b.n === 0 ? '' : `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(w, 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" rx="2"/>`;
  }).join('\n');
  const bw = 0.08;
  const xs = Array.from({ length: 81 }, (_, i) => (i / 80) * xMax);
  const dens = xs.map((x) => {
    let s = 0;
    for (const c of cities) {
      const u = (x - c.intensity) / bw;
      s += Math.exp(-0.5 * u * u);
    }
    return (s / (cities.length * bw * Math.sqrt(2 * Math.PI))) * cities.length * binWidth;
  });
  const densPath = xs.map((x, i) => {
    const px = m.l + (x / xMax) * plotW;
    const py = m.t + plotH - (dens[i] / yMax) * plotH;
    return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');
  const xTicks = [];
  for (let x = 0; x <= xMax + 1e-9; x += 0.2) {
    const px = (m.l + (x / xMax) * plotW).toFixed(1);
    xTicks.push(`<line x1="${px}" y1="${m.t + plotH}" x2="${px}" y2="${m.t + plotH + 6}" stroke="${C.inkMuted}"/><text x="${px}" y="${m.t + plotH + 24}" text-anchor="middle" class="tick">${x.toFixed(1)}</text>`);
  }
  const yTicks = [];
  for (let y = 0; y <= yMax; y += 2) {
    const py = m.t + plotH - (y / yMax) * plotH;
    yTicks.push(`<line x1="${m.l - 6}" y1="${py}" x2="${m.l}" y2="${py}" stroke="${C.inkMuted}"/><line x1="${m.l}" y1="${py}" x2="${m.l + plotW}" y2="${py}" stroke="${C.parchmentDeep}" stroke-width="1"/><text x="${m.l - 12}" y="${py + 4}" text-anchor="end" class="tick">${y}</text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="histTitle histDesc">
  <title id="histTitle">${esc(copy.histTitle)}</title>
  <desc id="histDesc">${esc(copy.histDesc)}</desc>
  <defs><style>.tick { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.inkMuted}; } .axis-title { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; fill: ${C.sea}; font-weight: 600; }</style></defs>
  <rect width="${W}" height="${H}" fill="${C.parchment}"/>
  ${yTicks.join('\n')}
  ${bars}
  <path d="${densPath}" fill="none" stroke="${C.sea}" stroke-width="2.4" stroke-linejoin="round"/>
  <line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  ${xTicks.join('\n')}
  <text class="axis-title" x="${m.l + plotW / 2}" y="${H - 14}" text-anchor="middle">${esc(copy.histX)}</text>
  <text class="axis-title" x="18" y="${m.t + plotH / 2}" text-anchor="middle" transform="rotate(-90 18 ${m.t + plotH / 2})">${esc(copy.histY)}</text>
  <g transform="translate(${m.l + plotW - 220}, ${m.t + 8})">
    <rect x="0" y="0" width="14" height="14" fill="${C.seaSoft}" rx="2"/><text class="tick" x="20" y="12">${esc(copy.histCities)}</text>
    <rect x="90" y="0" width="14" height="14" fill="${C.ochre}" rx="2"/><text class="tick" x="110" y="12">${esc(copy.histRotterdam)}</text>
  </g>
</svg>`;
}

function buildEventStudy(lang) {
  const copy = FIG_COPY[lang];
  const points = [
    { year: 1600, coef: 0, se: 0, baseline: true },
    { year: 1675, coef: 2.56, se: 7.84 },
    { year: 1750, coef: 11.37, se: 5.3 },
  ].map((p) => ({ ...p, lo: p.coef - 1.96 * p.se, hi: p.coef + 1.96 * p.se }));
  const W = 880, H = 500;
  const m = { t: 64, r: 36, b: 70, l: 64 };
  const plotW = W - m.l - m.r, plotH = H - m.t - m.b;
  const yMin = -16, yMax = 24;
  const years = [1600, 1675, 1750];
  const xOf = (year) => m.l + (years.indexOf(year) / (years.length - 1)) * plotW;
  const yOf = (v) => m.t + ((yMax - v) / (yMax - yMin)) * plotH;
  const f = (n) => n.toFixed(1);
  const grid = [];
  for (let y = yMin; y <= yMax; y += 4) {
    const py = f(yOf(y));
    grid.push(`<line x1="${m.l}" y1="${py}" x2="${m.l + plotW}" y2="${py}" stroke="${C.parchmentDeep}" stroke-width="${y === 0 ? 1.8 : 1}" stroke-dasharray="${y === 0 ? '0' : '4 5'}"/><text x="${m.l - 12}" y="${(Number(py) + 4).toFixed(1)}" text-anchor="end" class="tick">${y}</text>`);
  }
  const series = points.map((p, idx) => {
    const x = xOf(p.year), y = yOf(p.coef), yLo = yOf(p.lo), yHi = yOf(p.hi);
    const color = p.year === 1750 ? C.ochre : C.seaMid;
    const labelOnLeft = idx === points.length - 1;
    const labelX = x + (labelOnLeft ? -14 : 14);
    const labelAnchor = labelOnLeft ? 'end' : 'start';
    return `<g>
      <line x1="${f(x)}" y1="${f(yLo)}" x2="${f(x)}" y2="${f(yHi)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="${f(x - 8)}" y1="${f(yLo)}" x2="${f(x + 8)}" y2="${f(yLo)}" stroke="${color}" stroke-width="2"/>
      <line x1="${f(x - 8)}" y1="${f(yHi)}" x2="${f(x + 8)}" y2="${f(yHi)}" stroke="${color}" stroke-width="2"/>
      <circle cx="${f(x)}" cy="${f(y)}" r="${p.baseline ? 6 : 8}" fill="${p.baseline ? C.parchment : color}" stroke="${color}" stroke-width="2.5"/>
      <text x="${f(x)}" y="${m.t + plotH + 28}" text-anchor="middle" class="tick">${p.year}${p.baseline ? esc(copy.base) : ''}</text>
      <text x="${f(labelX)}" y="${f(y - 13)}" text-anchor="${labelAnchor}" class="coef">${p.coef.toFixed(2)}</text>
    </g>`;
  }).join('\n');
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${f(xOf(p.year))},${f(yOf(p.coef))}`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="esTitle esDesc">
  <title id="esTitle">${esc(copy.esTitle)}</title>
  <desc id="esDesc">${esc(copy.esDesc)}</desc>
  <defs><style>.tick { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.inkMuted}; } .coef { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; fill: ${C.sea}; font-weight: 600; paint-order: stroke fill; stroke: ${C.parchment}; stroke-width: 5px; stroke-linejoin: round; } .chart-note { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; fill: ${C.inkMuted}; font-weight: 500; letter-spacing: 0.01em; } .axis-title { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; fill: ${C.sea}; font-weight: 600; }</style></defs>
  <rect width="${W}" height="${H}" fill="${C.parchment}"/>
  ${grid.join('\n')}
  <path d="${line}" fill="none" stroke="${C.seaSoft}" stroke-width="2" stroke-dasharray="6 5"/>
  ${series}
  <line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  <text class="axis-title" x="${m.l + plotW / 2}" y="${H - 16}" text-anchor="middle">${esc(copy.esX)}</text>
  <text class="axis-title" x="20" y="${m.t + plotH / 2}" text-anchor="middle" transform="rotate(-90 20 ${m.t + plotH / 2})">${esc(copy.esY)}</text>
  <text x="${m.l}" y="30" class="chart-note">${esc(copy.esNote)}</text>
</svg>`;
}

function buildLiteracyGap(lang) {
  // Mean city-level literacy by gender (thesis summary stats / short-talk figure).
  const copy = FIG_COPY[lang];
  const years = [1600, 1675, 1750];
  const female = [33.45, 48.08, 59.79];
  const male = [66.63, 75.86, 85.36];
  const W = 880, H = 480;
  const m = { t: 48, r: 168, b: 64, l: 64 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const yMin = 20, yMax = 90;
  const xOf = (i) => m.l + (i / (years.length - 1)) * plotW;
  const yOf = (v) => m.t + ((yMax - v) / (yMax - yMin)) * plotH;
  const f = (n) => n.toFixed(1);

  const malePts = male.map((v, i) => [xOf(i), yOf(v)]);
  const femalePts = female.map((v, i) => [xOf(i), yOf(v)]);
  const band = [
    ...malePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)},${f(y)}`),
    ...femalePts
      .slice()
      .reverse()
      .map(([x, y]) => `L${f(x)},${f(y)}`),
    'Z',
  ].join(' ');
  const maleLine = malePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)},${f(y)}`).join(' ');
  const femaleLine = femalePts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)},${f(y)}`).join(' ');

  const yTicks = [];
  for (let y = 20; y <= 80; y += 20) {
    const py = yOf(y);
    yTicks.push(
      `<line x1="${m.l}" y1="${f(py)}" x2="${m.l + plotW}" y2="${f(py)}" stroke="${C.parchmentDeep}" stroke-width="1"/>` +
        `<text x="${m.l - 12}" y="${f(py + 4)}" text-anchor="end" class="tick">${y}</text>`
    );
  }
  const xTicks = years
    .map(
      (yr, i) =>
        `<line x1="${f(xOf(i))}" y1="${m.t + plotH}" x2="${f(xOf(i))}" y2="${m.t + plotH + 7}" stroke="${C.sea}" stroke-width="1.5"/>` +
        `<text x="${f(xOf(i))}" y="${m.t + plotH + 28}" text-anchor="middle" class="tick">${yr}</text>`
    )
    .join('\n');

  const maleDots = malePts
    .map(
      ([x, y]) =>
        `<circle cx="${f(x)}" cy="${f(y)}" r="6" fill="${C.ochre}" stroke="${C.parchment}" stroke-width="1.5"/>`
    )
    .join('\n');
  const femaleDots = femalePts
    .map(
      ([x, y]) =>
        `<circle cx="${f(x)}" cy="${f(y)}" r="6" fill="${C.sea}" stroke="${C.parchment}" stroke-width="1.5"/>`
    )
    .join('\n');

  // Gap markers at the year so bracket height matches the shaded gap
  const g0x = xOf(0);
  const g0y1 = yOf(male[0]);
  const g0y2 = yOf(female[0]);
  const g2x = xOf(2);
  const g2y1 = yOf(male[2]);
  const g2y2 = yOf(female[2]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="gapTitle gapDesc">
  <title id="gapTitle">${esc(copy.gapTitle)}</title>
  <desc id="gapDesc">${esc(copy.gapDesc)}</desc>
  <defs>
    <style>
      .tick { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.inkMuted}; }
      .axis-title { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; fill: ${C.sea}; font-weight: 600; }
      .series { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 600; }
      .ann { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 12px; fill: ${C.inkMuted}; font-weight: 600; }
      .note { font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif; font-size: 13px; fill: ${C.inkMuted}; font-style: italic; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.parchment}"/>
  ${yTicks.join('\n')}
  <path d="${band}" fill="${C.seaSoft}" fill-opacity="0.22"/>
  <path d="${maleLine}" fill="none" stroke="${C.ochre}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="${femaleLine}" fill="none" stroke="${C.sea}" stroke-width="2.6" stroke-linejoin="round"/>
  ${maleDots}
  ${femaleDots}
  <g class="gap-ann">
    <line x1="${f(g0x)}" y1="${f(g0y1)}" x2="${f(g0x)}" y2="${f(g0y2)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <line x1="${f(g0x - 5)}" y1="${f(g0y1)}" x2="${f(g0x + 5)}" y2="${f(g0y1)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <line x1="${f(g0x - 5)}" y1="${f(g0y2)}" x2="${f(g0x + 5)}" y2="${f(g0y2)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <rect x="${f(g0x + 14)}" y="${f((g0y1 + g0y2) / 2 - 11)}" width="78" height="22" rx="3" fill="${C.white}" fill-opacity="0.92"/>
    <text class="ann" x="${f(g0x + 18)}" y="${f((g0y1 + g0y2) / 2 + 5)}">${esc(copy.gap1600)}</text>
  </g>
  <g class="gap-ann">
    <line x1="${f(g2x)}" y1="${f(g2y1)}" x2="${f(g2x)}" y2="${f(g2y2)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <line x1="${f(g2x - 5)}" y1="${f(g2y1)}" x2="${f(g2x + 5)}" y2="${f(g2y1)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <line x1="${f(g2x - 5)}" y1="${f(g2y2)}" x2="${f(g2x + 5)}" y2="${f(g2y2)}" stroke="${C.inkMuted}" stroke-width="1.4"/>
    <rect x="${f(g2x - 14 - 78)}" y="${f((g2y1 + g2y2) / 2 - 11)}" width="78" height="22" rx="3" fill="${C.white}" fill-opacity="0.92"/>
    <text class="ann" x="${f(g2x - 14 - 78 + 4)}" y="${f((g2y1 + g2y2) / 2 + 5)}">${esc(copy.gap1750)}</text>
  </g>
  <text class="note" x="${f(xOf(1))}" y="${f(yOf(28))}" text-anchor="middle">${esc(copy.gapNote)}</text>
  <text class="series" fill="${C.ochre}" x="${f(malePts[2][0] + 14)}" y="${f(malePts[2][1] + 4)}">${esc(copy.gapMale)}</text>
  <text class="series" fill="${C.sea}" x="${f(femalePts[2][0] + 14)}" y="${f(femalePts[2][1] + 4)}">${esc(copy.gapFemale)}</text>
  <line x1="${m.l}" y1="${m.t + plotH}" x2="${m.l + plotW}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  <line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + plotH}" stroke="${C.sea}" stroke-width="1.5"/>
  ${xTicks}
  <text class="axis-title" x="${m.l + plotW / 2}" y="${H - 14}" text-anchor="middle">${esc(copy.gapX)}</text>
  <text class="axis-title" x="18" y="${m.t + plotH / 2}" text-anchor="middle" transform="rotate(-90 18 ${m.t + plotH / 2})">${esc(copy.gapY)}</text>
</svg>`;
}

const written = [];
for (const lang of ['en', 'nl']) {
  for (const [stem, build] of [
    ['cities-map', buildMap],
    ['cities-map-hero', buildHeroMap],
    ['treatment-intensity', buildHistogram],
    ['event-study', buildEventStudy],
    ['literacy-gap', buildLiteracyGap],
  ]) {
    const file = `${stem}.${lang}.svg`;
    const svg = build(lang);
    writeFileSync(join(outDir, file), svg);
    written.push(svg);
  }
}

for (const name of ['cities-map.svg', 'cities-map-hero.svg', 'treatment-intensity.svg', 'event-study.svg', 'literacy-gap.svg']) {
  const p = join(outDir, name);
  if (existsSync(p)) unlinkSync(p);
}

// JSON payloads for client-side interactive charts (same sources as the static SVGs).
const dataDir = join(__dirname, '../public/data');
mkdirSync(dataDir, { recursive: true });

const histBinWidth = 0.1;
const histXMax = Math.ceil(Math.max(...cities.map((c) => c.intensity)) / 0.2) * 0.2;
const histBins = [];
for (let x = 0; x < histXMax; x += histBinWidth) histBins.push({ x0: x, x1: x + histBinWidth, n: 0, cities: [] });
for (const c of cities) {
  const i = Math.min(histBins.length - 1, Math.floor(c.intensity / histBinWidth));
  histBins[i].n += 1;
  histBins[i].cities.push(c.cityKey);
}
const histBw = 0.08;
const histXs = Array.from({ length: 81 }, (_, i) => (i / 80) * histXMax);
const histDens = histXs.map((x) => {
  let s = 0;
  for (const c of cities) {
    const u = (x - c.intensity) / histBw;
    s += Math.exp(-0.5 * u * u);
  }
  return (s / (cities.length * histBw * Math.sqrt(2 * Math.PI))) * cities.length * histBinWidth;
});

const gapYears = [1600, 1675, 1750];
const gapFemale = [33.45, 48.08, 59.79];
const gapMale = [66.63, 75.86, 85.36];

const eventPoints = [
  { year: 1600, coef: 0, se: 0, baseline: true },
  { year: 1675, coef: 2.56, se: 7.84, baseline: false },
  { year: 1750, coef: 11.37, se: 5.3, baseline: false },
].map((p) => ({ ...p, lo: p.coef - 1.96 * p.se, hi: p.coef + 1.96 * p.se }));

const chartData = {
  'cities-map': {
    land: NL_LAND,
    cities: cities.map((c) => ({
      cityKey: c.cityKey,
      intensity: c.intensity,
      lon: c.lon,
      lat: c.lat,
    })),
    labels: CITY_LABELS,
    box: { minLon: 3.2, maxLon: 7.2, minLat: 50.95, maxLat: 53.55, w: 900, h: 720, pad: 48 },
    labelOffset: {
      Terschelling: [8, -10],
      Harlingen: [8, 4],
      Enkhuizen: [8, 4],
      Hoorn: [8, 4],
      Haarlem: [8, -2],
      Nijmegen: [8, 4],
      Leeuwarden: [8, 4],
      Zwolle: [8, 4],
    },
  },
  'literacy-gap': {
    years: gapYears,
    female: gapFemale,
    male: gapMale,
    gaps: gapMale.map((m, i) => +(m - gapFemale[i]).toFixed(1)),
  },
  'treatment-intensity': {
    binWidth: histBinWidth,
    xMax: histXMax,
    bins: histBins,
    density: { x: histXs, y: histDens },
    yMax: Math.max(16, ...histBins.map((b) => b.n)),
    labels: CITY_LABELS,
  },
  'event-study': {
    points: eventPoints,
    yMin: -16,
    yMax: 24,
  },
};

for (const [stem, payload] of Object.entries(chartData)) {
  const json = JSON.stringify(payload);
  writeFileSync(join(dataDir, `${stem}.json`), json);
  written.push(json);
}

// Content hash so img src query params bust CDN/browser caches when SVGs change
// (EN cities-map in particular was sticky after the GIS outline landed).
const figureVersion = createHash('sha1').update(written.join('\0')).digest('hex').slice(0, 10);
const versionPath = join(__dirname, '../src/js/figure-version.js');
writeFileSync(
  versionPath,
  `/** Auto-generated by scripts/build-figures.mjs — do not edit. */\nexport const figureVersion = '${figureVersion}';\n`
);

console.log(
  `Wrote EN/NL SVGs to ${outDir} and chart JSON to ${dataDir} (${cities.length} cities); figureVersion=${figureVersion}`
);
