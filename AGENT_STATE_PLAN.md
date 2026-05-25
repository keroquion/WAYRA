# AGENT STATE PLAN — Inventario Pro

## Versión Actual: v2.0.0 — 2026-04-27

---

## Fases

### ✅ FASE 1 — Módulos Inventario + Registros (v1.0.0)
**Estado:** COMPLETADO — carpeta `inventario-pro-v1/`

### ✅ FASE 2 — Expansión 4 Módulos (v2.0.0)
**Estado:** COMPLETADO — carpeta `inventario-pro-v2/`

#### Bloques terminados v2
- [x] `core-config/app.config.js` — empresa, columnas, estados, flujos, catálogos
- [x] `core-config/app.js` — Router + bootstrap async (IndexedDB → APIs → Sync)
- [x] `core-theme/styles.css` — CSS global extendido: stepper, PIN, CRUD, reports, print
- [x] `core-theme/theme.js` — ThemeManager dark/light
- [x] `utils-helpers/toast.js` — Notificaciones
- [x] `utils-helpers/formatters.js` — Formateadores + icons estado
- [x] `utils-helpers/validators.js` — PIN, RUC, required, numeric
- [x] `modulo-0-datos/local-cache.js` — IndexedDB: lotes, audit, sync_queue, config, catalogos
- [x] `modulo-0-datos/apps-script-bridge.js` — HTTP bridge con retry/timeout
- [x] `modulo-0-datos/sheets-api.js` — Google Sheets read-only + caché
- [x] `modulo-0-datos/sync-engine.js` — Offline-first + cola + resolución timestamp
- [x] `modulo-0-datos/audit-trail.js` — Log inmutable CREATE/UPDATE/DELETE
- [x] `modulo-0-datos/drive-upload.js` — Base64 → Drive via bridge
- [x] `modulo-0-datos/import-export.js` — CSV + XLSX (SheetJS)
- [x] `modulo-0-datos/inventario.view.js` — Vista inventario completo
- [x] `modulo-1-ingreso/scanner-barras.js` — Toggle Auto/Manual + vibración
- [x] `modulo-1-ingreso/evidencia-fotos.js` — Fotos + preview + upload Drive + lightbox
- [x] `modulo-1-ingreso/flujo-garantia.js` — Stepper 6 estados garantía
- [x] `modulo-1-ingreso/flujo-soporte.js` — Stepper 6 estados soporte + repuestos
- [x] `modulo-1-ingreso/modo-rapido.js` — Panel sticky de configuración rápida para ingreso masivo
- [x] `modulo-1-ingreso/ingreso.view.js` — Vista principal Módulo 1
- [x] `modulo-1-ingreso/historial.view.js` — Historial de lotes
- [x] `modulo-2-reportes/agrupador-lotes.js` — Totalización por tipo/marca/estado
- [x] `modulo-2-reportes/plantillas/garantia-proveedor.js` — Doc formal garantía
- [x] `modulo-2-reportes/plantillas/reporte-lote.js` — Reporte general lote
- [x] `modulo-2-reportes/plantillas/ticket-soporte.js` — Doc individual de ticket de soporte
- [x] `modulo-2-reportes/reportes.view.js` — Vista reportes: preview + export
- [x] `modulo-3-admin/pin-auth.js` — PIN SHA-256 + keypad + sesión
- [x] `modulo-3-admin/catalogos-crud.js` — CRUD catálogos sin código
- [x] `modulo-3-admin/perfil-config.js` — Export/Import config JSON
- [x] `modulo-3-admin/admin.view.js` — Vista admin 6 tabs protegida por PIN
- [x] `componentes-ui/modal-generico.js` — Modal reutilizable
- [x] `apps-script/Code.gs` — Backend Apps Script completo
- [x] `index.html` — Entry point con SheetJS CDN

---

### ⏳ FASE 3 — (Backlog)
- [ ] Dashboard ejecutivo con gráficos (Chart.js)
- [ ] Import masivo CSV → Sheets via Apps Script
- [ ] Búsqueda por serie + QR scanner (WebRTC camera)
- [ ] Módulo de Usuarios con roles (Admin/Técnico/Consultor)
- [ ] Modo offline completo con SW (Service Worker)
- [ ] Notificaciones de equipo pendiente >7 días
- [ ] Repuestos con código de barras propio (cuando el usuario lo necesite)
- [ ] API REST bridge alternativa (sin Apps Script)

---

## Control de Versiones

| Versión | Fecha       | Descripción                                                          |
|---------|-------------|----------------------------------------------------------------------|
| v1.0.0  | 2026-04-27  | Inventario + Registros. Read-only Sheets. localStorage.              |
| v2.0.0  | 2026-04-27  | +4 módulos: Datos/IndexedDB, Ingreso/Flujos, Reportes, Admin/PIN.   |

---

## Decisiones de Diseño

| Decisión | Razón |
|----------|-------|
| IndexedDB en lugar de localStorage | Capacidad ilimitada, async, soporte binario |
| Apps Script Web App para escritura | No expone credenciales en el frontend |
| SheetJS CDN para XLSX | Sin build step, funciona directo en HTML |
| window.print() para PDF | Sin dependencias, usa CSS @media print |
| SHA-256 Web Crypto para PIN | Nativo del navegador, cero deps |
| CSS tokens var() para temas | 1 línea de JS cambia todo el tema |
