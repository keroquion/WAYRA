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
      case 'writeRow':
        result = _writeAsset(body.rowData);
        break;
      case 'updateRow':
        result = _updateRow(body.sheetName, body.rowIndex, body.rowData);
        break;
      case 'deleteRow':
        result = _deleteRow(body.sheetName, body.codigo);
        break;
      case 'clearDatabase':
        result = _clearDatabase();
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
      case 'testDrive':
        result = _testDrive();
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
      case 'saveRepuestosDB':
        result = _saveRepuestosDB(body.entries);
        break;
      case 'loadRepuestosDB':
        result = _loadRepuestosDB();
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

function _hasHeaderRow(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  return firstRow.some(h => {
    const header = String(h || '').trim().toUpperCase();
    return header === 'CODIGO' || header === 'SERIE' || header === 'ESTADO' || header === 'MARCA';
  });
}

function _getNextCode() {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(INVENTARIO_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(INVENTARIO_SHEET);
    sheet.appendRow(['SERIE','CODIGO','TIP_EQUIP','MARCA','MODELO','PROCESADOR','RAM','HD_SSD','PANTALLA','CASE','RESOLUCION','PULGADAS','SUCURSAL','ESTADO','OBSERVACION','FEC_COMPRA','DOC_COMPRA','FEC_VENTA','DOC_VENTA','USUARIO_ASIGNADO','DNI','CARGO','AREA_DEPARTAMENTO','IP','PERFIL_RED']);
    sheet.getRange(1, 1, 1, 19).setBackground('#4a86e8').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    return 'WYR-10001';
  }

  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 'WYR-10001';
  
  const hasHeaders = _hasHeaderRow(sheet);
  if (hasHeaders && lastRow === 1) return 'WYR-10001';

  const startRow = hasHeaders ? 2 : 1;
  const numRows = lastRow - startRow + 1;
  if (numRows <= 0) return 'WYR-10001';

  // Leemos la columna B (CODIGO)
  const codigos = sheet.getRange(startRow, 2, numRows, 1).getValues();
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
    sheet.appendRow(['SERIE','CODIGO','TIP_EQUIP','MARCA','MODELO','PROCESADOR','RAM','HD_SSD','PANTALLA','CASE','RESOLUCION','PULGADAS','SUCURSAL','ESTADO','OBSERVACION','FEC_COMPRA','DOC_COMPRA','FEC_VENTA','DOC_VENTA','USUARIO_ASIGNADO','DNI','CARGO','AREA_DEPARTAMENTO','IP','PERFIL_RED']);
  }
  
  const values = _prepareRowValues(sheet, rowData);
  const codigoToInsert = values[1]; // Columna B es index 1
  
  if (codigoToInsert) {
    const lastRow = sheet.getLastRow();
    const hasHeaders = _hasHeaderRow(sheet);
    const startRow = hasHeaders ? 2 : 1;
    const numRows = lastRow - startRow + 1;
    
    if (numRows > 0) {
      const codigos = sheet.getRange(startRow, 2, numRows, 1).getValues();
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

// ── Funciones de compatibilidad y operaciones ───────────────────────

function _prepareRowValues(sheet, rowData, existingRowIndex) {
  if (Array.isArray(rowData)) {
    return rowData;
  }
  // Es un objeto
  let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  if (!_hasHeaderRow(sheet)) {
    headers = ['SERIE','CODIGO','TIP_EQUIP','MARCA','MODELO','PROCESADOR','RAM','HD_SSD','PANTALLA','CASE','RESOLUCION','PULGADAS','SUCURSAL','ESTADO','OBSERVACION','FEC_COMPRA','DOC_COMPRA','FEC_VENTA','DOC_VENTA','USUARIO_ASIGNADO','DNI','CARGO','AREA_DEPARTAMENTO','IP','PERFIL_RED'];
  }
  const existingValues = existingRowIndex 
    ? sheet.getRange(existingRowIndex, 1, 1, headers.length).getValues()[0]
    : [];
    
  return headers.map((h, idx) => {
    const key = String(h || '').trim().replace(/[.\s/]/g, '_').toUpperCase();
    if (rowData && rowData[key] !== undefined) {
      return rowData[key];
    }
    return existingRowIndex ? existingValues[idx] : "";
  });
}

function _updateRow(sheetName, rowIndex, rowData) {
  const ss = _getSpreadsheet();
  if (sheetName === '_Registros' || sheetName === 'VentasDetallado' || sheetName === 'Buscador Historial') {
    sheetName = INVENTARIO_SHEET;
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  
  const values = _prepareRowValues(sheet, rowData, rowIndex);
  sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  return { ok: true };
}

function _deleteRow(sheetName, codigo) {
  const ss = _getSpreadsheet();
  if (sheetName === '_Registros' || sheetName === 'VentasDetallado' || sheetName === 'Buscador Historial') {
    sheetName = INVENTARIO_SHEET;
  }
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja no encontrada: ' + sheetName);
  
  if (!codigo) throw new Error('Se requiere el código para eliminar');

  const data = sheet.getDataRange().getValues();
  const headers = data[0] || [];
  const codIndex = headers.findIndex(h => String(h).toUpperCase() === 'CODIGO');
  
  if (codIndex === -1) throw new Error('Columna CODIGO no encontrada en la hoja');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][codIndex]).trim() === String(codigo).trim()) {
      sheet.deleteRow(i + 1);
      return { ok: true, deleted: true };
    }
  }
  
  return { ok: true, deleted: false, message: 'Fila no encontrada con el código ' + codigo };
}

function _clearDatabase() {
  const ss = _getSpreadsheet();
  const sheetsToClear = [INVENTARIO_SHEET, AUDIT_SHEET, '_Lotes'];
  
  sheetsToClear.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow > 1) {
        // Borramos todo excepto la fila 1 (los encabezados)
        // Eliminamos las filas físicamente para asegurar reset completo
        sheet.deleteRows(2, lastRow - 1);
      }
    }
  });
  
  return { ok: true };
}

function _readSheet(sheetName, range) {
  const ss = _getSpreadsheet();
  // El frontend a veces usa _Registros (antes VentasDetallado). 
  // Redirigimos "_Registros", "VentasDetallado" y "Buscador Historial" al nuevo INVENTARIO_SHEET
  if (sheetName === '_Registros' || sheetName === 'VentasDetallado' || sheetName === 'Buscador Historial') {
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

// ── Guardar Repuestos DB en hoja _RepuestosDB ──────────────────────
function _saveRepuestosDB(entries) {
  if (!entries || !Array.isArray(entries)) return { saved: 0 };
  const ss    = _getSpreadsheet();
  const SHEET = '_RepuestosDB';
  let sheet   = ss.getSheetByName(SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET);
    const headers = ['key', 'repuesto', 'modelo', 'modelo_normalizado', 'pn', 'usos', 'updatedAt'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0f766e').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 7).clearContent();

  const rows = [];
  for (const e of entries) {
    if (!e.modelos || !e.modelos.length) continue;
    for (const m of e.modelos) {
      rows.push([
        e.key        || '',
        e.repuesto   || '',
        m.modelo     || '',
        (m.modelo||'').toLowerCase().replace(/[^a-z0-9]/g,''),
        m.pn         || '',
        m.usos       || 1,
        e.updatedAt  || new Date().toISOString(),
      ]);
    }
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  return { saved: rows.length };
}

// ── Cargar Repuestos DB desde _RepuestosDB ─────────────────────────
function _loadRepuestosDB() {
  const ss    = _getSpreadsheet();
  const SHEET = '_RepuestosDB';
  const sheet = ss.getSheetByName(SHEET);
  if (!sheet || sheet.getLastRow() <= 1) return { entries: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();

  const map = {};
  for (const row of data) {
    const [key, repuesto, modelo, , pn, usos, updatedAt] = row;
    if (!key) continue;
    if (!map[key]) map[key] = { key, repuesto, modelos: [], pn: '', updatedAt };
    if (modelo) {
      map[key].modelos.push({ modelo, pn: pn || '', usos: Number(usos) || 1 });
      if (pn) map[key].pn = pn;
    }
  }

  return { entries: Object.values(map) };
}
