/**
 * modulo-5-usuarios/auth-service.js — Inventario Pro v3
 * Servicio de Autenticación y Autorización para manejo multiusuario.
 */

const AuthService = (() => {
  const USERS = {
    'admin': { role: 'admin', pass: '1234' },
    'tecnico1': { role: 'tecnico', pass: '1234' },
    'tecnico2': { role: 'tecnico', pass: '1234' }
  };

  const SESSION_KEY = 'inv_pro_session_v3';

  let _currentUser = null;

  function init() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (USERS[data.username]) {
          _currentUser = { username: data.username, role: USERS[data.username].role };
        }
      }
    } catch (e) {
      console.warn('[AuthService] Error loading session:', e);
    }
  }

  function login(username, password) {
    return new Promise((resolve) => {
      // Simulate slight delay for realism
      setTimeout(() => {
        const usr = username.trim().toLowerCase();
        if (USERS[usr] && USERS[usr].pass === password) {
          _currentUser = { username: usr, role: USERS[usr].role };
          localStorage.setItem(SESSION_KEY, JSON.stringify(_currentUser));
          EventBus.emit('auth:login', _currentUser);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 300);
    });
  }

  function logout() {
    _currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    EventBus.emit('auth:logout');
    window.location.reload(); // Hard reload to clear all states
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
  // Admin: Sí a todo. Técnico: Solo si el lote no tiene owner (caso raro) o si él es el owner.
  function canEditLote(lote) {
    if (!lote) return false;
    if (isAdmin()) return true;
    if (_currentUser && _currentUser.role === 'tecnico') {
      // Si el lote no tiene owner, no se deja editar por técnico para proteger los antiguos no migrados.
      // (La migración los pondrá a nombre de 'admin')
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
