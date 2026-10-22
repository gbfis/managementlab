/**
 * resetPassword.js — halaman reset password via link email.
 * Route: /#/reset-password?token=<token>
 * Halaman public (tidak butuh session).
 */
const ResetPassword = {
  render(container, params) {
    Dom.clearChildren(container);

    // Token dari params yang sudah di-parse oleh router
    const token = (params && params.token) ? params.token : null;

    const page = Dom.createElement('div', { class: 'login-page' });
    const card = Dom.createElement('div', { class: 'login-card' });

    card.appendChild(Dom.createElement('div', { class: 'login-logo', text: 'SMLA' }));
    card.appendChild(Dom.createElement('p', {
      class: 'login-subtitle',
      text: 'Buat Password Baru'
    }));

    if (!token) {
      card.appendChild(Dom.createElement('div', { class: 'alert alert-danger' }, [
        Dom.createElement('span', { text: 'Link reset password tidak valid. Silakan minta ulang melalui halaman login.' })
      ]));
      const backBtn = Dom.createElement('a', {
        class: 'btn btn-primary btn-full',
        href: '#/login',
        text: 'Kembali ke Login',
        style: 'display:block;text-align:center;margin-top:12px'
      });
      card.appendChild(backBtn);
      page.appendChild(card);
      container.appendChild(page);
      return;
    }

    const errorBox = Dom.createElement('div', { class: 'login-error' });
    errorBox.hidden = true;
    card.appendChild(errorBox);

    const form = Dom.createElement('form', { id: 'reset-form', novalidate: true });

    const passInput = Dom.createElement('input', {
      type: 'password',
      id: 'new-password',
      name: 'password_baru',
      class: 'form-input',
      autocomplete: 'new-password',
      placeholder: 'Minimal 8 karakter',
      required: true
    });
    form.appendChild(Form.fieldGroup('Password Baru', passInput, {
      required: true,
      hint: 'Minimal 8 karakter, kombinasi huruf dan angka'
    }));

    const confirmInput = Dom.createElement('input', {
      type: 'password',
      id: 'confirm-password',
      name: 'confirm_password',
      class: 'form-input',
      autocomplete: 'new-password',
      placeholder: 'Ulangi password baru',
      required: true
    });
    form.appendChild(Form.fieldGroup('Konfirmasi Password', confirmInput, { required: true }));

    const submitBtn = Dom.createElement('button', {
      type: 'submit',
      class: 'btn btn-primary btn-full',
      text: 'Simpan Password Baru'
    });
    form.appendChild(Dom.createElement('div', { class: 'form-group' }, submitBtn));

    card.appendChild(form);
    page.appendChild(card);
    container.appendChild(page);

    form.addEventListener('submit', (e) => this._onSubmit(e, token, submitBtn, errorBox));
    passInput.focus();
  },

  async _onSubmit(e, token, submitBtn, errorBox) {
    e.preventDefault();
    Form.clearErrors(e.target);
    errorBox.hidden = true;

    const data = Form.getData(e.target);
    let valid = true;

    if (!Validate.required(data.password_baru)) {
      Form.showError(document.getElementById('new-password'), 'Password baru wajib diisi');
      valid = false;
    } else if (!Validate.minLength(data.password_baru, 8)) {
      Form.showError(document.getElementById('new-password'), 'Password minimal 8 karakter');
      valid = false;
    }

    if (data.password_baru !== data.confirm_password) {
      Form.showError(document.getElementById('confirm-password'), 'Konfirmasi password tidak cocok');
      valid = false;
    }
    if (!valid) return;

    Form.setLoading(submitBtn, true, 'Menyimpan...');
    try {
      await Api.post('resetPasswordViaToken', {
        reset_token: token,
        password_baru: data.password_baru
      });
      Dom.clearChildren(errorBox.parentElement || document.getElementById('reset-form'));
      // Tampilkan pesan sukses
      const card = document.querySelector('.login-card');
      if (card) {
        Dom.clearChildren(card);
        card.appendChild(Dom.createElement('div', { class: 'login-logo', text: 'SMLA' }));
        card.appendChild(Dom.createElement('div', { class: 'alert alert-success', style: 'margin-top:16px' }, [
          Dom.createElement('span', { text: 'Password berhasil diubah! Silakan login dengan password baru Anda.' })
        ]));
        const loginBtn = Dom.createElement('a', {
          class: 'btn btn-primary btn-full',
          href: '#/login',
          text: 'Login Sekarang',
          style: 'display:block;text-align:center;margin-top:16px'
        });
        card.appendChild(loginBtn);
      }
    } catch (err) {
      Form.setLoading(submitBtn, false, 'Simpan Password Baru');
      Dom.clearChildren(errorBox);
      errorBox.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: err.message || 'Gagal menyimpan password. Link mungkin sudah kadaluarsa.' }));
      errorBox.hidden = false;
    }
  }
};
