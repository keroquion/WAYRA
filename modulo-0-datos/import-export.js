/**
 * modulo-0-datos/import-export.js
 * Import: CSV
 * Export: CSV + XLSX (via SheetJS CDN)
 */

const ImportExport = (() => {

  // ── EXPORT CSV ───────────────────────────────────────────────────
  function exportCSV(rows, columns, filename = 'export') {
    const headers = columns.map(c => c.label).join(';');
    const lines = rows.map(r =>
      columns.map(c => `"${(r[c.key]||'').toString().replace(/"/g,'""')}"`).join(';')
    );
    const csv = '\uFEFF' + [headers, ...lines].join('\r\n'); // BOM para Excel
    _download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
    Toast.success('CSV exportado');
  }

  // ── EXPORT XLSX (usa SheetJS si disponible) ──────────────────────
  function exportXLSX(rows, columns, filename = 'export', sheetTitle = 'Datos') {
    if (typeof XLSX === 'undefined') {
      Toast.warning('SheetJS no cargado. Exportando CSV en su lugar.');
      exportCSV(rows, columns, filename);
      return;
    }
    const headers = columns.map(c => c.label);
    const data = rows.map(r => columns.map(c => r[c.key] || ''));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Estilos básicos de ancho de columna
    ws['!cols'] = columns.map(c => ({ wch: Math.min(Math.max(c.label.length + 4, 10), 40) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, `${filename}.xlsx`);
    Toast.success('Excel exportado');
  }

  // ── EXPORT LOTE ──────────────────────────────────────────────────
  async function exportLote(lote, format = 'csv') {
    if (!lote?.equipos?.length) { Toast.warning('Lote vacío'); return; }
    const cols = [
      ...APP_CONFIG.columns,
      { key: '_obsPersonal', label: 'Mi Obs.' },
      { key: '_timestamp',   label: 'Hora Registro' },
    ];
    const filename = `lote-${lote.titulo.replace(/\s+/g, '-')}-${Date.now()}`;
    if (format === 'xlsx') exportXLSX(lote.equipos, cols, filename, lote.titulo);
    else                   exportCSV(lote.equipos, cols, filename);
  }

  // ── EXPORT INVENTARIO COMPLETO ───────────────────────────────────
  function exportInventario(rows, format = 'csv') {
    const filename = `inventario-completo-${Date.now()}`;
    if (format === 'xlsx') exportXLSX(rows, APP_CONFIG.columns, filename, 'Inventario');
    else                   exportCSV(rows, APP_CONFIG.columns, filename);
  }

  // ── IMPORT CSV ───────────────────────────────────────────────────
  function importCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) { reject(new Error('CSV vacío')); return; }

          // Detectar separador
          const sep = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g,'').trim());

          const rows = lines.slice(1).map(line => {
            const vals = _parseLine(line, sep);
            const obj = {};
            headers.forEach((h, i) => {
              const key = h.replace(/[.\s/]/g,'_').toUpperCase();
              obj[key] = (vals[i]||'').replace(/^"|"$/g,'').trim();
            });
            return obj;
          });

          resolve({ headers, rows, count: rows.length });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  function _parseLine(line, sep) {
    const result = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === sep && !inQ) { result.push(cur); cur = ''; }
      else { cur += c; }
    }
    result.push(cur);
    return result;
  }

  // ── IMPORT XLSX ──────────────────────────────────────────────────
  function importXLSX(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') { reject(new Error('SheetJS no disponible')); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve({ rows, count: rows.length });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Error al leer Excel'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Helper descarga ──────────────────────────────────────────────
  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  return { exportCSV, exportXLSX, exportLote, exportInventario, importCSV, importXLSX };
})();

window.ImportExport = ImportExport;
