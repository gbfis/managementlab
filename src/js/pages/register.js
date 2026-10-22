/**
 * register.js — halaman registrasi mandiri untuk mahasiswa & dosen.
 * Setelah daftar, akun berstatus 'menunggu_verifikasi' sampai admin aktifkan.
 */
const Register = {
  render(container) {
    Dom.clearChildren(container);

    const page = Dom.createElement('div', { class: 'login-page' });
    const card = Dom.createElement('div', { class: 'login-card' });

    card.appendChild(Dom.createElement('div', { class: 'login-logo', text: 'SMLA' }));
    card.appendChild(Dom.createElement('p', { class: 'login-subtitle', text: 'Daftar Akun Baru' }));

    const errorBox = Dom.createElement('div', { class: 'login-error' });
    errorBox.hidden = true;
    card.appendChild(errorBox);

    const form = Dom.createElement('form', { id: 'register-form', novalidate: true });

    // Nama
    const namaInput = Dom.createElement('input', { type: 'text', class: 'form-input', id: 'reg-nama', name: 'nama', maxlength: '100', autocomplete: 'name' });
    form.appendChild(Form.fieldGroup('Nama Lengkap', namaInput, { required: true }));

    // Email
    const emailInput = Dom.createElement('input', { type: 'email', class: 'form-input', id: 'reg-email', name: 'email', autocomplete: 'email', placeholder: 'email@kampus.ac.id' });
    form.appendChild(Form.fieldGroup('Email', emailInput, { required: true }));

    // NIM/NIP
    const nimInput = Dom.createElement('input', { type: 'text', class: 'form-input', id: 'reg-nim', name: 'nip_nim', maxlength: '30', placeholder: 'NIM atau NIP' });
    form.appendChild(Form.fieldGroup('NIM / NIP', nimInput, { required: true }));

    // Role
    const roleSelect = Dom.createElement('select', { class: 'form-select', id: 'reg-role', name: 'role' }, [
      Dom.createElement('option', { value: 'mahasiswa', text: 'Mahasiswa' }),
      Dom.createElement('option', { value: 'dosen', text: 'Dosen' })
    ]);
    form.appendChild(Form.fieldGroup('Role', roleSelect, { required: true }));

    // No WA
    const waInput = Dom.createElement('input', { type: 'tel', class: 'form-input', id: 'reg-wa', name: 'no_wa', placeholder: '08xxxxxxxxxx' });
    form.appendChild(Form.fieldGroup('No. WhatsApp', waInput, { hint: 'Opsional — memudahkan admin menghubungi Anda' }));

    // Password
    const passInput = Dom.createElement('input', { type: 'password', class: 'form-input', id: 'reg-pass', name: 'password', autocomplete: 'new-password', placeholder: 'Min. 8 karakter' });
    form.appendChild(Form.fieldGroup('Password', passInput, { required: true, hint: 'Minimal 8 karakter' }));

    // Konfirmasi password
    const confirmInput = Dom.createElement('input', { type: 'password', class: 'form-input', id: 'reg-confirm', name: 'confirm', autocomplete: 'new-password', placeholder: 'Ulangi password' });
    form.appendChild(Form.fieldGroup('Konfirmasi Password', confirmInput, { required: true }));

    const submitBtn = Dom.createElement('button', { type: 'submit', class: 'btn btn-primary btn-full', text: 'Daftar' });
    form.appendChild(Dom.createElement('div', { class: 'form-group' }, submitBtn));

    // Link kembali ke login
    const backWrap = Dom.createElement('div', { class: 'login-forgot' });
    const backLink = Dom.createElement('a', { href: '#/login', class: 'btn-link', text: 'Sudah punya akun? Masuk' });
    backWrap.appendChild(backLink);
    form.appendChild(backWrap);

    card.appendChild(form);
    page.appendChild(card);
    container.appendChild(page);

    form.addEventListener('submit', (e) => this._onSubmit(e, submitBtn, errorBox));
    namaInput.focus();
  },

  async _onSubmit(e, submitBtn, errorBox) {
    e.preventDefault();
    Form.clearErrors(e.target);
    errorBox.hidden = true;

    const data = Form.getData(e.target);
    let valid = true;

    if (!Validate.required(data.nama)) { Form.showError(document.getElementById('reg-nama'), 'Nama wajib diisi'); valid = false; }
    else if (!Validate.minLength(data.nama, 2)) { Form.showError(document.getElementById('reg-nama'), 'Nama minimal 2 karakter'); valid = false; }

    if (!Validate.required(data.email)) { Form.showError(document.getElementById('reg-email'), 'Email wajib diisi'); valid = false; }
    else if (!Validate.email(data.email)) { Form.showError(document.getElementById('reg-email'), 'Format email tidak valid'); valid = false; }

    if (!Validate.required(data.nip_nim)) { Form.showError(document.getElementById('reg-nim'), 'NIM/NIP wajib diisi'); valid = false; }

    if (!Validate.required(data.password)) { Form.showError(document.getElementById('reg-pass'), 'Password wajib diisi'); valid = false; }
    else if (!Validate.minLength(data.password, 8)) { Form.showError(document.getElementById('reg-pass'), 'Password minimal 8 karakter'); valid = false; }

    if (data.password !== data.confirm) { Form.showError(document.getElementById('reg-confirm'), 'Konfirmasi password tidak cocok'); valid = false; }

    if (!valid) return;

    Form.setLoading(submitBtn, true, 'Mendaftar...');
    try {
      const result = await Api.post('registerUser', {
        nama: data.nama.trim(),
        email: data.email.trim().toLowerCase(),
        nip_nim: data.nip_nim.trim(),
        role: data.role,
        no_wa: data.no_wa ? data.no_wa.trim() : '',
        password: data.password
      });

      // Tampilkan pesan sukses, ganti seluruh card
      const card = container.querySelector('.login-card');
      if (card) {
        Dom.clearChildren(card);
        card.appendChild(Dom.createElement('div', { class: 'login-logo', text: 'SMLA' }));
        const msg = (result && result.message) ? result.message
          : 'Pendaftaran berhasil! Akun Anda menunggu verifikasi admin.';
        card.appendChild(Dom.createElement('div', {
          class: 'alert alert-success',
          style: 'margin-top:16px'
        }, [Dom.createElement('span', { text: msg })]));
        card.appendChild(Dom.createElement('p', {
          style: 'text-align:center;margin-top:16px;font-size:13px;color:#718096',
          text: 'Admin akan mengaktifkan akun Anda setelah verifikasi.'
        }));
        const loginBtn = Dom.createElement('a', {
          class: 'btn btn-primary btn-full',
          href: '#/login',
          text: 'Kembali ke Login',
          style: 'display:block;text-align:center;margin-top:16px'
        });
        card.appendChild(loginBtn);
      }
    } catch (err) {
      Form.setLoading(submitBtn, false, 'Daftar');
      Dom.clearChildren(errorBox);
      errorBox.appendChild(Dom.createElement('div', {
        class: 'alert alert-danger',
        text: err.message || 'Pendaftaran gagal. Coba lagi nanti.'
      }));
      errorBox.hidden = false;
    }
  }
};
