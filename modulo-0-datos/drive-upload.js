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

  return { uploadFile, uploadDataURL, previewUrl, getBase64Preview };
})();

window.DriveUpload = DriveUpload;
