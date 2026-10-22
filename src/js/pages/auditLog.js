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
      Dom.createElement('option', { value: 'login', text: 'login' }),
      Dom.createElement('option', { value: 'logout', text: 'logout' }),
      Dom.createElement('option', { value: 'login_failed', text: 'login_failed' }),
      Dom.createElement('option', { value: 'account_locked', text: 'account_locked' }),
      Dom.createElement('option', { value: 'create_peminjaman', text: 'create_peminjaman' }),
      Dom.createElement('option', { value: 'approve', text: 'approve' }),
      Dom.createElement('option', { value: 'reject', text: 'reject' }),
      Dom.createElement('option', { value: 'return', text: 'return' }),
      Dom.createElement('option', { value: 'create_lab', text: 'create_lab' }),
      Dom.createElement('option', { value: 'update_lab', text: 'update_lab' }),
      Dom.createElement('option', { value: 'delete_lab', text: 'delete_lab' }),
      Dom.createElement('option', { value: 'create_alat', text: 'create_alat' }),
      Dom.createElement('option', { value: 'update_alat', text: 'update_alat' }),
      Dom.createElement('option', { value: 'delete_alat', text: 'delete_alat' }),
      Dom.createElement('option', { value: 'create_user', text: 'create_user' }),
      Dom.createElement('option', { value: 'update_user', text: 'update_user' }),
      Dom.createElement('option', { value: 'create_laporan_kerusakan', text: 'create_laporan_kerusakan' }),
      Dom.createElement('option', { value: 'update_tindak_lanjut', text: 'update_tindak_lanjut' }),
      Dom.createElement('option', { value: 'selesai_tindak_lanjut', text: 'selesai_tindak_lanjut' }),
      Dom.createElement('option', { value: 'daily_reminder', text: 'daily_reminder' }),
      Dom.createElement('option', { value: 'overdue_update', text: 'overdue_update' })
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
            const pre = Dom.createElement('pre', { style: 'white-space:pre-wrap;word-break:break-word;font-size:12px;margin:0;max-width:360px' });
            pre.textContent = Format.prettyJson(r.detail);
            return pre;
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
