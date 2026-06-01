/**
 * modulo-3-admin/admin-conexion.js — Inventario Pro v3
 * Lógica para la pestaña de Conexión, Apps Script, Google Drive y Gemini en Admin.
 */

const AdminConexion = (() => {

  function init() {
    window._adminGuardarGAS = guardarGAS;
    window._adminTestGAS = testGAS;
    window._adminTestDrive = testDrive;
    window._adminPreviewGemini = previewGemini;
    window._adminTestGemini = testGemini;
  }

  async function guardarGAS() {
    const url = document.getElementById('admin-gas-url')?.value?.trim() || '';
    const sheetName = document.getElementById('admin-sheets-sheet')?.value?.trim() || 'Buscador Historial';
    
    APP_CONFIG.sheets.sheetName = sheetName;
    localStorage.setItem('inv-pro-sheets-cfg', JSON.stringify({ sid: '', key: '', name: sheetName }));
    
    AppsScriptBridge.setUrl(url);
    localStorage.setItem('inv-pro-gas-url', url);
    Toast.success('Configuración guardada correctamente');
    SheetsAPI.invalidateCache();
    
    // Intentar cargar lotes automáticamente
    try {
      const stats = await LocalCache.loadLotesFromRemote();
      if (stats && stats.total > 0) {
        Toast.success(`Historial sincronizado: ${stats.total} lotes cargados`);
        window._histLotes = await LocalCache.getLotes();
      }
    } catch(e) {
      // Ignorar silenciosamente si no hay red o da error
    }
  }

  async function testGAS() {
    const r = document.getElementById('admin-gas-result');
    if (!r) return;
    if (window.location.protocol === 'file:') {
      r.innerHTML = '<span style="color:var(--warning)">⚠️ Error: "Failed to fetch" — Abre la app usando Live Server (Servidor local) y no file://</span>';
      return;
    }
    r.innerHTML = '<span class="spinner"></span> Probando conexión de Lectura y Escritura…';
    try {
      await guardarGAS();
      await AppsScriptBridge.testConnection();
      r.innerHTML = `<span style="color:var(--success)">✅ ¡Todo listo! Conexión exitosa a Google. Cargando lotes...</span>`;
      
      try {
        const stats = await LocalCache.loadLotesFromRemote();
        window._histLotes = await LocalCache.getLotes();
        let lotesMsg = stats && stats.total > 0 ? `<br>📦 Historial recuperado: <strong>${stats.total}</strong> lote(s)` : `<br>📦 No hay lotes históricos en la nube.`;
        r.innerHTML = `<span style="color:var(--success)">✅ ¡Todo listo! Conexión exitosa a Google.</span>${lotesMsg}`;
      } catch (e) {
        r.innerHTML = `<span style="color:var(--warning)">✅ Conexión exitosa, pero no se pudieron descargar los lotes: ${e.message}</span>`;
      }
    } catch (err) {
      let hint = '';
      if (err.message.includes('Failed to fetch') || err.name === 'AbortError' || err.message.includes('aborted')) {
        hint = '<br><span style="font-size:0.72rem;color:var(--text-muted)">💡 La conexión se está bloqueando. Si usas antivirus (Kaspersky, ESET) desactiva el escudo web un minuto. O prueba abriendo el link en pestaña de incógnito.</span>';
      }
      r.innerHTML = `<span style="color:var(--danger)">❌ ${err.message}</span>${hint}`;
    }
  }

  async function testDrive() {
    const r = document.getElementById('admin-drive-result');
    if (!r) return;
    if (!APP_CONFIG.appsScript.webAppUrl) {
      r.innerHTML = '<span style="color:var(--warning)">⚠️ Primero debes configurar la URL del Web App arriba.</span>';
      return;
    }
    r.innerHTML = '<span class="spinner"></span> Probando permisos de Google Drive…';
    try {
      const res = await AppsScriptBridge.testDrive();
      r.innerHTML = `<span style="color:var(--success)">✅ ¡Drive conectado! Carpeta: <strong>${res.name}</strong> <a href="${res.folderUrl}" target="_blank" style="margin-left:8px;color:var(--accent);text-decoration:underline">Abrir Carpeta</a></span>`;
    } catch (err) {
      r.innerHTML = `<span style="color:var(--danger)">❌ Error al conectar con Drive: ${err.message}</span>`;
    }
  }

  function previewGemini(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dz = document.getElementById('gemini-dropzone');
      const inner = document.getElementById('gemini-dropzone-inner');
      if (inner) {
        inner.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:6px">`;
      }
      window._geminiTestFile = file;
      const btn = document.getElementById('gemini-test-btn');
      if (btn) btn.disabled = false;
      const r = document.getElementById('admin-gemini-result');
      if (r) r.innerHTML = '';
    };
    reader.readAsDataURL(file);
  }

  async function testGemini() {
    const r = document.getElementById('admin-gemini-result');
    if (!r) return;
    if (!APP_CONFIG.appsScript.webAppUrl) {
      r.innerHTML = '<span style="color:var(--warning)">⚠️ Configura la URL de Apps Script primero (Tab Conexión).</span>';
      return;
    }
    if (!window._geminiTestFile) {
      r.innerHTML = '<span style="color:var(--warning)">⚠️ Selecciona una imagen primero.</span>';
      return;
    }

    const btn = document.getElementById('gemini-test-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando…'; }
    r.innerHTML = '<span class="spinner"></span> Enviando imagen a Gemini IA…';

    try {
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const maxDim = 1024;
            if (width > maxDim || height > maxDim) {
              if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
              else { width = Math.round((width * maxDim) / height); height = maxDim; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            res(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = () => rej(new Error('Error al procesar imagen'));
          img.src = e.target.result;
        };
        fr.onerror = () => rej(new Error('Error leyendo imagen'));
        fr.readAsDataURL(window._geminiTestFile);
      });
      const [header, base64] = dataUrl.split(',');
      const mimeType = 'image/jpeg';

      const res = await AppsScriptBridge.geminiOCR(base64, mimeType);
      const data = res.data || {};

      const labels = {
        descripcion: '🏷️ Descripción', marca: '🏭 Marca', modelo: '💻 Modelo', pn: '🔩 Part Number (PN)',
        serie: '🔢 Serie', sku: '📦 SKU', procesador: '⚡ Procesador',
        ram: '🧠 RAM', pantalla: '🖥️ Pantalla', notas: '📝 Notas'
      };

      const rows = Object.entries(labels)
        .filter(([k]) => data[k])
        .map(([k, label]) => `
          <tr>
            <td style="padding:7px 10px;font-size:0.75rem;color:var(--text-muted);font-weight:600;white-space:nowrap;border-bottom:1px solid var(--border)">${label}</td>
            <td style="padding:7px 10px;font-size:0.82rem;color:var(--text-primary);border-bottom:1px solid var(--border);font-weight:${k==='pn'?'700':'400'};color:${k==='pn'?'var(--accent)':'var(--text-primary)'}">${data[k]}</td>
          </tr>`).join('');

      if (rows) {
        r.innerHTML = `
          <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.3);border-radius:var(--radius-md);overflow:hidden;margin-top:8px">
            <div style="padding:10px 14px;background:rgba(34,197,94,0.12);font-weight:700;font-size:0.8rem;color:var(--success);display:flex;align-items:center;gap:6px">
              ✅ Gemini identificó los siguientes datos:
            </div>
            <table style="width:100%;border-collapse:collapse">${rows}</table>
            ${data.pn ? `
              <div style="padding:10px 14px;border-top:1px solid var(--border);background:var(--bg-hover)">
                <span style="font-size:0.72rem;color:var(--text-muted)">Buscar repuesto compatible:</span><br>
                <a href="https://www.google.com/search?q=${encodeURIComponent((data.pn||'')+' '+(data.modelo||'')+' repuesto compatible')}" target="_blank" style="color:var(--accent);font-size:0.8rem;text-decoration:underline">🔍 Buscar "${data.pn} ${data.modelo||''}" en Google</a>
              </div>` : ''}
          </div>`;
      } else {
        r.innerHTML = `<div style="color:var(--warning);font-size:0.8rem;margin-top:8px">⚠️ Gemini no pudo extraer datos de esta imagen. Intenta con una foto más clara y cerca de la etiqueta.</div>`;
      }
    } catch (err) {
      const isPermError = err.message.toLowerCase().includes('urlfetch') || err.message.toLowerCase().includes('permission') || err.message.toLowerCase().includes('authorization');
      const isKeyError  = err.message.includes('GEMINI_API_KEY no configurada');
      r.innerHTML = `
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius-md);padding:12px;margin-top:8px">
          <div style="color:var(--danger);font-weight:700;font-size:0.8rem;margin-bottom:6px">❌ ${err.message}</div>
          ${isPermError ? '<div style="font-size:0.75rem;color:var(--text-secondary)">💡 <strong>Fix:</strong> En Apps Script editor → Ejecutar → cualquier función → aparece popup → "Revisar permisos" → Aceptar todo. Solo se hace 1 vez.</div>' : ''}
          ${isKeyError  ? '<div style="font-size:0.75rem;color:var(--text-secondary)">💡 Sigue los pasos de la izquierda para agregar la propiedad <code>GEMINI_API_KEY</code> en Apps Script.</div>' : ''}
        </div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🤖 Analizar con Gemini'; }
    }
  }

  return { init };
})();

window.AdminConexion = AdminConexion;
