#!/usr/bin/env node
/**
 * Build a formatted bibliography from Thesis.bib for keys cited in the thesis.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const bibPath = join(root, 'paper/thesis/Thesis.bib');
const i18nPath = join(__dirname, '../src/js/i18n.js');
const outPath = join(__dirname, '../src/js/bibliography.js');

const KEY_ALIASES = {
  acemoglu2005: 'acemoglu2005a',
  akcomak2016: 'akcomak2016a',
  akcomak2016a: 'akcomak2016',
  cantoni2015a: 'cantoni2015',
};

/** Bib keys for sources named in the website narrative (site/src/js/i18n.js), not the full thesis. */
const SITE_CITED_KEYS = ['akcomak2016a', 'petram2024', 'schmidt2025'];

const APA_TITLES = {
  akcomak2016a:
    'Why did the Netherlands develop so early? The legacy of the Brethren of the Common Life',
  petram2024:
    "The Dutch East India Company's eighteenth-century workforce: An enriched data collection",
};

function parseBib(text) {
  const entries = {};
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '@') {
      i += 1;
      continue;
    }
    const typeMatch = text.slice(i).match(/^@(\w+)\{/);
    if (!typeMatch) {
      i += 1;
      continue;
    }
    const type = typeMatch[1].toLowerCase();
    i += typeMatch[0].length;
    const keyEnd = text.indexOf(',', i);
    const key = text.slice(i, keyEnd).trim();
    i = keyEnd + 1;
    const fields = {};
    while (i < text.length) {
      while (i < text.length && /[\s,]/.test(text[i])) i += 1;
      if (text[i] === '}') {
        i += 1;
        break;
      }
      const fm = text.slice(i).match(/^([a-zA-Z]+)\s*=\s*/);
      if (!fm) {
        i += 1;
        continue;
      }
      const field = fm[1].toLowerCase();
      i += fm[0].length;
      let value = '';
      if (text[i] === '{') {
        let depth = 0;
        const start = i;
        do {
          if (text[i] === '{') depth += 1;
          else if (text[i] === '}') depth -= 1;
          i += 1;
        } while (i < text.length && depth > 0);
        value = text.slice(start + 1, i - 1);
      } else if (text[i] === '"') {
        i += 1;
        const start = i;
        while (i < text.length && text[i] !== '"') i += 1;
        value = text.slice(start, i);
        i += 1;
      } else {
        const start = i;
        while (i < text.length && text[i] !== ',' && text[i] !== '}') i += 1;
        value = text.slice(start, i).trim();
      }
      fields[field] = value.trim();
    }
    entries[key] = { type, key, fields };
  }
  return entries;
}

function cleanTeX(s) {
  return String(s || '')
    .replace(/\{\{|\}\}/g, '')
    .replace(/[{}]/g, '')
    .replace(/~/g, ' ')
    .replace(/\\&/g, '&')
    .replace(/\\'/g, '’')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAuthors(authorField) {
  if (!authorField) return [];
  // biblatex name lists separated by " and "
  return authorField.split(/\s+and\s+/i).map((chunk) => {
    chunk = chunk.trim();
    // family=Weel, given=Bas, prefix=ter, useprefix=true
    if (/family=/.test(chunk)) {
      const family = (chunk.match(/family=([^,]+)/) || [])[1]?.trim();
      const given = (chunk.match(/given=([^,]+)/) || [])[1]?.trim();
      const prefix = (chunk.match(/prefix=([^,]+)/) || [])[1]?.trim();
      const useprefix = /useprefix\s*=\s*true/i.test(chunk);
      const last = [useprefix ? prefix : null, family].filter(Boolean).join(' ');
      return { family: last, given };
    }
    if (chunk.includes(',')) {
      const [family, given] = chunk.split(',').map((x) => x.trim());
      return { family, given };
    }
    const parts = chunk.split(/\s+/);
    return { family: parts.at(-1), given: parts.slice(0, -1).join(' ') };
  });
}

function formatAuthorList(authors) {
  if (!authors.length) return 'Unknown';
  const fmt = (a) => {
    const initials = (a.given || '')
      .split(/[\s~-]+/)
      .filter(Boolean)
      .map((g) => {
        const ch = [...g.replace(/[^A-Za-zÀ-ÖØ-öø-ÿİıŞşĞğÜüÇç]/gu, '')][0];
        return ch ? `${ch.toUpperCase()}.` : '';
      })
      .filter(Boolean)
      .join(' ');
    return initials ? `${a.family}, ${initials}` : a.family;
  };
  if (authors.length === 1) return fmt(authors[0]);
  if (authors.length === 2) return `${fmt(authors[0])} & ${fmt(authors[1])}`;
  return `${authors.slice(0, -1).map(fmt).join(', ')}, & ${fmt(authors.at(-1))}`;
}

function yearOf(fields) {
  const d = fields.date || fields.year || '';
  const m = String(d).match(/(\d{4})/);
  return m ? m[1] : 'n.d.';
}

function sentenceCaseTitle(title) {
  const t = cleanTeX(title);
  if (!t) return '';
  // Keep existing capitalization mostly; strip bib double-brace noise already done
  return t;
}

function formatEntry(entry) {
  const f = entry.fields;
  const authors = formatAuthorList(parseAuthors(f.author || f.editor));
  const year = yearOf(f);
  const title = APA_TITLES[entry.key] || sentenceCaseTitle(f.title);
  const journal = cleanTeX(f.journaltitle || f.journal || f.booktitle || '');
  const publisher = cleanTeX(f.publisher || '');
  const volume = cleanTeX(f.volume || '');
  const number = cleanTeX(f.number || '');
  const pages = cleanTeX(f.pages || '').replace(/--/g, '–');
  const doi = cleanTeX(f.doi || '');
  const url = cleanTeX(f.url || '');
  const howpublished = cleanTeX(f.howpublished || f.note || '');

  let mid = '';
  if (entry.type === 'article' || entry.type === 'periodical') {
    mid = journal
      ? `<em>${journal}${volume ? `, ${volume}` : ''}</em>${number ? `(${number})` : ''}${pages ? `, ${pages}` : ''}.`
      : '';
  } else if (entry.type === 'book' || entry.type === 'thesis' || entry.type === 'collection') {
    mid = [publisher, howpublished].filter(Boolean).join('. ') + (publisher || howpublished ? '.' : '');
  } else if (entry.type === 'dataset') {
    mid = publisher ? `${publisher}.` : '';
  } else if (entry.type === 'report' || entry.type === 'online') {
    mid = [journal || howpublished, publisher].filter(Boolean).join('. ');
    if (mid && !mid.endsWith('.')) mid += '.';
  } else {
    mid = [journal, publisher].filter(Boolean).join('. ');
    if (mid && !mid.endsWith('.')) mid += '.';
  }

  const link = doi ? `https://doi.org/${doi}` : url;
  const linkHtml = link
    ? ` <a href="${link}" target="_blank" rel="noopener noreferrer">${doi ? `https://doi.org/${doi}` : link}</a>`
    : '';

  const formattedTitle =
    entry.type === 'dataset'
      ? `<em>${title}</em> [Data set].`
      : `${title}${title.endsWith('?') || title.endsWith('.') ? '' : '.'}`;

  return `${authors} (${year}). ${formattedTitle} ${mid}${linkHtml}`.replace(/\s+/g, ' ').trim();
}

function citedKeysFromWebsite() {
  const text = readFileSync(i18nPath, 'utf8');
  const en = text.split(/\ben:\s*\{/, 2)[1]?.split(/\bnl:\s*\{/, 2)[0] || text;
  const found = new Set();
  if (/Akçomak|Akcomak/i.test(en) && /\(2016\)/.test(en)) found.add('akcomak2016a');
  if (/Petram/i.test(en) && /2024/.test(en)) found.add('petram2024');
  if (/Schmidt/i.test(en) && /2025/.test(en)) found.add('schmidt2025');
  // Fall back to explicit allowlist intersection so the list cannot silently grow from thesis cites
  return SITE_CITED_KEYS.filter((k) => found.has(k));
}

const bib = parseBib(readFileSync(bibPath, 'utf8'));
const cited = citedKeysFromWebsite();
const resolved = [];
for (const k of cited) {
  const bibKey = KEY_ALIASES[k] || k;
  if (!bib[bibKey]) {
    console.warn(`Missing bib entry for ${k} (-> ${bibKey})`);
    continue;
  }
  resolved.push(bib[bibKey]);
}

resolved.sort((a, b) => {
  const aa = formatAuthorList(parseAuthors(a.fields.author || a.fields.editor)).toLowerCase();
  const bb = formatAuthorList(parseAuthors(b.fields.author || b.fields.editor)).toLowerCase();
  if (aa !== bb) return aa.localeCompare(bb);
  return yearOf(a.fields).localeCompare(yearOf(b.fields));
});

const items = resolved.map((e) => ({
  key: e.key,
  html: formatEntry(e),
  sort: formatAuthorList(parseAuthors(e.fields.author || e.fields.editor)),
  year: yearOf(e.fields),
}));

const file = `/** Auto-generated from Thesis.bib for sources cited in the website narrative — do not edit by hand. */
export const bibliography = ${JSON.stringify(items, null, 2)};
`;

writeFileSync(outPath, file);
console.log(`Wrote ${items.length} website-cited bibliography entries to ${outPath}`);
