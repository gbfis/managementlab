/**
 * dom.js — helper DOM yang aman dari XSS.
 * TIDAK ADA innerHTML dengan data user di file ini.
 * Semua pembuatan elemen memakai createElement + textContent + appendChild.
 */
const Dom = {
  qs(selector, parent) {
    return (parent || document).querySelector(selector);
  },

  qsa(selector, parent) {
    return [...(parent || document).querySelectorAll(selector)];
  },

  setText(el, text) {
    if (el) el.textContent = text == null ? '' : String(text);
  },

  setAttr(el, attr, val) {
    if (el) el.setAttribute(attr, val);
  },

  show(el) {
    if (el) el.hidden = false;
  },

  hide(el) {
    if (el) el.hidden = true;
  },

  toggle(el, show) {
    if (!el) return;
    el.hidden = show === undefined ? el.hidden : !show;
  },

  addClass(el, cls) {
    if (el) el.classList.add(cls);
  },

  removeClass(el, cls) {
    if (el) el.classList.remove(cls);
  },

  toggleClass(el, cls, force) {
    if (el) el.classList.toggle(cls, force);
  },

  /**
   * Buat elemen DOM secara aman.
   * @param {string} tag - nama tag
   * @param {object} [attrs] - atribut. khusus: 'class', 'text', 'dataset', event 'onClick' dll.
   * @param {Node|string|number|Array} [children] - anak elemen (node, string, number, atau array)
   * @returns {HTMLElement}
   */
  createElement(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        const value = attrs[key];
        if (value == null || value === false) continue;
        if (key === 'class') {
          el.className = value;
        } else if (key === 'text') {
          el.textContent = String(value);
        } else if (key === 'dataset') {
          for (const dk in value) el.dataset[dk] = value[dk];
        } else if (key === 'style' && typeof value === 'object') {
          for (const sk in value) el.style[sk] = value[sk];
        } else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
          el.setAttribute(key, '');
        } else {
          el.setAttribute(key, String(value));
        }
      }
    }
    this._appendChildren(el, children);
    return el;
  },

  _appendChildren(el, children) {
    if (children == null) return;
    const list = Array.isArray(children) ? children : [children];
    list.forEach((child) => {
      if (child == null || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
  },

  /** Hapus semua anak elemen. */
  clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  },

  /** Alias clearChildren. */
  empty(el) {
    this.clearChildren(el);
  }
};
