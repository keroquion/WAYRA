/**
 * modulo-0-datos/drive-upload.js
 * Subida de archivos a Supabase Storage (Mantiene el nombre DriveUpload por compatibilidad).
 * Flujo: File → Blob → Supabase Storage REST → URL Pública
 */

const DriveUpload = (() => {
  const MAX_SIZE_MB = 10;
  const BUCKET_NAME = 'fotos';

  // ── Helpers ──────────────────────────────────────────────────────
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  }

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

  async function uploadToSupabaseStorage(blob, filename, mimeType) {
    if (!APP_CONFIG.supabase || !APP_CONFIG.supabase.url) {
      throw new Error('Supabase no está configurado');
    }
    // Usar POST para crear nuevo archivo
    const url = `${APP_CONFIG.supabase.url}/storage/v1/object/${BUCKET_NAME}/${encodeURIComponent(filename)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': APP_CONFIG.supabase.anonKey,
        'Authorization': `Bearer ${APP_CONFIG.supabase.anonKey}`,
        'Content-Type': mimeType
      },
      body: blob
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error('Error al subir archivo a Supabase: ' + err);
    }

    return `${APP_CONFIG.supabase.url}/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(filename)}`;
  }

  // ── APIs Originales ──────────────────────────────────────────────
  async function uploadFile(file, onProgress = null) {
    if (!file) throw new Error('No se proporcionó archivo');

    const sizeMB = file.size / 1048576;
    if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo muy grande (máx ${MAX_SIZE_MB}MB)`);

    if (onProgress) onProgress(10, 'Subiendo a Supabase…');

    const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const url = await uploadToSupabaseStorage(file, filename, file.type);

    if (onProgress) onProgress(100, 'Listo');

    return url;
  }

  async function uploadDataURL(dataUrl, filename = 'captura.jpg', onProgress = null) {
    if (onProgress) onProgress(20, 'Preparando imagen…');

    let base64;
    let mimeType = 'image/jpeg';

    if (dataUrl.includes(',')) {
      // Es un Data URL: "data:image/jpeg;base64,XXXXX"
      const [header, b64] = dataUrl.split(',');
      base64 = b64;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else {
      // Ya es base64 puro
      base64 = dataUrl;
    }

    const blob = base64ToBlob(base64, mimeType);

    if (onProgress) onProgress(50, 'Subiendo a Supabase…');

    const url = await uploadToSupabaseStorage(blob, filename, mimeType);

    if (onProgress) onProgress(100, 'Listo');

    return url;
  }

  async function getBase64Preview(file) {
    const b64 = await _toBase64(file);
    return `data:${file.type};base64,${b64}`;
  }

  function previewUrl(file) {
    return URL.createObjectURL(file);
  }

  // Sube y retorna objeto completo por compatibilidad
  async function uploadFileWithMeta(file, onProgress = null, loteNombre = '', equipoCodigo = '') {
    if (!file) throw new Error('No se proporcionó archivo');

    let blob;
    let mimeType = 'image/jpeg';
    let filename = '';
    let sizeMB = 0;
    const actualOnProgress = typeof onProgress === 'function' ? onProgress : null;

    if (typeof file === 'string') {
      // Cadena Base64 o Data URL
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
      blob = base64ToBlob(base64Data, mimeType);
      const sizeBytes = blob.size;
      sizeMB = sizeBytes / 1048576;
      
      const ext = mimeType.split('/')[1] || 'jpg';
      const codigoPrefix = equipoCodigo ? `${equipoCodigo}_` : '';
      filename = `${codigoPrefix}${Date.now()}_evidencia.${ext}`;
    } else {
      // Objeto File o Blob
      blob = file;
      sizeMB = file.size / 1048576;
      mimeType = file.type || 'image/jpeg';
      const codigoPrefix = equipoCodigo ? `${equipoCodigo}_` : '';
      filename = `${codigoPrefix}${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    }

    if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo muy grande (máx ${MAX_SIZE_MB}MB)`);

    if (actualOnProgress) actualOnProgress(40, 'Subiendo a Supabase…');
    
    // Si queremos organizar por lote en carpetas, añadimos el lote al nombre
    const finalLote = typeof loteNombre === 'string' && loteNombre ? `${loteNombre}/` : '';
    const finalPath = finalLote + filename;

    const publicUrl = await uploadToSupabaseStorage(blob, finalPath, mimeType);
    
    if (actualOnProgress) actualOnProgress(100, 'Listo');

    return {
      url:      publicUrl,
      thumbUrl: publicUrl,
      fileId:   finalPath,
    };
  }

  return { uploadFile, uploadFileWithMeta, uploadDataURL, previewUrl, getBase64Preview };
})();

window.DriveUpload = DriveUpload;
