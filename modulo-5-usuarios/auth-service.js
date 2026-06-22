/**
 * modulo-5-usuarios/auth-service.js
 * Integración real con Supabase Auth.
 */

const AuthService = (() => {
  const SESSION_KEY = 'sb_auth_session_v4';
  let _currentUser = null;

  function init() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        _currentUser = JSON.parse(stored);
      }
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async function login(username, password) {
    const usr = username.trim().toLowerCase();
    const email = usr.includes('@') ? usr : `${usr}@wayra.com`;

    if (!APP_CONFIG.supabase.url || !APP_CONFIG.supabase.anonKey) {
      throw new Error('Supabase no está configurado');
    }

    const res = await fetch(`${APP_CONFIG.supabase.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': APP_CONFIG.supabase.anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error_description || errorData.msg || 'Usuario o contraseña incorrectos');
    }

    const data = await res.json();
    const role = usr.includes('admin') ? 'admin' : 'tecnico';
    
    _currentUser = { 
      username: usr, 
      role: role, 
      access_token: data.access_token 
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(_currentUser));
    if (typeof EventBus !== 'undefined') EventBus.emit('auth:login', _currentUser);
    return true;
  }

  function logout() {
    _currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    if (typeof EventBus !== 'undefined') EventBus.emit('auth:logout');
    window.location.reload(); 
  }

  function getUsuarioActual() { return _currentUser; }
  function isLoggedIn() { return _currentUser !== null; }
  function isAdmin() { return _currentUser && _currentUser.role === 'admin'; }

  function canEditLote(lote) {
    if (!lote) return false;
    if (isAdmin()) return true;
    if (_currentUser && _currentUser.role === 'tecnico') {
      return lote._ownerId === _currentUser.username;
    }
    return false;
  }

  init();

  return { login, logout, getUsuarioActual, isLoggedIn, isAdmin, canEditLote };
})();

window.AuthService = AuthService;
