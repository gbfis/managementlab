/**
 * peminjaman.js — daftar peminjaman (admin/staff: semua, peminjam: milik sendiri).
 */
const Peminjaman = {
  _filter: 'semua',

  render(container) {
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: Auth.isAdminOrStaff() ? 'Peminjaman' : 'Peminjaman Saya' })
    ]);
    if (Auth.hasRole('mahasiswa', 'dosen', 'admin', 'staff')) {
      header.appendChild(Dom.createElement('div', { class: 'page-header-actions' }, [
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Ajukan Peminjaman',
          onClick: () => Router.navigate('/peminjaman/baru')
        })
      ]));
    }
    container.appendChild(header);

    const tabsWrap = Dom.createElement('div', { class: 'tabs', id: 'peminjaman-tabs' });
    container.appendChild(tabsWrap);

    const tableWrap = Dom.createElement('div', { id: 'peminjaman-table' });
    container.appendChild(tableWrap);

    this._renderTabs(tabsWrap);
    this._load(tableWrap);
  },

  _renderTabs(tabsWrap) {
    Dom.clearChildren(tabsWrap);
    let tabs;
    if (Auth.isAdminOrStaff()) {
      tabs = [
        { key: 'semua', label: 'Semua' },
        { key: 'pending', label: 'Menunggu' },
        { key: 'approved', label: 'Disetujui' },
        { key: 'returned', label: 'Selesai' },
        { key: 'overdue', label: 'Terlambat' }
      ];
    } else {
      tabs = [
        { key: 'semua', label: 'Semua' },
        { key: 'pending', label: 'Menunggu' },
        { key: 'aktif', label: 'Aktif' },
        { key: 'returned', label: 'Selesai' }
      ];
    }
    tabs.forEach((t) => {
      tabsWrap.appendChild(Dom.createElement('button', {
        class: 'tab' + (t.key === this._filter ? ' active' : ''),
        type: 'button',
        text: t.label,
        onClick: () => {
          this._filter = t.key;
          this._renderTabs(tabsWrap);
          this._load(document.getElementById('peminjaman-table'));
        }
      }));
    });
  },

  async _load(container) {
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'loading-center' }, [
      Dom.createElement('span', { class: 'spinner' })
    ]));
    try {
      let data;
      if (Auth.isAdminOrStaff()) {
        data = await Api.get('getPeminjaman');
      } else {
        data = await Api.get('getMyPeminjaman');
      }
      data = data || [];
      const filtered = this._applyFilter(data);
      Dom.clearChildren(container);

      const columns = [];
      columns.push({ key: 'tanggal_pinjam', label: 'Tanggal', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_pinjam) }) });
      if (Auth.isAdminOrStaff()) {
        columns.push({ key: 'nama_peminjam', label: 'Peminjam' });
      }
      columns.push({ key: 'nama_item', label: 'Item' });
      columns.push({ key: 'tipe_peminjaman', label: 'Tipe', render: (r) => Dom.createElement('span', { text: r.tipe_peminjaman === 'lab' ? 'Lab' : 'Alat' }) });
      columns.push({ key: 'status', label: 'Status', render: (r) => Badge.render(r.status) });
      columns.push({
        key: '_aksi', label: 'Aksi', render: (r) => Dom.createElement('button', {
          class: 'btn btn-secondary btn-sm', type: 'button', text: 'Detail',
          onClick: (e) => { e.stopPropagation(); Router.navigate('/peminjaman/' + r.id); }
        })
      });

      Table.render(container, columns, filtered, {
        pageSize: 10,
        emptyMessage: Auth.isAdminOrStaff() ? 'Belum ada peminjaman yang masuk.' : 'Belum ada peminjaman. Klik "Ajukan Peminjaman" untuk mulai.',
        onRowClick: (row) => Router.navigate('/peminjaman/' + row.id)
      });
    } catch (e) {
      Dom.clearChildren(container);
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat data: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _applyFilter(data) {
    const f = this._filter;
    if (f === 'semua') return data;
    if (f === 'aktif') return data.filter((p) => p.status === 'approved' || p.status === 'overdue');
    return data.filter((p) => p.status === f);
  }
};
