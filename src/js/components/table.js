/**
 * table.js — render tabel dari data array. Aman dari XSS (textContent + DOM builder).
 *
 * columns: [{ key, label, render?(row) -> Node|string, align?, className? }]
 * data: array of objects
 * options: { pageSize=10, emptyMessage, currentPage, onRowClick?(row) }
 */
const Table = {
  /**
   * Render tabel + pagination langsung ke container.
   * @param {HTMLElement} container
   * @param {Array} columns
   * @param {Array} data
   * @param {object} [options]
   */
  render(container, columns, data, options) {
    if (!container) return;
    Dom.clearChildren(container);
    options = options || {};
    const pageSize = options.pageSize || 10;
    const emptyMessage = options.emptyMessage || 'Tidak ada data.';

    if (!data || !data.length) {
      container.appendChild(this._renderEmpty(emptyMessage));
      return;
    }

    // State pagination
    this._state = this._state || {};
    const key = options.stateKey || container.id || 'default';
    let currentPage = this._state[key] || 1;
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);

    // Wrapper
    const wrapper = Dom.createElement('div', { class: 'table-container' });
    const table = Dom.createElement('table', { class: 'table' });

    // Header
    const thead = Dom.createElement('thead');
    const trh = Dom.createElement('tr');
    columns.forEach((col) => {
      const th = Dom.createElement('th', { text: col.label || '' });
      if (col.align) th.style.textAlign = col.align;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    // Body
    const tbody = Dom.createElement('tbody');
    pageData.forEach((row) => {
      const tr = Dom.createElement('tr');
      if (typeof options.onRowClick === 'function') {
        tr.classList.add('clickable-row');
        tr.addEventListener('click', () => options.onRowClick(row));
      }
      columns.forEach((col) => {
        const td = Dom.createElement('td');
        if (col.align) td.style.textAlign = col.align;
        if (col.className) td.className = col.className;
        let content;
        if (typeof col.render === 'function') {
          content = col.render(row);
        } else {
          const val = row[col.key];
          content = val == null || val === '' ? '-' : val;
        }
        this._appendCell(td, content);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    // Pagination
    if (data.length > pageSize) {
      const pg = Dom.createElement('div', { class: 'pagination' });
      pg.appendChild(Dom.createElement('span', {
        class: 'pagination-info',
        text: `Menampilkan ${start + 1}\u2013${Math.min(start + pageSize, data.length)} dari ${data.length}`
      }));
      const btns = Dom.createElement('div', { class: 'pagination-btns' });

      btns.appendChild(this._pageBtn('\u2039', currentPage <= 1, () => {
        this._state[key] = currentPage - 1;
        this.render(container, columns, data, options);
      }));

      // Nomor halaman (sederhana: max 7)
      const maxButtons = 7;
      let from = 1, to = totalPages;
      if (totalPages > maxButtons) {
        from = Math.max(1, currentPage - 3);
        to = Math.min(totalPages, from + maxButtons - 1);
        if (to - from < maxButtons - 1) from = Math.max(1, to - maxButtons + 1);
      }
      if (from > 1) {
        btns.appendChild(this._pageBtn('1', false, () => {
          this._state[key] = 1;
          this.render(container, columns, data, options);
        }));
        if (from > 2) btns.appendChild(Dom.createElement('span', { class: 'pagination-info', text: '\u2026' }));
      }
      for (let p = from; p <= to; p++) {
        const b = this._pageBtn(String(p), false, () => {
          this._state[key] = p;
          this.render(container, columns, data, options);
        });
        if (p === currentPage) b.classList.add('active');
        btns.appendChild(b);
      }
      if (to < totalPages) {
        if (to < totalPages - 1) btns.appendChild(Dom.createElement('span', { class: 'pagination-info', text: '\u2026' }));
        btns.appendChild(this._pageBtn(String(totalPages), false, () => {
          this._state[key] = totalPages;
          this.render(container, columns, data, options);
        }));
      }

      btns.appendChild(this._pageBtn('\u203a', currentPage >= totalPages, () => {
        this._state[key] = currentPage + 1;
        this.render(container, columns, data, options);
      }));
      pg.appendChild(btns);
      container.appendChild(pg);
    }
  },

  _pageBtn(label, disabled, onClick) {
    return Dom.createElement('button', {
      class: 'pagination-btn',
      type: 'button',
      text: label,
      disabled: disabled,
      onClick: onClick
    });
  },

  _appendCell(td, content) {
    if (content == null || content === false) {
      td.textContent = '-';
      return;
    }
    if (Array.isArray(content)) {
      content.forEach((c) => this._appendCell(td, c));
    } else if (content instanceof Node) {
      td.appendChild(content);
    } else {
      td.textContent = String(content);
    }
  },

  _renderEmpty(message) {
    return Dom.createElement('div', { class: 'empty-state' }, [
      Dom.createElement('p', { class: 'empty-state-text', text: message })
    ]);
  },

  /** Reset state pagination (mis. saat data/filter berubah). */
  resetPage() {
    this._state = {};
  },

  /** Render pagination standalone. */
  renderPagination(container, total, currentPage, pageSize, onPageChange) {
    if (!container) return;
    Dom.clearChildren(container);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    container.appendChild(Dom.createElement('span', {
      class: 'pagination-info',
      text: `Halaman ${currentPage} dari ${totalPages} (${total} data)`
    }));
    const btns = Dom.createElement('div', { class: 'pagination-btns' });
    btns.appendChild(this._pageBtn('\u2039', currentPage <= 1, () => onPageChange(currentPage - 1)));
    btns.appendChild(this._pageBtn('\u203a', currentPage >= totalPages, () => onPageChange(currentPage + 1)));
    container.appendChild(btns);
  }
};
