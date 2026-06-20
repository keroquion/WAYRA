/**
 * modulo-3-admin/admin.view.js
 * Vista protegida por PIN: empresa, catálogos, Apps Script, auditoría.
 * ORQUESTADOR (Refactorizado)
 */

const AdminView = (() => {

  async function render() {
    PinAuth.requestPin(
      () => _renderAdmin(),
      () => Views.go('ingreso')
    );
  }

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

      <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:16px">
        ${['Empresa','Catálogos','Conexión','Seguridad','Auditoría','Portabilidad','🤖 Gemini IA','🗄️ Repuestos DB'].map((t,i)=>`
          <button class="btn btn-ghost admin-tab" id="admin-tab-${i}" onclick="AdminView.switchTab(${i})" style="border-radius:0;border-bottom:2px solid transparent;padding:10px 16px;font-size:0.82rem">${t}</button>
        `).join('')}
      </div>

      <!-- TAB EMPRESA -->
      <div class="admin-panel" id="admin-panel-0">
        <div class="card" style="max-width:520px">
          <div class="card-title">🏢 Datos de la Empresa</div>
          <div class="form-group">
            <label class="form-label">Nombre Empresa *</label>
            <input type="text" class="form-control" id="admin-emp-nombre" value="${emp.nombre}" placeholder="Wayra">
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
            Los navegadores bloquean las peticiones de red desde file://.<br><br>
            <strong>Solución (1 minuto):</strong><br>
            • En VS Code: instala la extensión <strong>Live Server</strong> → click derecho en <code class="inline-code">index.html</code> → <em>Open with Live Server</em><br>
            • O arrastra la carpeta <code class="inline-code">inventario-pro-v2</code> a <a href="https://app.netlify.com/drop" target="_blank" style="color:var(--accent);text-decoration:underline">netlify.com/drop</a> para URL pública gratis
          </div>
        </div>` : ''}

        <div class="grid-1" style="align-items:start">
          <div class="card" style="max-width: 600px;">
            <div class="card-title">🚀 Base de Datos en Google Sheets (Vía Apps Script)</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Esta URL se encarga de TODO: <strong>Leer la base de datos, guardar registros y subir imágenes a Drive</strong>. ¡Ya no necesitas API Keys!
            </div>
            <details style="margin-bottom:12px">
              <summary style="font-size:0.78rem;font-weight:600;cursor:pointer;color:var(--text-secondary);padding:6px 0">📋 Instrucciones de despliegue (clic para ver)</summary>
              <div style="background:var(--bg-hover);border-radius:var(--radius-sm);padding:12px;margin-top:8px;font-size:0.78rem;line-height:1.8">
                1. Abre tu Google Sheet → <strong>Extensiones → Apps Script</strong><br>
                2. Borra todo y pega el contenido de <code class="inline-code">apps-script/CodeWayra.gs</code><br>
                3. <strong>Implementar → Nueva implementación</strong><br>
                4. Tipo: <strong>Aplicación web</strong><br>
                5. Ejecutar como: <strong>Yo</strong> · Acceso: <strong>Cualquier persona</strong><br>
                6. Haz clic en <strong>Implementar</strong> → autoriza los permisos<br>
                7. Copia la URL y pégala abajo
              </div>
            </details>
            <div class="form-group">
              <label class="form-label">Nombre de la Hoja</label>
              <input type="text" class="form-control" id="admin-sheets-sheet" value="${APP_CONFIG.sheets.sheetName || 'InventarioTI'}" placeholder="InventarioTI">
            </div>
            <div class="form-group">
              <label class="form-label">URL del Web App</label>
              <input type="text" class="form-control" id="admin-gas-url" value="${APP_CONFIG.appsScript.webAppUrl}" placeholder="https://script.google.com/macros/s/.../exec">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary" onclick="AdminConexion.guardarGAS()" style="flex:1">💾 Guardar Configuración</button>
              <button class="btn btn-secondary" onclick="AdminConexion.testGAS()">🔍 Probar Conexión</button>
            </div>
            <div id="admin-gas-result" style="margin-top:10px;font-size:0.78rem"></div>
          </div>
          
          <div class="card" style="max-width: 600px; margin-top: 16px;">
            <div class="card-title">📁 Google Drive (Evidencias fotográficas)</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Verifica si el sistema tiene permisos para crear la carpeta y guardar las imágenes en Google Drive correctamente.
            </div>
            <button class="btn btn-secondary" onclick="AdminConexion.testDrive()">🔍 Probar Conexión a Drive</button>
            <div id="admin-drive-result" style="margin-top:10px;font-size:0.78rem"></div>
          </div>
        </div>
      </div>

      <!-- TAB SEGURIDAD -->
      <div class="admin-panel" id="admin-panel-3" style="display:none">
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:start">
          <div class="card" style="max-width:340px;flex:1">
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
            <button class="btn btn-primary" onclick="AdminView.cambiarPin()">🔐 Cambiar PIN</button>
          </div>

          <div class="card" style="max-width:380px;flex:1">
            <div class="card-title">🧹 Limpieza de Datos y Caché</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px">
              Borra toda la base de datos local (IndexedDB) y caché del navegador en este dispositivo. 
              <strong>Se cerrará la sesión y se restablecerá la configuración</strong>. 
              Si tienes otras pestañas o ventanas de la aplicación abiertas en este dispositivo, se reiniciarán automáticamente.
            </div>
            <button class="btn btn-danger" onclick="AdminView.limpiarBaseDatosLocal()" style="width:100%">🧹 Limpiar Base de Datos y Caché</button>
          </div>

          <!-- HARD RESET NUBE -->
          <div class="card" style="border: 2px solid #ef4444; background: #fff1f2;">
            <div class="card-title" style="color:#b91c1c">⚠️ Peligro: Vaciar Nube (Google Sheets)</div>
            <div style="font-size:0.8rem;color:#991b1b;margin-bottom:14px">
              Borra TODO el contenido de Google Sheets (Inventario, Auditoría y Lotes) dejando solo las cabeceras. <strong>Esta acción es IRREVERSIBLE</strong> y borrará los datos de todos los usuarios de la empresa.
            </div>
            <button class="btn btn-danger" onclick="AdminView.hardResetCloud()" style="width:100%;background:#dc2626;border-color:#b91c1c">💥 Vaciar Todo (Hard Reset)</button>
          </div>

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
              Exporta empresa, catálogos y preferencias a un archivo JSON.
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
              <input type="file" accept=".json" style="display:none" onchange="AdminView.importarConfig(this)">
            </label>
          </div>
        </div>
      </div>

      <!-- TAB GEMINI IA -->
      <div class="admin-panel" id="admin-panel-6" style="display:none">
        <div class="grid-2" style="align-items:start">
          <div class="card">
            <div class="card-title">🤖 Gemini IA — OCR de Etiquetas</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">
              Sube una foto de cualquier etiqueta de hardware para que Gemini extraiga los datos clave.
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
          </div>

          <div class="card">
            <div class="card-title">🧪 Probar con imagen real</div>
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
                <input type="file" accept="image/*" capture="environment" style="display:none" onchange="AdminConexion.previewGemini(this)">
              </label>
            </div>
            <input type="file" id="gemini-test-file" accept="image/*" style="display:none" onchange="AdminConexion.previewGemini(this)">
            <button id="gemini-test-btn" class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="AdminConexion.testGemini()" disabled>
              🤖 Analizar con Gemini
            </button>
            <div id="admin-gemini-result" style="font-size:0.78rem"></div>
          </div>
        </div>
      </div>

      <!-- TAB REPUESTOS DB (tab 7) -->
      <div class="admin-panel" id="admin-panel-7" style="display:none">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
          <input type="text" class="form-control" id="rep-db-search"
            placeholder="🔍 Buscar por modelo, repuesto o PN…"
            oninput="AdminRepuestosDB.filtrarRepuestos(this.value)"
            style="width:100%;max-width:300px;margin-bottom:12px;padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-card);color:var(--text-primary)">
          <button class="btn btn-secondary btn-sm" onclick="AdminRepuestosDB.syncRepuestosDB()">☁️ Sincronizar con Sheets</button>
        </div>
        
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:10px">➕ Añadir Repuesto Manualmente</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <div style="flex:1;min-width:140px">
              <label class="form-label" style="font-size:0.75rem;margin-bottom:4px">Repuesto *</label>
              <select id="rep-db-nuevo-repuesto" class="form-control" style="padding:6px 10px">
                <option value="">-- Seleccionar --</option>
                ${(APP_CONFIG.catalogos?.tiposRepuesto||[]).map(t => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div style="flex:1;min-width:140px">
              <label class="form-label" style="font-size:0.75rem;margin-bottom:4px">Modelo de Equipo *</label>
              <input type="text" id="rep-db-nuevo-modelo" class="form-control" placeholder="Ej: ThinkPad T490" style="padding:6px 10px">
            </div>
            <div style="flex:1;min-width:140px">
              <label class="form-label" style="font-size:0.75rem;margin-bottom:4px">Part Number (PN)</label>
              <input type="text" id="rep-db-nuevo-pn" class="form-control" placeholder="Ej: 02DL007" style="padding:6px 10px">
            </div>
            <button class="btn btn-primary" onclick="AdminRepuestosDB.agregarManual()" style="height:35px;margin-bottom:2px">💾 Guardar</button>
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span class="card-title" style="margin:0">🗄️ Base de Datos Repuestos × Modelo</span>
            <span id="rep-db-count" style="font-size:0.75rem;color:var(--text-muted)"></span>
          </div>
          <div style="overflow-x:auto" id="rep-db-tabla"></div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="card-title">🔗 Aliases de Modelos</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">
            Agrupa nombres de modelos que son lo mismo. Ej: <code class="inline-code">HP ProBook 640 G8</code> = <code class="inline-code">PROBOOK 640G8</code>.<br>
            El sistema ya normaliza automáticamente, pero aquí puedes forzar equivalencias manuales.
          </div>
          <div id="aliases-lista" style="margin-bottom:10px"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input type="text" class="form-control" id="alias-modelo-a" placeholder="Modelo A (nombre en la base)" style="flex:1;min-width:160px">
            <input type="text" class="form-control" id="alias-modelo-b" placeholder="Modelo B (alias equivalente)" style="flex:1;min-width:160px">
            <button class="btn btn-primary" onclick="AdminRepuestosDB.guardarAlias()">➕ Agregar alias</button>
          </div>
        </div>
      </div>
    `;

    AdminConexion.init();
    AdminRepuestosDB.init();

    switchTab = (i) => {
      document.querySelectorAll('.admin-panel').forEach((p,j)=> p.style.display = j===i?'':'none');
      document.querySelectorAll('.admin-tab').forEach((b,j)=>{
        b.style.borderBottomColor = j===i ? 'var(--accent)' : 'transparent';
        b.style.color = j===i ? 'var(--accent)' : '';
      });
      if (i===4) AuditTrail.renderTo('audit-container');
      if (i===7) AdminRepuestosDB.render();
    };

    cambiarPin = async () => {
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

    importarConfig = async (input) => {
      const file = input.files[0];
      if (!file) return;
      await PerfilConfig.importarConfig(file);
      input.value = '';
      render();
    };

    limpiarBaseDatosLocal = async () => {
      if (!confirm('⚠️ ¿Estás seguro de que deseas borrar toda la información local y caché de este dispositivo y de todas las pestañas abiertas?\n\nSe cerrará la sesión y se borrarán la configuración de Sheets, el historial local y la caché. Esto no afectará los datos reales de tu Google Sheet.')) return;
      
      try {
        const channel = new BroadcastChannel('app-cache-reset');
        channel.postMessage('clear_and_reload');
      } catch(e) {}

      try {
        await LocalCache.clear('equipos');
        await LocalCache.clear('lotes');
        await LocalCache.clear('audit');
        await LocalCache.clear('sync_queue');
        await LocalCache.clear('catalogos');
        await LocalCache.clear('config');
        await LocalCache.clear('repuestos_db');
      } catch(e) {}

      localStorage.clear();

      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        } catch(e) {}
      }

      alert('✅ Base de datos local y caché eliminadas. La página se reiniciará.');
      location.reload(true);
    };

    async function hardResetCloud() {
      const p1 = prompt('⚠️ ATENCIÓN: Estás a punto de vaciar TODA la base de datos de la empresa en la nube (Google Sheets).\n\nSi estás seguro, escribe "CONFIRMAR" (en mayúsculas):');
      if (p1 !== 'CONFIRMAR') {
        Toast.info('Operación cancelada');
        return;
      }
      
      const p2 = prompt('¿Deseas limpiar también la memoria caché local después de vaciar la nube? (SI / NO)\nRecomendado: SI');
      
      Toast.info('⏳ Vaciando base de datos en la nube...', 0);
      
      try {
        const res = await AppsScriptBridge.request('clearDatabase', {});
        if(res.ok) {
          Toast.success('¡La base de datos en la nube ha sido vaciada con éxito!');
          if(p2 === 'SI' || p2 === 'si') {
            setTimeout(() => limpiarBaseDatosLocal(), 1500);
          }
        } else {
          throw new Error(res.error || 'Error desconocido');
        }
      } catch(err) {
        Toast.error('Error al vaciar BD: ' + err.message);
      }
    }

    switchTab(0);
  }

  let switchTab, cambiarPin, importarConfig, limpiarBaseDatosLocal, hardResetCloud;

  return { render, switchTab, cambiarPin, limpiarBaseDatosLocal, importarConfig, hardResetCloud };
})();

window.AdminView = AdminView;
