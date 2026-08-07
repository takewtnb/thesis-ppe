import { renderLiteracyGap } from './literacy-gap.js';
import { renderTreatmentIntensity } from './treatment-intensity.js';
import { renderEventStudy } from './event-study.js';
import { renderCitiesMap } from './cities-map.js';
import { renderVoyageGlobe } from './voyage-globe.js';

const RENDERERS = {
  'literacy-gap': renderLiteracyGap,
  'treatment-intensity': renderTreatmentIntensity,
  'event-study': renderEventStudy,
  'cities-map': renderCitiesMap,
  'voyage-globe': renderVoyageGlobe,
};

const cleanups = new Map();
let mountGeneration = 0;

/**
 * Mount or re-render all [data-chart] figures for the active language.
 * @param {string} lang
 * @param {(key: string) => string} t
 */
export async function mountCharts(lang, t) {
  const generation = ++mountGeneration;
  const mounts = [...document.querySelectorAll('[data-chart]')];
  await Promise.all(
    mounts.map(async (mount) => {
      const stem = mount.getAttribute('data-chart');
      const render = RENDERERS[stem];
      if (!render) return;
      const prev = cleanups.get(mount);
      if (typeof prev === 'function') prev();
      try {
        const cleanup = await render(mount, lang, t);
        if (generation !== mountGeneration) {
          if (typeof cleanup === 'function') cleanup();
          return;
        }
        cleanups.set(mount, cleanup || (() => {}));
      } catch (err) {
        console.error(`Chart render failed: ${stem}`, err);
        if (generation === mountGeneration) mount.textContent = '';
      }
    })
  );
}
