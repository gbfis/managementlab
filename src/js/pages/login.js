/**
 * login.js — halaman login (full page, di luar layout sidebar).
 */
const Login = {
  render(container) {
    Dom.clearChildren(container);

    const page = Dom.createElement('div', { class: 'login-page' });
    const card = Dom.createElement('div', { class: 'login-card' });

    card.appendChild(Dom.createElement('div', { class: 'login-logo', text: 'SMLA' }));
    card.appendChild(Dom.createElement('div', {
      class: 'login-subtitle',
      text: 'Sistem Management Peminjaman Lab & Alat'
    }));

    const errorBox = Dom.createElement('div', { class: 'login-error', id: 'login-error' });
    errorBox.hidden = true;
    card.appendChild(errorBox);

    const form = Dom.createElement('form', { id: 'login-form', novalidate: true });

    // Email
    const emailInput = Dom.createElement('input', {
      type: 'email',
      id: 'login-email',
      name: 'email',
      class: 'form-input',
      autocomplete: 'username',
      placeholder: 'email@kampus.ac.id',
      required: true
    });
    form.appendChild(Form.fieldGroup('Email', emailInput, { required: true }));

    // Password
    const passwordInput = Dom.createElement('input', {
      type: 'password',
      id: 'login-password',
      name: 'password',
      class: 'form-input',
      autocomplete: 'current-password',
      placeholder: 'Masukkan password',
      required: true
    });
    form.appendChild(Form.fieldGroup('Password', passwordInput, { required: true }));

    // Submit
    const submitBtn = Dom.createElement('button', {
      type: 'submit',
      class: 'btn btn-primary btn-full',
      text: 'Masuk'
    });
    form.appendChild(Dom.createElement('div', { class: 'form-group' }, submitBtn));

    card.appendChild(form);
    page.appendChild(card);
    container.appendChild(page);

    form.addEventListener('submit', (e) => this._onSubmit(e, submitBtn, errorBox));
    emailInput.focus();
  },

  _showError(errorBox, message) {
    Dom.clearChildren(errorBox);
    errorBox.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: message }));
    errorBox.hidden = false;
  },

  async _onSubmit(e, submitBtn, errorBox) {
    e.preventDefault();
    Form.clearErrors(e.target);
    errorBox.hidden = true;

    const data = Form.getData(e.target);
    const email = (data.email || '').trim().toLowerCase();

    let valid = true;
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    if (!Validate.required(email)) {
      Form.showError(emailInput, 'Email wajib diisi');
      valid = false;
    } else if (!Validate.email(email)) {
      Form.showError(emailInput, 'Format email tidak valid');
      valid = false;
    }
    if (!Validate.required(data.password)) {
      Form.showError(passwordInput, 'Password wajib diisi');
      valid = false;
    }
    if (!valid) return;

    Form.setLoading(submitBtn, true, 'Masuk...');
    try {
      const user = await Auth.login(email, data.password);
      Toast.success('Selamat datang, ' + (user.nama || user.email));
      Router.navigate('/');
    } catch (err) {
      Form.setLoading(submitBtn, false, 'Masuk');
      this._showError(errorBox, err && err.message ? err.message : 'Login gagal. Periksa email dan password Anda.');
    }
  }
};
