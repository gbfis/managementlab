/**
 * dashboard.js — dashboard per role (admin/staff vs peminjam).
 */
const Dashboard = {
  render(container) {
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Dashboard' })
    ]);
    container.appendChild(header);

    const loading = Dom.createElement('div', { class: 'loading-center' }, [
      Dom.createElement('span', { class: 'spinner spinner-lg' })
    ]);
    container.appendChild(loading);

    if (Auth.isAdminOrStaff()) {
      this._renderAdmin(container, loading);
    } else {
      this._renderPeminjam(container, loading);
    }
  },

  _todayStr() {
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  // ===== Admin/Staff =====
  async _renderAdmin(container, loading) {
    try {
      const [statsRes, pendingRes, approvedRes, overdueRes, laporanRes] = await Promise.allSettled([
        Api.get('getDashboardStats'),
        Api.get('getPeminjaman', { status: 'pending' }),
        Api.get('getPeminjaman', { status: 'approved' }),
        Api.get('getReportOverdue'),
        Api.get('getLaporanKerusakan')
      ]);

      loading.remove();

      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const pending = pendingRes.status === 'fulfilled' ? (pendingRes.value || []) : [];
      const approved = approvedRes.status === 'fulfilled' ? (approvedRes.value || []) : [];
      const overdue = overdueRes.status === 'fulfilled' ? (overdueRes.value || []) : [];
      const laporanAll = laporanRes.status === 'fulfilled' ? (laporanRes.value || []) : [];
      const laporanAktif = laporanAll.filter((l) => l.status_tindak_lanjut === 'menunggu' || l.status_tindak_lanjut === 'dalam_proses');

      // Overdue alert banner
      if (stats && stats.totalOverdue > 0) {
        container.appendChild(Dom.createElement('div', { class: 'alert alert-danger' }, [
          Dom.createElement('span', { text: `Ada ${stats.totalOverdue} peminjaman yang terlambat dikembalikan. Lihat halaman Pengembalian untuk menindaklanjuti.` })
        ]));
      }

      // Stat cards
      if (stats) {
        container.appendChild(this._statCards(stats));
      } else {
        container.appendChild(Dom.createElement('div', { class: 'alert alert-warning', text: 'Gagal memuat statistik dashboard.' }));
      }

      // Quick action pending
      container.appendChild(this._section('Peminjaman Menunggu Persetujuan', pending, (row) => this._pendingRow(row), 'Tidak ada pengajuan yang menunggu persetujuan.'));

      // Due today
      const today = this._todayStr();
      const dueToday = approved.filter((p) => p.tanggal_kembali_rencana === today);
      container.appendChild(this._section('Jatuh Tempo Hari Ini', dueToday, (row) => this._dueRow(row), 'Tidak ada peminjaman jatuh tempo hari ini.'));

      // Laporan aktif
      container.appendChild(this._section('Laporan Kerusakan Aktif', laporanAktif, (row) => this._laporanRow(row), 'Tidak ada laporan kerusakan aktif.'));
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat dashboard: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _statCards(stats) {
    const grid = Dom.createElement('div', { class: 'stat-grid' });
    grid.appendChild(this._statCard(stats.totalAktif, 'Peminjaman Aktif'));
    grid.appendChild(this._statCard(stats.totalPending, 'Menunggu Persetujuan', 'warning'));
    grid.appendChild(this._statCard(stats.totalOverdue, 'Terlambat', stats.totalOverdue > 0 ? 'danger' : ''));
    grid.appendChild(this._statCard(stats.labTersedia, 'Lab Tersedia', 'success'));
    grid.appendChild(this._statCard(stats.alatTersedia, 'Alat Tersedia', 'success'));
    return grid;
  },

  _statCard(value, label, modifier) {
    const cls = 'stat-card' + (modifier ? ' ' + modifier : '');
    return Dom.createElement('div', { class: cls }, [
      Dom.createElement('div', { class: 'stat-value', text: String(value != null ? value : '-') }),
      Dom.createElement('div', { class: 'stat-label', text: label })
    ]);
  },

  _section(title, data, rowRender, emptyMsg) {
    const wrap = Dom.createElement('div', { class: 'card mb-6' });
    wrap.appendChild(Dom.createElement('div', { class: 'card-header' }, [
      Dom.createElement('h2', { text: title })
    ]));
    const body = Dom.createElement('div', { class: 'card-body' });
    if (!data || !data.length) {
      body.appendChild(Dom.createElement('div', { class: 'empty-state' }, [
        Dom.createElement('p', { class: 'empty-state-text', text: emptyMsg })
      ]));
    } else {
      const container = Dom.createElement('div');
      body.appendChild(container);
      const columns = this._sectionColumns(rowRender);
      Table.render(container, columns, data, { pageSize: 5 });
    }
    wrap.appendChild(body);
    return wrap;
  },

  _sectionColumns(rowRender) {
    // Each section supplies its own columns via rowRender marker; default generic
    return rowRender();
  },

  _pendingRow() {
    return [
      { key: 'nama_peminjam', label: 'Peminjam' },
      { key: 'nama_item', label: 'Item' },
      { key: 'tipe_peminjaman', label: 'Tipe', render: (r) => Dom.createElement('span', { text: r.tipe_peminjaman === 'lab' ? 'Lab' : 'Alat' }) },
      { key: 'tanggal_pinjam', label: 'Pinjam', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_pinjam) }) },
      { key: 'status', label: 'Status', render: (r) => Badge.render(r.status) },
      {
        key: '_aksi', label: 'Aksi', render: (r) => {
          const wrap = Dom.createElement('div', { class: 'actions-cell' });
          wrap.appendChild(Dom.createElement('button', {
            class: 'btn btn-primary btn-sm', type: 'button', text: 'Setujui',
            onClick: (e) => { e.stopPropagation(); this._quickApprove(r.id); }
          }));
          wrap.appendChild(Dom.createElement('button', {
            class: 'btn btn-danger btn-sm', type: 'button', text: 'Tolak',
            onClick: (e) => { e.stopPropagation(); this._quickReject(r.id); }
          }));
          return wrap;
        }
      }
    ];
  },

  _dueRow() {
    return [
      { key: 'nama_peminjam', label: 'Peminjam' },
      { key: 'nama_item', label: 'Item' },
      { key: 'tanggal_kembali_rencana', label: 'Rencana Kembali', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_kembali_rencana) }) },
      { key: 'status', label: 'Status', render: (r) => Badge.render(r.status) },
      {
        key: '_aksi', label: 'Aksi', render: (r) => {
          const wrap = Dom.createElement('div', { class: 'actions-cell' });
          wrap.appendChild(Dom.createElement('button', {
            class: 'btn btn-secondary btn-sm', type: 'button', text: 'Lihat',
            onClick: (e) => { e.stopPropagation(); Router.navigate('/peminjaman/' + r.id); }
          }));
          return wrap;
        }
      }
    ];
  },

  _laporanRow() {
    return [
      { key: 'nama_item', label: 'Item' },
      { key: 'tipe_laporan', label: 'Tipe', render: (r) => Badge.render(r.tipe_laporan) },
      { key: 'tingkat_kerusakan', label: 'Tingkat', render: (r) => Badge.render(r.tingkat_kerusakan) },
      { key: 'status_tindak_lanjut', label: 'Tindak Lanjut', render: (r) => Badge.render(r.status_tindak_lanjut) },
      { key: 'created_at', label: 'Dilaporkan', render: (r) => Dom.createElement('span', { text: Format.date(r.created_at) }) }
    ];
  },

  _quickApprove(id) {
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
            this.render(document.getElementById('main-content'));
          } catch (e) { Toast.error(e.message || 'Gagal menyetujui peminjaman'); return false; }
        }
      }
    ]);
  },

  _quickReject(id) {
    let catatanInput;
    Modal.open('Tolak Peminjaman', () => {
      catatanInput = Dom.createElement('textarea', { class: 'form-textarea', placeholder: 'Alasan penolakan (wajib)' });
      const group = Form.fieldGroup('Alasan Penolakan', catatanInput, { required: true });
      group.dataset.required = '1';
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
            this.render(document.getElementById('main-content'));
          } catch (e) { Toast.error(e.message || 'Gagal menolak peminjaman'); return false; }
        }
      }
    ]);
  },

  // ===== Peminjam =====
  async _renderPeminjam(container, loading) {
    const user = Auth.getCurrentUser();
    try {
      // Peringatan no_wa
      if (user && !user.no_wa) {
        loading.parentNode.insertBefore(Dom.createElement('div', { class: 'alert alert-warning' }, [
          Dom.createElement('span', { text: 'Lengkapi nomor WhatsApp di profil Anda agar admin dapat menghubungi Anda jika perlu.' })
        ]), loading);
      }

      const mine = await Api.get('getMyPeminjaman');
      loading.remove();

      const list = mine || [];
      const active = list.filter((p) => p.status === 'approved' || p.status === 'overdue')
        .sort((a, b) => new Date(a.tanggal_kembali_rencana) - new Date(b.tanggal_kembali_rencana));
      const latest = list.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Hero CTA
      const hero = Dom.createElement('div', { class: 'card mb-6' });
      hero.appendChild(Dom.createElement('div', { class: 'card-body' }, [
        Dom.createElement('h2', { class: 'section-title', text: 'Selamat datang, ' + (user ? user.nama : '') }),
        Dom.createElement('p', { class: 'text-muted mb-4', text: 'Ajukan peminjaman lab atau alat dengan cepat.' }),
        Dom.createElement('button', {
          class: 'btn btn-primary', type: 'button', text: 'Ajukan Peminjaman Baru',
          onClick: () => Router.navigate('/peminjaman/baru')
        })
      ]));
      container.appendChild(hero);

      // Active loans
      container.appendChild(this._peminjamSection('Peminjaman Aktif Saya', active, (row) => {
        const days = Dom.createElement('span');
        const rel = Format.relativeDate(row.tanggal_kembali_rencana);
        days.textContent = rel;
        const isOverdue = row.status === 'overdue';
        if (isOverdue) days.classList.add('text-danger');
        return days;
      }, 'Belum ada peminjaman aktif. Klik "Ajukan Peminjaman Baru" untuk mulai.'));

      // Latest status
      container.appendChild(this._peminjamSection('Peminjaman Terbaru', latest, (row) => Badge.render(row.status), 'Belum ada peminjaman. Klik "Ajukan Peminjaman" untuk mulai.'));
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat dashboard: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _peminjamSection(title, data, statusRender, emptyMsg) {
    const wrap = Dom.createElement('div', { class: 'card mb-6' });
    wrap.appendChild(Dom.createElement('div', { class: 'card-header' }, [Dom.createElement('h2', { text: title })]));
    const body = Dom.createElement('div', { class: 'card-body' });
    if (!data || !data.length) {
      body.appendChild(Dom.createElement('div', { class: 'empty-state' }, [
        Dom.createElement('p', { class: 'empty-state-text', text: emptyMsg })
      ]));
    } else {
      const cont = Dom.createElement('div');
      body.appendChild(cont);
      Table.render(cont, [
        { key: 'nama_item', label: 'Item' },
        { key: 'tipe_peminjaman', label: 'Tipe', render: (r) => Dom.createElement('span', { text: r.tipe_peminjaman === 'lab' ? 'Lab' : 'Alat' }) },
        { key: 'tanggal_pinjam', label: 'Pinjam', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_pinjam) }) },
        { key: 'tanggal_kembali_rencana', label: 'Rencana Kembali', render: (r) => Dom.createElement('span', { text: Format.date(r.tanggal_kembali_rencana) }) },
        { key: 'status', label: 'Status', render: statusRender },
        { key: '_detail', label: '', render: (r) => Dom.createElement('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Detail', onClick: (e) => { e.stopPropagation(); Router.navigate('/peminjaman/' + r.id); } }) }
      ], data, {
        pageSize: 5,
        onRowClick: (row) => Router.navigate('/peminjaman/' + row.id)
      });
    }
    wrap.appendChild(body);
    return wrap;
  }
};
