/**
 * form.js — helper form (ambil data, tampilkan error, loading state).
 * Aman dari XSS (textContent).
 */
const Form = {
  /**
   * Ambil object dari semua input/select/textarea dalam form (berdasarkan name).
   * @param {HTMLFormElement} formEl
   * @returns {object}
   */
  getData(formEl) {
    const data = {};
    if (!formEl) return data;
    const fields = formEl.querySelectorAll('input, select, textarea');
    fields.forEach((field) => {
      if (!field.name) return;
      let value;
      if (field.type === 'checkbox') {
        value = field.checked;
      } else if (field.type === 'radio') {
        if (field.checked) data[field.name] = field.value;
        return;
      } else if (field.type === 'number') {
        value = field.value === '' ? '' : Number(field.value);
      } else {
        value = field.value;
      }
      data[field.name] = value;
    });
    return data;
  },

  /**
   * Tampilkan pesan error di bawah input.
   * @param {HTMLElement} inputEl
   * @param {string} message
   */
  showError(inputEl, message) {
    if (!inputEl) return;
    this.clearError(inputEl);
    inputEl.classList.add('error');
    inputEl.setAttribute('aria-invalid', 'true');
    const err = Dom.createElement('span', { class: 'form-error', text: message });
    // sisipkan tepat setelah input (atau parent jika wrapping)
    const next = inputEl.nextElementSibling;
    if (next && next.classList.contains('form-hint')) {
      inputEl.parentNode.insertBefore(err, next);
    } else {
      inputEl.parentNode.insertBefore(err, inputEl.nextSibling);
    }
  },

  clearError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('error');
    inputEl.removeAttribute('aria-invalid');
    const next = inputEl.nextElementSibling;
    if (next && next.classList.contains('form-error')) next.remove();
  },

  /** Hapus semua .form-error dalam form. */
  clearErrors(formEl) {
    if (!formEl) return;
    formEl.querySelectorAll('.form-error').forEach((e) => e.remove());
    formEl.querySelectorAll('.error').forEach((e) => e.classList.remove('error'));
    formEl.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  },

  /**
   * Toggle loading state pada tombol submit.
   * @param {HTMLButtonElement} submitBtn
   * @param {boolean} isLoading
   * @param {string} [loadingText]
   */
  setLoading(submitBtn, isLoading, loadingText) {
    if (!submitBtn) return;
    if (isLoading) {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = loadingText || 'Memuat...';
    } else {
      submitBtn.disabled = false;
      if (submitBtn.dataset.originalText != null) {
        submitBtn.textContent = submitBtn.dataset.originalText;
        delete submitBtn.dataset.originalText;
      }
    }
  },

  /** Buat <label> yang terhubung ke input via for/id. */
  createLabel(text, forId, required) {
    const attrs = { class: 'form-label', text: text, for: forId };
    if (required) attrs.class += ' required';
    return Dom.createElement('label', attrs);
  },

  /** Helper buat group label + input. */
  fieldGroup(labelText, inputEl, opts) {
    opts = opts || {};
    const group = Dom.createElement('div', { class: 'form-group' });
    if (labelText) group.appendChild(this.createLabel(labelText, inputEl.id, opts.required));
    group.appendChild(inputEl);
    if (opts.hint) group.appendChild(Dom.createElement('span', { class: 'form-hint', text: opts.hint }));
    return group;
  }
};
