/**
 * modulo-5-usuarios/auth-service.js — Inventario Pro v3
 * Servicio de Autenticación y Autorización para manejo multiusuario.
 * 
 * Mejoras v3.1: Hashing SHA-256, expiración de sesión (12h), ofuscación local,
 * y protección de fuerza bruta (lockout de 5 mins).
 */

const AuthService = (() => {
  // Passwords hasheadas con SHA-256 (Hash de "1234" = 03ac6742...)
  const USERS = {
    'admin': { role: 'admin', hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
    'tecnico1': { role: 'tecnico', hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
    'tecnico2': { role: 'tecnico', hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' }
  };

  const SESSION_KEY = 'inv_pro_session_v3_secure';
  const LOCK_KEY = 'inv_pro_login_attempts';
  const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 horas de validez
  const MAX_ATTEMPTS = 3;
  const LOCK_TIME = 5 * 60 * 1000; // 5 minutos

  let _currentUser = null;

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function _encodeSession(data) {
    const str = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(str)));
  }

  function _decodeSession(token) {
    try {
      const str = decodeURIComponent(escape(atob(token)));
      return JSON.parse(str);
    } catch { return null; }
  }

  function _checkLockout() {
    const lock = JSON.parse(localStorage.getItem(LOCK_KEY) || '{"attempts":0,"lockedUntil":0}');
    if (Date.now() < lock.lockedUntil) {
      return Math.ceil((lock.lockedUntil - Date.now()) / 60000); // minutos restantes
    }
    return 0; // No bloqueado
  }

  function _recordAttempt(success) {
    let lock = JSON.parse(localStorage.getItem(LOCK_KEY) || '{"attempts":0,"lockedUntil":0}');
    if (success) {
      localStorage.removeItem(LOCK_KEY);
      return;
    }
    lock.attempts += 1;
    if (lock.attempts >= MAX_ATTEMPTS) {
      lock.lockedUntil = Date.now() + LOCK_TIME;
      lock.attempts = 0;
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  }

  function init() {
    try {
      // Limpiar sesión anterior obsoleta en texto claro si existe
      localStorage.removeItem('inv_pro_session_v3'); 

      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const data = _decodeSession(stored);
        if (data && data.expires > Date.now() && USERS[data.username] && USERS[data.username].role === data.role) {
          _currentUser = { username: data.username, role: data.role };
        } else {
          // Sesión expirada o manipulada
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {
      console.warn('[AuthService] Error al cargar la sesión segura:', e);
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async function login(username, password) {
    // Simulamos un pequeño delay para disuadir ataques automatizados y feedback visual
    await new Promise(r => setTimeout(r, 400));

    const lockoutMins = _checkLockout();
    if (lockoutMins > 0) {
      throw new Error(`Demasiados intentos. Cuenta bloqueada temporalmente. Intenta en ${lockoutMins} minuto(s).`);
    }

    const usr = username.trim().toLowerCase();
    const inputHash = await sha256(password);

    if (USERS[usr] && USERS[usr].hash === inputHash) {
      _currentUser = { username: usr, role: USERS[usr].role };
      const sessionData = {
        username: usr,
        role: USERS[usr].role,
        expires: Date.now() + SESSION_TTL
      };
      localStorage.setItem(SESSION_KEY, _encodeSession(sessionData));
      _recordAttempt(true);
      if (typeof EventBus !== 'undefined') EventBus.emit('auth:login', _currentUser);
      return true;
    } else {
      _recordAttempt(false);
      return false;
    }
  }

  function logout() {
    _currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    if (typeof EventBus !== 'undefined') EventBus.emit('auth:logout');
    window.location.reload(); // Hard reload para limpiar estados en memoria
  }

  function getUsuarioActual() {
    return _currentUser;
  }

  function isLoggedIn() {
    return _currentUser !== null;
  }

  function isAdmin() {
    return _currentUser && _currentUser.role === 'admin';
  }

  // Permisos: ¿Puede este usuario editar/eliminar un lote?
  function canEditLote(lote) {
    if (!lote) return false;
    if (isAdmin()) return true;
    if (_currentUser && _currentUser.role === 'tecnico') {
      return lote._ownerId === _currentUser.username;
    }
    return false;
  }

  // Inicializar al cargar el script
  init();

  return {
    login,
    logout,
    getUsuarioActual,
    isLoggedIn,
    isAdmin,
    canEditLote
  };
})();

window.AuthService = AuthService;
