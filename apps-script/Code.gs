/**
 * apps-script/Code.gs
 * Google Apps Script Web App — Backend de Inventario Pro v2.
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre tu Google Sheet
 * 2. Extensiones → Apps Script
 * 3. Pega TODO este código (reemplaza el existente)
 * 4. Implementar → Nueva implementación → Tipo: "Aplicación web"
 * 5. Ejecutar como: "Yo (tu email)"
 * 6. Quién tiene acceso: "Cualquier persona"
 * 7. Haz clic en "Implementar" y copia la URL
 * 8. Pega esa URL en Admin → Conexión → Apps Script Web App
 *
 * GEMINI API KEY:
 * Para guardar tu API Key de Gemini de forma segura (no visible en el frontend):
 * 1. En el editor de Apps Script ve a: Proyecto → ⚙️ Configuración del proyecto
 * 2. Sección "Propiedades de secuencia de comandos" → Agregar propiedad
 * 3. Nombre: GEMINI_API_KEY  Valor: tu_api_key_aquí
 * 4. Guardar. Nunca se expone al cliente.
 */

const SPREADSHEET_ID = ''; // Si el script no está dentro del Sheet, pega aquí el ID del Google Sheet
const AUDIT_SHEET    = '_AuditTrail';
const SOPORTE_SHEET  = '_Soporte';
const DRIVE_FOLDER   = 'Inventario Pro - Evidencias';

// ── Helper para obtener el Sheet (bound o standalone) ──────────────
function _getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('El script no está vinculado a un Sheet y SPREADSHEET_ID está vacío.');
  return ss;
}

// ── Punto de entrada POST ──────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'ping':
        result = { ok: true, timestamp: new Date().toISOString() };
        break;
      case 'testDrive':
        result = _testDrive();
        break;
      case 'readSheet':
        result = _readSheet(body.sheetName, body.range);
        break;
      case 'writeRow':
        result = _writeRow(body.sheetName, body.rowData);
        break;
      case 'updateRow':
        result = _updateRow(body.sheetName, body.rowIndex, body.rowData);
        break;
      case 'deleteRow':
        result = _deleteRow(body.sheetName, body.rowIndex);
        break;
      case 'uploadToDrive':
        result = _uploadToDrive(body.base64, body.filename, body.mimeType);
        break;
      case 'appendAudit':
        result = _appendAudit(body.auditRow);
        break;
      case 'getRowCount':
        result = _getRowCount(body.sheetName);
        break;
      case 'saveLotes':
        result = _saveLotes(body.lotes);
        break;
      case 'loadLotes':
        result = _loadLotes();
        break;
      case 'saveSoporte':
        result = _saveSoporte(body.ticket);
        break;
      case 'geminiOCR':
        result = _geminiOCR(body.base64, body.mimeType);
        break;
      case 'writeAuditHardware':
        result = _writeAuditHardware(body.hardwareData);
        break;
      case 'searchHardwareData':
        result = _searchHardwareData(body.serial);
        break;
      case 'getAuditHistory':
        result = _getAuditHistory();
        break;
      default:
        throw new Error('Acción desconocida: ' + action);
    }

    return _cors(ContentService.createTextOutput(JSON.stringify({ ok: true, ...result })));
  } catch (err) {
    return _cors(ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })));
  }
}

// ── GET para CORS preflight ────────────────────────────────────────
function doGet(e) {
  const action = e.parameter?.action || 'ping';
  return _cors(ContentService.createTextOutput(JSON.stringify({ ok: true, action })));
}

// ── Leer hoja ──────────────────────────────────────────────────────
function _readSheet(sheetName, range) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  const data = range
    ? sheet.getRange(range).getValues()
    : sheet.getDataRange().getValues();
  return { values: data };
}

// ── Obtener número de filas ────────────────────────────────────────
function _getRowCount(sheetName) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  return { rowCount: sheet.getLastRow() };
}

// ── Escribir fila al final ─────────────────────────────────────────
function _writeRow(sheetName, rowData) {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  const values = Array.isArray(rowData) ? rowData : Object.values(rowData);
  sheet.appendRow(values);
  return { rowIndex: sheet.getLastRow() };
}

// ── Actualizar fila por índice ─────────────────────────────────────
function _updateRow(sheetName, rowIndex, rowData) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  const values = Array.isArray(rowData) ? [rowData] : [Object.values(rowData)];
  sheet.getRange(rowIndex, 1, 1, values[0].length).setValues(values);
  return { ok: true };
}

// ── Eliminar fila por índice ───────────────────────────────────────
function _deleteRow(sheetName, rowIndex) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  sheet.deleteRow(rowIndex);
  return { ok: true };
}

// ── Subir archivo a Drive ──────────────────────────────────────────
function _uploadToDrive(base64, filename, mimeType) {
  // Obtener o crear carpeta
  let folder;
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  // Decodificar base64 y crear archivo
  const decoded = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', filename);
  const file = folder.createFile(blob);

  // Hacer el archivo público con enlace
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  // URL corregida: drive.usercontent.google.com funciona como <img src> en todos los navegadores modernos
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`;
  // Thumbnail más pequeño para previews en tabla
  const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  return { url, thumbUrl, fileId };
}

// ── Test Drive (Verifica/Crea carpeta y permisos) ──────────────────
function _testDrive() {
  let folder;
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (folders.hasNext()) {
    folder = folders.next();
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return { ok: true, folderId: folder.getId(), folderUrl: folder.getUrl(), name: DRIVE_FOLDER };
}

// ── Audit trail ────────────────────────────────────────────────────
function _appendAudit(auditRow) {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET);
    sheet.appendRow(['Timestamp', 'Acción', 'Entidad', 'Usuario', 'Datos']);
    sheet.getRange(1, 1, 1, 5).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
  }
  sheet.appendRow(auditRow);
  return { ok: true };
}

// ── Guardar ticket de Soporte en hoja _Soporte ────────────────────
function _saveSoporte(ticket) {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(SOPORTE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SOPORTE_SHEET);
    const headers = [
      'ID Ticket', 'Fecha', 'Código Equipo', 'Marca', 'Modelo',
      'Serie', 'Tipo Equipo', 'Procesador', 'RAM', 'HD/SSD',
      'Estado Soporte', 'Técnico', 'Falla Reportada', 'Diagnóstico',
      'Repuestos Usados', 'Obs. Final', 'Fotos (URLs)', 'Gemini OCR Data',
      'Lote', 'Última Modificación'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Buscar si ya existe una fila con este ID de ticket para actualizarla
  const lastRow = sheet.getLastRow();
  let targetRow = -1;
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === ticket.id) { targetRow = i + 2; break; }
    }
  }

  const repuestosStr = (ticket.repuestos || []).map(r => r.nombre).join(', ');
  const fotosStr = (ticket.fotos || []).map(f => f.url || f.thumbUrl || '').filter(Boolean).join('\n');
  const geminiStr = ticket.geminiData ? JSON.stringify(ticket.geminiData) : '';

  const row = [
    ticket.id || `sop_${Date.now()}`,
    ticket.fecha || new Date().toISOString(),
    ticket.codigo || '',
    ticket.marca || '',
    ticket.modelo || '',
    ticket.serie || '',
    ticket.tipoEquipo || '',
    ticket.procesador || '',
    ticket.ram || '',
    ticket.hdSsd || '',
    ticket.estado || '',
    ticket.tecnico || '',
    ticket.falla || '',
    ticket.diagnostico || '',
    repuestosStr,
    ticket.obs || '',
    fotosStr,
    geminiStr,
    ticket.lote || '',
    new Date().toISOString(),
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { ok: true, row: targetRow > 0 ? targetRow : sheet.getLastRow() };
}

// ── Gemini OCR — Extrae datos clave de etiqueta de hardware ────────
// La API Key debe estar en Propiedades de script: GEMINI_API_KEY
// Modelos en orden de preferencia (fallback automático si uno no está disponible)
const GEMINI_MODELS = [
  'gemini-2.5-flash',          // Gemini 2.5 Flash (5 RPM)
  'gemini-3.0-flash',          // Gemini 3 Flash (5 RPM)
  'gemini-3.1-flash-lite',     // Gemini 3.1 Flash Lite (15 RPM)
  'gemini-2.5-flash-lite',     // Gemini 2.5 Flash Lite (10 RPM)
];

function _geminiOCR(base64, mimeType) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada. Ve a ⚙️ Configuración del proyecto → Propiedades de secuencia de comandos.');

  const prompt = `Analiza esta imagen de una pieza de hardware. Tu tarea es extraer la información de la etiqueta y ADEMÁS identificar exactamente qué es el objeto.
IMPORTANTE: Tienes acceso a búsqueda en internet. Busca el Part Number (PN) o Modelo que encuentres en la etiqueta para identificar el repuesto exacto.
Devuelve un JSON estricto con estos campos (omite los vacíos):
- "descripcion": Usa tu búsqueda en internet con el PN encontrado para dar el nombre comercial real del repuesto (ej. "Brazo giratorio para monitor Dell 24 pulgadas", "Teclado retroiluminado HP Envy"). NO des respuestas genéricas.
- "modelo": modelo exacto del equipo
- "marca": fabricante  
- "pn": Part Number (PN), DP/N, o número de parte
- "serie": número de serie (SN)
- "sku": SKU o código de producto
- "procesador": CPU si aparece
- "ram": memoria si aparece
- "pantalla": tamaño/resolución de pantalla si aparece
- "notas": cualquier otro dato útil

Responde SOLO con un JSON válido.`;

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64 } }
      ]
    }],
    tools: [
      { googleSearch: {} }
    ],
    generationConfig: { 
      temperature: 0.1, 
      maxOutputTokens: 2048,
      response_mime_type: "application/json"
    }
  });

  // Intentar cada modelo en orden hasta que uno responda OK
  let lastError = 'Sin modelos disponibles';
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = UrlFetchApp.fetch(endpoint, {
        method: 'POST',
        contentType: 'application/json',
        payload: body,
        muteHttpExceptions: true,
      });
      const respJson = JSON.parse(response.getContentText());
      if (respJson.error) {
        const errCode = respJson.error.code;
        const errMsg  = respJson.error.message || '';
        if (errCode === 404 || errMsg.includes('not found')) {
          lastError = `Modelo ${model} no disponible`; continue;
        }
        throw new Error('Gemini error: ' + errMsg);
      }
      const raw   = respJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      let data;
      try { data = JSON.parse(clean); }
      catch { data = { notas: clean }; }
      return { data, model };
    } catch (fetchErr) {
      lastError = fetchErr.message;
    }
  }
  throw new Error('Ningún modelo Gemini disponible. Último error: ' + lastError);
}

// ── Guardar lotes completos (reescribe hoja _Lotes) ────────────────
function _saveLotes(lotes) {
  const ss = _getSpreadsheet();
  const LOTES_SHEET = '_Lotes';
  let sheet = ss.getSheetByName(LOTES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOTES_SHEET);
    sheet.appendRow(['id', 'titulo', 'fechaCreacion', 'activo', 'equipos_json']);
    sheet.getRange(1, 1, 1, 5).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
  }

  // Limpiar datos existentes (preservar cabecera)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  // Escribir cada lote como fila
  if (lotes && lotes.length > 0) {
    const rows = lotes.map(l => [
      l.id || '',
      l.titulo || '',
      l.fechaCreacion || '',
      l.activo ? 'true' : 'false',
      JSON.stringify(l.equipos || [])
    ]);
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  return { saved: (lotes || []).length };
}

// ── Cargar lotes desde _Lotes ──────────────────────────────────────
function _loadLotes() {
  const ss = _getSpreadsheet();
  const LOTES_SHEET = '_Lotes';
  const sheet = ss.getSheetByName(LOTES_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return { lotes: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const lotes = data
    .filter(row => row[0]) // filtrar filas vacías
    .map(row => ({
      id: row[0],
      titulo: row[1],
      fechaCreacion: row[2],
      activo: row[3] === 'true',
      equipos: (() => { try { return JSON.parse(row[4] || '[]'); } catch { return []; } })(),
    }));

  return { lotes };
}

// ── CORS helper ────────────────────────────────────────────────────
function _cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════
//  Módulo: Auditoría de Hardware (desde HardwareAuditApp C#)
//  Hoja destino: _AuditHardware
// ══════════════════════════════════════════════════════════════════

const HARDWARE_AUDIT_SHEET = '_AuditHardware';

/**
 * Escribe un registro de auditoría de hardware en la hoja _AuditHardware.
 * Crea la hoja con encabezados si no existe.
 * Llamado desde la app C# HardwareAuditApp.
 */
function _writeAuditHardware(hw) {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(HARDWARE_AUDIT_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(HARDWARE_AUDIT_SHEET);
    const headers = [
      'Timestamp',
      'Marca',
      'Modelo',
      'Serial',
      'CODIGO',
      'CPU',
      'RAM (GB)',
      'Almacenamiento Modelo',
      'Almacenamiento Capacidad (GB)',
      'Resolución Pantalla',
      'Salud Batería (%)',
      'Capacidad Actual Batería (mWh)',
      'Capacidad Diseño Batería (mWh)',
      'Windows Versión',
      'Windows Activación',
      'Office Versión',
      'Office Activación',
      'Drivers Faltantes / Con Error',
      'Enviado Por (Usuario PC)',
      'Nombre PC'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1a73e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }

  // Detalles de RAM por módulo/slot
  let ramStr = (hw.ramGb || '0') + ' GB';
  if (hw.ramModulos && hw.ramModulos.length > 0) {
    const detalles = hw.ramModulos
      .map(r => `${r.Locator || 'Slot'}: ${r.CapacityGb} GB (${r.Speed} MHz)`)
      .join('\n');
    ramStr = `${hw.ramGb} GB Total\n${detalles}`;
  }

  // Detalles de almacenamiento por disco
  let storageStr = hw.almacenamientoModelo || 'N/A';
  if (hw.almacenamientoDiscos && hw.almacenamientoDiscos.length > 0) {
    storageStr = hw.almacenamientoDiscos
      .map(d => `${d.Model} [${d.Type}]`)
      .join('\n');
  }

  const row = [
    new Date().toISOString(),
    hw.marca              || 'N/A',
    hw.modelo             || 'N/A',
    hw.serial             || 'N/A',
    hw.codigoEquipo       || '',
    hw.cpu                || 'N/A',
    ramStr,
    storageStr,
    hw.almacenamientoCapacidad || 0,
    hw.resolucion         || 'N/A',
    hw.saludBateria       || 0,
    hw.bateriaActual      || 0,
    hw.bateriaDiseño      || 0,
    hw.windowsVersion     || 'N/A',
    hw.windowsActivacion  || 'N/A',
    hw.officeVersion      || 'No detectado',
    hw.officeActivacion   || 'N/A',
    hw.driverProblemas    || 'Ninguno',
    hw.usuarioPC          || 'N/A',
    hw.nombrePC           || 'N/A',
  ];

  sheet.appendRow(row);

  // Fila alterna para legibilidad
  const lastRow = sheet.getLastRow();
  if (lastRow % 2 === 0) {
    sheet.getRange(lastRow, 1, 1, row.length).setBackground('#e8f0fe');
  }

  return { ok: true, rowIndex: lastRow };
}

/**
 * Busca un equipo en la hoja VentasDetallado por número de serie.
 * Retorna el CODIGO si lo encuentra.
 */
function _searchHardwareData(serial) {
  if (!serial || serial === 'N/A') return { found: false };

  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName('VentasDetallado');
  if (!sheet) return { found: false, error: 'Hoja VentasDetallado no encontrada' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { found: false };

  // Columna A (0) = Serie, Columna B (1) = Codigo
  for (let i = 1; i < data.length; i++) {
    const rowSerial = String(data[i][0] || '').trim();
    if (rowSerial.toUpperCase() === String(serial).trim().toUpperCase()) {
      return { found: true, codigo: String(data[i][1] || '').trim() };
    }
  }
  return { found: false };
}

/**
 * Retorna todo el historial de auditoría de hardware desde _AuditHardware.
 */
function _getAuditHistory() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(HARDWARE_AUDIT_SHEET);
  if (!sheet) return { values: [] };
  return { values: sheet.getDataRange().getValues() };
}

// ══════════════════════════════════════════════════════════════════
//  FUNCIÓN DE DIAGNÓSTICO — Ejecutar manualmente desde el editor
//  para verificar permisos y API key de Gemini.
//
//  CÓMO USAR:
//  1. En el editor de Apps Script, selecciona "verificarGemini"
//     en el dropdown de funciones (junto al botón ▶ Ejecutar)
//  2. Click ▶ Ejecutar
//  3. Si pide permisos → ACEPTA TODO (esto autoriza UrlFetchApp)
//  4. Revisa el resultado en: Ver → Registros de ejecución
// ══════════════════════════════════════════════════════════════════
function verificarGemini() {
  const results = [];

  // ── 1. Verificar que UrlFetchApp funciona ────────────────────────
  try {
    const testResp = UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
    results.push('✅ UrlFetchApp: Permiso OK (HTTP ' + testResp.getResponseCode() + ')');
  } catch (e) {
    results.push('❌ UrlFetchApp: SIN PERMISO — ' + e.message);
    results.push('   👉 Solución: Ve a Proyecto → ⚙️ → Scopes y agrega external_request');
    Logger.log(results.join('\n'));
    return;
  }

  // ── 2. Verificar que la API Key está guardada ────────────────────
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    results.push('❌ GEMINI_API_KEY: NO encontrada en propiedades del script');
    results.push('   👉 Solución: ⚙️ Configuración → Propiedades → Agregar GEMINI_API_KEY');
    Logger.log(results.join('\n'));
    return;
  }

  const keyPreview = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
  results.push('✅ GEMINI_API_KEY: Encontrada (' + keyPreview + ')');

  // ── 3. Probar cada modelo hasta que uno funcione ─────────────────
  let modelOk = null;
  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
      const body = JSON.stringify({
        contents: [{ parts: [{ text: 'Responde solo: OK' }] }],
        generationConfig: { maxOutputTokens: 5 }
      });
      const resp = UrlFetchApp.fetch(endpoint, {
        method: 'POST',
        contentType: 'application/json',
        payload: body,
        muteHttpExceptions: true,
      });
      const json = JSON.parse(resp.getContentText());

      if (json.error) {
        const code = json.error.code;
        const msg  = json.error.message || '';
        if (code === 404 || msg.includes('not found')) {
          results.push('⚠️  Modelo ' + model + ': no disponible (404)');
          continue;
        }
        if (code === 400 || msg.includes('API_KEY_INVALID') || msg.includes('invalid')) {
          results.push('❌ GEMINI_API_KEY: INVÁLIDA — Google la rechaza');
          results.push('   👉 Solución: Genera una nueva key en aistudio.google.com/app/apikey');
          break;
        }
        if (code === 429) {
          results.push('⚠️  ' + model + ': Cuota agotada (key válida, OK para uso normal)');
          modelOk = model; break;
        }
        results.push('❌ Error en ' + model + ' (código ' + code + '): ' + msg);
        continue;
      }

      const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || '(sin texto)';
      results.push('✅ Modelo activo: ' + model);
      results.push('✅ Respuesta: "' + reply.trim() + '"');
      results.push('🎉 TODO OK — Gemini está listo para usar');
      modelOk = model;
      break;
    } catch (e) {
      results.push('❌ Error con ' + model + ': ' + e.message);
    }
  }

  if (!modelOk) {
    results.push('❌ Ningún modelo respondió. Verifica tu API key y cuota en aistudio.google.com');
  }

  Logger.log('═══════════════════════════════════\n' + results.join('\n') + '\n═══════════════════════════════════');
  SpreadsheetApp.getUi()?.alert('Diagnóstico Gemini\n\n' + results.join('\n'));
}
