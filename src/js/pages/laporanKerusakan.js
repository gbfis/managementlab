/**
 * laporanKerusakan.js — laporan kerusakan & kehilangan (admin/staff).
 */
const LaporanKerusakan = {
  _filter: 'aktif',
  _labs: [],
  _alat: [],

  render(container) {
    if (!Auth.isAdminOrStaff()) { Router.navigate('/'); return; }
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Laporan Kerusakan' }),
      Dom.createElement('div', { class: 'page-header-actions' }, [
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Laporan Mandiri',
          onClick: () => this._mandiriModal()
        })
      ])
    ]);
    container.appendChild(header);

    const tabs = Dom.createElement('div', { class: 'tabs', id: 'lk-tabs' });
    container.appendChild(tabs);
    this._renderTabs(tabs);

    const tableWrap = Dom.createElement('div', { id: 'lk-table' });
    container.appendChild(tableWrap);
    this._load(tableWrap);
  },

  _renderTabs(tabsWrap) {
    Dom.clearChildren(tabsWrap);
    const tabs = [
      { key: 'aktif', label: 'Aktif' },
      { key: 'selesai', label: 'Selesai / Diabaikan' }
    ];
    tabs.forEach((t) => {
      tabsWrap.appendChild(Dom.createElement('button', {
        class: 'tab' + (t.key === this._filter ? ' active' : ''),
        type: 'button', text: t.label,
        onClick: () => {
          this._filter = t.key;
          this._renderTabs(tabsWrap);
          this._load(document.getElementById('lk-table'));
        }
      }));
    });
  },

  async _load(container) {
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]));
    try {
      const [laporan, labs, alat] = await Promise.all([
        Api.get('getLaporanKerusakan'),
        Api.get('getLabs'),
        Api.get('getAlat')
      ]);
      this._labs = labs || [];
      this._alat = alat || [];
      let data = laporan || [];
      if (this._filter === 'aktif') {
        data = data.filter((l) => l.status_tindak_lanjut === 'menunggu' || l.status_tindak_lanjut === 'dalam_proses');
      } else {
        data = data.filter((l) => l.status_tindak_lanjut === 'selesai' || l.status_tindak_lanjut === 'diabaikan');
      }
      Dom.clearChildren(container);

      const columns = [
        { key: 'nama_item', label: 'Item' },
        { key: 'tipe_item', label: 'Tipe Item', render: (r) => Dom.createElement('span', { text: r.tipe_item === 'lab' ? 'Lab' : 'Alat' }) },
        { key: 'tipe_laporan', label: 'Tipe Laporan', render: (r) => Badge.render(r.tipe_laporan) },
        { key: 'tingkat_kerusakan', label: 'Tingkat', render: (r) => Badge.render(r.tingkat_kerusakan) },
        { key: 'sumber', label: 'Sumber', render: (r) => Badge.render(r.sumber) },
        { key: 'status_tindak_lanjut', label: 'Status', render: (r) => Badge.render(r.status_tindak_lanjut) },
        { key: 'created_at', label: 'Dilaporkan', render: (r) => Dom.createElement('span', { text: Format.date(r.created_at) }) },
        {
          key: '_aksi', label: 'Aksi', render: (r) => {
            const cell = Dom.createElement('div', { class: 'actions-cell' });
            if (r.status_tindak_lanjut === 'menunggu' || r.status_tindak_lanjut === 'dalam_proses') {
              cell.appendChild(Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Update Tindak Lanjut', onClick: (e) => { e.stopPropagation(); this._updateModal(r); } }));
              cell.appendChild(Dom.createElement('button', { class: 'btn btn-primary btn-sm', type: 'button', text: 'Selesaikan', onClick: (e) => { e.stopPropagation(); this._selesaikanModal(r); } }));
            }
            return cell;
          }
        }
      ];
      Table.render(container, columns, data, {
        pageSize: 10,
        emptyMessage: this._filter === 'aktif' ? 'Tidak ada laporan aktif. Gunakan "Laporan Mandiri" untuk mencatat kerusakan atau kehilangan.' : 'Tidak ada laporan yang selesai.'
      });
    } catch (e) {
      Dom.clearChildren(container);
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat laporan: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _reload() {
    this.render(document.getElementById('main-content'));
  },

  _mandiriModal() {
    let fields = {};
    Modal.open('Laporan Mandiri', () => {
      fields.tipeItem = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'alat', text: 'Alat' }),
        Dom.createElement('option', { value: 'lab', text: 'Lab' })
      ]);
      fields.item = Dom.createElement('select', { class: 'form-select', id: 'mandiri-item' });
      fields.tipeLaporan = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'kerusakan', text: 'Kerusakan' }),
        Dom.createElement('option', { value: 'kehilangan', text: 'Kehilangan' })
      ]);
      fields.tingkat = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'ringan', text: 'Ringan' }),
        Dom.createElement('option', { value: 'sedang', text: 'Sedang' }),
        Dom.createElement('option', { value: 'berat', text: 'Berat' }),
        Dom.createElement('option', { value: 'hilang', text: 'Hilang' })
      ]);
      fields.deskripsi = Dom.createElement('textarea', { class: 'form-textarea', maxlength: '1000' });
      fields.estimasi = Dom.createElement('input', { type: 'number', class: 'form-input', min: '0', placeholder: '0' });

      const populate = () => {
        Dom.clearChildren(fields.item);
        fields.item.appendChild(Dom.createElement('option', { value: '', text: '\u2014 Pilih Item \u2014' }));
        const list = fields.tipeItem.value === 'lab' ? this._labs : this._alat;
        list.forEach((it) => {
          const name = fields.tipeItem.value === 'lab' ? it.nama_lab : it.nama_alat;
          fields.item.appendChild(Dom.createElement('option', { value: it.id, text: name }));
        });
      };
      fields.tipeItem.addEventListener('change', populate);
      populate();

      return Dom.createElement('div', {}, [
        Form.fieldGroup('Tipe Item', fields.tipeItem, { required: true }),
        Form.fieldGroup('Item', fields.item, { required: true }),
        Form.fieldGroup('Tipe Laporan', fields.tipeLaporan, { required: true }),
        Form.fieldGroup('Tingkat', fields.tingkat, { required: true }),
        Form.fieldGroup('Deskripsi', fields.deskripsi, { required: true, hint: 'Min. 5 karakter' }),
        Form.fieldGroup('Estimasi Biaya (Rp)', fields.estimasi, { hint: 'Opsional' })
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Kirim', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.item.value)) { Toast.error('Pilih item'); return false; }
          if (!Validate.minLength(fields.deskripsi.value, 5)) { Toast.error('Deskripsi minimal 5 karakter'); return false; }
          try {
            await Api.post('createLaporanKerusakan', {
              tipe_item: fields.tipeItem.value,
              id_item: fields.item.value,
              tipe_laporan: fields.tipeLaporan.value,
              deskripsi: fields.deskripsi.value.trim(),
              tingkat_kerusakan: fields.tingkat.value,
              estimasi_biaya: fields.estimasi.value ? Number(fields.estimasi.value) : 0
            });
            Toast.success('Laporan berhasil dibuat');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal membuat laporan'); return false; }
        }
      }
    ]);
  },

  _updateModal(lap) {
    let fields = {};
    Modal.open('Update Tindak Lanjut', () => {
      fields.status = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'menunggu', text: 'Menunggu', selected: lap.status_tindak_lanjut === 'menunggu' }),
        Dom.createElement('option', { value: 'dalam_proses', text: 'Dalam Proses', selected: lap.status_tindak_lanjut === 'dalam_proses' }),
        Dom.createElement('option', { value: 'diabaikan', text: 'Diabaikan', selected: lap.status_tindak_lanjut === 'diabaikan' })
      ]);
      fields.tindak = Dom.createElement('textarea', { class: 'form-textarea' });
      if (lap.tindak_lanjut) fields.tindak.value = lap.tindak_lanjut;
      fields.estimasi = Dom.createElement('input', { type: 'number', class: 'form-input', min: '0', value: lap.estimasi_biaya || '' });
      return Dom.createElement('div', {}, [
        Form.fieldGroup('Status', fields.status, { required: true }),
        Form.fieldGroup('Keterangan Tindak Lanjut', fields.tindak),
        Form.fieldGroup('Estimasi Biaya (Rp)', fields.estimasi)
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Simpan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (fields.status.value === 'diabaikan' && !Validate.required(fields.tindak.value)) {
            Toast.error('Alasan diabaikan wajib diisi'); return false;
          }
          try {
            await Api.post('updateTindakLanjut', {
              id: lap.id,
              status_tindak_lanjut: fields.status.value,
              tindak_lanjut: fields.tindak.value.trim(),
              estimasi_biaya: fields.estimasi.value ? Number(fields.estimasi.value) : 0
            });
            Toast.success('Tindak lanjut diperbarui');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal memperbarui tindak lanjut'); return false; }
        }
      }
    ]);
  },

  _selesaikanModal(lap) {
    let fields = {};
    Modal.open('Selesaikan Tindak Lanjut', () => {
      fields.tindak = Dom.createElement('textarea', { class: 'form-textarea' });
      fields.kembalikan = Dom.createElement('input', { type: 'checkbox', id: 'kembalikan-kondisi' });
      return Dom.createElement('div', {}, [
        Dom.createElement('p', { class: 'mb-4', text: 'Item: ' + lap.nama_item }),
        Form.fieldGroup('Keterangan Penyelesaian', fields.tindak, { required: true }),
        Dom.createElement('div', { class: 'form-group' }, [
          Dom.createElement('label', { class: 'radio-option', for: 'kembalikan-kondisi' }, [
            fields.kembalikan, Dom.createElement('span', { text: 'Kembalikan kondisi item ke baik' })
          ])
        ])
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Selesaikan', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!Validate.required(fields.tindak.value)) { Toast.error('Keterangan penyelesaian wajib diisi'); return false; }
          try {
            await Api.post('selesaikanTindakLanjut', {
              id: lap.id,
              tindak_lanjut: fields.tindak.value.trim(),
              kembalikan_kondisi: !!fields.kembalikan.checked
            });
            Toast.success('Laporan diselesaikan');
            this._reload();
          } catch (e) { Toast.error(e.message || 'Gagal menyelesaikan laporan'); return false; }
        }
      }
    ]);
  }
};
