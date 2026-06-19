/**
 * apps-script/CodeWayra.gs
 * Backend específico para el Módulo de Registro de Bienes de Wayra.
 */

const SPREADSHEET_ID = ''; // Pega aquí el ID del nuevo Google Sheet "Wayra"
const AUDIT_SHEET    = '_AuditTrail';
const DRIVE_FOLDER   = 'Inventario Wayra - Evidencias';
const INVENTARIO_SHEET = 'InventarioTI'; // Usado para Registro de Bienes

function _getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('El script no está vinculado a un Sheet y SPREADSHEET_ID está vacío.');
  return ss;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'ping':
        result = { ok: true, timestamp: new Date().toISOString() };
        break;
      case 'writeAsset':
        result = _writeAsset(body.rowData);
        break;
      case 'getNextCode':
        result = { codigo: _getNextCode() };
        break;
      case 'readSheet':
        result = _readSheet(body.sheetName, body.range);
        break;
      case 'uploadToDrive':
        result = _uploadToDrive(body.base64, body.filename, body.mimeType);
        break;
      case 'appendAudit':
        result = _appendAudit(body.auditRow);
        break;
      case 'saveLotes':
        result = _saveLotes(body.lotes);
        break;
      case 'loadLotes':
        result = _loadLotes();
        break;
      default:
        throw new Error('Acción desconocida: ' + action);
    }

    return _cors(ContentService.createTextOutput(JSON.stringify({ ok: true, ...result })));
  } catch (err) {
    return _cors(ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message })));
  }
}

function doGet(e) {
  const action = e.parameter?.action || 'ping';
  return _cors(ContentService.createTextOutput(JSON.stringify({ ok: true, action })));
}

// ── Nuevas funciones Wayra ─────────────────────────────────────────

function _getNextCode() {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(INVENTARIO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(INVENTARIO_SHEET);
    sheet.appendRow(['SERIE','CODIGO','TIP_EQUIP','MARCA','MODELO','PROCESADOR','RAM','HD_SSD','PANTALLA','CASE','RESOLUCION','PULGADAS','SUCURSAL','ESTADO','OBSERVACION','FEC_COMPRA','DOC_COMPRA','FEC_VENTA','DOC_VENTA']);
    sheet.getRange(1, 1, 1, 19).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    return 'WYR-10001';
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 'WYR-10001';

  // Leemos la columna B (CODIGO)
  const codigos = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  let max = 10000;
  for (let i = 0; i < codigos.length; i++) {
    const cod = String(codigos[i][0]).trim();
    if (cod.startsWith('WYR-')) {
      const num = parseInt(cod.replace('WYR-', ''), 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  }
  return 'WYR-' + (max + 1);
}

function _writeAsset(rowData) {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(INVENTARIO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(INVENTARIO_SHEET);
    sheet.appendRow(['SERIE','CODIGO','TIP_EQUIP','MARCA','MODELO','PROCESADOR','RAM','HD_SSD','PANTALLA','CASE','RESOLUCION','PULGADAS','SUCURSAL','ESTADO','OBSERVACION','FEC_COMPRA','DOC_COMPRA','FEC_VENTA','DOC_VENTA']);
  }
  
  const values = Array.isArray(rowData) ? rowData : Object.values(rowData);
  const codigoToInsert = values[1]; // Columna B es index 1
  
  if (codigoToInsert) {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const codigos = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (let i = 0; i < codigos.length; i++) {
        if (codigos[i][0] === codigoToInsert) {
          throw new Error('El código ' + codigoToInsert + ' ya existe.');
        }
      }
    }
  }
  
  sheet.appendRow(values);
  return { ok: true, rowIndex: sheet.getLastRow(), codigo: codigoToInsert };
}

// ── Funciones de compatibilidad ────────────────────────────────────

function _readSheet(sheetName, range) {
  const ss = _getSpreadsheet();
  // El frontend a veces usa _Registros (antes VentasDetallado). 
  // Redirigimos "_Registros" y "VentasDetallado" al nuevo INVENTARIO_SHEET
  if (sheetName === '_Registros' || sheetName === 'VentasDetallado') {
    sheetName = INVENTARIO_SHEET;
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  const data = range
    ? sheet.getRange(range).getValues()
    : sheet.getDataRange().getValues();
  return { values: data };
}

function _uploadToDrive(base64, filename, mimeType, loteNombre) {
  let rootFolder;
  const rootFolders = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (rootFolders.hasNext()) {
    rootFolder = rootFolders.next();
  } else {
    rootFolder = DriveApp.createFolder(DRIVE_FOLDER);
    rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  let targetFolder = rootFolder;
  if (loteNombre) {
    const loteClean = loteNombre.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 80);
    const subFolders = rootFolder.getFoldersByName(loteClean);
    if (subFolders.hasNext()) {
      targetFolder = subFolders.next();
    } else {
      targetFolder = rootFolder.createFolder(loteClean);
      targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  }

  const decoded = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', filename);
  const file = targetFolder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const url      = `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
  const thumbUrl = `https://lh3.googleusercontent.com/d/${fileId}=w200`;
  return { url, thumbUrl, fileId };
}

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

function _saveLotes(lotes) {
  const ss = _getSpreadsheet();
  const LOTES_SHEET = '_Lotes';
  let sheet = ss.getSheetByName(LOTES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOTES_SHEET);
    sheet.appendRow(['id', 'titulo', 'fechaCreacion', 'activo', 'equipos_json']);
    sheet.getRange(1, 1, 1, 5).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

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

function _loadLotes() {
  const ss = _getSpreadsheet();
  const LOTES_SHEET = '_Lotes';
  const sheet = ss.getSheetByName(LOTES_SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return { lotes: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const lotes = data
    .filter(row => row[0])
    .map(row => ({
      id: row[0],
      titulo: row[1],
      fechaCreacion: row[2],
      activo: row[3] === 'true',
      equipos: (() => { try { return JSON.parse(row[4] || '[]'); } catch { return []; } })(),
    }));

  return { lotes };
}

function _cors(output) {
  return output.setMimeType(ContentService.MimeType.JSON);
}
