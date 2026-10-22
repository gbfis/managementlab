/**
 * router.js — hash-based router dengan guard autentikasi & role.
 * Route dengan parameter: '/peminjaman/:id' -> params.id
 */
const Router = {
  routes: [], // [{ path, pattern, render, roles }]
  _currentCleanup: null,

  /**
   * Daftarkan route.
   * @param {string} path - mis. '/' atau '/peminjaman/:id'
   * @param {function} renderFn - (container, params) => void
   * @param {Array|null} allowedRoles - role yang boleh, null = semua role terautentikasi
   */
  register(path, renderFn, allowedRoles) {
    const pattern = path.replace(/:[^/]+/g, '([^/]+)');
    this.routes.push({
      path: path,
      regex: new RegExp('^' + pattern + '$'),
      paramNames: (path.match(/:[^/]+/g) || []).map((p) => p.slice(1)),
      render: renderFn,
      roles: allowedRoles
    });
  },

  navigate(path) {
    window.location.hash = path;
  },

  getCurrentPath() {
    const hash = window.location.hash.slice(1); // hapus '#'
    if (!hash) return '/';
    // Pisahkan path dari query string — query string ditangani terpisah via getQueryParams()
    const qIndex = hash.indexOf('?');
    return qIndex !== -1 ? hash.slice(0, qIndex) : hash;
  },

  /** Ambil query params dari hash URL, mis. #/reset-password?token=xxx */
  getQueryParams() {
    const hash = window.location.hash.slice(1);
    const qIndex = hash.indexOf('?');
    if (qIndex === -1) return {};
    const search = hash.slice(qIndex);
    const params = {};
    new URLSearchParams(search).forEach((v, k) => { params[k] = v; });
    return params;
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  matchRoute(path) {
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i];
      const m = route.regex.exec(path);
      if (m) {
        const params = {};
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(m[idx + 1]);
        });
        return { route: route, params: params };
      }
    }
    return null;
  },

  handleRoute() {
    // cleanup halaman sebelumnya jika ada
    if (typeof this._currentCleanup === 'function') {
      try { this._currentCleanup(); } catch (e) {}
      this._currentCleanup = null;
    }

    const path = this.getCurrentPath();

    // Halaman public (tidak butuh auth): login, reset-password, register
    const publicPaths = ['/login', '/reset-password', '/register'];
    if (publicPaths.indexOf(path) !== -1) {
      if (Auth.isAuthenticated() && path === '/login') {
        this.navigate('/');
        return;
      }
      const appEl = document.getElementById('app');
      Dom.clearChildren(appEl);
      if (path === '/login') {
        Login.render(appEl);
      } else if (path === '/reset-password') {
        const qp = this.getQueryParams();
        ResetPassword.render(appEl, qp);
      } else if (path === '/register') {
        Register.render(appEl);
      }
      return;
    }

    // Guard autentikasi
    if (!Auth.isAuthenticated()) {
      this.navigate('/login');
      return;
    }

    // Pastikan layout (sidebar + main content) ada
    const mainContent = App.ensureLayout();

    const match = this.matchRoute(path);
    if (!match) {
      App.renderNotFound(mainContent, 'Halaman tidak ditemukan');
      return;
    }

    // Guard role
    if (match.route.roles && match.route.roles.length) {
      if (!Auth.hasRole.apply(Auth, match.route.roles)) {
        App.renderNotFound(mainContent, 'Anda tidak memiliki izin untuk mengakses halaman ini');
        Toast.error('Anda tidak memiliki izin untuk mengakses halaman ini');
        return;
      }
    }

    // Tutup sidebar mobile saat navigasi
    App.closeSidebar();

    // Render halaman
    try {
      match.route.render(mainContent, match.params);
      window.scrollTo(0, 0);
    } catch (e) {
      console.error('Render error:', e);
      App.renderError(mainContent, e);
    }
  },

  /** Set cleanup function untuk halaman aktif (mis. event listener global). */
  setCleanup(fn) {
    this._currentCleanup = fn;
  }
};
