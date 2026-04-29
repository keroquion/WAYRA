/**
 * modulo-3-admin/pin-auth.js
 * PIN de 4 dígitos con SHA-256.
 * Sesión de 30 minutos. PIN por defecto: 1234.
 */

const PinAuth = (() => {
  const SESSION_KEY = 'inv-admin-session';
  const PIN_KEY     = 'inv-admin-pin';

  let _sessionExpiry = 0;

  // ── Verificar si sesión activa ───────────────────────────────────
  function isAuthenticated() {
    return Date.now() < _sessionExpiry;
  }

  // ── Iniciar sesión (llamado tras PIN correcto) ───────────────────
  function _startSession() {
    _sessionExpiry = Date.now() + (APP_CONFIG.admin.sessionMinutes * 60000);
    sessionStorage.setItem(SESSION_KEY, _sessionExpiry.toString());
  }

  // ── Restaurar sesión previa ──────────────────────────────────────
  function init() {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) _sessionExpiry = parseInt(saved) || 0;
  }

  // ── Hash PIN ─────────────────────────────────────────────────────
  async function hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // ── Obtener hash guardado ────────────────────────────────────────
  async function getSavedHash() {
    let h = await LocalCache.getConfig(PIN_KEY);
    if (!h) {
      // Primera vez: guardar PIN por defecto 1234
      h = await hashPin(APP_CONFIG.admin.defaultPin);
      await LocalCache.setConfig(PIN_KEY, h);
    }
    return h;
  }

  // ── Cambiar PIN ──────────────────────────────────────────────────
  async function changePin(newPin) {
    const err = Validators.pin(newPin);
    if (err) throw new Error(err);
    const h = await hashPin(newPin);
    await LocalCache.setConfig(PIN_KEY, h);
    Toast.success('PIN actualizado');
  }

  // ── Mostrar teclado PIN y resolver promesa al autenticar ─────────
  function requestPin(onSuccess, onCancel = null) {
    if (isAuthenticated()) { onSuccess(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'pin-overlay';
    overlay.id = 'pin-overlay';

    let _entered = '';

    const render = (shake = false, errMsg = '') => {
      overlay.innerHTML = `
        <div class="pin-card ${shake ? 'shake' : ''}">
          <div style="font-size:1.8rem;margin-bottom:8px">🔐</div>
          <div style="font-weight:700;font-size:1rem;margin-bottom:4px">Acceso Administrador</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:4px">Ingresa el PIN de 4 dígitos</div>
          ${errMsg ? `<div style="color:var(--danger);font-size:0.75rem;margin-bottom:4px">${errMsg}</div>` : ''}
          <div class="pin-dots">
            ${[0,1,2,3].map(i=>`<div class="pin-dot ${i<_entered.length?'filled':''} ${shake&&_entered.length?'error':''}"></div>`).join('')}
          </div>
          <div class="pin-keypad">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>`
              <button class="pin-key ${k===''?'pin-key-empty':''}" ${k===''?'disabled':''} onclick="_pinKeyPress('${k}')">${k}</button>
            `).join('')}
          </div>
          ${onCancel ? `<button onclick="_pinCancel()" style="margin-top:12px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.78rem">Cancelar</button>` : ''}
        </div>
        <style>@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}</style>
      `;
    };

    window._pinKeyPress = async (k) => {
      if (k === '⌫') { _entered = _entered.slice(0,-1); render(); return; }
      if (k === '' || _entered.length >= 4) return;
      _entered += k;
      render();

      if (_entered.length === 4) {
        const saved = await getSavedHash();
        const typed = await hashPin(_entered);
        if (typed === saved) {
          _startSession();
          overlay.remove();
          onSuccess();
        } else {
          const prev = _entered;
          _entered = '';
          render(true, 'PIN incorrecto');
          setTimeout(() => render(), 700);
        }
      }
    };

    window._pinCancel = () => { overlay.remove(); if(onCancel) onCancel(); };

    document.body.appendChild(overlay);
    render();
  }

  // ── Cerrar sesión ────────────────────────────────────────────────
  function logout() {
    _sessionExpiry = 0;
    sessionStorage.removeItem(SESSION_KEY);
  }

  return { init, isAuthenticated, requestPin, changePin, logout, hashPin };
})();

window.PinAuth = PinAuth;
