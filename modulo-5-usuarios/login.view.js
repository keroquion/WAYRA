/**
 * modulo-5-usuarios/login.view.js — Inventario Pro v3
 * Vista de Login que bloquea la app hasta autenticarse.
 */

const LoginView = (() => {

  function render() {
    if (AuthService.isLoggedIn()) return; // Ya está logueado

    const el = document.createElement('div');
    el.id = 'login-overlay';
    el.style.position = 'fixed';
    el.style.top = '0'; el.style.left = '0'; el.style.width = '100vw'; el.style.height = '100vh';
    el.style.backgroundColor = 'var(--bg-body)';
    el.style.zIndex = '9999';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.padding = '20px';

    el.innerHTML = `
      <div class="card" style="width:100%;max-width:400px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,0.1)">
        <div style="text-align:center;margin-bottom:24px">
          <h2 style="margin:0;color:var(--text-primary);font-size:1.8rem">Inventario Pro</h2>
          <p style="margin:5px 0 0 0;color:var(--text-muted);font-size:0.9rem">Acceso Restringido</p>
        </div>

        <form id="login-form" onsubmit="event.preventDefault(); LoginView.doLogin()">
          <div style="margin-bottom:15px">
            <label class="form-label">Usuario</label>
            <input type="text" id="login-user" class="form-control" placeholder="Ej: admin o tecnico1" required autocomplete="username">
          </div>
          <div style="margin-bottom:24px">
            <label class="form-label">Contraseña</label>
            <input type="password" id="login-pass" class="form-control" placeholder="••••" required autocomplete="current-password">
          </div>
          
          <button type="submit" id="login-btn" class="btn btn-primary" style="width:100%;padding:12px;font-size:1rem">
            Iniciar Sesión
          </button>
        </form>

        <div style="margin-top:20px;text-align:center;font-size:0.75rem;color:var(--text-muted)">
          Versión Multi-Usuario
        </div>
      </div>
    `;

    document.body.appendChild(el);
    setTimeout(() => document.getElementById('login-user').focus(), 100);
  }

  async function doLogin() {
    const usr = document.getElementById('login-user').value;
    const pwd = document.getElementById('login-pass').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span> Verificando...';

    const success = await AuthService.login(usr, pwd);

    if (success) {
      const overlay = document.getElementById('login-overlay');
      if (overlay) overlay.remove();
      Toast.success(\`¡Bienvenido, \${AuthService.getUsuarioActual().username}!\`);
      // Emit events or direct init
      if (window.App) {
        window.App.init(); // Re-iniciar la app
      } else {
        window.location.reload();
      }
    } else {
      btn.disabled = false;
      btn.innerHTML = 'Iniciar Sesión';
      Toast.error('Credenciales incorrectas');
    }
  }

  function renderUserInfo() {
    const container = document.getElementById('user-info-container');
    if (!container) return;

    if (!AuthService.isLoggedIn()) {
      container.innerHTML = '';
      return;
    }

    const usr = AuthService.getUsuarioActual();
    const roleLabel = usr.role === 'admin' ? '🛡️ Admin' : '👨‍🔧 Técnico';

    container.innerHTML = \`
      <div style="display:flex;align-items:center;gap:10px;background:var(--bg-hover);padding:4px 12px;border-radius:20px;border:1px solid var(--border)">
        <div style="font-size:0.85rem">
          <strong>\${usr.username}</strong>
          <span style="color:var(--text-muted);font-size:0.75rem;margin-left:4px">(\${roleLabel})</span>
        </div>
        <button onclick="AuthService.logout()" class="btn btn-secondary btn-sm" style="padding:2px 8px;font-size:0.75rem;background:none;border-color:transparent" title="Cerrar sesión">
          🚪 Salir
        </button>
      </div>
    \`;
  }

  return {
    render,
    doLogin,
    renderUserInfo
  };
})();

window.LoginView = LoginView;
