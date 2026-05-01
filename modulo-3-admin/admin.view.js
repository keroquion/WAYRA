/**
 * modulo-3-admin/admin.view.js
 * Vista protegida por PIN: empresa, catálogos, Apps Script, auditoría.
 */

const AdminView = (() => {

  async function render() {
    PinAuth.requestPin(
      () => _renderAdmin(),
      () => Views.go('ingreso')
    );
  }

  // ── Helper: tarjeta de estado de conexión ─────────────────────────
  function _statusCard(icon, title, status, msg, hint) {
    const colors = {
      ok:    { bg: 'rgba(34,197,94,0.1)',  border: 'var(--success)', dot: 'var(--success)', label: 'CONECTADO' },
      saved: { bg: 'rgba(79,110,247,0.1)', border: 'var(--accent)',  dot: 'var(--accent)',  label: 'GUARDADO'  },
      warn:  { bg: 'rgba(245,158,11,0.1)', border: 'var(--warning)', dot: 'var(--warning)', label: 'ATENCIÓN'  },
      empty: { bg: 'var(--bg-hover)',       border: 'var(--border)',  dot: 'var(--text-muted)', label: 'PENDIENTE' },
      error: { bg: 'rgba(239,68,68,0.1)',  border: 'var(--danger)',  dot: 'var(--danger)',  label: 'ERROR'     },
    };
    const c = colors[status] || colors.empty;
    return `
      <div style="background:${c.bg};border:1px solid ${c.border};border-radius:var(--radius-md);padding:14px 16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="width:10px;height:10px;border-radius:50%;background:${c.dot};display:inline-block;flex-shrink:0"></span>
          <span style="font-weight:700;font-size:0.82rem">${icon} ${title}</span>
          <span style="margin-left:auto;font-size:0.65rem;font-weight:700;color:${c.dot};letter-spacing:0.5px">${c.label}</span>
        </div>
        <div style="font-size:0.76rem;color:var(--text-secondary)">${msg}</div>
        ${hint ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">💡 ${hint}</div>` : ''}
      </div>
    `;
  }

  async function _renderAdmin() {
    const el = document.getElementById('view-admin');
    if (!el) return;

    const emp = APP_CONFIG.empresa;
    const isFileProto = window.location.protocol === 'file:';
    const hasGAS      = !!APP_CONFIG.appsScript.webAppUrl;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">⚙️ Administración</div>
          <div class="page-subtitle">Configuración del sistema — Acceso restringido</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onclick="PinAuth.logout();Views.go('ingreso')">🔒 Cerrar Sesión Admin</button>
        </div>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:16px">
        ${['Empresa','Catálogos','Conexión','Seguridad','Auditoría','Portabilidad','🤖 Gemini IA'].map((t,i)=>`
          <button class="btn btn-ghost admin-tab" id="admin-tab-${i}" onclick="_adminTab(${i})" style="border-radius:0;border-bottom:2px solid transparent;padding:10px 16px;font-size:0.82rem">${t}</button>
        `).join('')}
      </div>

      <!-- TAB EMPRESA -->
      <div class="admin-panel" id="admin-panel-0">
        <div class="card" style="max-width:520px">
          <div class="card-title">🏢 Datos de la Empresa</div>
          <div class="form-group">
            <label class="form-label">Nombre Empresa *</label>
            <input type="text" class="form-control" id="admin-emp-nombre" value="${emp.nombre}" placeholder="Petulap S.A.C.">
          </div>
          <div class="form-group">
            <label class="form-label">RUC</label>
            <input type="text" class="form-control" id="admin-emp-ruc" value="${emp.ruc}" placeholder="20000000000" maxlength="11">
          </div>
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" class="form-control" id="admin-emp-dir" value="${emp.direccion||''}" placeholder="Av. Ejemplo 123">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input type="text" class="form-control" id="admin-emp-tel" value="${emp.telefono||''}" placeholder="01-1234567">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="text" class="form-control" id="admin-emp-email" value="${emp.email||''}" placeholder="contacto@empresa.com">
            </div>
          </div>
          <button class="btn btn-primary" onclick="PerfilConfig.guardarEmpresa()">💾 Guardar Empresa</button>
        </div>
      </div>

      <!-- TAB CATÁLOGOS -->
      <div class="admin-panel" id="admin-panel-1" style="display:none">
        <div class="grid-2">
          <div>
            ${CatalogosCRUD.renderSeccion('marcas',       '🏷️ Marcas',          'Nueva marca')}
            ${CatalogosCRUD.renderSeccion('tiposEquipo',  '💻 Tipos de Equipo', 'Nuevo tipo')}
            ${CatalogosCRUD.renderSeccion('sucursales',   '🏢 Sucursales',      'Nueva sucursal')}
          </div>
          <div>
            ${CatalogosCRUD.renderSeccion('proveedores',   '🤝 Proveedores',    'Nuevo proveedor')}
            ${CatalogosCRUD.renderSeccion('tiposRepuesto', '🔩 Tipos Repuesto', 'Nuevo repuesto')}
          </div>
        </div>
      </div>

      <!-- TAB CONEXIÓN -->
      <div class="admin-panel" id="admin-panel-2" style="display:none">

        <!-- Panel de estado visual -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${_statusCard('🌐', 'Protocolo',
            isFileProto ? 'warn' : 'ok',
            isFileProto ? 'Abriendo como file:// — fetch bloqueado por el navegador' : 'HTTP — todo habilitado',
            isFileProto ? 'Abre con Live Server o servidor local para que funcione' : '')}
          ${_statusCard('🚀', 'Google Apps Script',
            hasGAS ? 'saved' : 'empty',
            hasGAS ? 'URL del Web App configurada' : 'Sin URL de Apps Script',
            hasGAS ? 'Todo listo (Lectura y Escritura unificadas)' : 'Despliega Code.gs y pega la URL')}
        </div>

        ${isFileProto ? `
        <div style="background:rgba(245,158,11,0.12);border:1px solid var(--warning);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:14px;display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:1.5rem;line-height:1">⚠️</span>
          <div style="font-size:0.8rem;line-height:1.7">
            <strong style="color:var(--warning)">Estás abriendo la app como archivo local (file://)</strong><br>
            Los navegadores bloquean las peticiones de red desde file://. Los botones <strong>Probar</strong> darán error <em>"Failed to fetch"</em>.<br><br>
            <strong>Solución (1 minuto):</strong><br>
            • En VS Code: instala la extensión <strong>Live Server</strong> → click derecho en <code class="inline-code">index.html</code> → <em>Open with Live Server</em><br>
            • O arrastra la carpeta <code class="inline-code">inventario-pro-v2</code> a <a href="https://app.netlify.com/drop" target="_blank" style="color:var(--accent);text-decoration:underline">netlify.com/drop</a> para URL pública gratis
          </div>
        </div>` : ''}

        <div class="grid-1" style="align-items:start">
          <!-- Apps Script Único -->
          <div class="card" style="max-width: 600px;">
            <div class="card-title">🚀 Base de Datos en Google Sheets (Vía Apps Script)</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Esta URL se encarga de TODO: <strong>Leer la base de datos, guardar registros y subir imágenes a Drive</strong>. ¡Ya no necesitas API Keys!
            </div>
            <details style="margin-bottom:12px">
              <summary style="font-size:0.78rem;font-weight:600;cursor:pointer;color:var(--text-secondary);padding:6px 0">📋 Instrucciones de despliegue (clic para ver)</summary>
              <div style="background:var(--bg-hover);border-radius:var(--radius-sm);padding:12px;margin-top:8px;font-size:0.78rem;line-height:1.8">
                1. Abre tu Google Sheet → <strong>Extensiones → Apps Script</strong><br>
                2. Borra todo y pega el contenido de <code class="inline-code">apps-script/Code.gs</code><br>
                3. <strong>Implementar → Nueva implementación</strong><br>
                4. Tipo: <strong>Aplicación web</strong><br>
                5. Ejecutar como: <strong>Yo</strong> · Acceso: <strong>Cualquier persona</strong><br>
                6. Haz clic en <strong>Implementar</strong> → autoriza los permisos<br>
                7. Copia la URL y pégala abajo
              </div>
            </details>
            <div class="form-group">
              <label class="form-label">Nombre de la Hoja (Donde están tus datos base)</label>
              <input type="text" class="form-control" id="admin-sheets-sheet" value="${APP_CONFIG.sheets.sheetName || 'Buscador Historial'}" placeholder="Buscador Historial">
              <div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">Ejemplo: Buscador Historial o VentasDetallado</div>
            </div>
            <div class="form-group">
              <label class="form-label">URL del Web App</label>
              <input type="text" class="form-control" id="admin-gas-url" value="${APP_CONFIG.appsScript.webAppUrl}" placeholder="https://script.google.com/macros/s/.../exec">
              <div style="font-size:0.68rem;color:var(--text-muted);margin-top:3px">Debe terminar en <code class="inline-code">/exec</code></div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" onclick="_adminGuardarGAS()" style="flex:1">💾 Guardar Configuración</button>
              <button class="btn btn-secondary" onclick="_adminTestGAS()">🔍 Probar Conexión</button>
            </div>
            <div id="admin-gas-result" style="margin-top:10px;font-size:0.78rem"></div>
          </div>
          
          <!-- Google Drive Status -->
          <div class="card" style="max-width: 600px; margin-top: 16px;">
            <div class="card-title">📁 Google Drive (Evidencias fotográficas)</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Verifica si el sistema tiene permisos para crear la carpeta y guardar las imágenes en Google Drive correctamente.
            </div>
            <button class="btn btn-secondary" onclick="_adminTestDrive()">🔍 Probar Conexión a Drive</button>
            <div id="admin-drive-result" style="margin-top:10px;font-size:0.78rem"></div>
          </div>
        </div>
      </div>

      <!-- TAB SEGURIDAD -->
      <div class="admin-panel" id="admin-panel-3" style="display:none">
        <div class="card" style="max-width:340px">
          <div class="card-title">🔐 Cambiar PIN de Administrador</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:14px">PIN por defecto: <code class="inline-code">1234</code></div>
          <div class="form-group">
            <label class="form-label">PIN Actual</label>
            <input type="password" class="form-control" id="admin-pin-actual" maxlength="4" placeholder="••••">
          </div>
          <div class="form-group">
            <label class="form-label">Nuevo PIN (4 dígitos)</label>
            <input type="password" class="form-control" id="admin-pin-nuevo" maxlength="4" placeholder="••••">
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Nuevo PIN</label>
            <input type="password" class="form-control" id="admin-pin-confirm" maxlength="4" placeholder="••••">
          </div>
          <button class="btn btn-primary" onclick="_adminCambiarPin()">🔐 Cambiar PIN</button>
        </div>
      </div>

      <!-- TAB AUDITORÍA -->
      <div class="admin-panel" id="admin-panel-4" style="display:none">
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span class="card-title" style="margin:0">📋 Historial de Auditoría</span>
            <button class="btn btn-secondary btn-sm" onclick="LocalCache.exportBackup()">💾 Backup JSON</button>
          </div>
          <div style="padding:12px;overflow-x:auto" id="audit-container">
            <div style="color:var(--text-muted);text-align:center;padding:20px">Cargando…</div>
          </div>
        </div>
      </div>

      <!-- TAB PORTABILIDAD -->
      <div class="admin-panel" id="admin-panel-5" style="display:none">
        <div class="grid-2" style="align-items:start">
          <div class="card">
            <div class="card-title">📤 Exportar Configuración</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Exporta empresa, catálogos y preferencias a un archivo JSON.<br>
              Útil para copiar la configuración a otra PC.
            </div>
            <button class="btn btn-primary" onclick="PerfilConfig.exportarConfig()">⬇️ Descargar config.json</button>
          </div>
          <div class="card">
            <div class="card-title">📥 Importar Configuración</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Importa un archivo de configuración previamente exportado.
            </div>
            <label class="drop-zone" style="display:block;cursor:pointer">
              <div class="drop-icon">📂</div>
              <div style="font-weight:600">Arrastra o haz clic para seleccionar</div>
              <div style="font-size:0.75rem;margin-top:4px">Archivo .json</div>
              <input type="file" accept=".json" style="display:none" onchange="_adminImportarConfig(this)">
            </label>
          </div>
        </div>
      </div>

      <!-- TAB GEMINI IA -->
      <div class="admin-panel" id="admin-panel-6" style="display:none">
        <div class="grid-2" style="align-items:start">

          <!-- Instrucciones -->
          <div class="card">
            <div class="card-title">🤖 Gemini IA — OCR de Etiquetas</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">
              Sube una foto de cualquier etiqueta de hardware para que Gemini extraiga los datos clave.
              <br><br>
              <strong>La API Key se guarda en Apps Script</strong>, funciona desde cualquier equipo.
            </div>

            <div style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(99,102,241,0.08));border:1px solid rgba(124,58,237,0.3);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:14px">
              <div style="font-weight:700;font-size:0.82rem;margin-bottom:10px;color:var(--accent)">📋 Configurar API Key (solo 1 vez):</div>
              <ol style="font-size:0.78rem;line-height:2.1;color:var(--text-secondary);margin:0;padding-left:18px">
                <li>Ve a <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent);text-decoration:underline">aistudio.google.com/app/apikey</a> → crear API Key</li>
                <li>En Apps Script editor → <strong>⚙️ Configuración del proyecto</strong></li>
                <li>Sección <strong>"Propiedades de secuencia de comandos"</strong> → Agregar</li>
                <li>Nombre: <code class="inline-code">GEMINI_API_KEY</code> · Valor: tu key</li>
                <li>Guardar ✅</li>
              </ol>
            </div>

            <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-md);padding:10px 12px;font-size:0.75rem">
              <strong style="color:var(--warning)">⚠️ Error de permisos al primer uso:</strong><br>
              <span style="color:var(--text-secondary)">En Apps Script, ve a <strong>Ejecutar → cualquier función</strong> → aparecerá un popup → <strong>"Revisar permisos"</strong> → acepta todo. Solo se hace una vez.</span>
            </div>
          </div>

          <!-- Probador de imagen -->
          <div class="card">
            <div class="card-title">🧪 Probar con imagen real</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px">
              Sube una foto de etiqueta, teclado, pantalla o cualquier pieza de hardware.
            </div>

            <!-- Drop zone / preview -->
            <div id="gemini-dropzone" style="border:2px dashed var(--border);border-radius:var(--radius-md);min-height:140px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;margin-bottom:12px;cursor:pointer;transition:border-color 0.2s;overflow:hidden;position:relative"
                 onclick="document.getElementById('gemini-test-file').click()"
                 onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
              <div id="gemini-dropzone-inner" style="text-align:center;padding:16px">
                <div style="font-size:2.5rem;margin-bottom:6px">📷</div>
                <div style="font-size:0.82rem;font-weight:600">Haz clic para seleccionar imagen</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">o toma foto con la cámara</div>
              </div>
            </div>

            <div style="display:flex;gap:8px;margin-bottom:12px">
              <label style="flex:1;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;background:var(--bg-hover);border:1px dashed var(--border);border-radius:var(--radius-md);font-size:0.8rem" onclick="document.getElementById('gemini-test-file').click()">
                📁 Archivo
              </label>
              <label style="flex:1;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;background:var(--bg-hover);border:1px dashed var(--border);border-radius:var(--radius-md);font-size:0.8rem">
                📷 Cámara
                <input type="file" accept="image/*" capture="environment" style="display:none" onchange="_adminPreviewGemini(this)">
              </label>
            </div>

            <input type="file" id="gemini-test-file" accept="image/*" style="display:none" onchange="_adminPreviewGemini(this)">

            <button id="gemini-test-btn" class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="_adminTestGemini()" disabled>
              🤖 Analizar con Gemini
            </button>

            <div id="admin-gemini-result" style="font-size:0.78rem"></div>
          </div>

        </div>
      </div>
    `;

    // ── Handlers globales (ANTES de _adminTab) ──────────────────────
    window._adminTab = (i) => {
      document.querySelectorAll('.admin-panel').forEach((p,j)=> p.style.display = j===i?'':'none');
      document.querySelectorAll('.admin-tab').forEach((b,j)=>{
        b.style.borderBottomColor = j===i ? 'var(--accent)' : 'transparent';
        b.style.color = j===i ? 'var(--accent)' : '';
      });
      if (i===4) AuditTrail.renderTo('audit-container');
    };

    // ── Preview de imagen en drop zone ──────────────────────────────
    window._adminPreviewGemini = (input) => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dz = document.getElementById('gemini-dropzone');
        const inner = document.getElementById('gemini-dropzone-inner');
        if (inner) {
          inner.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:200px;object-fit:contain;border-radius:6px">`;
        }
        // Guardar archivo en variable global para el botón Analizar
        window._geminiTestFile = file;
        const btn = document.getElementById('gemini-test-btn');
        if (btn) btn.disabled = false;
        // Limpiar resultado anterior
        const r = document.getElementById('admin-gemini-result');
        if (r) r.innerHTML = '';
      };
      reader.readAsDataURL(file);
    };

    window._adminTestGemini = async () => {
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
        // Convertir y comprimir imagen (resize max 1024px) para evitar payload enorme en móviles
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

        // Mapeo de labels para mostrar
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
    };

    window._adminGuardarGAS = async () => {
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
        // Ignorar silenciosamente si no hay red o da error, el Test mostrará el error real.
      }
    };

    window._adminTestGAS = async () => {
      const r = document.getElementById('admin-gas-result');
      if (!r) return;
      if (window.location.protocol === 'file:') {
        r.innerHTML = '<span style="color:var(--warning)">⚠️ Error: "Failed to fetch" — Abre la app usando Live Server (Servidor local) y no file://</span>';
        return;
      }
      r.innerHTML = '<span class="spinner"></span> Probando conexión de Lectura y Escritura…';
      try {
        await window._adminGuardarGAS();
        // Solo hacemos un ping ultra-rápido para probar que los permisos están bien
        await AppsScriptBridge.testConnection();
        r.innerHTML = `<span style="color:var(--success)">✅ ¡Todo listo! Conexión exitosa a Google. Cargando lotes...</span>`;
        
        // Cargar lotes con notificación
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
    };

    window._adminTestDrive = async () => {
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
    };

    window._adminCambiarPin = async () => {
      const actual  = (document.getElementById('admin-pin-actual')?.value || '').trim();
      const nuevo   = (document.getElementById('admin-pin-nuevo')?.value || '').trim();
      const confirmVal = (document.getElementById('admin-pin-confirm')?.value || '').trim();
      if (!actual) { Toast.warning('Ingresa el PIN actual'); return; }
      if (nuevo !== confirmVal) { Toast.warning('Los PINs no coinciden'); return; }
      const errPin = Validators.pin(nuevo);
      if (errPin) { Toast.warning(errPin); return; }
      const savedHash  = await LocalCache.getConfig('inv-admin-pin');
      const actualHash = await PinAuth.hashPin(actual);
      if (savedHash && actualHash !== savedHash) { Toast.error('PIN actual incorrecto'); return; }
      try { await PinAuth.changePin(nuevo); Toast.success('PIN cambiado ✅'); } catch(e) { Toast.error(e.message); }
    };

    window._adminImportarConfig = async (input) => {
      const file = input.files[0];
      if (!file) return;
      await PerfilConfig.importarConfig(file);
      input.value = '';
      render();
    };

    // Activar primer tab
    _adminTab(0);
  }

  return { render };
})();

window.AdminView = AdminView;
