/**
 * core-config/app.js — Router y bootstrap v2.0.0
 */

const Views = (() => {
  const VIEWS = {
    tareas:      { el: 'view-tareas',      render: () => TareasView.render(),         nav: 'nav-tareas'     },
    'historial-tareas': { el: 'view-historial-tareas', render: () => HistorialTareasView.render(), nav: 'nav-historial-tareas' },
    inventario:  { el: 'view-inventario',  render: () => InventarioView.render(), nav: 'nav-inventario'  },
    escaner:     { el: 'view-escaner',     render: () => EscanerView.render(),    nav: 'nav-escaner'     },
    reportes:    { el: 'view-reportes',    render: () => ReportesView.render(),   nav: 'nav-reportes'    },
    admin:       { el: 'view-admin',       render: () => AdminView.render(),      nav: 'nav-admin'       },
    'registro-bienes': { el: 'view-registro-bienes', render: () => RegistroBienesView.render(), nav: 'nav-registro-bienes' },
  };

  let _current = null;

  function go(viewName) {
    const view = VIEWS[viewName];
    if (!view) return;

    // Notificar a la vista saliente (desactiva scanner global si salimos de ingreso)
    if (_current && _current !== viewName) {
      if (_current === 'tareas' && window.TareasView?.onLeave) {
        TareasView.onLeave();
      }
      if (_current === 'escaner' && window.EscanerView?.onLeave) {
        EscanerView.onLeave();
      }
      if (_current === 'registro-bienes' && window.RegistroBienesView?.onLeave) {
        RegistroBienesView.onLeave();
      }
    }

    Object.values(VIEWS).forEach(v => {
      document.getElementById(v.el)?.classList.remove('active');
      document.getElementById(v.nav)?.classList.remove('active');
    });
    document.getElementById(view.el)?.classList.add('active');
    document.querySelectorAll('.bottom-nav-item').forEach(b => {
      if (b.dataset.view === viewName) b.classList.add('active');
      else b.classList.remove('active');
    });

    _current = viewName;
    view.render();
    history.replaceState(null, '', '#' + viewName);

    // ── Cerrar sidebar en móvil ──
    _closeSidebar();
  }

  function init() {
    const hash = window.location.hash.substring(1);
    if (VIEWS[hash]) {
      go(hash);
    } else {
      go('tareas');
    }
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#','') || 'tareas';
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

  // 4.5 Extraer posibles repuestos que estén en Lotes pero no en el catálogo
  await LocalCache.syncCatalogTiposFromLotes();

  // 5. Restaurar config de Sheets (compatibilidad - ya no es la fuente de datos)
  try {
    // APP_CONFIG.sheets puede no existir si fue eliminado, creamos un fallback
    if (!APP_CONFIG.sheets) APP_CONFIG.sheets = { spreadsheetId: '', apiKey: '', sheetName: 'InventarioTI' };
    const savedSheets = JSON.parse(localStorage.getItem('inv-pro-sheets-cfg') || 'null');
    if (savedSheets) {
      APP_CONFIG.sheets.spreadsheetId = savedSheets.sid || '';
      APP_CONFIG.sheets.apiKey        = savedSheets.key || '';
      APP_CONFIG.sheets.sheetName     = savedSheets.name || 'InventarioTI';
    }
  } catch {}

  // 6. Restaurar URL de Apps Script
  const gasUrl = localStorage.getItem('inv-pro-gas-url') || '';
  if (gasUrl) APP_CONFIG.appsScript.webAppUrl = gasUrl;

  // 7. Restaurar historial de lotes en variable global para export
  LocalCache.getLotes().then(lotes => { window._histLotes = lotes; });

  // 8. Inicializar APIs
  SupabaseAPI.init();
  AppsScriptBridge.init(gasUrl);
  PinAuth.init();

  // 8.5. Sincronizar inventario desde Supabase al arrancar
  if (navigator.onLine && window.location.protocol !== 'file:') {
    SupabaseAPI.syncFromRemote().then(() => {
      const current = Views.getCurrent();
      if (current === 'inventario' && window.InventarioView) InventarioView.render();
    }).catch(() => {});
  }

  // 9. Iniciar motor de sync (escribe la cola pendiente a Supabase)
  SyncEngine.start();

  // 9.6. Listener de restablecimiento de caché en pestañas duplicadas
  try {
    const resetChannel = new BroadcastChannel('app-cache-reset');
    resetChannel.onmessage = (event) => {
      if (event.data === 'clear_and_reload') location.reload(true);
    };
  } catch(e) {}

  // 9.7. Re-sincronizar con Supabase si la pestaña lleva más de 10 min inactiva
  window.addEventListener('focus', () => {
    if (navigator.onLine && window.location.protocol !== 'file:') {
      LocalCache.getConfig('equipos_supabase_sync', 0).then(lastSync => {
        if ((Date.now() - lastSync) > 10 * 60 * 1000) {
          SupabaseAPI.syncFromRemote(true).then(() => {
            const current = Views.getCurrent();
            if (current === 'inventario' && window.InventarioView) InventarioView.render();
          }).catch(() => {});
        }
      });
    }
  });

  // 9.8. Restaurar estado de la barra lateral en PC
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

  // 13. Prefetch silencioso de Supabase al arrancar
  SupabaseAPI.fetchAll().catch(() => {});
});

window.Views = Views;
