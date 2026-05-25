# Inventario Pro v2.0.0

Sistema de gestión modular de lotes e inventario con almacenamiento local en IndexedDB y sincronización bidireccional con Google Sheets y Google Drive mediante Apps Script.

## 🚀 Características Principales

- **Offline-First:** Almacenamiento local completo usando IndexedDB (`modulo-0-datos/local-cache.js`).
- **Sincronización:** Cola de operaciones en segundo plano hacia Google Sheets (`modulo-0-datos/sync-engine.js`).
- **Ingreso de Equipos:** Registro rápido mediante lector de código de barras manual o automático, y soporte de cámara para evidencia fotográfica subida a Google Drive.
- **Flujos de Trabajo:** Estados configurables de garantía y soporte con stepper interactivo.
- **Modo Rápido:** Configuración rápida persistente (sticky values) para ingresos masivos automáticos.
- **Reportes:** Generación de reportes generales y tickets de soporte individuales exportables a PDF, Excel y CSV.
- **Administración:** Configuración protegida por PIN SHA-256 (PIN por defecto: `1234`), personalización de catálogos y migración de datos.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3 nativo (CSS Variables), JavaScript Vanilla ES6.
- **Base de Datos Local:** IndexedDB.
- **Backend:** Google Apps Script (`Code.gs`) y Google Sheets API v4.
- **Librerías Externas:** SheetJS (XLSX) y html2pdf.js.
