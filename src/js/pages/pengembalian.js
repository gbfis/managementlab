/**
 * pengembalian.js — antrian pengembalian (admin/staff).
 */
const Pengembalian = {
  render(container) {
    if (!Auth.isAdminOrStaff()) { Router.navigate('/'); return; }
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Antrian Pengembalian' })
    ]);
    container.appendChild(header);

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]);
    container.appendChild(loading);

    this._load(container);
  },

  async _load(container) {
    try {
      const all = await Api.get('getPeminjaman');
      const queue = (all || []).filter((p) => p.status === 'approved' || p.status === 'overdue')
        .sort((a, b) => new Date(a.tanggal_kembali_rencana) - new Date(b.tanggal_kembali_rencana));
      const loading = container.querySelector('.loading-center');
      if (loading) loading.remove();

      const wrap = Dom.createElement('div', { id: 'pengembalian-table' });
      container.appendChild(wrap);

      const columns = [
        { key: 'nama_peminjam', label: 'Peminjam' },
        { key: 'nama_item', label: 'Item' },
        { key: 'tipe_peminjaman', label: 'Tipe', render: (r) => Dom.createElement('span', { text: r.tipe_peminjaman === 'lab' ? 'Lab' : 'Alat' }) },
        { key: 'tanggal_kembali_rencana', label: 'Rencana Kembali', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_kembali_rencana) }) },
        { key: 'status', label: 'Status', render: (r) => Badge.render(r.status) },
        {
          key: '_aksi', label: 'Aksi', render: (r) => Dom.createElement('button', {
            class: 'btn btn-primary btn-sm', type: 'button', text: 'Konfirmasi Kembali',
            onClick: (e) => { e.stopPropagation(); this._returnModal(r); }
          })
        }
      ];
      Table.render(wrap, columns, queue, {
        pageSize: 10,
        emptyMessage: 'Tidak ada peminjaman yang menunggu konfirmasi pengembalian.'
      });
    } catch (e) {
      const loading = container.querySelector('.loading-center');
      if (loading) loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat antrian: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _returnModal(p) {
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
            this.render(document.getElementById('main-content'));
          } catch (e) { Toast.error(e.message || 'Gagal mengonfirmasi pengembalian'); return false; }
        }
      }
    ]);
  }
};
