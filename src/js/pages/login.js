/**
 * login.js — halaman login dan lupa password (full page, di luar layout sidebar).
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

    // Link lupa password
    const forgotWrap = Dom.createElement('div', { class: 'login-forgot' });
    const forgotLink = Dom.createElement('button', {
      type: 'button',
      class: 'btn-link',
      text: 'Lupa password?'
    });
    forgotLink.addEventListener('click', () => this._showForgotModal());
    forgotWrap.appendChild(forgotLink);

    // Separator
    forgotWrap.appendChild(Dom.createElement('span', { text: ' · ', style: 'color:#cbd5e0' }));

    // Link register
    const registerLink = Dom.createElement('a', {
      href: '#/register',
      class: 'btn-link',
      text: 'Daftar akun baru'
    });
    forgotWrap.appendChild(registerLink);
    form.appendChild(forgotWrap);

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
  },

  /** Tampilkan modal lupa password */
  _showForgotModal() {
    const emailInput = Dom.createElement('input', {
      type: 'email',
      class: 'form-input',
      placeholder: 'email@kampus.ac.id',
      autocomplete: 'email'
    });

    Modal.open(
      'Lupa Password',
      () => {
        const wrap = Dom.createElement('div');
        wrap.appendChild(Dom.createElement('p', {
          text: 'Masukkan email akun Anda. Kami akan mengirim link untuk membuat password baru.',
          style: 'margin-bottom:12px;color:#4a5568;font-size:14px'
        }));
        wrap.appendChild(Form.fieldGroup('Email', emailInput, { required: true }));
        return wrap;
      },
      [
        {
          label: 'Kirim Link Reset',
          type: 'primary',
          onClick: async () => {
            Form.clearErrors(emailInput.closest('.form-group') || emailInput);
            const email = (emailInput.value || '').trim().toLowerCase();
            if (!Validate.email(email)) {
              Form.showError(emailInput, 'Masukkan email yang valid');
              return false; // Jaga modal tetap terbuka
            }
            try {
              await Api.post('requestPasswordReset', { email });
              Toast.success('Link reset password telah dikirim. Periksa inbox email Anda.');
            } catch (err) {
              Toast.error(err.message || 'Gagal mengirim email. Coba lagi nanti.');
              return false; // Jaga modal tetap terbuka jika error
            }
          }
        },
        { label: 'Batal', type: 'secondary' }
      ]
    );
    setTimeout(() => emailInput.focus(), 100);
  }
};
