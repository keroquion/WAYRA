/**
 * core-config/app.js — Router y bootstrap v2.0.0
 */

const Views = (() => {
  const VIEWS = {
    ingreso:     { el: 'view-ingreso',     render: () => IngresoView.render(),    nav: 'nav-ingreso'     },
    historial:   { el: 'view-historial',   render: () => HistorialView.render(),  nav: 'nav-historial'   },
    inventario:  { el: 'view-inventario',  render: () => InventarioView.render(), nav: 'nav-inventario'  },
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
    const hash = location.hash.replace('#','') || 'ingreso';
    go(VIEWS[hash] ? hash : 'ingreso');
  }

  // ── Sidebar móvil ──
  function _openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('active');
  }

  function _closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('open')) _closeSidebar();
    else _openSidebar();
  }

  return { go, init, getCurrent: () => _current, toggleSidebar };
})();

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Tema
  ThemeManager.init();

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
  if (gasUrl && navigator.onLine && window.location.protocol !== 'file:') {
    LocalCache.loadLotesFromRemote().then(() => {
      // Actualizar variable global con lotes mergeados
      LocalCache.getLotes().then(lotes => { window._histLotes = lotes; });
    }).catch(() => {});
  }

  // 9. Iniciar motor de sync
  SyncEngine.start();

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
