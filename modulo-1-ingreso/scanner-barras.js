/**
 * modulo-1-ingreso/scanner-barras.js
 * Toggle Auto / Manual.
 * Auto: detecta velocidad de keydown (>50ms entre chars = manual, <50ms = scanner).
 * Manual: campo normal con botón.
 *
 * v2.2: Scanner Global — captura pistoleo en cualquier parte de la página
 * cuando la vista activa es Ingreso y el foco NO está en un campo editable.
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

  // ── Scanner Global (pistoleo libre) ──────────────────────────────────
  let _globalBuffer = '';
  let _globalLastKeyTime = 0;
  let _globalTimer = null;
  let _globalActive = false; // true solo cuando estamos en la vista de ingreso

  /**
   * Activa/desactiva el listener global.
   * Llamar con true al entrar a la vista de ingreso, false al salir.
   */
  function setGlobalActive(active) {
    _globalActive = active;
    if (!active) {
      _globalBuffer = '';
      clearTimeout(_globalTimer);
    }
  }

  /**
   * Listener global de keydown a nivel de document.
   * Solo actúa si:
   *   1. _globalActive === true (estamos en vista ingreso)
   *   2. El foco NO está en un input, textarea, select o elemento editable
   *   3. No se está presionando una tecla modificadora sola (Ctrl, Alt, Meta)
   */
  function _onGlobalKeyDown(e) {
    if (!_globalActive) return;

    // Si el foco está en un campo editable, ignorar
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' ||
      document.activeElement?.isContentEditable;
    if (isEditable) return;

    // Ignorar teclas modificadoras solas, teclas especiales que no aportan carácter
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length > 1 && e.key !== 'Enter') return;

    const now = Date.now();

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = _globalBuffer.trim();
      _globalBuffer = '';
      clearTimeout(_globalTimer);

      if (!val) return;

      // Inyectar al campo de código y disparar el scan
      const input = document.getElementById(_inputId);
      if (input) {
        input.value = val;
        input.focus();
        // Mostrar indicador visual brevemente
        _showGlobalScanIndicator(val);
        // Disparar el scan
        if (_onScan) _onScan(val);
        setTimeout(() => { if (input) input.value = ''; }, 200);
      } else if (_onScan) {
        // Si no hay campo visible, disparar directo
        _onScan(val);
      }
      return;
    }

    // Acumular carácter
    const delta = now - _globalLastKeyTime;
    if (_globalBuffer.length === 0 || delta < SCAN_SPEED_MS * 3) {
      // Primera tecla o viene rápido (scanner) → acumular
      _globalBuffer += e.key;
      e.preventDefault(); // evitar que el carácter aparezca en la página
    } else {
      // Demasiado lento → es teclado manual, descartamos y empezamos de nuevo
      // Enfocar el campo de código para que el usuario escriba ahí
      const input = document.getElementById(_inputId);
      if (input) { input.focus(); input.value = _globalBuffer + e.key; }
      _globalBuffer = '';
    }

    _globalLastKeyTime = now;

    // Timer de timeout: si no llega Enter ni más teclas, intentar procesar
    clearTimeout(_globalTimer);
    _globalTimer = setTimeout(() => {
      const val = _globalBuffer.trim();
      _globalBuffer = '';
      if (!val) return;
      // Si llegó texto sin Enter (algunos scanners no envían Enter), procesar igual
      const input = document.getElementById(_inputId);
      if (input) {
        input.value = val;
        input.focus();
        _showGlobalScanIndicator(val);
        if (_onScan) _onScan(val);
        setTimeout(() => { if (input) input.value = ''; }, 200);
      }
    }, SCAN_TIMEOUT + 150);
  }

  /**
   * Muestra un indicador visual flotante cuando se detecta un pistoleo global.
   */
  function _showGlobalScanIndicator(codigo) {
    let badge = document.getElementById('global-scan-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'global-scan-badge';
      badge.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: var(--accent, #7c3aed); color: #fff;
        border-radius: 24px; padding: 10px 20px;
        font-size: 0.85rem; font-weight: 700;
        box-shadow: 0 4px 20px rgba(124,58,237,0.5);
        display: flex; align-items: center; gap: 8px;
        animation: scanPulse 0.3s ease;
        pointer-events: none;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(badge);
      // Animación CSS
      if (!document.getElementById('scan-badge-style')) {
        const style = document.createElement('style');
        style.id = 'scan-badge-style';
        style.textContent = `
          @keyframes scanPulse {
            from { transform: scale(0.8) translateY(10px); opacity: 0; }
            to   { transform: scale(1) translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    badge.innerHTML = `🔫 <span>${codigo}</span>`;
    badge.style.opacity = '1';
    clearTimeout(badge._hideTimer);
    badge._hideTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1200);
  }

  // Adjuntar el listener global una sola vez
  document.addEventListener('keydown', _onGlobalKeyDown);

  // ── Inicializar ──────────────────────────────────────────────────
  function init(inputId, onScan, mode = null) {
    _inputId = inputId;
    _onScan = onScan;
    _mode = mode || (APP_CONFIG.scannerAutoMode ? 'auto' : 'manual');
    _attach();
    _updateToggleUI();
  }

  // ── Adjuntar listeners al campo ───────────────────────────────────────────
  function _attach() {
    const input = document.getElementById(_inputId);
    if (!input) return;
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
        _triggerScan(val, input);
      } else {
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

  return { init, setMode, toggleMode, getMode: () => _mode, setGlobalActive };
})();

window.ScannerBarras = ScannerBarras;
