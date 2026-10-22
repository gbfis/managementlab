/**
 * Database.gs
 * Helper CRUD generik untuk Google Sheets.
 * Semua penulisan string melewati sanitizeForSheet().
 */

/**
 * Ambil sheet berdasarkan nama, throw NOT_FOUND jika tidak ada.
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw { code: 'NOT_FOUND', message: `Sheet '${sheetName}' tidak ditemukan` };
  }
  return sheet;
}

/**
 * Ambil array header dari baris pertama sheet.
 * @param {string} sheetName
 * @returns {string[]}
 */
function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  return data[0].map(h => String(h).trim());
}

/**
 * Konversi nilai dari sheet ke format yang lebih mudah digunakan.
 * Date objects dikonversi ke ISO string.
 * @param {*} value
 * @returns {*}
 */
function convertSheetValue(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? '' : value.toISOString();
  }
  return value;
}

/**
 * Konversi array data baris menjadi object {header: value}.
 * @param {string[]} headers
 * @param {Array} row
 * @returns {object}
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = convertSheetValue(row[i] !== undefined ? row[i] : '');
  });
  return obj;
}

/**
 * Ambil semua baris sebagai array of objects (skip header row, skip baris kosong).
 * @param {string} sheetName
 * @returns {object[]}
 */
function getAllRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Skip baris yang benar-benar kosong
    const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
    if (!hasData) continue;
    results.push(rowToObject(headers, row));
  }
  return results;
}

/**
 * Append data baru ke sheet sebagai baris baru.
 * Semua nilai string di-sanitize sebelum ditulis.
 * @param {string} sheetName
 * @param {object} rowData - object dengan key = nama kolom
 * @returns {number} rowIndex (1-indexed, termasuk header)
 */
function appendRow(sheetName, rowData) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);

  const rowArray = headers.map(h => {
    const val = rowData[h] !== undefined ? rowData[h] : '';
    return sanitizeForSheet(val);
  });

  sheet.appendRow(rowArray);
  return sheet.getLastRow();
}

/**
 * Cari baris pertama yang memiliki nilai tertentu di kolom tertentu (0-indexed).
 * @param {string} sheetName
 * @param {number} colIndex - 0-indexed
 * @param {*} value
 * @returns {{rowIndex: number, data: object}|null}
 */
function findRow(sheetName, colIndex, value) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0].map(h => String(h).trim());

  for (let i = 1; i < data.length; i++) {
    const cellVal = convertSheetValue(data[i][colIndex]);
    if (String(cellVal) === String(value)) {
      return {
        rowIndex: i + 1, // 1-indexed untuk Sheet API
        data: rowToObject(headers, data[i])
      };
    }
  }
  return null;
}

/**
 * Cari semua baris yang cocok dengan object filters.
 * filters: { namaKolom: nilaiYangDicari }
 * @param {string} sheetName
 * @param {object} filters
 * @returns {object[]}
 */
function findRows(sheetName, filters) {
  const rows = getAllRows(sheetName);
  if (!filters || Object.keys(filters).length === 0) return rows;

  return rows.filter(row => {
    return Object.entries(filters).every(([key, val]) => {
      if (val === null || val === undefined) return true; // skip filter kosong
      return String(row[key]) === String(val);
    });
  });
}

/**
 * Update kolom-kolom tertentu pada baris tertentu (rowIndex 1-indexed).
 * updates: { namaKolom: nilaiBar }
 * @param {string} sheetName
 * @param {number} rowIndex - 1-indexed (termasuk header, jadi baris data mulai dari 2)
 * @param {object} updates
 */
function updateRow(sheetName, rowIndex, updates) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);

  Object.entries(updates).forEach(([colName, value]) => {
    const colIndex = headers.indexOf(colName);
    if (colIndex === -1) return; // kolom tidak ditemukan, skip
    const sanitized = sanitizeForSheet(value);
    sheet.getRange(rowIndex, colIndex + 1).setValue(sanitized);
  });
}

/**
 * Cari baris berdasarkan id (kolom 'id'), return {rowIndex, data} atau null.
 * @param {string} sheetName
 * @param {string} id
 * @returns {{rowIndex: number, data: object}|null}
 */
function findRowById(sheetName, id) {
  const headers = getHeaders(sheetName);
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) return null;
  return findRow(sheetName, idColIndex, id);
}
