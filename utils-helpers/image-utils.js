/**
 * utils-helpers/image-utils.js — Inventario Pro v3
 * Utilidades centralizadas de imagen.
 * Elimina duplicación: antes existía la misma lógica en admin.view.js y flujo-soporte.js.
 */

const ImageUtils = (() => {

  /**
   * Comprime una imagen (File o Blob) a base64 JPEG.
   * @param {File|Blob} fileOrBlob
   * @param {number} maxDim — dimensión máxima en px (default 1024)
   * @param {number} quality — calidad JPEG 0-1 (default 0.8)
   * @returns {Promise<string>} base64 string SIN prefijo data:
   */
  async function compressToBase64(fileOrBlob, maxDim = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const [, base64] = dataUrl.split(',');
          resolve(base64);
        };
        img.onerror = () => reject(new Error('Error al procesar imagen'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error leyendo imagen'));
      reader.readAsDataURL(fileOrBlob);
    });
  }

  /**
   * Genera un preview en dataURL (para thumbnails rápidos).
   * @param {File|Blob} fileOrBlob
   * @param {number} maxDim — dimensión máxima (default 200)
   * @returns {Promise<string>} dataURL completo (con prefijo data:image/jpeg;base64,)
   */
  async function createPreview(fileOrBlob, maxDim = 200) {
    const base64 = await compressToBase64(fileOrBlob, maxDim, 0.6);
    return `data:image/jpeg;base64,${base64}`;
  }

  /**
   * Lee un archivo como dataURL completo (sin compresión).
   * @param {File} file
   * @returns {Promise<string>} dataURL
   */
  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsDataURL(file);
    });
  }

  return { compressToBase64, createPreview, readAsDataURL };
})();

window.ImageUtils = ImageUtils;
