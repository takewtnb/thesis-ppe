#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '../public/data/voyage-routes.json'), 'utf8'));
const i18n = readFileSync(join(here, '../src/js/i18n.js'), 'utf8');
const errors = [];
const routeIds = new Set();
const allowedCompanies = new Set(['voc']);
const allowedTypes = new Set(['corridor', 'voyage']);

function validCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function translatedInBothLanguages(key) {
  const matches = i18n.match(new RegExp(`\\b${key}:`, 'g'));
  return (matches || []).length === 2;
}

for (const [id, place] of Object.entries(data.places || {})) {
  if (!validCoordinate(place.coordinates)) errors.push(`Place ${id} has invalid coordinates`);
  if (!place.labelKey || !translatedInBothLanguages(place.labelKey)) {
    errors.push(`Place ${id} is missing a translated label key`);
  }
}

for (const route of data.routes || []) {
  if (!route.id || routeIds.has(route.id)) errors.push(`Duplicate or missing route id: ${route.id}`);
  routeIds.add(route.id);
  if (!allowedCompanies.has(route.company)) errors.push(`${route.id}: invalid company`);
  if (!allowedTypes.has(route.type)) errors.push(`${route.id}: invalid type`);
  if (!route.titleKey || !translatedInBothLanguages(route.titleKey)) {
    errors.push(`${route.id}: missing title translation`);
  }
  if (!route.descriptionKey || !translatedInBothLanguages(route.descriptionKey)) {
    errors.push(`${route.id}: missing description translation`);
  }
  if (!route.periodKey || !translatedInBothLanguages(route.periodKey)) {
    errors.push(`${route.id}: missing period translation`);
  }
  if (!validCoordinate(route.focus)) errors.push(`${route.id}: invalid focus coordinate`);
  if (!Array.isArray(route.sourceIds) || route.sourceIds.length === 0) {
    errors.push(`${route.id}: route must cite at least one source`);
  }
  for (const sourceId of route.sourceIds || []) {
    const source = data.sources?.[sourceId];
    if (!source?.institution || !source?.title || !/^https:\/\//.test(source?.url || '')) {
      errors.push(`${route.id}: invalid source ${sourceId}`);
    }
  }
  if (!Array.isArray(route.paths) || route.paths.length === 0) errors.push(`${route.id}: missing paths`);
  for (const [pathIndex, path] of (route.paths || []).entries()) {
    if (!Array.isArray(path) || path.length < 2) errors.push(`${route.id}: path ${pathIndex} is too short`);
    for (const point of path || []) {
      if (point.place && !data.places?.[point.place]) {
        errors.push(`${route.id}: unknown place ${point.place}`);
      } else if (!point.place && !validCoordinate(point.coordinates)) {
        errors.push(`${route.id}: invalid reconstruction waypoint`);
      }
      if (!point.place && point.reconstruction !== true) {
        errors.push(`${route.id}: unlabelled waypoint must be marked as a reconstruction`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validated ${data.routes.length} sourced voyage routes and ${Object.keys(data.places).length} places.`);
