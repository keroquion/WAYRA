/**
 * _patch_global_scanner_and_marca.js
 * 1. Remove "Marca" column from Orden de Compra (screen + PDF + Excel)
 * 2. Add global barcode listener to scanner-barras.js
 *    - Intercepts rapid keystrokes (scanner pistol) anywhere on the page
 *    - When Enter fires after scanner-speed input, focuses ingreso-codigo
 *      and triggers the scan callback automatically
 *    - Does NOT interfere with normal typing in inputs/textareas
 */
const fs   = require('fs');
const path = require('path');

// ── Part 1: Remove Marca from reportes.view.js ────────────────────────────────
const REP = path.join(__dirname, 'modulo-2-reportes', 'reportes.view.js');
let rep = fs.readFileSync(REP, 'utf8');

// Screen table header
rep = rep.replace(
  `              <th style="border:1px solid #ccc;padding:6px 8px">Marca</th>\n              <th style="border:1px solid #ccc;padding:6px 8px">Modelo</th>`,
  `              <th style="border:1px solid #ccc;padding:6px 8px">Modelo</th>`
);
// Screen table row
rep = rep.replace(
  `                <td style="border:1px solid #ccc;padding:5px 8px">\${f.eq.MARCA||'—'}</td>\n                <td style="border:1px solid #ccc;padding:5px 8px">\${f.eq.MODELO||'—'}</td>`,
  `                <td style="border:1px solid #ccc;padding:5px 8px">\${f.eq.MODELO||'—'}</td>`
);
// PDF header
rep = rep.replace(
  `            <th>Marca</th>\n            <th>Modelo</th>`,
  `            <th>Modelo</th>`
);
// PDF row
rep = rep.replace(
  `            <td>\${f.eq.MARCA||'—'}</td>\n            <td>\${f.eq.MODELO||'—'}</td>`,
  `            <td>\${f.eq.MODELO||'—'}</td>`
);
// Excel headers
rep = rep.replace(
  `    const headers = ['Lote','Código','Marca','Modelo','Serie','Repuesto a comprar','PN/Código','Fecha solicitud','□ Llegó','Fecha colocación','Técnico instalación'];`,
  `    const headers = ['Lote','Código','Modelo','Serie','Repuesto a comprar','PN/Código','Fecha solicitud','□ Llegó','Fecha colocación','Técnico instalación'];`
);
// Excel rows (remove MARCA push)
rep = rep.replace(
  `            eq.MARCA  || '',\n            eq.MODELO || '',`,
  `            eq.MODELO || '',`
);
// Excel column widths (11 → 10)
rep = rep.replace(
  `    ws['!cols'] = [14,10,10,18,16,20,16,14,8,14,18].map(w=>({wch:w}));`,
  `    ws['!cols'] = [14,10,18,16,20,16,14,8,14,18].map(w=>({wch:w}));`
);

fs.writeFileSync(REP, rep, 'utf8');
console.log('[1] Marca column removed from Orden de Compra (screen + PDF + Excel)');

// ── Part 2: Add global barcode listener to scanner-barras.js ─────────────────
const SCAN = path.join(__dirname, 'modulo-1-ingreso', 'scanner-barras.js');
let scan = fs.readFileSync(SCAN, 'utf8');

scan = scan.replace(
  `  return { init, setMode, toggleMode, getMode: () => _mode };`,
  `  // ── Global barcode listener ───────────────────────────────────────
  // Captures scanner pistol keystrokes even when ingreso-codigo is not focused.
  // Logic: scanner types very fast (<SCAN_SPEED_MS between chars) and ends with Enter.
  // If rapid burst + Enter detected and focus is NOT inside a regular input/textarea,
  // we redirect the captured code to ingreso-codigo and trigger the scan.
  let _globalBuffer = '';
  let _globalLastTime = 0;
  let _globalTimer = null;

  function _initGlobalListener() {
    document.addEventListener('keydown', (e) => {
      // Ignore if focus is on a normal input/textarea/select (user is typing intentionally)
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditableField = (tag === 'input' || tag === 'textarea' || tag === 'select')
        && document.activeElement.id !== _inputId; // allow our own scan field

      // If focus is on another input, don't intercept
      if (isEditableField) return;

      // Ignore modifier-only keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

      const now = Date.now();
      const delta = now - _globalLastTime;
      _globalLastTime = now;

      if (e.key === 'Enter') {
        if (_globalBuffer.length >= 3) {
          const code = _globalBuffer.trim();
          _globalBuffer = '';
          clearTimeout(_globalTimer);
          // Redirect to the scan input and trigger
          const input = document.getElementById(_inputId);
          if (input && _onScan) {
            input.value = code;
            _triggerScan(code, input);
          }
        } else {
          _globalBuffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (delta < 80 || _globalBuffer === '') {
          // Fast keystroke or buffer start → accumulate
          _globalBuffer += e.key;
          clearTimeout(_globalTimer);
          // Auto-clear buffer if no more keys for 300ms
          _globalTimer = setTimeout(() => { _globalBuffer = ''; }, 300);
        } else {
          // Too slow → manual typing, reset buffer
          _globalBuffer = e.key;
        }
      }
    });
    console.log('[ScannerBarras] Global barcode listener active');
  }

  _initGlobalListener();

  return { init, setMode, toggleMode, getMode: () => _mode };`
);

fs.writeFileSync(SCAN, scan, 'utf8');
console.log('[2] Global barcode listener added to scanner-barras.js');
console.log('[DONE]');
