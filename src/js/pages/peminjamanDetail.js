/**
 * peminjamanDetail.js — detail peminjaman + aksi sesuai role.
 */
const PeminjamanDetail = {
  _data: null,

  async render(container, params) {
    Dom.clearChildren(container);
    const id = params && params.id;

    // back link
    container.appendChild(Dom.createElement('div', { class: 'mb-4' }, [
      Dom.createElement('a', { href: '#/peminjaman', class: 'btn btn-secondary btn-sm', text: '\u2190 Kembali', onClick: (e) => { e.preventDefault(); Router.navigate('/peminjaman'); } })
    ]));

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner spinner-lg' })]);
    container.appendChild(loading);

    if (!id) {
      loading.remove();
      App.renderNotFound(container, 'ID peminjaman tidak ditemukan');
      return;
    }

    try {
      const data = await Api.get('getPeminjamanById', { id: id });
      this._data = data;
      loading.remove();
      this._renderDetail(container, data);
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat peminjaman: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _renderDetail(container, p) {
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Detail Peminjaman' }),
      Dom.createElement('div', { class: 'page-header-actions' }, [Badge.render(p.status)])
    ]);
    container.appendChild(header);

    const card = Dom.createElement('div', { class: 'card mb-6' });
    const body = Dom.createElement('div', { class: 'card-body' });

    const grid = Dom.createElement('div', { class: 'detail-grid' });
    grid.appendChild(this._detailItem('Peminjam', p.nama_peminjam));
    grid.appendChild(this._detailItem('Email', p.email_peminjam));
    if (p.no_wa_peminjam) grid.appendChild(this._detailItem('No. WhatsApp', p.no_wa_peminjam));
    grid.appendChild(this._detailItem('Tipe', p.tipe_peminjaman === 'lab' ? 'Lab' : 'Alat'));
    grid.appendChild(this._detailItem('Item', p.nama_item));
    if (p.tipe_peminjaman === 'alat') grid.appendChild(this._detailItem('Jumlah', String(p.jumlah)));
    grid.appendChild(this._detailItem('Tanggal Pinjam', Format.date(p.tanggal_pinjam)));
    grid.appendChild(this._detailItem('Rencana Kembali', Format.date(p.tanggal_kembali_rencana)));
    if (p.tanggal_kembali_actual) grid.appendChild(this._detailItem('Tgl Kembali Aktual', Format.dateTime(p.tanggal_kembali_actual)));
    grid.appendChild(this._detailItem('Keperluan', p.keperluan));
    if (p.mata_kuliah) grid.appendChild(this._detailItem('Mata Kuliah', p.mata_kuliah));
    if (p.dosen_pembimbing) grid.appendChild(this._detailItem('Dosen Pembimbing', p.dosen_pembimbing));
    if (p.catatan_admin) grid.appendChild(this._detailItem('Catatan Admin', p.catatan_admin));
    grid.appendChild(this._detailItem('Dibuat', Format.dateTime(p.created_at)));

    body.appendChild(grid);
    card.appendChild(body);
    container.appendChild(card);

    // Aksi (admin/staff)
    if (Auth.isAdminOrStaff()) {
      container.appendChild(this._actionBar(p));
    }
  },

  _detailItem(label, value) {
    return Dom.createElement('div', { class: 'detail-item' }, [
      Dom.createElement('div', { class: 'detail-label', text: label }),
      Dom.createElement('div', { class: 'detail-value', text: value == null || value === '' ? '-' : String(value) })
    ]);
  },

  _actionBar(p) {
    const bar = Dom.createElement('div', { class: 'page-header-actions' });
    const wrap = Dom.createElement('div', { class: 'card' });
    const body = Dom.createElement('div', { class: 'card-body' });
    body.appendChild(Dom.createElement('div', { class: 'section-title', text: 'Tindakan' }));

    if (p.status === 'pending') {
      body.appendChild(Dom.createElement('button', {
        class: 'btn btn-primary', type: 'button', text: 'Setujui',
        onClick: () => this._approve(p.id)
      }));
      body.appendChild(Dom.createElement('span', { text: ' ' }));
      body.appendChild(Dom.createElement('button', {
        class: 'btn btn-danger', type: 'button', text: 'Tolak',
        onClick: () => this._reject(p.id)
      }));
    } else if (p.status === 'approved' || p.status === 'overdue') {
      body.appendChild(Dom.createElement('button', {
        class: 'btn btn-primary', type: 'button', text: 'Konfirmasi Kembali',
        onClick: () => this._return(p)
      }));
    } else {
      body.appendChild(Dom.createElement('p', { class: 'text-muted', text: 'Tidak ada tindakan tersedia untuk status ini.' }));
    }
    wrap.appendChild(body);
    return wrap;
  },

  _approve(id) {
    let catatanInput;
    Modal.open('Setujui Peminjaman', () => {
      catatanInput = Dom.createElement('textarea', { class: 'form-textarea', placeholder: 'Catatan untuk peminjam (opsional)' });
      return Dom.createElement('div', {}, [
        Dom.createElement('p', { class: 'mb-4', text: 'Setujui pengajuan peminjaman ini?' }),
        Form.fieldGroup('Catatan (opsional)', catatanInput)
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Setujui', type: 'primary', closeOnClick: true, onClick: async () => {
          try {
            await Api.post('approvePeminjaman', { id: id, catatan: catatanInput.value.trim() });
            Toast.success('Peminjaman disetujui');
            this.render(document.getElementById('main-content'), { id: id });
          } catch (e) { Toast.error(e.message || 'Gagal menyetujui peminjaman'); return false; }
        }
      }
    ]);
  },

  _reject(id) {
    let catatanInput, group;
    Modal.open('Tolak Peminjaman', () => {
      catatanInput = Dom.createElement('textarea', { class: 'form-textarea', placeholder: 'Alasan penolakan (wajib)' });
      group = Form.fieldGroup('Alasan Penolakan', catatanInput, { required: true });
      return Dom.createElement('div', {}, [
        Dom.createElement('p', { class: 'mb-4', text: 'Tolak pengajuan peminjaman ini? Alasan akan dikirim ke peminjam.' }),
        group
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Tolak', type: 'danger', closeOnClick: true, onClick: async () => {
          if (!Validate.required(catatanInput.value) || !Validate.minLength(catatanInput.value, 5)) {
            Toast.error('Alasan penolakan wajib diisi (min. 5 karakter)');
            return false;
          }
          try {
            await Api.post('rejectPeminjaman', { id: id, catatan: catatanInput.value.trim() });
            Toast.success('Peminjaman ditolak');
            this.render(document.getElementById('main-content'), { id: id });
          } catch (e) { Toast.error(e.message || 'Gagal menolak peminjaman'); return false; }
        }
      }
    ]);
  },

  _return(p) {
    let kondisiSelect, catatanInput, dendaInput;
    Modal.open('Konfirmasi Pengembalian', () => {
      kondisiSelect = Dom.createElement('select', { class: 'form-select' }, [
        Dom.createElement('option', { value: 'baik', text: 'Baik' }),
        Dom.createElement('option', { value: 'rusak_ringan', text: 'Rusak Ringan' }),
        Dom.createElement('option', { value: 'rusak_berat', text: 'Rusak Berat' }),
        Dom.createElement('option', { value: 'hilang', text: 'Hilang' })
      ]);
      catatanInput = Dom.createElement('textarea', { class: 'form-textarea', placeholder: 'Catatan kondisi pengembalian' });
      dendaInput = Dom.createElement('input', { type: 'number', class: 'form-input', min: '0', placeholder: '0' });
      return Dom.createElement('div', {}, [
        Dom.createElement('p', { class: 'mb-4', text: 'Konfirmasi pengembalian untuk: ' + p.nama_item }),
        Form.fieldGroup('Kondisi', kondisiSelect, { required: true }),
        Form.fieldGroup('Catatan', catatanInput),
        Form.fieldGroup('Denda (Rp)', dendaInput, { hint: 'Isi 0 jika tidak ada denda' })
      ]);
    }, [
      { label: 'Batal', type: 'secondary', onClick: () => {} },
      {
        label: 'Konfirmasi', type: 'primary', closeOnClick: true, onClick: async () => {
          if (!kondisiSelect.value) { Toast.error('Pilih kondisi pengembalian'); return false; }
          try {
            await Api.post('returnPeminjaman', {
              id: p.id,
              kondisi: kondisiSelect.value,
              catatan: catatanInput.value.trim(),
              denda: dendaInput.value ? Number(dendaInput.value) : 0
            });
            Toast.success('Pengembalian dikonfirmasi');
            this.render(document.getElementById('main-content'), { id: p.id });
          } catch (e) { Toast.error(e.message || 'Gagal mengonfirmasi pengembalian'); return false; }
        }
      }
    ]);
  }
};
