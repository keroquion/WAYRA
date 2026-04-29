/**
 * modulo-1-ingreso/scanner-barras.js
 * Toggle Auto / Manual.
 * Auto: detecta velocidad de keydown (>50ms entre chars = manual, <50ms = scanner).
 * Manual: campo normal con botón.
 */

const ScannerBarras = (() => {
  let _mode = 'auto'; // 'auto' | 'manual'
  let _buffer = '';
  let _lastKeyTime = 0;
  let _timer = null;
  let _onScan = null;
  let _inputId = null;

  const SCAN_SPEED_MS = 50;  // umbral: si el tiempo entre teclas < 50ms → es scanner
  const SCAN_TIMEOUT  = 100; // ms sin tecla para considerar código completo

  // ── Inicializar ──────────────────────────────────────────────────
  function init(inputId, onScan, mode = null) {
    _inputId = inputId;
    _onScan = onScan;
    _mode = mode || (APP_CONFIG.scannerAutoMode ? 'auto' : 'manual');
    _attach();
    _updateToggleUI();
  }

  // ── Adjuntar listeners ───────────────────────────────────────────
  function _attach() {
    const input = document.getElementById(_inputId);
    if (!input) return;

    // Siempre capturar Enter
    input.addEventListener('keydown', _onKeyDown);
  }

  function _onKeyDown(e) {
    const input = e.target;
    const now = Date.now();

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;

      if (_mode === 'auto') {
        // En auto: submit inmediato (scanner presiona Enter al final)
        _triggerScan(val, input);
      } else {
        // En manual: submit normal
        _triggerScan(val, input);
      }
      return;
    }

    // Detección de velocidad (solo en modo auto para posible feedback)
    if (_mode === 'auto') {
      const delta = now - _lastKeyTime;
      if (delta < SCAN_SPEED_MS && e.key.length === 1) {
        // Viene del scanner (rápido)
        input.style.borderColor = 'var(--info)';
      } else if (e.key.length === 1) {
        // Teclado manual
        input.style.borderColor = 'var(--border)';
      }
    }
    _lastKeyTime = now;
  }

  function _triggerScan(value, input) {
    if (navigator.vibrate) navigator.vibrate(80);
    input.value = '';
    input.style.borderColor = 'var(--success)';
    setTimeout(() => { input.style.borderColor = ''; }, 800);
    if (_onScan) _onScan(value);
  }

  // ── Cambiar modo ─────────────────────────────────────────────────
  function setMode(mode) {
    _mode = mode;
    APP_CONFIG.scannerAutoMode = mode === 'auto';
    _updateToggleUI();
    const input = document.getElementById(_inputId);
    if (input) {
      input.placeholder = mode === 'auto'
        ? 'Escanea el código (auto-submit)…'
        : 'Escribe el código y presiona Enter…';
      input.focus();
    }
  }

  function toggleMode() {
    setMode(_mode === 'auto' ? 'manual' : 'auto');
  }

  function _updateToggleUI() {
    const btnAuto   = document.getElementById('scan-btn-auto');
    const btnManual = document.getElementById('scan-btn-manual');
    if (btnAuto)   btnAuto.classList.toggle('active',   _mode === 'auto');
    if (btnManual) btnManual.classList.toggle('active', _mode === 'manual');
  }

  return { init, setMode, toggleMode, getMode: () => _mode };
})();

window.ScannerBarras = ScannerBarras;
