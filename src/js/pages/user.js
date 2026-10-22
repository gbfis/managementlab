/**
 * user.js — manajemen user (admin only).
 */
const User = {
  _data: [],

  render(container) {
    // Guard ekstra (router sudah cek, tapi double-check)
    if (!Auth.hasRole('admin')) {
      Router.navigate('/');
      return;
    }
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Manajemen User' }),
      Dom.createElement('div', { class: 'page-header-actions' }, [
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Tambah User',
          onClick: () => this._formModal(null)
        })
      ])
    ]);
    container.appendChild(header);

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]);
    container.appendChild(loading);

    this._load(container);
  },

  async _load(container) {
    try {
      this._data = (await Api.get('getUsers')) || [];
      const loading = container.querySelector('.loading-center');
      if (loading) loading.remove();
      this._renderTable(container);
    } catch (e) {
      const loading = container.querySelector('.loading-center');
      if (loading) loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat data user: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _renderTable(container) {
    const wrap = Dom.createElement('div', { id: 'user-table' });
    container.appendChild(wrap);
    const columns = [
      { key: 'nama', label: 'Nama' },
      { key: 'email', label: 'Email' },
      { key: 'nip_nim', label: 'NIP/NIM' },
      { key: 'role', label: 'Role', render: (r) => Badge.render(r.role) },
      { key: 'status', label: 'Status', render: (r) => Badge.render(r.status) },
      {
        key: '_aksi', label: 'Aksi', render: (r) => {
          const cell = Dom.createElement('div', { class: 'actions-cell' });
          cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Edit', onClick: (e) => { e.stopPropagation(); this._editModal(r); } }));
          cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Reset Password', onClick: (e) => { e.stopPropagation(); this._resetPasswordModal(r); } }));
          if (r.status === 'terkunci') {
            cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Buka Kunci', onClick: (e) => { e.stopPropagation(); this._unlock(r); } }));
          }
          if (r.status === 'aktif') {
            cell.appendChild(Dom.createElement('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Nonaktifkan', onClick: (e) => { e.stopPropagation(); this._deactivate(r); } }));
          }
          return cell;
        }
      }
    ];
    Table.render(wrap, columns, this._data, {
      pageSize: 10,
      emptyMessage: 'Belum ada user. Tambah user pertama.'
    });
  },

  _reload() {
    this.render(document.getElementById('main-content'));
  },

  _formModal(user) {
    const isEdit = !!user;
    let fields = {};
    Modal.open('Tambah User', () => {
      fields.nama = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100' });
      fields.email = Dom.createElement('input', { type: 'email', class: 'form-input', maxlength: '255' });
      fields.nipNim = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '50' });
      fields.role = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'mahasiswa', text: 'Mahasiswa' }),
        Dom.createElement('option', { value: 'dosen', text: 'Dosen' }),
        Dom.createElement('option', { value: 'staff', text: 'Staff' }),
        Dom.createElement('option', { value: 'admin', text: 'Admin' })
      ]);
      fields.noWa = Dom.createElement('input', { type: 'text', class: 'form-input', placeholder: '08xxxx atau 628xxxx' });
      fields.password = Dom.createElement('input', { type: 'password', class: 'form-input' });
      return Dom.createElement('div', {}, [
        Form.fieldGroup('Nama', fields.nama, { required: true }),
        Form.fieldGroup('Email', fields.email, { required: true }),
        Form.fieldGroup('NIP/NIM', fields.nipNim, { required: true }),
        Form.fieldGroup('Role', fields.role, { required: true }),
        Form.fieldGroup('No. WhatsApp', fields.noWa, { hint: 'Format 08xx atau 628xx' }),
        Form.fieldGroup('Password', fields.password, { required: true, hint: 'Min. 8 karakter, kombinasi huruf & angka' })
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.nama.value)) { Toast.error('Nama wajib diisi'); return; }
          if (!Validate.email(fields.email.value)) { Toast.error('Email tidak valid'); return; }
          if (!Validate.required(fields.nipNim.value)) { Toast.error('NIP/NIM wajib diisi'); return; }
          if (fields.noWa.value && !Validate.noWa(fields.noWa.value)) { Toast.error('No. WhatsApp tidak valid'); return; }
          if (!Validate.password(fields.password.value)) { Toast.error('Password min. 8 karakter (huruf & angka)'); return; }
          try {
            await Api.post('createUser', {
              nama: fields.nama.value.trim(),
              email: fields.email.value.trim().toLowerCase(),
              nip_nim: fields.nipNim.value.trim(),
              role: fields.role.value,
              no_wa: fields.noWa.value.trim(),
              password: fields.password.value
            });
            Toast.success('User berhasil ditambahkan');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal menambah user'); }
        }
      }
    ]);
  },

  _editModal(user) {
    let fields = {};
    Modal.open('Edit User', () => {
      fields.nama = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100', value: user.nama || '' });
      fields.role = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'mahasiswa', text: 'Mahasiswa', selected: user.role === 'mahasiswa' }),
        Dom.createElement('option', { value: 'dosen', text: 'Dosen', selected: user.role === 'dosen' }),
        Dom.createElement('option', { value: 'staff', text: 'Staff', selected: user.role === 'staff' }),
        Dom.createElement('option', { value: 'admin', text: 'Admin', selected: user.role === 'admin' })
      ]);
      fields.status = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'aktif', text: 'Aktif', selected: user.status === 'aktif' }),
        Dom.createElement('option', { value: 'nonaktif', text: 'Nonaktif', selected: user.status === 'nonaktif' })
      ]);
      fields.noWa = Dom.createElement('input', { type: 'text', class: 'form-input', value: user.no_wa || '' });
      return Dom.createElement('div', {}, [
        Dom.createElement('div', { class: 'form-group' }, [Dom.createElement('label', { class: 'form-label', text: 'Email' }), Dom.createElement('input', { type: 'email', class: 'form-input', value: user.email || '', disabled: true })]),
        Form.fieldGroup('Nama', fields.nama, { required: true }),
        Form.fieldGroup('Role', fields.role, { required: true }),
        Form.fieldGroup('Status', fields.status, { required: true }),
        Form.fieldGroup('No. WhatsApp', fields.noWa, { hint: 'Format 08xx atau 628xx' })
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.nama.value)) { Toast.error('Nama wajib diisi'); return; }
          if (fields.noWa.value && !Validate.noWa(fields.noWa.value)) { Toast.error('No. WhatsApp tidak valid'); return; }
          try {
            await Api.post('updateUser', {
              id: user.id,
              nama: fields.nama.value.trim(),
              role: fields.role.value,
              status: fields.status.value,
              no_wa: fields.noWa.value.trim()
            });
            Toast.success('User berhasil diperbarui');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal memperbarui user'); }
        }
      }
    ]);
  },

  _resetPasswordModal(user) {
    let input;
    Modal.open('Reset Password', () => {
      input = Dom.createElement('input', { type: 'password', class: 'form-input' });
      return Dom.createElement('div', {}, [
        Dom.createElement('p', { class: 'mb-4', text: 'Atur password baru untuk ' + user.email }),
        Form.fieldGroup('Password Baru', input, { required: true, hint: 'Min. 8 karakter, kombinasi huruf & angka' })
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Reset', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.password(input.value)) { Toast.error('Password min. 8 karakter (huruf & angka)'); return; }
          try {
            await Api.post('resetPassword', { id: user.id, password_baru: input.value });
            Toast.success('Password berhasil direset');
          } catch (e) { Toast.error(e.message || 'Gagal reset password'); }
        }
      }
    ]);
  },

  _unlock(user) {
    Modal.confirm('Buka Kunci Akun', `Buka kunci akun ${user.email}?`, async () => {
      try {
        await Api.post('unlockUser', { id: user.id });
        Toast.success('Akun berhasil dibuka kuncinya');
        this._reload();
      } catch (e) { Toast.error(e.message || 'Gagal membuka kunci'); }
    }, { confirmLabel: 'Buka Kunci', cancelLabel: 'Batal' });
  },

  _deactivate(user) {
    Modal.confirm('Nonaktifkan User', `Nonaktifkan ${user.email}? User tidak bisa login sampai diaktifkan kembali.`, async () => {
      try {
        await Api.post('updateUser', { id: user.id, status: 'nonaktif' });
        Toast.success('User dinonaktifkan');
        this._reload();
      } catch (e) { Toast.error(e.message || 'Gagal menonaktifkan user'); }
    }, { confirmLabel: 'Nonaktifkan', cancelLabel: 'Batal', danger: true });
  }
};
