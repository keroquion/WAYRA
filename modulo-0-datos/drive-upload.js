/**
 * modulo-0-datos/drive-upload.js
 * Subida de archivos a Google Drive via Apps Script Bridge.
 * Flujo: File → FileReader (Base64) → AppsScriptBridge.uploadToDrive → URL
 */

const DriveUpload = (() => {
  const MAX_SIZE_MB = 10;

  // ── Subir desde File object ──────────────────────────────────────
  async function uploadFile(file, onProgress = null) {
    if (!file) throw new Error('No se proporcionó archivo');

    const sizeMB = file.size / 1048576;
    if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo muy grande (máx ${MAX_SIZE_MB}MB)`);

    if (onProgress) onProgress(10, 'Leyendo archivo…');

    const base64 = await _toBase64(file);
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    if (onProgress) onProgress(40, 'Subiendo a Drive…');

    const result = await AppsScriptBridge.uploadToDrive(base64, filename, file.type);

    if (onProgress) onProgress(100, 'Listo');

    return result.url || result.fileUrl || '';
  }

  // ── Subir desde canvas/dataURL ───────────────────────────────────
  async function uploadDataURL(dataUrl, filename = 'captura.jpg', onProgress = null) {
    if (onProgress) onProgress(20, 'Preparando imagen…');

    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    if (onProgress) onProgress(50, 'Subiendo a Drive…');

    const result = await AppsScriptBridge.uploadToDrive(base64, filename, mimeType);

    if (onProgress) onProgress(100, 'Listo');

    return result.url || result.fileUrl || '';
  }

  // ── FileReader → Base64 ──────────────────────────────────────────
  function _toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const [, base64] = e.target.result.split(',');
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  }

  // ── Si no hay Apps Script, usar URL.createObjectURL como fallback ─
  // ── Convertir a Base64 para guardarlo en IndexedDB y evitar que se rompa ─
  async function getBase64Preview(file) {
    const b64 = await _toBase64(file);
    return `data:${file.type};base64,${b64}`;
  }

  function previewUrl(file) {
    return URL.createObjectURL(file);
  }

  // ── Subir y retornar objeto completo (url + thumbUrl + fileId) ───
  // loteNombre: nombre del lote (será la subcarpeta en Drive)
  // equipoCodigo: código del equipo (prefijo del nombre de archivo)
  async function uploadFileWithMeta(file, onProgress = null, loteNombre = '', equipoCodigo = '') {
    if (!file) throw new Error('No se proporcionó archivo');

    let base64 = '';
    let mimeType = 'image/jpeg';
    let filename = '';
    let sizeMB = 0;
    const actualOnProgress = typeof onProgress === 'function' ? onProgress : null;

    if (typeof file === 'string') {
      // Es una cadena Base64 o Data URL
      let base64Data = file;
      if (file.includes(',')) {
        const parts = file.split(',');
        const header = parts[0];
        base64Data = parts[1];
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) mimeType = mimeMatch[1];
      } else {
        if (typeof onProgress === 'string') {
          mimeType = onProgress;
        }
      }
      base64 = base64Data;
      const sizeBytes = base64.length * 0.75;
      sizeMB = sizeBytes / 1048576;
      
      const ext = mimeType.split('/')[1] || 'jpg';
      const codigoPrefix = equipoCodigo ? `${equipoCodigo}_` : '';
      filename = `${codigoPrefix}${Date.now()}_evidencia.${ext}`;
    } else {
      // Es un objeto File o Blob
      sizeMB = file.size / 1048576;
      if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo muy grande (máx ${MAX_SIZE_MB}MB)`);
      if (actualOnProgress) actualOnProgress(10, 'Leyendo archivo…');
      base64 = await _toBase64(file);
      mimeType = file.type || 'image/jpeg';
      const codigoPrefix = equipoCodigo ? `${equipoCodigo}_` : '';
      filename = `${codigoPrefix}${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    }

    if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo muy grande (máx ${MAX_SIZE_MB}MB)`);

    if (actualOnProgress) actualOnProgress(40, 'Subiendo a Drive…');
    
    const finalLote = typeof loteNombre === 'string' ? loteNombre : '';
    const result = await AppsScriptBridge.uploadToDrive(base64, filename, mimeType, finalLote);
    
    if (actualOnProgress) actualOnProgress(100, 'Listo');

    return {
      url:      result.url || result.fileUrl || '',
      thumbUrl: result.thumbUrl || result.url || '',
      fileId:   result.fileId || null,
    };
  }

  return { uploadFile, uploadFileWithMeta, uploadDataURL, previewUrl, getBase64Preview };
})();

window.DriveUpload = DriveUpload;
