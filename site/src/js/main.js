import './../css/styles.css';
import { translations, defaultLang, supportedLangs } from './i18n.js';
import { bibliography } from './bibliography.js';
import { figureVersion } from './figure-version.js';
import { mountCharts } from './charts/index.js';

const STORAGE_KEY = 'ppe-thesis-lang';
const progressBar = document.getElementById('progress-bar');
const chapterLinks = [...document.querySelectorAll('.chapters__list a')];
const sections = chapterLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const menuBtn = document.getElementById('chapters-menu-btn');
const menuPanel = document.getElementById('chapters-menu');
let menuLang = defaultLang;

function setMenuOpen(open) {
  if (!menuBtn || !menuPanel) return;
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  menuBtn.setAttribute('aria-label', t(menuLang, open ? 'navMenuClose' : 'navMenuOpen'));
  menuPanel.hidden = !open;
}

function toggleMenu() {
  const open = menuBtn?.getAttribute('aria-expanded') === 'true';
  setMenuOpen(!open);
}

if (menuBtn && menuPanel) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  chapterLinks.forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });
  document.addEventListener('click', (e) => {
    if (menuPanel.hidden) return;
    if (menuPanel.contains(e.target) || menuBtn.contains(e.target)) return;
    setMenuOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenuOpen(false);
  });
}

function updateProgress() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

function updateActiveChapter() {
  const offset = window.scrollY + window.innerHeight * 0.28;
  let current = sections[0];
  for (const section of sections) {
    if (section.offsetTop <= offset) current = section;
  }
  chapterLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${current.id}`;
    link.classList.toggle('is-active', active);
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
);

document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

function onScroll() {
  updateProgress();
  updateActiveChapter();
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

const decompBtns = document.querySelectorAll('.decomp__btn');
const decompPanels = document.querySelectorAll('.decomp__panel');

decompBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.decomp;
    decompBtns.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    decompPanels.forEach((panel) => {
      const active = panel.dataset.panel === key;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  });
});

function renderBibliography() {
  const list = document.getElementById('bibliography-list');
  if (!list) return;
  list.innerHTML = bibliography
    .map((item) => `<li data-bib-key="${item.key}">${item.html}</li>`)
    .join('');
}

renderBibliography();

function detectLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (supportedLangs.includes(stored)) return stored;
  return defaultLang;
}

function t(lang, key) {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

function applyLanguage(lang) {
  if (!supportedLangs.includes(lang)) lang = defaultLang;
  document.documentElement.lang = lang;
  localStorage.setItem(STORAGE_KEY, lang);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(lang, key);
    if (el.tagName === 'TITLE') {
      document.title = value;
    } else if (el.tagName === 'META') {
      el.setAttribute('content', value);
    } else {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(lang, el.getAttribute('data-i18n-html'));
  });

  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    el.setAttribute('alt', t(lang, el.getAttribute('data-i18n-alt')));
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-aria')));
  });

  const base = import.meta.env.BASE_URL;
  document.querySelectorAll('[data-fig]').forEach((el) => {
    const name = el.getAttribute('data-fig');
    // Cache-bust: GitHub Pages / browsers can keep a stale cities-map.en.svg
    // after GIS regenerations when the URL path is unchanged.
    el.setAttribute('src', `${base}figures/${name}.${lang}.svg?v=${figureVersion}`);
  });

  document.querySelectorAll('[data-set-lang]').forEach((btn) => {
    const active = btn.getAttribute('data-set-lang') === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  menuLang = lang;
  if (menuBtn) {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-label', t(lang, open ? 'navMenuClose' : 'navMenuOpen'));
  }

  mountCharts(lang, (key) => t(lang, key));
}

document.querySelectorAll('[data-set-lang]').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-set-lang')));
});

applyLanguage(detectLang());
