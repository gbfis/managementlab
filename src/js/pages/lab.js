/**
 * lab.js — halaman lab. Admin/staff: CRUD. Peminjam: view only.
 */
const Lab = {
  _data: [],

  async render(container) {
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Lab' })
    ]);
    if (Auth.isAdminOrStaff()) {
      header.appendChild(Dom.createElement('div', { class: 'page-header-actions' }, [
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Tambah Lab',
          onClick: () => this._formModal(null)
        })
      ]));
    }
    container.appendChild(header);

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]);
    container.appendChild(loading);

    try {
      this._data = (await Api.get('getLabs')) || [];
      loading.remove();
      this._renderTable(container);
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat data lab: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _renderTable(container) {
    const wrap = Dom.createElement('div', { id: 'lab-table' });
    container.appendChild(wrap);
    const columns = [
      { key: 'nama_lab', label: 'Nama Lab' },
      { key: 'kode_lab', label: 'Kode' },
      { key: 'lokasi', label: 'Lokasi' },
      { key: 'kapasitas', label: 'Kapasitas' },
      { key: 'status', label: 'Status', render: (r) => Badge.render(r.status) }
    ];
    if (Auth.isAdminOrStaff()) {
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
    }
    Table.render(wrap, columns, this._data, {
      pageSize: 10,
      emptyMessage: 'Belum ada lab yang terdaftar. Tambah lab pertama.'
    });
  },

  _reload() {
    const main = document.getElementById('main-content');
    this.render(main);
  },

  _formModal(lab) {
    const isEdit = !!lab;
    let fields = {};
    Modal.open(isEdit ? 'Edit Lab' : 'Tambah Lab', () => {
      fields.nama = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100', value: lab ? lab.nama_lab : '' });
      fields.kode = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '50', value: lab ? lab.kode_lab : '' });
      fields.lokasi = Dom.createElement('input', { type: 'text', class: 'form-input', maxlength: '100', value: lab ? lab.lokasi : '' });
      fields.kapasitas = Dom.createElement('input', { type: 'number', class: 'form-input', min: '0', value: lab ? lab.kapasitas : '' });
      fields.deskripsi = Dom.createElement('textarea', { class: 'form-textarea', maxlength: '500' });
      if (lab && lab.deskripsi) fields.deskripsi.value = lab.deskripsi;
      const groups = [
        Form.fieldGroup('Nama Lab', fields.nama, { required: true }),
        Form.fieldGroup('Kode Lab', fields.kode, { required: true }),
        Form.fieldGroup('Lokasi', fields.lokasi, { required: true }),
        Form.fieldGroup('Kapasitas', fields.kapasitas, { required: true }),
        Form.fieldGroup('Deskripsi', fields.deskripsi)
      ];
      return Dom.createElement('div', {}, groups);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.nama.value)) { Toast.error('Nama lab wajib diisi'); return; }
          if (!Validate.required(fields.kode.value)) { Toast.error('Kode lab wajib diisi'); return; }
          if (!Validate.required(fields.lokasi.value)) { Toast.error('Lokasi wajib diisi'); return; }
          if (!Validate.positiveInt(fields.kapasitas.value)) { Toast.error('Kapasitas harus angka positif'); return; }
          const payload = {
            nama_lab: fields.nama.value.trim(),
            kode_lab: fields.kode.value.trim(),
            lokasi: fields.lokasi.value.trim(),
            kapasitas: Number(fields.kapasitas.value),
            deskripsi: fields.deskripsi.value.trim()
          };
          try {
            if (isEdit) {
              await Api.post('updateLab', Object.assign({ id: lab.id }, payload));
              Toast.success('Lab berhasil diperbarui');
            } else {
              await Api.post('createLab', payload);
              Toast.success('Lab berhasil ditambahkan');
            }
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal menyimpan lab'); }
        }
      }
    ]);
  },

  _statusModal(lab) {
    let select;
    Modal.open('Ubah Status Lab', () => {
      select = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'tersedia', text: 'Tersedia', selected: lab.status === 'tersedia' }),
        Dom.createElement('option', { value: 'maintenance', text: 'Maintenance', selected: lab.status === 'maintenance' }),
        Dom.createElement('option', { value: 'tidak_tersedia', text: 'Tidak Tersedia', selected: lab.status === 'tidak_tersedia' })
      ]);
      return Dom.createElement('div', {}, [Form.fieldGroup('Status', select, { required: true })]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          try {
            await Api.post('updateLab', { id: lab.id, status: select.value });
            Toast.success('Status lab diubah');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal mengubah status'); }
        }
      }
    ]);
  },

  _delete(lab) {
    Modal.confirm('Hapus Lab', `Hapus lab "${lab.nama_lab}"? Lab akan ditandai tidak tersedia.`, async () => {
      try {
        await Api.post('deleteLab', { id: lab.id });
        Toast.success('Lab berhasil dihapus');
        this._reload();
      } catch (e) { Toast.error(e.message || 'Gagal menghapus lab'); }
    }, { confirmLabel: 'Hapus', cancelLabel: 'Batal', danger: true });
  }
};
