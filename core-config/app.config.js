/**
 * core-config/app.config.js — Inventario Pro v2.0.0
 * Config central. NUNCA hardcodear valores en otros módulos.
 */

const APP_CONFIG = {
  version: '2.0.0',
  appName: 'Inventario Pro',
  subtitle: 'Sistema de Gestión de Lotes',

  // ── Empresa (editable en Admin → se persiste en IndexedDB) ──────
  empresa: {
    nombre: 'Wayra',
    ruc:    '20000000000',
    direccion: '',
    telefono: '',
    email: '',
    logo: '',  // base64 o URL
  },

  // ── Apps Script Web App ─────────────────────────────────────────
  appsScript: {
    webAppUrl: '',  // pegar URL del Web App desplegado
    retries: 3,
    timeoutMs: 30000,
  },

  // ── Google Sheets (lectura directa sin Apps Script) ─────────────
  sheets: {
    apiKey: '',
    spreadsheetId: '',
    sheetName: 'InventarioTI',
    dataRange: '',
  },

  // ── Columnas del dataset ─────────────────────────────────────────
  columns: [
    { key: 'SERIE',       label: 'Serie',        visible: true,  width: 120, editable: false },
    { key: 'CODIGO',      label: 'Código',       visible: true,  width: 90,  editable: false },
    { key: 'TIP_EQUIP',   label: 'Tipo Equipo',  visible: true,  width: 110, editable: true  },
    { key: 'MARCA',       label: 'Marca',        visible: true,  width: 90,  editable: true  },
    { key: 'MODELO',      label: 'Modelo',       visible: true,  width: 150, editable: true  },
    { key: 'PROCESADOR',  label: 'Procesador',   visible: true,  width: 160, editable: true  },
    { key: 'RAM',         label: 'RAM',          visible: true,  width: 70,  editable: true  },
    { key: 'HD_SSD',      label: 'HD/SSD',       visible: true,  width: 100, editable: true  },
    { key: 'PULGADAS',    label: 'Pulgadas',     visible: true,  width: 80,  editable: true  },
    { key: 'SUCURSAL',    label: 'Sucursal',     visible: true,  width: 90,  editable: true  },
    { key: 'ESTADO',      label: 'Estado',       visible: true,  width: 80,  editable: true  },
    { key: 'OBSERVACION', label: 'Observación',  visible: true,  width: 200, editable: true  },
    // Nuevas columnas para asignación y actas
    { key: 'USUARIO_ASIGNADO', label: 'Usuario Asignado', visible: false, width: 120, editable: true, isAsignacion: true },
    { key: 'DNI',             label: 'DNI',             visible: false, width: 80,  editable: true, isAsignacion: true },
    { key: 'CARGO',           label: 'Cargo',           visible: false, width: 120, editable: true, isAsignacion: true },
    { key: 'AREA_DEPARTAMENTO',label: 'Área / Dpto.',    visible: false, width: 120, editable: true, isAsignacion: true },
    { key: 'IP',              label: 'IP',              visible: false, width: 100, editable: true, isAsignacion: true },
    { key: 'PERFIL_RED',      label: 'Perfil Red',      visible: false, width: 100, editable: true, isAsignacion: true },
  ],

  // ── Estados equipo ────────────────────────────────────────────────
  estados: {
    C: { label: 'Correcto',    color: '#22c55e', icon: '✅' },
    P: { label: 'En Revisión', color: '#f59e0b', icon: '🔧' },
    M: { label: 'Malogrado',   color: '#ef4444', icon: '⚠️' },
    V: { label: 'Vendido',     color: '#6366f1', icon: '💰' },
    G: { label: 'En Garantía', color: '#06b6d4', icon: '🛡️' },
    S: { label: 'En Soporte',  color: '#a855f7', icon: '🔩' },
  },

  // ── Estados flujo Garantía ───────────────────────────────────────
  estadosGarantia: [
    { key: 'RECIBIDO',           label: 'Recibido',           color: 'var(--info)'    },
    { key: 'DIAGNOSTICADO',      label: 'Diagnosticado',      color: 'var(--warning)' },
    { key: 'ENVIADO_PROVEEDOR',  label: 'Enviado Proveedor',  color: 'var(--purple)'  },
    { key: 'EN_PROVEEDOR',       label: 'En Proveedor',       color: 'var(--accent)'  },
    { key: 'DEVUELTO',           label: 'Devuelto',           color: 'var(--success)' },
    { key: 'CERRADO',            label: 'Cerrado',            color: 'var(--text-muted)' },
  ],

  // ── Estados flujo Soporte ────────────────────────────────────────
  estadosSoporte: [
    { key: 'RECIBIDO',           label: 'Recibido',           color: 'var(--info)'    },
    { key: 'DIAGNOSTICO',        label: 'Diagnóstico',        color: 'var(--warning)' },
    { key: 'ESPERANDO_REPUESTO', label: 'Esp. Repuesto',      color: 'var(--danger)'  },
    { key: 'REPARANDO',          label: 'Reparando',          color: 'var(--purple)'  },
    { key: 'LISTO',              label: 'Listo',              color: 'var(--success)' },
    { key: 'ENTREGADO',          label: 'Entregado',          color: 'var(--text-muted)' },
  ],

  // ── Catálogos (editables en Admin) ───────────────────────────────
  catalogos: {
    marcas:        ['DELL','HP','LENOVO','APPLE','TOSHIBA','ASUS','MICROSOFT','HALION','BYTESPEED','AZUS'],
    tiposEquipo:   ['LAPTOP','PC','AIO','MONITOR','CPU','TABLET','IMPRESORA','CAMARA','TECLADO','MOUSE','MICROFONO','CABLE','SWITCH','ROUTER','ACCESS POINT','REPUESTO','ACCESORIO','OTRO'],
    sucursales:    ['PRINCIPAL', 'ALMACÉN'],
    proveedores:   ['PROVEEDOR A','PROVEEDOR B'],
    tiposRepuesto: ['PANTALLA','TECLADO','BATERÍA','CARGADOR','RAM','DISCO','CARCASA','TOUCHPAD','BISAGRA','FLEX'],
  },

  // ── Admin / Seguridad ────────────────────────────────────────────
  admin: {
    pinHash: '',         // SHA-256 del PIN (se guarda aquí en runtime, persiste en IndexedDB)
    sessionMinutes: 30,
    defaultPin: '1234',
  },

  // ── Preferencias ─────────────────────────────────────────────────
  rowsPerPage: 20,
  scannerAutoMode: true,   // true = auto-submit al escanear
  syncIntervalMs: 30000,   // intervalo de sync automático
};

window.APP_CONFIG = APP_CONFIG;
