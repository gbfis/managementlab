/**
 * auth.js — manajemen sesi & role di sisi klien.
 * Token disimpan di localStorage. (RBAC final tetap di GAS.)
 */
const Auth = {
  TOKEN_KEY: 'smla_token',
  USER_KEY: 'smla_user',

  /** Login: panggil API, simpan token + user. */
  async login(email, password) {
    const result = await Api.post('login', { email: email, password: password });
    if (result && result.token && result.user) {
      this.setSession(result.token, result.user);
      return result.user;
    }
    throw new Error('Login gagal: respons tidak valid dari server');
  },

  /** Logout: panggil API (best-effort), lalu hapus sesi. */
  async logout() {
    try {
      if (this.getToken()) await Api.post('logout', {});
    } catch (e) {
      // abaikan error logout — tetap hapus sesi lokal
    }
    this.clearSession();
    Router.navigate('/login');
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /** Update data user lokal (mis. setelah update profile). */
  setCurrentUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  /** Cek apakah role user saat ini termasuk salah satu dari roles. */
  hasRole() {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;
    const roles = Array.prototype.slice.call(arguments);
    return roles.indexOf(user.role) !== -1;
  },

  isAdminOrStaff() {
    return this.hasRole('admin', 'staff');
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
};
