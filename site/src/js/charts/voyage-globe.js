import {
  geoDistance,
  geoGraticule10,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/land-110m.json';
import { C, ChartTooltip, clear, loadChartData, prefersReducedMotion, svgEl } from './shared.js';

const W = 680;
const H = 620;
const BASE_SCALE = 272;
const LAND = feature(world, world.objects.land);
const SPHERE = { type: 'Sphere' };
const GRATICULE = geoGraticule10();

function htmlEl(name, className, text) {
  const element = document.createElement(name);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointCoordinates(point, places) {
  return point.place ? places[point.place].coordinates : point.coordinates;
}

function routePlaces(route) {
  const seen = new Set();
  const places = [];
  for (const path of route.paths) {
    for (const point of path) {
      if (!point.place || seen.has(point.place)) continue;
      seen.add(point.place);
      places.push(point.place);
    }
  }
  return places;
}

function pointAlongPath(points, progress) {
  if (points.length < 2) return points[0];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const distance = geoDistance(points[i - 1], points[i]);
    lengths.push(distance);
    total += distance;
  }
  let target = (((progress % 1) + 1) % 1) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      const ratio = lengths[i] ? target / lengths[i] : 0;
      return geoInterpolate(points[i], points[i + 1])(ratio);
    }
    target -= lengths[i];
  }
  return points.at(-1);
}

function nearestRotation(from, focus) {
  const target = [-focus[0], -focus[1], 0];
  const delta = ((((target[0] - from[0]) % 360) + 540) % 360) - 180;
  return [from[0] + delta, target[1], 0];
}

export async function renderVoyageGlobe(mount, lang, t) {
  const data = await loadChartData('voyage-routes');
  clear(mount);
  mount.classList.add('chart--voyage-globe');

  const reducedMotion = prefersReducedMotion();
  const listeners = [];
  const listen = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  };

  let activeRoute = data.routes[0];
  let rotation = [-12, -8, 0];
  let zoom = 1;
  let paused = reducedMotion;
  let inView = false;
  let frameId = null;
  let previousTime = 0;
  let markerProgress = 0;
  let focusAnimation = null;
  let dragState = null;

  const projection = geoOrthographic()
    .translate([W / 2, H / 2])
    .scale(BASE_SCALE)
    .precision(0.35)
    .clipAngle(90);
  const path = geoPath(projection);

  const shell = htmlEl('div', 'globe-explorer');
  const stage = htmlEl('div', 'globe-stage');
  const stageMeta = htmlEl('div', 'globe-stage__meta');
  stageMeta.append(
    htmlEl('span', '', t('globeMetaWorld')),
    htmlEl('span', '', t('globeMetaProjection'))
  );

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'globe-svg',
    tabindex: '0',
    role: 'group',
    'aria-label': `${t('globeAlt')}. ${t('globeInstruction')}`,
  });
  const sphere = svgEl('path', { class: 'globe-sphere', 'aria-hidden': 'true' });
  const graticule = svgEl('path', { class: 'globe-graticule', 'aria-hidden': 'true' });
  const land = svgEl('path', { class: 'globe-land', 'aria-hidden': 'true' });
  const routeLayer = svgEl('g', { class: 'globe-routes', 'aria-hidden': 'true' });
  const portLayer = svgEl('g', { class: 'globe-ports' });
  const marker = svgEl('circle', {
    r: 5.5,
    class: 'globe-voyage-marker',
    'aria-hidden': 'true',
  });
  svg.append(sphere, graticule, land, routeLayer, portLayer, marker);

  const stageControls = htmlEl('div', 'globe-stage__controls');
  const pauseButton = htmlEl('button', 'globe-icon-btn');
  pauseButton.type = 'button';
  const zoomOut = htmlEl('button', 'globe-icon-btn', '−');
  zoomOut.type = 'button';
  zoomOut.setAttribute('aria-label', t('globeZoomOut'));
  const zoomIn = htmlEl('button', 'globe-icon-btn', '+');
  zoomIn.type = 'button';
  zoomIn.setAttribute('aria-label', t('globeZoomIn'));
  stageControls.append(pauseButton, zoomOut, zoomIn);

  const instruction = htmlEl('p', 'globe-stage__instruction', t('globeInstruction'));
  stage.append(stageMeta, svg, stageControls, instruction);

  const panel = htmlEl('aside', 'globe-panel');
  const routeLabel = htmlEl('p', 'globe-panel__label', t('globeRoutesLabel'));
  const routeList = htmlEl('div', 'globe-route-list');
  const routeButtons = new Map();
  const detail = htmlEl('article', 'globe-detail');
  detail.setAttribute('aria-live', 'polite');
  const ethics = htmlEl('p', 'globe-ethics', t('globeEthics'));
  panel.append(routeLabel, routeList, detail, ethics);
  shell.append(stage, panel);
  mount.appendChild(shell);

  const routeElements = new Map();
  for (const route of data.routes) {
    const elements = route.paths.map((routePath, pathIndex) => {
      const element = svgEl('path', {
        class: `globe-route globe-route--${route.company}`,
        'data-route': route.id,
        'data-path': pathIndex,
      });
      routeLayer.appendChild(element);
      return { element, coordinates: routePath.map((point) => pointCoordinates(point, data.places)) };
    });
    routeElements.set(route.id, elements);

    const button = htmlEl('button', 'globe-route-btn');
    button.type = 'button';
    button.dataset.route = route.id;
    const company = htmlEl('span', `globe-route-btn__company globe-route-btn__company--${route.company}`, route.company.toUpperCase());
    const copy = htmlEl('span', 'globe-route-btn__copy');
    copy.append(
      htmlEl('span', 'globe-route-btn__title', t(route.titleKey)),
      htmlEl('span', 'globe-route-btn__period', t(route.periodKey))
    );
    button.append(company, copy);
    routeButtons.set(route.id, button);
    routeList.appendChild(button);
  }

  const portElements = new Map();
  const tooltip = new ChartTooltip(stage);
  for (const [placeId, place] of Object.entries(data.places)) {
    const group = svgEl('g', {
      class: `globe-port${place.regional ? ' globe-port--regional' : ''}`,
      tabindex: '0',
      role: 'img',
      'aria-label': t(place.labelKey),
    });
    group.append(
      svgEl('circle', { r: place.regional ? 4.5 : 3.8, class: 'globe-port__dot' }),
      svgEl('circle', { r: 15, class: 'globe-port__hit' })
    );
    const showTooltip = (event) => {
      tooltip.show(`<strong>${t(place.labelKey)}</strong>`, event.clientX, event.clientY);
    };
    listen(group, 'pointerenter', showTooltip);
    listen(group, 'pointermove', showTooltip);
    listen(group, 'pointerleave', () => tooltip.hide());
    listen(group, 'focus', () => {
      const rect = group.getBoundingClientRect();
      tooltip.show(`<strong>${t(place.labelKey)}</strong>`, rect.left + rect.width / 2, rect.top);
    });
    listen(group, 'blur', () => tooltip.hide());
    portLayer.appendChild(group);
    portElements.set(placeId, group);
  }

  function visiblePlaceIds() {
    const ids = new Set();
    for (const route of data.routes) {
      routePlaces(route).forEach((id) => ids.add(id));
    }
    return ids;
  }

  function setPaused(value) {
    paused = reducedMotion ? true : value;
    pauseButton.textContent = paused ? '▶' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? t('globeResume') : t('globePause'));
    pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
  }

  function renderDetail(route) {
    clear(detail);
    const meta = htmlEl(
      'p',
      `globe-detail__meta globe-detail__meta--${route.company}`,
      `${route.company.toUpperCase()} · ${t(route.type === 'voyage' ? 'globeTypeVoyage' : 'globeTypeCorridor')}`
    );
    const heading = htmlEl('h3', 'globe-detail__title', t(route.titleKey));
    const period = htmlEl('p', 'globe-detail__period', `${t('globePeriodLabel')}: ${t(route.periodKey)}`);
    const description = htmlEl('p', 'globe-detail__description', t(route.descriptionKey));
    const places = routePlaces(route);
    const stops = htmlEl('p', 'globe-detail__stops');
    const stopsLabel = htmlEl('strong', '', `${t('globeStopsLabel')}: `);
    stops.append(stopsLabel, document.createTextNode(places.map((id) => t(data.places[id].labelKey)).join(' → ')));
    const reconstruction = htmlEl('p', 'globe-detail__note', t('globeReconstruction'));
    detail.append(meta, heading, period, description, stops, reconstruction);
    detail.appendChild(htmlEl('p', 'globe-detail__sources-title', t('globeSourcesLabel')));
    const sources = htmlEl('ul', 'globe-detail__sources');
    for (const sourceId of route.sourceIds) {
      const source = data.sources[sourceId];
      const item = htmlEl('li');
      const link = htmlEl('a', '', `${source.institution}: ${source.title}`);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.appendChild(link);
      sources.appendChild(item);
    }
    detail.appendChild(sources);
  }

  function updateSelection() {
    for (const route of data.routes) {
      const selected = route.id === activeRoute.id;
      for (const { element } of routeElements.get(route.id)) {
        element.classList.toggle('is-selected', selected);
        element.classList.toggle('is-dimmed', !selected);
      }
      const button = routeButtons.get(route.id);
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
    renderDetail(activeRoute);
  }

  function focusRoute(route) {
    const target = nearestRotation(rotation, route.focus);
    if (reducedMotion) {
      rotation = target;
      redraw();
      return;
    }
    focusAnimation = {
      from: rotation.slice(),
      to: target,
      started: performance.now(),
      duration: 700,
    };
    startAnimation();
  }

  function selectRoute(route, focus = true) {
    activeRoute = route;
    markerProgress = 0;
    setPaused(true);
    updateSelection();
    if (focus) focusRoute(route);
    redraw();
  }

  function redraw() {
    projection.rotate(rotation).scale(BASE_SCALE * zoom);
    sphere.setAttribute('d', path(SPHERE));
    graticule.setAttribute('d', path(GRATICULE));
    land.setAttribute('d', path(LAND));

    for (const route of data.routes) {
      for (const item of routeElements.get(route.id)) {
        item.element.setAttribute('d', path({ type: 'LineString', coordinates: item.coordinates }) || '');
      }
    }

    const placeIds = visiblePlaceIds();
    const centre = [-rotation[0], -rotation[1]];
    for (const [placeId, group] of portElements) {
      const coordinate = data.places[placeId].coordinates;
      const visible = placeIds.has(placeId) && geoDistance(centre, coordinate) < Math.PI / 2;
      group.style.display = visible ? '' : 'none';
      group.setAttribute('aria-hidden', visible ? 'false' : 'true');
      group.setAttribute('tabindex', visible ? '0' : '-1');
      if (!visible) continue;
      const projected = projection(coordinate);
      group.setAttribute('transform', `translate(${projected[0].toFixed(2)},${projected[1].toFixed(2)})`);
    }

    const markerPath = routeElements.get(activeRoute.id)[0].coordinates;
    const markerPoint = pointAlongPath(markerPath, markerProgress);
    const markerVisible = geoDistance(centre, markerPoint) < Math.PI / 2;
    marker.style.display = markerVisible ? '' : 'none';
    if (markerVisible) {
      const projected = projection(markerPoint);
      marker.setAttribute('cx', projected[0].toFixed(2));
      marker.setAttribute('cy', projected[1].toFixed(2));
    }
  }

  function animate(time) {
    frameId = null;
    if (!inView) return;
    const delta = previousTime ? Math.min(40, time - previousTime) : 16;
    previousTime = time;

    if (focusAnimation) {
      const raw = clamp((time - focusAnimation.started) / focusAnimation.duration, 0, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      rotation = focusAnimation.from.map(
        (value, index) => value + (focusAnimation.to[index] - value) * eased
      );
      if (raw >= 1) focusAnimation = null;
    } else if (!paused) {
      rotation[0] -= delta * 0.0024;
    }
    if (!reducedMotion) markerProgress = (markerProgress + delta * 0.000045) % 1;
    redraw();
    startAnimation();
  }

  function startAnimation() {
    if (!inView || frameId != null || reducedMotion) return;
    frameId = requestAnimationFrame(animate);
  }

  for (const route of data.routes) {
    listen(routeButtons.get(route.id), 'click', () => selectRoute(route));
  }
  listen(pauseButton, 'click', () => {
    setPaused(!paused);
    startAnimation();
  });
  listen(zoomOut, 'click', () => {
    zoom = clamp(zoom - 0.1, 0.78, 1.28);
    setPaused(true);
    redraw();
  });
  listen(zoomIn, 'click', () => {
    zoom = clamp(zoom + 0.1, 0.78, 1.28);
    setPaused(true);
    redraw();
  });
  listen(svg, 'keydown', (event) => {
    const step = event.shiftKey ? 15 : 6;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', ' '].includes(event.key)) return;
    event.preventDefault();
    setPaused(true);
    if (event.key === 'ArrowLeft') rotation[0] -= step;
    if (event.key === 'ArrowRight') rotation[0] += step;
    if (event.key === 'ArrowUp') rotation[1] = clamp(rotation[1] + step, -75, 75);
    if (event.key === 'ArrowDown') rotation[1] = clamp(rotation[1] - step, -75, 75);
    if (event.key === '+' || event.key === '=') zoom = clamp(zoom + 0.1, 0.78, 1.28);
    if (event.key === '-') zoom = clamp(zoom - 0.1, 0.78, 1.28);
    if (event.key === ' ') setPaused(false);
    redraw();
    startAnimation();
  });
  listen(svg, 'pointerdown', (event) => {
    dragState = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation: rotation.slice(),
    };
    setPaused(true);
    svg.setPointerCapture?.(event.pointerId);
  });
  listen(svg, 'pointermove', (event) => {
    if (!dragState || dragState.id !== event.pointerId) return;
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    if (event.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) return;
    rotation[0] = dragState.rotation[0] + dx * 0.28;
    rotation[1] = clamp(dragState.rotation[1] - dy * 0.2, -75, 75);
    redraw();
  });
  const endDrag = (event) => {
    if (dragState?.id === event.pointerId) dragState = null;
  };
  listen(svg, 'pointerup', endDrag);
  listen(svg, 'pointercancel', endDrag);

  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      previousTime = 0;
      if (inView) startAnimation();
      else if (frameId != null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    },
    { threshold: 0.08 }
  );
  observer.observe(mount);

  setPaused(paused);
  updateSelection();
  redraw();

  return () => {
    observer.disconnect();
    if (frameId != null) cancelAnimationFrame(frameId);
    listeners.splice(0).forEach((remove) => remove());
    tooltip.destroy();
  };
}
