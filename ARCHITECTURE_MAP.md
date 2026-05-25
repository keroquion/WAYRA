# ARCHITECTURE MAP — Inventario Pro v2.0.0

```
inventario-pro-v2/
│
├── index.html                                   → Entry point. SheetJS CDN. Orden de scripts garantizado.
│
├── core-config/
│   ├── app.config.js                            → Config central: empresa, columnas, estados, catálogos, flujos.
│   └── app.js                                   → Router Views.go() + bootstrap async (IndexedDB → SheetsAPI → SyncEngine).
│
├── core-theme/
│   ├── styles.css                               → CSS global completo. Tokens var(). Sin colores hardcoded.
│   └── theme.js                                 → ThemeManager dark/light.
│
├── modulo-0-datos/
│   ├── local-cache.js                           → IndexedDB wrapper. Stores: equipos, lotes, audit, sync_queue, config, catalogos.
│   ├── apps-script-bridge.js                    → HTTP POST al Apps Script Web App. Retry 3x. Timeout configurable.
│   ├── sheets-api.js                            → Google Sheets API v4 (solo lectura). Caché 30s.
│   ├── sync-engine.js                           → Offline-first: cola de operaciones → sync async → resolución timestamp.
│   ├── audit-trail.js                           → Log inmutable CREATE/UPDATE/DELETE → IndexedDB + Sheets _AuditTrail.
│   ├── drive-upload.js                          → File/DataURL → Base64 → Apps Script → Drive URL.
│   ├── import-export.js                         → CSV (con BOM) + XLSX (SheetJS). Import CSV/XLSX.
│   └── inventario.view.js                       → Vista inventario: filtros, stats, col-toggle, paginación, export.
│
├── modulo-1-ingreso/
│   ├── scanner-barras.js                        → Toggle Auto (keydown trap) / Manual. Vibración móvil.
│   ├── evidencia-fotos.js                       → FileInput → preview → upload Drive async → lightbox.
│   ├── flujo-garantia.js                        → Stepper 6 estados. Modal cambio estado. Audit en cada transición.
│   ├── flujo-soporte.js                         → Stepper 6 estados. Repuestos usados (texto). Técnico asignado.
│   ├── modo-rapido.js                           → Panel sticky de configuración rápida para ingreso masivo.
│   ├── ingreso.view.js                          → Vista principal: scan bar + col-toggle + tabla lote + botones flujo.
│   └── historial.view.js                        → Historial de lotes: colapsar/expandir, eliminar, export CSV/XLSX.
│
├── modulo-2-reportes/
│   ├── agrupador-lotes.js                       → Totalizar equipos por tipo/marca/estado/sucursal con barras de progreso.
│   ├── plantillas/
│   │   ├── garantia-proveedor.js                → Doc formal: cabecera empresa, tabla equipos, firma/sello.
│   │   ├── ticket-soporte.js                    → Doc individual de ticket de soporte para vista previa y PDF.
│   │   └── reporte-lote.js                      → Reporte general: resumen visual + tabla completa.
│   └── reportes.view.js                         → Vista: selector lote + tipo doc + preview live + export PDF/CSV/XLSX.
│
├── modulo-3-admin/
│   ├── pin-auth.js                              → PIN SHA-256. Keypad visual. Sesión 30min. Default: 1234.
│   ├── catalogos-crud.js                        → CRUD sin código: marcas, tipos, sucursales, proveedores, repuestos.
│   ├── perfil-config.js                         → Export/Import config JSON entre PCs. Persistencia empresa en IndexedDB.
│   └── admin.view.js                            → Vista 6 tabs: Empresa, Catálogos, Conexión, Seguridad, Auditoría, Portabilidad.
│
├── componentes-ui/
│   └── modal-generico.js                        → Modal reutilizable con slot de contenido dinámico.
│
├── utils-helpers/
│   ├── toast.js                                 → Notificaciones success/error/warning/info.
│   ├── formatters.js                            → Fechas, badges de estado, highlight, safe, currency.
│   └── validators.js                            → required, pin, ruc, numeric, minLength.
│
└── apps-script/
    └── Code.gs                                  → Backend Apps Script: doPost/doGet, readSheet, writeRow, uploadToDrive, audit.
```

## Flujo de Datos

```
Google Sheets API v4 (lectura)
         ↓
    SheetsAPI (caché 30s)
         ↓
  InventarioView / IngresoView
         ↓
    LocalCache (IndexedDB)  ←→  SyncEngine ←→  AppsScriptBridge  →  Google Sheets
                                                                   →  Google Drive
         ↓
    AuditTrail (append-only)
```

## Seguridad

```
Admin view  →  PinAuth.requestPin()  →  SHA-256(PIN)  →  IndexedDB
Sesión activa: 30 min en sessionStorage
```

## Export Cadena

```
Datos del lote/inventario
    → CSV (BOM para Excel) o XLSX (SheetJS)
    → window.print() para PDF (@media print)
    → Plantilla HTML → Documento formal
```
