/**
 * Config.gs
 * Mengambil konfigurasi dari sheet 'config' dan PropertiesService.
 */

/**
 * Ambil nilai konfigurasi dari sheet 'config'.
 * Hasil di-cache 10 menit agar tidak terlalu sering baca sheet.
 * @param {string} key
 * @returns {string|null}
 */
function getConfig(key) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'cfg_' + key;
  const cached = cache.get(cacheKey);
  if (cached !== null) return cached;

  const rows = getAllRows('config');
  const entry = rows.find(r => r.key === key);
  const value = entry ? String(entry.value) : null;

  if (value !== null) {
    cache.put(cacheKey, value, 600); // 10 menit
  }
  return value;
}

/**
 * Ambil secret dari PropertiesService (tidak pernah dari sheet).
 * @param {string} key
 * @returns {string|null}
 */
function getSecret(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Return SpreadsheetApp.getActiveSpreadsheet()
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
