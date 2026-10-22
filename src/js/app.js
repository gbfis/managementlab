/**
 * app.js — inisialisasi aplikasi: render layout, registrasi route, init router.
 */
const App = {
  _layoutBuilt: false,
  _mainContent: null,

  /** Menu sidebar (label bisa string atau map per role). */
  _menu: [
    { path: '/', label: 'Dashboard', roles: null },
    { path: '/peminjaman', label: { default: 'Peminjaman', peminjam: 'Peminjaman Saya' }, roles: null },
    { path: '/lab', label: 'Lab', roles: null },
    { path: '/alat', label: 'Alat', roles: null },
    { path: '/pengembalian', label: 'Pengembalian', roles: ['admin', 'staff'] },
    { path: '/laporan-kerusakan', label: 'Laporan Kerusakan', roles: ['admin', 'staff'] },
    { path: '/laporan', label: 'Laporan', roles: ['admin', 'staff'] },
    { path: '/user', label: 'User', roles: ['admin'] },
    { path: '/audit', label: 'Audit Log', roles: ['admin'] }
  ],

  init() {
    Api.init();
    this.registerRoutes();
    Router.init();
  },

  registerRoutes() {
    Router.register('/', (c) => Dashboard.render(c), null);
    Router.register('/login', (c) => Login.render(c), null);
    Router.register('/reset-password', (c, p) => ResetPassword.render(c, p), null);
    Router.register('/peminjaman', (c) => Peminjaman.render(c), null);
    Router.register('/peminjaman/baru', (c) => PeminjamanForm.render(c), ['mahasiswa', 'dosen']);
    Router.register('/peminjaman/:id', (c, p) => PeminjamanDetail.render(c, p), null);
    Router.register('/lab', (c) => Lab.render(c), null);
    Router.register('/alat', (c) => Alat.render(c), null);
    Router.register('/pengembalian', (c) => Pengembalian.render(c), ['admin', 'staff']);
    Router.register('/laporan-kerusakan', (c) => LaporanKerusakan.render(c), ['admin', 'staff']);
    Router.register('/laporan', (c) => Laporan.render(c), ['admin', 'staff']);
    Router.register('/user', (c) => User.render(c), ['admin']);
    Router.register('/audit', (c) => AuditLog.render(c), ['admin']);
  },

  /** Bangun layout sekali; return main-content. */
  ensureLayout() {
    const appEl = document.getElementById('app');
    if (!this._layoutBuilt || !this._mainContent || !appEl.querySelector('.app-layout')) {
      this._buildLayout(appEl);
      this._layoutBuilt = true;
    }
    this._updateUserBar();
    this._updateActiveNav();
    return this._mainContent;
  },

  _buildLayout(appEl) {
    Dom.clearChildren(appEl);

    // Backdrop untuk sidebar mobile
    const backdrop = Dom.createElement('div', { class: 'sidebar-backdrop', id: 'sidebar-backdrop' });
    backdrop.addEventListener('click', () => this.closeSidebar());
    appEl.appendChild(backdrop);

    const layout = Dom.createElement('div', { class: 'app-layout' });

    // Sidebar
    const sidebar = Dom.createElement('aside', { class: 'sidebar', id: 'sidebar' });
    sidebar.appendChild(Dom.createElement('div', { class: 'sidebar-logo', text: 'SMLA' }));
    const nav = Dom.createElement('nav', { class: 'sidebar-nav', id: 'sidebar-nav' });
    sidebar.appendChild(nav);

    // Footer logout
    const footer = Dom.createElement('div', { class: 'sidebar-footer' });
    const logoutBtn = Dom.createElement('button', {
      class: 'btn-logout',
      type: 'button',
      text: 'Keluar',
      onClick: () => this.confirmLogout()
    });
    footer.appendChild(logoutBtn);
    sidebar.appendChild(footer);
    layout.appendChild(sidebar);

    // Main wrapper
    const mainWrapper = Dom.createElement('div', { class: 'main-content' });

    // Top bar
    const topBar = Dom.createElement('header', { class: 'top-bar' });
    const hamburger = Dom.createElement('button', {
      class: 'hamburger',
      type: 'button',
      'aria-label': 'Buka menu',
      text: '\u2630',
      onClick: () => this.toggleSidebar()
    });
    topBar.appendChild(hamburger);
    topBar.appendChild(Dom.createElement('span', { class: 'top-bar-title', text: 'SMLA' }));
    const userBox = Dom.createElement('div', { class: 'top-bar-user' });
    const userInfo = Dom.createElement('div', { class: 'user-info' });
    userInfo.appendChild(Dom.createElement('div', { class: 'user-name', id: 'topbar-user-name' }));
    userInfo.appendChild(Dom.createElement('div', { class: 'user-role', id: 'topbar-user-role' }));
    userBox.appendChild(userInfo);
    const logoutTop = Dom.createElement('button', {
      class: 'btn btn-secondary btn-sm',
      type: 'button',
      text: 'Keluar',
      onClick: () => this.confirmLogout()
    });
    userBox.appendChild(logoutTop);
    topBar.appendChild(userBox);
    mainWrapper.appendChild(topBar);

    // Main content area
    const main = Dom.createElement('main', { class: 'content-area', id: 'main-content' });
    mainWrapper.appendChild(main);
    layout.appendChild(mainWrapper);
    appEl.appendChild(layout);

    this._mainContent = main;
    this._renderSidebarNav(nav);
  },

  _renderSidebarNav(nav) {
    Dom.clearChildren(nav);
    const user = Auth.getCurrentUser();
    const role = user ? user.role : null;
    const isPeminjam = (role === 'mahasiswa' || role === 'dosen');

    this._menu.forEach((item) => {
      // Filter role
      if (item.roles) {
        if (!item.roles.includes(role)) return;
      }
      // Label
      let label;
      if (typeof item.label === 'string') {
        label = item.label;
      } else {
        label = isPeminjam ? (item.label.peminjam || item.label.default) : item.label.default;
      }
      const navItem = Dom.createElement('a', {
        class: 'nav-item',
        href: '#' + item.path,
        'data-path': item.path,
        text: label,
        onClick: (e) => {
          e.preventDefault();
          Router.navigate(item.path);
        }
      });
      nav.appendChild(navItem);
    });
  },

  _updateUserBar() {
    const user = Auth.getCurrentUser();
    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    if (user) {
      if (nameEl) Dom.setText(nameEl, user.nama || user.email || '');
      if (roleEl) Dom.setText(roleEl, Format.roleLabel(user.role));
    }
  },

  _updateActiveNav() {
    const path = Router.getCurrentPath();
    Dom.qsa('#sidebar-nav .nav-item').forEach((el) => {
      const itemPath = el.getAttribute('data-path');
      let active = false;
      if (itemPath === '/') {
        active = path === '/';
      } else {
        active = path === itemPath || path.indexOf(itemPath + '/') === 0;
      }
      Dom.toggleClass(el, 'active', active);
    });
  },

  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    if (sb) sb.classList.toggle('open');
    if (bd) bd.classList.toggle('visible');
  },

  closeSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    if (sb) sb.classList.remove('open');
    if (bd) bd.classList.remove('visible');
  },

  confirmLogout() {
    Modal.confirm('Keluar', 'Apakah Anda yakin ingin keluar dari sistem?', () => {
      Auth.logout();
    }, { confirmLabel: 'Keluar', cancelLabel: 'Batal', danger: true });
  },

  /** Render halaman tidak ditemukan / tidak berhak. */
  renderNotFound(container, message) {
    if (!container) return;
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'empty-state' }, [
      Dom.createElement('p', { class: 'empty-state-text', text: message || 'Halaman tidak ditemukan' }),
      Dom.createElement('a', { class: 'btn btn-primary', href: '#/', text: 'Kembali ke Dashboard' })
    ]));
  },

  renderError(container, err) {
    if (!container) return;
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'alert alert-danger' }, [
      Dom.createElement('span', { text: 'Terjadi kesalahan saat memuat halaman.' + (err && err.message ? ' ' + err.message : '') })
    ]));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
