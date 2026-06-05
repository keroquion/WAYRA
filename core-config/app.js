/**
 * core-config/app.js — Router y bootstrap v2.0.0
 */

const Views = (() => {
  const VIEWS = {
    ingreso:     { el: 'view-ingreso',     render: () => IngresoView.render(),    nav: 'nav-ingreso'     },
    historial:   { el: 'view-historial',   render: () => HistorialView.render(),  nav: 'nav-historial'   },
    inventario:  { el: 'view-inventario',  render: () => InventarioView.render(), nav: 'nav-inventario'  },
    escaner:     { el: 'view-escaner',     render: () => EscanerView.render(),    nav: 'nav-escaner'     },
    reportes:    { el: 'view-reportes',    render: () => ReportesView.render(),   nav: 'nav-reportes'    },
    admin:       { el: 'view-admin',       render: () => AdminView.render(),      nav: 'nav-admin'       },
  };

  let _current = null;

  function go(viewName) {
    const view = VIEWS[viewName];
    if (!view) return;

    // Notificar a la vista saliente (desactiva scanner global si salimos de ingreso)
    if (_current && _current !== viewName) {
      if (_current === 'ingreso' && window.IngresoView?.onLeave) {
        IngresoView.onLeave();
      }
      if (_current === 'escaner' && window.EscanerView?.onLeave) {
        EscanerView.onLeave();
      }
    }

    Object.values(VIEWS).forEach(v => {
      document.getElementById(v.el)?.classList.remove('active');
      document.getElementById(v.nav)?.classList.remove('active');
    });
    document.getElementById(view.el)?.classList.add('active');
    document.getElementById(view.nav)?.classList.add('active');
    _current = viewName;
    view.render();
    history.replaceState(null, '', '#' + viewName);

    // ── Bottom nav sync ──
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // ── Cerrar sidebar en móvil ──
    _closeSidebar();
  }

  function init() {
    const hash = location.hash.replace('#','') || 'historial';
    go(VIEWS[hash] ? hash : 'historial');
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#','') || 'historial';
      if (h !== _current && VIEWS[h]) go(h);
    });
  }

  // ── Sidebar móvil y escritorio ──
  function _openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('active');
  }

  function _closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  function toggleSidebar() {
    if (window.innerWidth > 768) {
      const shell = document.getElementById('app-shell');
      if (shell) {
        shell.classList.toggle('sidebar-collapsed');
        const isCollapsed = shell.classList.contains('sidebar-collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
      }
    } else {
      const sidebar = document.getElementById('sidebar');
      if (sidebar?.classList.contains('open')) _closeSidebar();
      else _openSidebar();
    }
  }

  return { go, init, getCurrent: () => _current, toggleSidebar };
})();

// ── Verificación de versión (auto-update en todos los dispositivos) ──────────
async function _checkAppVersion() {
  try {
    // Fetch con no-store para NUNCA usar caché del navegador
    const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const { version, notes } = await res.json();
    const storedVersion = localStorage.getItem('inv-pro-app-version');

    if (storedVersion && storedVersion !== version) {
      console.log(`[App] 🔄 Nueva versión detectada: ${storedVersion} → ${version}`);
      localStorage.setItem('inv-pro-app-version', version);
      // Limpiar todos los caches del Service Worker / browser cache
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      // Notificar y recargar
      if (typeof Toast !== 'undefined') {
        Toast.info('🔄 Nueva versión disponible. Actualizando…');
      }
      setTimeout(() => location.reload(true), 1200);
      return true; // indica que se va a recargar
    }

    // Primera vez o misma versión: guardar
    localStorage.setItem('inv-pro-app-version', version);
    return false;
  } catch {
    // Sin red o sin version.json → continuar normalmente
    return false;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 0. Verificar versión — si hay nueva, se recarga antes de iniciar
  const _reloading = await _checkAppVersion();
  if (_reloading) return; // no iniciar nada, viene la recarga

  // 1. Tema
  ThemeManager.init();

  // 1.5. Multiusuario: Verificar Login
  if (!AuthService.isLoggedIn()) {
    LoginView.render();
    return; // Detener inicio. El login recargará la página.
  }

  // Renderizar info del usuario en el topbar si existe un contenedor
  LoginView.renderUserInfo();

  // Ocultar tabs de administración si no es admin
  if (!AuthService.isAdmin()) {
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin) navAdmin.style.display = 'none';
  }

  // 2. Inicializar IndexedDB
  await LocalCache.init();

  // 3. Restaurar empresa guardada
  await PerfilConfig.cargarEmpresaGuardada();

  // 4. Restaurar catálogos guardados
  const cats = await LocalCache.getCatalogos();
  Object.assign(APP_CONFIG.catalogos, cats);

  // 5. Restaurar config de Sheets
  try {
    const savedSheets = JSON.parse(localStorage.getItem('inv-pro-sheets-cfg') || 'null');
    if (savedSheets) {
      APP_CONFIG.sheets.spreadsheetId = savedSheets.sid || '';
      APP_CONFIG.sheets.apiKey        = savedSheets.key || '';
      APP_CONFIG.sheets.sheetName     = savedSheets.name || 'VentasDetallado';
    }
  } catch {}

  // 6. Restaurar URL de Apps Script
  const gasUrl = localStorage.getItem('inv-pro-gas-url') || '';
  if (gasUrl) APP_CONFIG.appsScript.webAppUrl = gasUrl;

  // 7. Restaurar historial de lotes en variable global para export
  LocalCache.getLotes().then(lotes => { window._histLotes = lotes; });

  // 8. Inicializar APIs
  SheetsAPI.init(APP_CONFIG.sheets);
  AppsScriptBridge.init(gasUrl);
  PinAuth.init();

  // 8.5. Cargar lotes desde Sheets (si hay conexión configurada)
  // Sheets es la fuente de verdad — al abrir la app en CUALQUIER dispositivo,
  // se descarga el estado actual de Sheets y se reemplaza el IndexedDB local.
  // Luego se refresca la vista activa para que el usuario vea datos correctos.
  if (gasUrl && navigator.onLine && window.location.protocol !== 'file:') {
    LocalCache.loadLotesFromRemote().then(async () => {
      const lotes = await LocalCache.getLotes();
      window._histLotes = lotes;
      // Refrescar la vista activa si muestra lotes (sin esperar intervención del usuario)
      const current = Views.getCurrent();
      if (current === 'historial' && window.HistorialView) {
        HistorialView.render();
      } else if (current === 'ingreso' && window.IngresoView) {
        IngresoView.render();
      }
    }).catch(() => {});

    // Cargar Repuestos DB en paralelo (Memory Map)
    ModoRapido.loadFromRemote().catch(() => {});
  }

  // 9. Iniciar motor de sync
  SyncEngine.start();

  // 9.5. Restaurar estado de la barra lateral en PC
  if (window.innerWidth > 768) {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
      document.getElementById('app-shell')?.classList.add('sidebar-collapsed');
    }
  }

  // 10. Router
  Views.init();

  // 11. Eventos globales topbar
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => ThemeManager.toggle());
  document.getElementById('sheets-status-chip')?.addEventListener('click', () => Views.go('admin'));
  document.getElementById('sync-chip')?.addEventListener('click', () => SyncEngine.forceSync());

  // 12. Hamburger y sidebar overlay (móvil)
  document.getElementById('btn-hamburger')?.addEventListener('click', () => Views.toggleSidebar());
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => Views.toggleSidebar());

  // 13. Prefetch silencioso si hay Sheets configurado
  if (APP_CONFIG.sheets.spreadsheetId && APP_CONFIG.sheets.apiKey) {
    SheetsAPI.fetchAll().catch(() => {});
  }
});

window.Views = Views;
