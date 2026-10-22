/**
 * laporan.js — laporan statistik (admin/staff) dengan grafik bar canvas.
 */
const Laporan = {
  render(container) {
    if (!Auth.isAdminOrStaff()) { Router.navigate('/'); return; }
    Dom.clearChildren(container);
    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Laporan & Statistik' })
    ]);
    container.appendChild(header);

    // Filter periode
    const filter = Dom.createElement('div', { class: 'filter-bar' });
    const fromInput = Dom.createElement('input', { type: 'date', id: 'lap-from', class: 'form-input' });
    const toInput = Dom.createElement('input', { type: 'date', id: 'lap-to', class: 'form-input' });
    const renderBtn = Dom.createElement('button', { class: 'btn btn-primary', type: 'button', text: 'Tampilkan Laporan' });
    filter.appendChild(Form.fieldGroup('Dari', fromInput, {}));
    filter.appendChild(Form.fieldGroup('Sampai', toInput, {}));
    filter.appendChild(Dom.createElement('div', { class: 'filter-actions' }, [renderBtn]));
    container.appendChild(filter);

    const result = Dom.createElement('div', { id: 'lap-result' });
    container.appendChild(result);

    renderBtn.addEventListener('click', () => this._load(result, fromInput.value, toInput.value));
    // default load (tanpa filter)
    this._load(result, '', '');
  },

  async _load(container, from, to) {
    Dom.clearChildren(container);
    container.appendChild(Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]));
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const [peminjaman, laporan] = await Promise.allSettled([
        Api.get('getReportPeminjaman', params),
        Api.get('getLaporanKerusakan', params)
      ]);
      Dom.clearChildren(container);

      if (peminjaman.status === 'fulfilled' && peminjaman.value) {
        this._renderPeminjaman(container, peminjaman.value);
      } else {
        container.appendChild(Dom.createElement('div', { class: 'alert alert-warning', text: 'Gagal memuat laporan peminjaman.' }));
      }

      if (laporan.status === 'fulfilled') {
        this._renderKerusakan(container, laporan.value || []);
      } else {
        container.appendChild(Dom.createElement('div', { class: 'alert alert-warning', text: 'Gagal memuat rekap kerusakan.' }));
      }
    } catch (e) {
      Dom.clearChildren(container);
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat laporan: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _renderPeminjaman(container, report) {
    const data = report.data || [];
    if (!data.length) {
      container.appendChild(Dom.createElement('div', { class: 'alert alert-info', text: 'Tidak ada aktivitas peminjaman di periode ini.' }));
    }

    // Stat cards
    const grid = Dom.createElement('div', { class: 'stat-grid' });
    grid.appendChild(this._statCard(report.total || 0, 'Total Peminjaman'));
    grid.appendChild(this._statCard(this._topItem(data, 'lab'), 'Lab Paling Sering'));
    grid.appendChild(this._statCard(this._topItem(data, 'alat'), 'Alat Paling Sering'));
    grid.appendChild(this._statCard(Format.rupiah(report.total_denda || 0), 'Total Denda'));
    container.appendChild(grid);

    // Grafik per bulan
    const card = Dom.createElement('div', { class: 'card mb-6' });
    card.appendChild(Dom.createElement('div', { class: 'card-header' }, [Dom.createElement('h2', { text: 'Peminjaman per Bulan' })]));
    const body = Dom.createElement('div', { class: 'card-body' });
    const canvas = Dom.createElement('canvas', { width: '800', height: '260', style: 'width:100%;max-width:100%;height:auto' });
    body.appendChild(canvas);
    card.appendChild(body);
    container.appendChild(card);
    this._drawChart(canvas, this._groupByMonth(data));
  },

  _renderKerusakan(container, laporan) {
    const total = laporan.length;
    const estimasi = laporan.reduce((s, l) => s + (parseInt(l.estimasi_biaya, 10) || 0), 0);
    const card = Dom.createElement('div', { class: 'card' });
    card.appendChild(Dom.createElement('div', { class: 'card-header' }, [Dom.createElement('h2', { text: 'Rekap Kerusakan & Kehilangan' })]));
    const body = Dom.createElement('div', { class: 'card-body' });
    const grid = Dom.createElement('div', { class: 'stat-grid' });
    grid.appendChild(this._statCard(total, 'Total Laporan'));
    grid.appendChild(this._statCard(Format.rupiah(estimasi), 'Estimasi Biaya'));
    body.appendChild(grid);

    // Tabel ringkas
    const wrap = Dom.createElement('div', { class: 'mt-4' });
    body.appendChild(wrap);
    Table.render(wrap, [
      { key: 'nama_item', label: 'Item' },
      { key: 'tipe_laporan', label: 'Tipe', render: (r) => Badge.render(r.tipe_laporan) },
      { key: 'tingkat_kerusakan', label: 'Tingkat', render: (r) => Badge.render(r.tingkat_kerusakan) },
      { key: 'status_tindak_lanjut', label: 'Status', render: (r) => Badge.render(r.status_tindak_lanjut) },
      { key: 'estimasi_biaya', label: 'Estimasi Biaya', render: (r) => Dom.createElement('span', { text: Format.rupiah(r.estimasi_biaya || 0) }) }
    ], laporan, { pageSize: 10, emptyMessage: 'Tidak ada laporan kerusakan di periode ini.' });
    card.appendChild(body);
    container.appendChild(card);
  },

  _statCard(value, label) {
    return Dom.createElement('div', { class: 'stat-card' }, [
      Dom.createElement('div', { class: 'stat-value', text: String(value != null && value !== '' ? value : '-') }),
      Dom.createElement('div', { class: 'stat-label', text: label })
    ]);
  },

  _topItem(data, tipe) {
    const counts = {};
    data.forEach((p) => {
      if (p.tipe_peminjaman === tipe) counts[p.nama_item] = (counts[p.nama_item] || 0) + 1;
    });
    let best = '-', max = 0;
    for (const k in counts) {
      if (counts[k] > max) { max = counts[k]; best = k; }
    }
    return best;
  },

  _groupByMonth(data) {
    const months = {};
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    data.forEach((p) => {
      const d = new Date(p.tanggal_pinjam || p.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.getFullYear() + '-' + d.getMonth();
      months[key] = (months[key] || 0) + 1;
    });
    const keys = Object.keys(months).sort();
    return keys.map((k) => {
      const parts = k.split('-');
      return { label: labels[parseInt(parts[1], 10)] + ' ' + parts[0], value: months[k] };
    });
  },

  _drawChart(canvas, bars) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!bars.length) {
      ctx.fillStyle = '#718096';
      ctx.font = '14px sans-serif';
      ctx.fillText('Tidak ada data', w / 2 - 40, h / 2);
      return;
    }
    const padding = 40;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;
    const max = Math.max.apply(null, bars.map((b) => b.value).concat([1]));
    const barW = Math.max(10, chartW / bars.length - 8);

    // Axis
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    ctx.fillStyle = '#1a365d';
    bars.forEach((b, i) => {
      const x = padding + i * (chartW / bars.length) + 4;
      const bh = (b.value / max) * chartH;
      const y = h - padding - bh;
      ctx.fillRect(x, y, barW, bh);
      // value label
      ctx.fillStyle = '#1a202c';
      ctx.font = '12px sans-serif';
      ctx.fillText(String(b.value), x + barW / 2 - 6, y - 6);
      // x label
      ctx.fillStyle = '#718096';
      ctx.fillText(b.label, x + barW / 2 - 14, h - padding + 16);
      ctx.fillStyle = '#1a365d';
    });
  }
};
