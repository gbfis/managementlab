/**
 * auditLog.js — tabel audit log (admin only) dengan filter & paginasi.
 */
const AuditLog = {
  _data: [],

  render(container) {
    if (!Auth.hasRole('admin')) { Router.navigate('/'); return; }
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Audit Log' })
    ]);
    container.appendChild(header);

    // Filter bar
    const filter = Dom.createElement('div', { class: 'filter-bar' });
    const fromInput = Dom.createElement('input', { type: 'date', id: 'audit-from', class: 'form-input' });
    const toInput = Dom.createElement('input', { type: 'date', id: 'audit-to', class: 'form-input' });
    const aksiInput = Dom.createElement('select', { class: 'form-select', id: 'audit-aksi' }, [
      Dom.createElement('option', { value: '', text: 'Semua Aksi' }),
      Dom.createElement('option', { value: 'login', text: 'Masuk' }),
      Dom.createElement('option', { value: 'logout', text: 'Keluar' }),
      Dom.createElement('option', { value: 'login_failed', text: 'Gagal Login' }),
      Dom.createElement('option', { value: 'account_locked', text: 'Akun Terkunci' }),
      Dom.createElement('option', { value: 'create_peminjaman', text: 'Buat Peminjaman' }),
      Dom.createElement('option', { value: 'approve', text: 'Setujui Peminjaman' }),
      Dom.createElement('option', { value: 'reject', text: 'Tolak Peminjaman' }),
      Dom.createElement('option', { value: 'return', text: 'Konfirmasi Kembali' }),
      Dom.createElement('option', { value: 'create_lab', text: 'Tambah Lab' }),
      Dom.createElement('option', { value: 'update_lab', text: 'Ubah Lab' }),
      Dom.createElement('option', { value: 'delete_lab', text: 'Hapus Lab' }),
      Dom.createElement('option', { value: 'create_alat', text: 'Tambah Alat' }),
      Dom.createElement('option', { value: 'update_alat', text: 'Ubah Alat' }),
      Dom.createElement('option', { value: 'delete_alat', text: 'Hapus Alat' }),
      Dom.createElement('option', { value: 'create_user', text: 'Tambah User' }),
      Dom.createElement('option', { value: 'update_user', text: 'Ubah User' }),
      Dom.createElement('option', { value: 'create_laporan_kerusakan', text: 'Buat Laporan Kerusakan' }),
      Dom.createElement('option', { value: 'update_tindak_lanjut', text: 'Update Tindak Lanjut' }),
      Dom.createElement('option', { value: 'selesai_tindak_lanjut', text: 'Selesaikan Tindak Lanjut' }),
      Dom.createElement('option', { value: 'daily_reminder', text: 'Reminder Harian' }),
      Dom.createElement('option', { value: 'overdue_update', text: 'Update Terlambat' })
    ]);
    const userInput = Dom.createElement('input', { type: 'text', id: 'audit-user', class: 'form-input', placeholder: 'Email user' });
    const filterBtn = Dom.createElement('button', { class: 'btn btn-primary', type: 'button', text: 'Filter' });
    const resetBtn = Dom.createElement('button', { class: 'btn btn-secondary', type: 'button', text: 'Reset' });

    filter.appendChild(Form.fieldGroup('Dari', fromInput, {}));
    filter.appendChild(Form.fieldGroup('Sampai', toInput, {}));
    filter.appendChild(Form.fieldGroup('Aksi', aksiInput, {}));
    filter.appendChild(Form.fieldGroup('User', userInput, {}));
    filter.appendChild(Dom.createElement('div', { class: 'filter-actions' }, [filterBtn, resetBtn]));
    container.appendChild(filter);

    const tableWrap = Dom.createElement('div', { id: 'audit-table' });
    container.appendChild(tableWrap);

    const doFilter = () => {
      this._load(tableWrap, {
        from: fromInput.value,
        to: toInput.value,
        aksi: aksiInput.value,
        user_email: userInput.value.trim()
      });
    };
    filterBtn.addEventListener('click', doFilter);
    resetBtn.addEventListener('click', () => {
      fromInput.value = ''; toInput.value = ''; aksiInput.value = ''; userInput.value = '';
      doFilter();
    });

    this._load(tableWrap, {});
  },

  async _load(container, params) {
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]));
    try {
      const data = await Api.get('getAuditLog', params);
      this._data = data || [];
      Dom.clearChildren(container);
      Table.resetPage();
      Table.render(container, [
        { key: 'timestamp', label: 'Waktu', render: (r) => Dom.createElement('span', { text: Format.dateTime(r.timestamp) }) },
        { key: 'user_email', label: 'User' },
        { key: 'aksi', label: 'Aksi', render: (r) => Badge.render(r.aksi === 'account_locked' ? 'terkunci' : r.aksi) },
        {
          key: 'detail', label: 'Detail', render: (r) => {
            const MAX_LEN = 200;
            let raw = Format.prettyJson(r.detail);
            const isTruncated = raw.length > MAX_LEN;
            const displayText = isTruncated ? raw.slice(0, MAX_LEN) + '…' : raw;

            const wrap = Dom.createElement('div');
            const pre = Dom.createElement('pre', {
              style: 'white-space:pre-wrap;word-break:break-word;font-size:12px;margin:0;max-width:320px;max-height:80px;overflow:hidden'
            });
            pre.textContent = displayText;
            wrap.appendChild(pre);

            if (isTruncated) {
              const toggle = Dom.createElement('button', {
                class: 'btn-link',
                type: 'button',
                text: 'Lihat selengkapnya',
                style: 'font-size:11px;margin-top:2px'
              });
              let expanded = false;
              toggle.addEventListener('click', () => {
                expanded = !expanded;
                pre.textContent = expanded ? raw : displayText;
                pre.style.maxHeight = expanded ? 'none' : '80px';
                toggle.textContent = expanded ? 'Sembunyikan' : 'Lihat selengkapnya';
              });
              wrap.appendChild(toggle);
            }
            return wrap;
          }
        },
        { key: 'ip_address', label: 'IP', render: (r) => Dom.createElement('span', { text: r.ip_address || '-' }) }
      ], this._data, {
        pageSize: 15,
        emptyMessage: 'Tidak ada log audit yang cocok dengan filter.'
      });
    } catch (e) {
      Dom.clearChildren(container);
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat audit log: ' + (e.message || 'terjadi kesalahan') }));
    }
  }
};
