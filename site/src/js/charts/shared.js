/** Shared helpers for interactive inline charts. */

export const C = {
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

const FONT = "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif";

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function svgEl(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    el.setAttribute(k, String(v));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function styleSheet(rules) {
  const style = svgEl('style');
  style.textContent = rules;
  return style;
}

export function axisTitleStyle() {
  return `.tick { font-family: ${FONT}; font-size: 13px; fill: ${C.inkMuted}; }
.axis-title { font-family: ${FONT}; font-size: 14px; fill: ${C.sea}; font-weight: 600; }
.series { font-family: ${FONT}; font-size: 14px; font-weight: 600; }
.ann { font-family: ${FONT}; font-size: 12px; fill: ${C.inkMuted}; font-weight: 600; }
.note { font-family: ${FONT}; font-size: 13px; fill: ${C.inkMuted}; font-style: italic; }
.coef { font-family: ${FONT}; font-size: 12px; fill: ${C.sea}; font-weight: 600; paint-order: stroke fill; stroke: ${C.parchment}; stroke-width: 5px; stroke-linejoin: round; }
.chart-note { font-family: ${FONT}; font-size: 12px; fill: ${C.inkMuted}; font-weight: 500; letter-spacing: 0.01em; }
.label { font-family: ${FONT}; font-size: 13px; fill: ${C.ink}; font-weight: 600; paint-order: stroke fill; stroke: ${C.parchment}; stroke-width: 3px; stroke-linejoin: round; }
.legend-t { font-family: ${FONT}; font-size: 12px; fill: ${C.inkMuted}; }
.chart-hit { cursor: pointer; }
.chart-dim { opacity: 0.28; transition: opacity 0.2s ease; }
.chart-focus { opacity: 1; }`;
}

/** Position a floating HTML tooltip relative to the chart mount. */
export class ChartTooltip {
  constructor(mount) {
    this.mount = mount;
    this.el = document.createElement('div');
    this.el.className = 'chart-tooltip';
    this.el.setAttribute('role', 'tooltip');
    this.el.hidden = true;
    mount.appendChild(this.el);
  }

  show(html, clientX, clientY) {
    this.el.innerHTML = html;
    this.el.hidden = false;
    const rect = this.mount.getBoundingClientRect();
    const pad = 12;
    let left = clientX - rect.left + pad;
    let top = clientY - rect.top + pad;
    this.el.style.left = '0px';
    this.el.style.top = '0px';
    const tw = this.el.offsetWidth;
    const th = this.el.offsetHeight;
    if (left + tw > rect.width - 4) left = clientX - rect.left - tw - pad;
    if (top + th > rect.height - 4) top = clientY - rect.top - th - pad;
    left = Math.max(4, left);
    top = Math.max(4, top);
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  hide() {
    this.el.hidden = true;
    this.el.innerHTML = '';
  }

  destroy() {
    this.el.remove();
  }
}

/** Run once when the mount (or its figure ancestor) becomes visible. */
export function onReveal(mount, callback) {
  if (prefersReducedMotion()) {
    callback();
    return;
  }
  const figure = mount.closest('[data-reveal]') || mount;
  if (figure.classList.contains('is-visible')) {
    requestAnimationFrame(callback);
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          obs.disconnect();
          callback();
          break;
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  obs.observe(figure);
}

export function animateStrokeDraw(path, duration = 900) {
  if (prefersReducedMotion() || !path.getTotalLength) {
    path.style.strokeDasharray = '';
    path.style.strokeDashoffset = '';
    return;
  }
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
  path.getBoundingClientRect();
  path.style.transition = `stroke-dashoffset ${duration}ms ease-out`;
  requestAnimationFrame(() => {
    path.style.strokeDashoffset = '0';
  });
}

export function fadeIn(el, duration = 700) {
  if (prefersReducedMotion()) {
    el.style.opacity = '1';
    return;
  }
  el.style.opacity = '0';
  el.style.transition = `opacity ${duration}ms ease-out`;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
  });
}

const cache = new Map();

export async function loadChartData(stem) {
  if (cache.has(stem)) return cache.get(stem);
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/${stem}.json`);
  if (!res.ok) throw new Error(`Failed to load chart data: ${stem}`);
  const data = await res.json();
  cache.set(stem, data);
  return data;
}

export function fmt(n, lang, digits = 1) {
  const locale = lang === 'nl' ? 'nl-NL' : 'en-GB';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}
