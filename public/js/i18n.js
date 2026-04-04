/* ═══════════════════════════════════════════
   CareAI i18n – Internationalization Module
   Supports: vi (Vietnamese), en (English)
   ═══════════════════════════════════════════ */

const I18N = (() => {
  let currentLang = localStorage.getItem('careai_lang') || 'vi';
  let translations = {};

  async function load(lang) {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      translations = await res.json();
      currentLang = lang;
      localStorage.setItem('careai_lang', lang);
    } catch (e) {
      console.warn(`i18n: Failed to load ${lang}, falling back to vi`, e);
      if (lang !== 'vi') return load('vi');
    }
  }

  function t(key, fallback) {
    const keys = key.split('.');
    let val = translations;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return fallback || key;
      }
    }
    return typeof val === 'string' ? val : fallback || key;
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated !== key) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translated;
        } else {
          el.textContent = translated;
        }
      }
    });

    // Apply i18n placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = t(key);
      if (translated !== key) {
        el.placeholder = translated;
      }
    });
  }

  function getLang() { return currentLang; }

  async function switchLang(lang) {
    await load(lang);
    applyToDOM();
    // Dispatch event for dynamic components to react
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (currentLang === 'vi') {
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatAge(dob) {
    const birth = new Date(dob);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) {
      const days = Math.max(0, Math.floor((now - birth) / (1000 * 60 * 60 * 24)));
      return `${days} ${t('common.day', 'days')}`;
    }
    if (months < 24) return `${months} ${t('common.month', 'months')}`;
    return `${Math.floor(months / 12)} ${t('common.year', 'years')}`;
  }

  // Auto-init
  async function init() {
    await load(currentLang);
    applyToDOM();
  }

  return { init, t, switchLang, getLang, formatDate, formatAge, applyToDOM };
})();
