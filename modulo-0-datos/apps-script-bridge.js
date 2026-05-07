/**
 * modulo-0-datos/apps-script-bridge.js
 * Capa de comunicación con Google Apps Script Web App.
 * Soporta: readSheet, writeRow, updateRow, deleteRow, uploadToDrive
 */

const AppsScriptBridge = (() => {
  let _url = '';
  let _status = 'disconnected';

  function init(url) {
    _url = url || APP_CONFIG.appsScript.webAppUrl || '';
  }

  async function _call(action, payload = {}, retries = 3) {
    if (!_url) throw new Error('Apps Script URL no configurada. Ve a ⚙️ Configuración.');

    const body = JSON.stringify({ action, ...payload });
    let lastErr;

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APP_CONFIG.appsScript.timeoutMs);
        const res = await fetch(_url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // Apps Script requiere text/plain para CORS
          body,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        _status = 'connected';
        _updateSyncChip();
        return json;
      } catch (err) {
        lastErr = err;
        if (i < retries - 1) await _sleep(1000 * (i + 1));
      }
    }
    _status = 'error';
    _updateSyncChip();
    throw lastErr;
  }

  // ── Operaciones ──────────────────────────────────────────────────

  async function getRowCount(sheetName) {
    return _call('getRowCount', { sheetName });
  }

  async function readSheet(sheetName, range = '') {
    return _call('readSheet', { sheetName, range });
  }

  async function writeRow(sheetName, rowData) {
    return _call('writeRow', { sheetName, rowData });
  }

  async function updateRow(sheetName, rowIndex, rowData) {
    return _call('updateRow', { sheetName, rowIndex, rowData });
  }

  async function deleteRow(sheetName, rowIndex) {
    return _call('deleteRow', { sheetName, rowIndex });
  }

  async function uploadToDrive(base64, filename, mimeType = 'image/jpeg', loteNombre = '') {
    return _call('uploadToDrive', { base64, filename, mimeType, loteNombre });
  }

  async function appendAudit(auditRow) {
    return _call('appendAudit', { auditRow });
  }

  // ── Test conexión y Drive ────────────────────────────────────────
  async function testConnection() {
    return _call('ping', {}, 1);
  }

  async function testDrive() {
    return _call('testDrive', {}, 1);
  }

  // ── Chip de sync ──────────────────────────────────────────────────
  function _updateSyncChip() {
    const chip = document.getElementById('sync-chip');
    if (!chip) return;
    chip.className = 'sync-chip ' + _status;
    const labels = { connected:'Sync OK', disconnected:'Sin Apps Script', connecting:'Sincronizando…', error:'Error sync', pending:'Pendiente sync' };
    chip.innerHTML = `<span class="dot"></span>${labels[_status]||_status}`;
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Lotes persistence ─────────────────────────────────────────────
  async function saveLotes(lotes) {
    return _call('saveLotes', { lotes }, 2);
  }

  async function loadLotes() {
    return _call('loadLotes', {}, 2);
  }

  async function geminiOCR(base64, mimeType) {
    return _call('geminiOCR', { base64, mimeType }, 1);
  }

  async function saveSoporte(ticket) {
    return _call('saveSoporte', { ticket }, 2);
  }

  return {
    init, getRowCount, readSheet, writeRow, updateRow, deleteRow,
    uploadToDrive, appendAudit, testConnection, testDrive, saveLotes, loadLotes,
    geminiOCR, saveSoporte,
    getStatus: () => _status,
    setUrl: (u) => { _url = u; APP_CONFIG.appsScript.webAppUrl = u; },
  };
})();

window.AppsScriptBridge = AppsScriptBridge;
