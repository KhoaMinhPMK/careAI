/* ═══════════════════════════════════════════
   CareAI SVG Icon Loader – v3.0
   Loads icons from /icons/outline/ directory
   ═══════════════════════════════════════════ */

const ICONS = {
  // Navigation & Layout
  'home': 'home.svg',
  'layout-dashboard': 'layout-dashboard.svg',
  'users': 'users.svg',
  'user': 'user.svg',
  'settings': 'settings.svg',
  'log-out': 'logout.svg',
  'menu': 'menu.svg',
  'x': 'x.svg',
  'login': 'login.svg',
  'lock': 'lock.svg',

  // Medical / Clinical
  'stethoscope': 'stethoscope.svg',
  'heart-pulse': 'activity-heartbeat.svg',
  'activity': 'activity.svg',
  'clipboard': 'clipboard.svg',
  'thermometer': 'thermometer.svg',

  // Charts & Data
  'trending-up': 'trending-up.svg',
  'trending-down': 'trending-down.svg',
  'bar-chart-3': 'chart-bar.svg',
  'pie-chart': 'chart-pie.svg',
  'line-chart': 'chart-line.svg',

  // Alerts & Status
  'alert-triangle': 'alert-triangle.svg',
  'alert-circle': 'alert-circle.svg',
  'bell': 'bell.svg',
  'check-circle': 'circle-check.svg',
  'check': 'check.svg',
  'shield-check': 'shield-check.svg',

  // Actions
  'search': 'search.svg',
  'filter': 'filter.svg',
  'download': 'download.svg',
  'upload': 'upload.svg',
  'refresh-cw': 'refresh.svg',
  'send': 'send.svg',
  'plus': 'plus.svg',
  'minus': 'minus.svg',
  'edit': 'edit.svg',
  'trash': 'trash.svg',
  'eye': 'eye.svg',
  'printer': 'printer.svg',
  'copy': 'copy.svg',

  // Communication
  'message-circle': 'message-circle.svg',
  'message-square': 'message-2.svg',

  // Content & Files
  'file-text': 'file-text.svg',
  'file': 'file.svg',
  'database': 'database.svg',
  'folder': 'folder.svg',

  // AI & Tech
  'cpu': 'cpu.svg',
  'zap': 'heart-bolt.svg',
  'brain': 'brain.svg',
  'sparkles': 'sparkles.svg',

  // Misc
  'calendar': 'calendar.svg',
  'clock': 'clock.svg',
  'info': 'info-circle.svg',
  'globe': 'globe.svg',
  'arrow-right': 'arrow-right.svg',
  'arrow-left': 'arrow-left.svg',
  'chevron-right': 'chevron-right.svg',
  'chevron-down': 'chevron-down.svg',
  'external-link': 'external-link.svg',
  'maximize': 'maximize.svg',
  'minimize': 'minimize.svg',
  'clipboard-plus': 'clipboard-plus.svg',
};

const iconCache = {};

async function loadIcon(name) {
  if (iconCache[name]) return iconCache[name];
  const file = ICONS[name];
  if (!file) return null;
  try {
    const res = await fetch(`/icons/outline/${file}`);
    if (!res.ok) return null;
    const svg = await res.text();
    iconCache[name] = svg;
    return svg;
  } catch (e) {
    return null;
  }
}

async function injectIcons() {
  const elements = document.querySelectorAll('[data-icon]');
  const promises = [];
  elements.forEach(el => {
    if (el.dataset.iconInjected) return;
    const name = el.getAttribute('data-icon');
    const size = el.getAttribute('data-icon-size') || '18';
    promises.push(
      loadIcon(name).then(svg => {
        if (svg) {
          // Set size via viewBox manipulation
          const sized = svg
            .replace(/width="[^"]*"/, `width="${size}"`)
            .replace(/height="[^"]*"/, `height="${size}"`);
          el.innerHTML = sized;
          el.dataset.iconInjected = 'true';
        }
      })
    );
  });
  await Promise.all(promises);
}
