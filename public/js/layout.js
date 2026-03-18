/* ═══════════════════════════════════════════
   CareAI Layout – Sidebar + Auth Helper
   Shared across all pages
   ═══════════════════════════════════════════ */

const Layout = (() => {
  function checkAuth() {
    const user = sessionStorage.getItem('careai_user');
    if (!user && !window.location.pathname.includes('login')) {
      window.location.href = 'login.html';
      return null;
    }
    return user ? JSON.parse(user) : null;
  }

  function logout() {
    sessionStorage.removeItem('careai_user');
    window.location.href = 'login.html';
  }

  function getInitials(name) {
    return name.split(' ').map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  function getSidebarHTML(activePage) {
    const user = checkAuth();
    if (!user) return '';
    const t = (k, fb) => (typeof I18N !== 'undefined') ? I18N.t(k, fb) : fb;
    const lang = (typeof I18N !== 'undefined') ? I18N.getLang() : 'vi';

    const navItems = [
      { id: 'dashboard', icon: 'layout-dashboard', label: t('nav.dashboard', 'Bảng Theo Dõi'), href: 'dashboard.html' },
      { id: 'patients', icon: 'users', label: t('nav.patients', 'Bệnh Nhân'), href: 'patients.html' },
      { id: 'medical-record', icon: 'clipboard-plus', label: t('nav.medicalRecord', 'Nhập Hồ Sơ'), href: 'medical-record.html' },
    ];

    const navHTML = navItems.map(item => {
      const isActive = activePage === item.id ? ' active' : '';
      return `<li><a href="${item.href}" class="${isActive}"><span data-icon="${item.icon}" data-icon-size="18"></span> <span>${item.label}</span></a></li>`;
    }).join('');

    return `
      <nav class="sidebar" id="sidebar">
        <a class="sidebar-brand" href="dashboard.html">
          <div class="brand-icon"><span data-icon="stethoscope" data-icon-size="18"></span></div>
          <div class="brand-text">
            <h1>CareAI</h1>
            <div class="brand-version">${t('app.version', 'v1.0')}</div>
          </div>
        </a>
        <ul class="sidebar-nav">${navHTML}</ul>
        <div class="sidebar-footer">
          <div class="sidebar-user">
            <div class="user-avatar">${getInitials(user.name)}</div>
            <div class="user-info">
              <div class="user-name">${user.name}</div>
              <div class="user-role">${user.role}</div>
            </div>
          </div>
          <div class="lang-switch">
            <button class="${lang === 'vi' ? 'active' : ''}" onclick="Layout.switchLang('vi')">VI</button>
            <button class="${lang === 'en' ? 'active' : ''}" onclick="Layout.switchLang('en')">EN</button>
          </div>
          <a href="#" onclick="Layout.logout(); return false;" class="sidebar-nav-link" style="display:flex;align-items:center;gap:8px;padding:8px;margin-top:8px;font-size:0.78rem;color:var(--text-tertiary);text-decoration:none;">
            <span data-icon="log-out" data-icon-size="16"></span>
            <span data-i18n="nav.logout">${t('nav.logout', 'Đăng Xuất')}</span>
          </a>
        </div>
      </nav>`;
  }

  function injectSidebar(activePage) {
    const user = checkAuth();
    if (!user) return;
    const sidebarDiv = document.getElementById('app-sidebar');
    if (sidebarDiv) {
      sidebarDiv.innerHTML = getSidebarHTML(activePage);
    }
  }

  async function switchLang(lang) {
    if (typeof I18N !== 'undefined') {
      await I18N.switchLang(lang);
      // Re-render sidebar
      const activePage = document.body.getAttribute('data-page') || 'dashboard';
      injectSidebar(activePage);
      // Re-inject icons
      if (typeof injectIcons === 'function') injectIcons();
    }
    // Update lang buttons
    document.querySelectorAll('.lang-switch button').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === lang.toUpperCase());
    });
  }

  return { checkAuth, logout, injectSidebar, switchLang, getInitials };
})();
