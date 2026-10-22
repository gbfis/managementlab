/**
 * peminjamanForm.js — form pengajuan peminjaman baru.
 * Field kondisional: jumlah (alat), mata kuliah & dosen (mahasiswa).
 */
const PeminjamanForm = {
  _items: { lab: [], alat: [] },
  _tipe: null,

  async render(container) {
    Dom.clearChildren(container);
    const user = Auth.getCurrentUser();

    const header = Dom.createElement('div', { class: 'page-header' }, [
      Dom.createElement('h1', { text: 'Ajukan Peminjaman Baru' })
    ]);
    container.appendChild(header);

    // Banner peringatan no_wa
    if (user && !user.no_wa) {
      container.appendChild(Dom.createElement('div', { class: 'alert alert-warning' }, [
        Dom.createElement('span', { text: 'Lengkapi nomor WhatsApp di profil Anda agar admin dapat menghubungi Anda jika perlu.' })
      ]));
    }

    const loading = Dom.createElement('div', { class: 'loading-center' }, [Dom.createElement('span', { class: 'spinner' })]);
    container.appendChild(loading);

    try {
      const [labs, alat] = await Promise.all([
        Api.get('getLabs', { status: 'tersedia' }),
        Api.get('getAlat', { status: 'tersedia' })
      ]);
      this._items.lab = labs || [];
      this._items.alat = (alat || []).filter((a) => parseInt(a.stok, 10) > 0);
      loading.remove();
      this._renderForm(container, user);
    } catch (e) {
      loading.remove();
      container.appendChild(Dom.createElement('div', { class: 'alert alert-danger', text: 'Gagal memuat daftar item: ' + (e.message || 'terjadi kesalahan') }));
    }
  },

  _todayStr() {
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  _addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  },

  _renderForm(container, user) {
    const form = Dom.createElement('form', { id: 'peminjaman-form', novalidate: true });

    // Tipe peminjaman — dibungkus fieldset+legend untuk semantik grup radio (WCAG m-2)
    const tipeGroup = Dom.createElement('div', { class: 'form-group' });
    const tipeFieldset = Dom.createElement('fieldset', { class: 'radio-fieldset' });
    tipeFieldset.appendChild(Dom.createElement('legend', { class: 'form-label required', text: 'Tipe Peminjaman' }));
    const radioWrap = Dom.createElement('div', { class: 'radio-group' });
    const labRadio = Dom.createElement('input', { type: 'radio', id: 'tipe-lab', name: 'tipe_peminjaman', value: 'lab' });
    const alatRadio = Dom.createElement('input', { type: 'radio', id: 'tipe-alat', name: 'tipe_peminjaman', value: 'alat' });
    radioWrap.appendChild(Dom.createElement('label', { class: 'radio-option', for: 'tipe-lab' }, [labRadio, Dom.createElement('span', { text: 'Lab' })]));
    radioWrap.appendChild(Dom.createElement('label', { class: 'radio-option', for: 'tipe-alat' }, [alatRadio, Dom.createElement('span', { text: 'Alat' })]));
    tipeFieldset.appendChild(radioWrap);
    tipeGroup.appendChild(tipeFieldset);
    form.appendChild(tipeGroup);

    // Container untuk item + jumlah (diisi dinamis)
    const itemArea = Dom.createElement('div', { id: 'item-area' });
    form.appendChild(itemArea);

    // Tanggal pinjam
    const tglPinjam = Dom.createElement('input', { type: 'date', id: 'tanggal_pinjam', name: 'tanggal_pinjam', class: 'form-input', min: this._todayStr() });
    form.appendChild(Form.fieldGroup('Tanggal Pinjam', tglPinjam, { required: true }));

    // Tanggal kembali
    const tglKembali = Dom.createElement('input', { type: 'date', id: 'tanggal_kembali_rencana', name: 'tanggal_kembali_rencana', class: 'form-input' });
    form.appendChild(Form.fieldGroup('Tanggal Kembali', tglKembali, { required: true, hint: 'Maksimal 7 hari dari tanggal pinjam' }));

    // Keperluan
    const keperluan = Dom.createElement('textarea', { id: 'keperluan', name: 'keperluan', class: 'form-textarea', maxlength: '500' });
    form.appendChild(Form.fieldGroup('Keperluan', keperluan, { required: true, hint: 'Min. 10 karakter, maks. 500 karakter' }));

    // Field akademik untuk mahasiswa dan dosen
    if (user && (user.role === 'mahasiswa' || user.role === 'dosen')) {
      const mk = Dom.createElement('input', { type: 'text', id: 'mata_kuliah', name: 'mata_kuliah', class: 'form-input', maxlength: '100' });
      form.appendChild(Form.fieldGroup('Mata Kuliah', mk, { hint: 'Opsional, maks. 100 karakter' }));
      const dosen = Dom.createElement('input', { type: 'text', id: 'dosen_pembimbing', name: 'dosen_pembimbing', class: 'form-input', maxlength: '100' });
      form.appendChild(Form.fieldGroup('Dosen Pembimbing', dosen, { hint: 'Opsional, maks. 100 karakter' }));
    }

    const submitBtn = Dom.createElement('button', { type: 'submit', class: 'btn btn-primary', text: 'Kirim Pengajuan' });
    form.appendChild(Dom.createElement('div', { class: 'form-group' }, submitBtn));

    container.appendChild(form);

    // Update tanggal kembali min/max saat tanggal pinjam berubah
    tglPinjam.addEventListener('change', () => {
      if (tglPinjam.value) {
        tglKembali.min = this._addDays(tglPinjam.value, 1);
        tglKembali.max = this._addDays(tglPinjam.value, 7);
        if (tglKembali.value && tglKembali.value <= tglPinjam.value) tglKembali.value = '';
      }
    });

    // Re-render item area saat tipe berubah
    const renderItems = () => {
      Dom.clearChildren(itemArea);
      if (this._tipe === 'lab' || this._tipe === 'alat') {
        const items = this._items[this._tipe];
        if (!items.length) {
          itemArea.appendChild(Dom.createElement('div', { class: 'alert alert-info mb-4', text: this._tipe === 'lab' ? 'Tidak ada lab tersedia saat ini.' : 'Tidak ada alat tersedia saat ini.' }));
          return;
        }
        const select = Dom.createElement('select', { id: 'id_item', name: 'id_item', class: 'form-select' });
        select.appendChild(Dom.createElement('option', { value: '', text: '\u2014 Pilih ' + (this._tipe === 'lab' ? 'Lab' : 'Alat') + ' \u2014' }));
        items.forEach((it) => {
          const label = this._tipe === 'lab'
            ? `${it.nama_lab}${it.lokasi ? ' \u2014 ' + it.lokasi : ''}`
            : `${it.nama_alat} (stok: ${it.stok})`;
          select.appendChild(Dom.createElement('option', { value: it.id, text: label }));
        });
        itemArea.appendChild(Form.fieldGroup('Pilih Item', select, { required: true }));

        // Jumlah hanya untuk alat
        if (this._tipe === 'alat') {
          const jumlah = Dom.createElement('input', { type: 'number', id: 'jumlah', name: 'jumlah', class: 'form-input', min: '1', value: '1' });
          const jumlahGroup = Form.fieldGroup('Jumlah', jumlah, { required: true, hint: 'Sesuaikan dengan stok tersedia' });
          jumlahGroup.hidden = true;
          itemArea.appendChild(jumlahGroup);
          select.addEventListener('change', () => {
            const chosen = items.find((it) => it.id === select.value);
            const max = chosen ? parseInt(chosen.stok, 10) : 1;
            jumlah.max = String(max);
            jumlah.value = '1';
            jumlahGroup.hidden = !chosen;
          });
        }
      }
    };

    const changeHandler = (val) => {
      this._tipe = val;
      renderItems();
    };
    labRadio.addEventListener('change', () => changeHandler('lab'));
    alatRadio.addEventListener('change', () => changeHandler('alat'));

    form.addEventListener('submit', (e) => this._onSubmit(e, submitBtn));
  },

  async _onSubmit(e, submitBtn) {
    e.preventDefault();
    Form.clearErrors(e.target);
    const data = Form.getData(e.target);
    let valid = true;

    if (!Validate.required(data.tipe_peminjaman)) {
      // Tampilkan error di bawah fieldset grup radio
      const radioFieldset = Dom.qs('fieldset.radio-fieldset', e.target);
      Form.showError(radioFieldset || Dom.qs('input[name="tipe_peminjaman"]'), 'Pilih tipe peminjaman');
      valid = false;
    }
    if (!Validate.required(data.id_item)) { valid = false; Toast.error('Pilih item yang ingin dipinjam'); }
    if (data.tipe_peminjaman === 'alat') {
      const stok = this._stokOf(data.id_item);
      if (!Validate.required(data.jumlah) || !Validate.positiveInt(data.jumlah, stok)) {
        Form.showError(document.getElementById('jumlah'), stok != null ? `Jumlah harus 1\u2013${stok}` : 'Jumlah tidak valid');
        valid = false;
      }
    }
    if (!Validate.dateNotPast(data.tanggal_pinjam)) {
      Form.showError(document.getElementById('tanggal_pinjam'), 'Tanggal pinjam tidak boleh sebelum hari ini');
      valid = false;
    }
    if (!Validate.dateAfter(data.tanggal_kembali_rencana, data.tanggal_pinjam)) {
      Form.showError(document.getElementById('tanggal_kembali_rencana'), 'Tanggal kembali harus setelah tanggal pinjam');
      valid = false;
    }
    if (!Validate.minLength(data.keperluan, 10)) {
      Form.showError(document.getElementById('keperluan'), 'Keperluan minimal 10 karakter');
      valid = false;
    } else if (!Validate.maxLength(data.keperluan, 500)) {
      Form.showError(document.getElementById('keperluan'), 'Keperluan maksimal 500 karakter');
      valid = false;
    }
    if (!valid) return;

    const payload = {
      tipe_peminjaman: data.tipe_peminjaman,
      id_item: data.id_item,
      tanggal_pinjam: data.tanggal_pinjam,
      tanggal_kembali_rencana: data.tanggal_kembali_rencana,
      keperluan: data.keperluan.trim()
    };
    if (data.tipe_peminjaman === 'alat') payload.jumlah = Number(data.jumlah);
    if (data.mata_kuliah) payload.mata_kuliah = data.mata_kuliah.trim();
    if (data.dosen_pembimbing) payload.dosen_pembimbing = data.dosen_pembimbing.trim();

    Form.setLoading(submitBtn, true, 'Mengirim...');
    try {
      await Api.post('createPeminjaman', payload);
      Toast.success('Pengajuan peminjaman berhasil dikirim');
      Router.navigate('/peminjaman');
    } catch (err) {
      Form.setLoading(submitBtn, false, 'Kirim Pengajuan');
      Toast.error(err.message || 'Gagal mengirim pengajuan');
    }
  },

  _stokOf(id) {
    const found = this._items.alat.find((a) => a.id === id);
    return found ? parseInt(found.stok, 10) : null;
  }
};
