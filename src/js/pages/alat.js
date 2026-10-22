/**
 * alat.js — halaman alat. Admin/staff: CRUD. Peminjam: view only.
 */
const Alat = {
  _data: [],
  _labs: [],

  async render(container) {
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Alat' })
    ]);
    if (Auth.isAdminOrStaff()) {
      header.appendChild(Dom.createElement('div', { class: 'page-header-actions' }, [
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Tambah Alat',
          onClick: () => this._formModal(null)
        })
      ]));
    }
    container.appendChild(header);

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]);
    container.appendChild(loading);

    try {
      const tasks = [Api.get('getAlat')];
      if (Auth.isAdminOrStaff()) tasks.push(Api.get('getLabs'));
      const [alat, labs] = await Promise.all(tasks);
      this._data = alat || [];
      this._labs = labs || [];
      loading.remove();
      this._renderTable(container);
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat data alat: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _renderTable(container) {
    const wrap = Dom.createElement('div', { id: 'alat-table' });
    container.appendChild(wrap);
    const columns = [
      { key: 'nama_alat', label: 'Nama Alat' },
      { key: 'kategori', label: 'Kategori' },
      { key: 'kondisi', label: 'Kondisi', render: (r) => Badge.render(r.kondisi) }
    ];
    if (Auth.isAdminOrStaff()) {
      columns.push({ key: 'stok', label: 'Stok' });
      columns.push({ key: 'status', label: 'Status', render: (r) => Badge.render(r.status) });
      columns.push({
        key: '_aksi', label: 'Aksi', render: (r) => {
          const cell = Dom.createElement('div', { class: 'actions-cell' });
          cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Edit', onClick: (e) => { e.stopPropagation(); this._formModal(r); } }));
          cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Ubah Status', onClick: (e) => { e.stopPropagation(); this._statusModal(r); } }));
          if (Auth.hasRole('admin')) {
            cell.appendChild(Dom.createElement('button', { class: 'btn btn-danger btn-sm', type: 'button', text: 'Hapus', onClick: (e) => { e.stopPropagation(); this._delete(r); } }));
          }
          return cell;
        }
      });
    } else {
      // Peminjam: stok tersedia
      columns.push({ key: 'stok', label: 'Stok Tersedia' });
    }
    Table.render(wrap, columns, this._data, {
      pageSize: 10,
      emptyMessage: 'Belum ada alat yang terdaftar. Tambah alat pertama.'
    });
  },

  _reload() {
    this.render(document.getElementById('main-content'));
  },

  _formModal(alat) {
    const isEdit = !!alat;
    let fields = {};
    Modal.open(isEdit ? 'Edit Alat' : 'Tambah Alat', () => {
      fields.nama = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100', value: alat ? alat.nama_alat : '' });
      fields.kode = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '50', value: alat ? alat.kode_alat : '' });
      fields.idLab = Dom.createElement('select', { class: 'form-select' });
      fields.idLab.appendChild(Dom.createElement('option', { value: '', text: '\u2014 Pilih Lab \u2014' }));
      this._labs.forEach((l) => {
        fields.idLab.appendChild(Dom.createElement('option', { value: l.id, text: l.nama_lab, selected: alat && alat.id_lab === l.id }));
      });
      if (alat && alat.id_lab) fields.idLab.value = alat.id_lab;
      fields.kategori = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100', value: alat ? alat.kategori : '' });
      fields.kondisi = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'baik', text: 'Baik', selected: !alat || alat.kondisi === 'baik' }),
        Dom.createElement('option', { value: 'rusak_ringan', text: 'Rusak Ringan', selected: alat && alat.kondisi === 'rusak_ringan' }),
        Dom.createElement('option', { value: 'rusak_berat', text: 'Rusak Berat', selected: alat && alat.kondisi === 'rusak_berat' })
      ]);
      fields.stok = Dom.createElement('input', { type: 'number', class: 'form-input', min: '0', value: alat ? alat.stok : '' });
      fields.deskripsi = Dom.createElement('textarea', { class: 'form-textarea', maxlength: '500' });
      if (alat && alat.deskripsi) fields.deskripsi.value = alat.deskripsi;
      return Dom.createElement('div', {}, [
        Form.fieldGroup('Nama Alat', fields.nama, { required: true }),
        Form.fieldGroup('Kode Alat', fields.kode, { required: true }),
        Form.fieldGroup('Lab', fields.idLab, { required: true }),
        Form.fieldGroup('Kategori', fields.kategori, { required: true }),
        Form.fieldGroup('Kondisi', fields.kondisi, { required: true }),
        Form.fieldGroup('Stok', fields.stok, { required: true }),
        Form.fieldGroup('Deskripsi', fields.deskripsi)
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.nama.value)) { Toast.error('Nama alat wajib diisi'); return false; }
          if (!Validate.required(fields.kode.value)) { Toast.error('Kode alat wajib diisi'); return false; }
          if (!Validate.required(fields.idLab.value)) { Toast.error('Lab wajib dipilih'); return false; }
          if (!Validate.required(fields.kategori.value)) { Toast.error('Kategori wajib diisi'); return false; }
          if (!Validate.positiveInt(fields.stok.value, null) && fields.stok.value !== '0') { Toast.error('Stok harus angka (min 0)'); return false; }
          const payload = {
            nama_alat: fields.nama.value.trim(),
            kode_alat: fields.kode.value.trim(),
            id_lab: fields.idLab.value,
            kategori: fields.kategori.value.trim(),
            kondisi: fields.kondisi.value,
            stok: Number(fields.stok.value || 0),
            deskripsi: fields.deskripsi.value.trim()
          };
          try {
            if (isEdit) {
              await Api.post('updateAlat', Object.assign({ id: alat.id }, payload));
              Toast.success('Alat berhasil diperbarui');
            } else {
              await Api.post('createAlat', payload);
              Toast.success('Alat berhasil ditambahkan');
            }
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal menyimpan alat'); return false; }
        }
      }
    ]);
  },

  _statusModal(alat) {
    let select;
    Modal.open('Ubah Status Alat', () => {
      select = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'tersedia', text: 'Tersedia', selected: alat.status === 'tersedia' }),
        Dom.createElement('option', { value: 'maintenance', text: 'Maintenance', selected: alat.status === 'maintenance' }),
        Dom.createElement('option', { value: 'tidak_tersedia', text: 'Tidak Tersedia', selected: alat.status === 'tidak_tersedia' })
      ]);
      return Dom.createElement('div', {}, [Form.fieldGroup('Status', select, { required: true })]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          try {
            await Api.post('updateAlat', { id: alat.id, status: select.value });
            Toast.success('Status alat diubah');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal mengubah status'); return false; }
        }
      }
    ]);
  },

  _delete(alat) {
    Modal.confirm('Hapus Alat', `Hapus alat "${alat.nama_alat}"?`, async () => {
      try {
        await Api.post('deleteAlat', { id: alat.id });
        Toast.success('Alat berhasil dihapus');
        this._reload();
      } catch (e) { Toast.error(e.message || 'Gagal menghapus alat'); }
    }, { confirmLabel: 'Hapus', cancelLabel: 'Batal', danger: true });
  }
};
