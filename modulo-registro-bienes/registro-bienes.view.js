/**
 * modulo-registro-bienes/registro-bienes.view.js
 * Vista para registrar nuevos bienes en el inventario de Wayra.
 */

const RegistroBienesView = (() => {
  let stream = null;
  let currentPhotoBase64 = null;
  let isSaving = false;

  async function _generarSiguienteCodigo() {
    let localData = [];
    try {
      localData = await SheetsAPI.fetchAll();
    } catch (e) {
      console.warn('Error al obtener datos locales para autogenerar código:', e);
    }
    
    let max = 10000;
    for (let i = 0; i < localData.length; i++) {
      const cod = String(localData[i].CODIGO || '').trim();
      if (cod.startsWith('WYR-')) {
        const num = parseInt(cod.replace('WYR-', ''), 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    }
    
    try {
      const queue = await LocalCache.getQueue();
      for (const op of queue) {
        if ((op.action === 'writeRow' || op.action === 'writeAsset') && op.rowData && op.rowData[1]) {
          const cod = String(op.rowData[1]).trim();
          if (cod.startsWith('WYR-')) {
            const num = parseInt(cod.replace('WYR-', ''), 10);
            if (!isNaN(num) && num > max) {
              max = num;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error al leer cola de sincronización:', e);
    }

    return 'WYR-' + (max + 1);
  }

  const categorias = [
    { id: 'LAPTOP/PC', label: 'Laptops / PCs', icon: '💻', campos: ['marca','modelo','serie','procesador','ram','hd_ssd','observacion','foto'], presets: ['8GB','16GB','256 SSD','512 SSD','i5','i7'] },
    { id: 'MONITOR', label: 'Monitores', icon: '🖥️', campos: ['marca','modelo','serie','pulgadas','observacion','foto'], presets: ['19"','21.5"','22"','24"','27"'] },
    { id: 'CABLE', label: 'Cables / Adaptadores', icon: '🔌', campos: ['tipo_sub','observacion','cantidad','foto'], presets: ['HDMI 1.8m','DP 1.8m','VGA','Poder C13','USB-C','Cat6 2m'] },
    { id: 'PERIFERICO', label: 'Periféricos', icon: '⌨️', campos: ['tipo_sub','marca','modelo','serie','observacion','foto'], presets: ['Teclado USB','Mouse USB','Webcam 1080p','Headset USB'] },
    { id: 'REDES', label: 'Redes', icon: '🌐', campos: ['tipo_sub','marca','modelo','serie','observacion','foto'], presets: ['Switch 8P','Switch 24P','Router','AP WiFi'] },
    { id: 'REPUESTO', label: 'Repuestos', icon: '📦', campos: ['tipo_sub','modelo','observacion','foto'], presets: ['RAM DDR4 8GB','SSD 480GB','Batería','Cargador'] },
    { id: 'OTRO', label: 'Otros', icon: '🛠️', campos: ['observacion','marca','modelo','serie','foto'], presets: [] }
  ];

  const marcasPrediccion = {
    DELL: ["latitude","optiplex","inspiron","vostro","precision","xps"],
    HP: ["probook","elitebook","zbook","pavilion","prodesk","elitedesk"],
    LENOVO: ["thinkpad","thinkcentre","ideapad","ideacentre","legion","yoga"]
  };

  async function render() {
    const el = document.getElementById('view-registro-bienes');
    if (!el) return;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📥 Registro de Bienes TI</div>
          <div class="page-subtitle">Ingresa nuevos equipos al inventario de Wayra</div>
        </div>
        <div class="page-actions" style="display:flex; align-items:center; gap:12px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:0.85rem; color:var(--text-muted);">
            <input type="checkbox" id="rb-modo-rafaga" style="width:16px; height:16px; accent-color:var(--danger);">
            Modo Ráfaga 🔥
          </label>
        </div>
      </div>

      <style>
        .rb-layout-container { display: flex; gap: 20px; align-items: flex-start; }
        .rb-form-card { flex: 1; min-width: 300px; padding: 20px; width: 100%; box-sizing: border-box; }
        .rb-preview-card { width: 320px; flex-shrink: 0; position: sticky; top: 80px; background: var(--bg-hover); border: 1px solid var(--border); box-sizing: border-box; }
        @media (max-width: 768px) {
          .rb-layout-container { flex-direction: column-reverse; }
          .rb-preview-card { width: 100%; position: static; }
        }
      </style>
      <div class="rb-layout-container">
        <!-- FORMULARIO -->
        <div class="card rb-form-card">
          <div class="form-group">
            <label class="form-label">Categoría del Bien</label>
            <select class="form-control" id="rb-categoria" tabindex="1">
              <option value="" disabled selected>Selecciona una categoría...</option>
              ${categorias.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Ubicación / Sucursal</label>
            <select class="form-control" id="rb-sucursal">
              ${(APP_CONFIG.catalogos.sucursales||[]).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>

          <div id="rb-presets-container" style="display:none; margin-bottom: 16px; gap: 8px; flex-wrap: wrap;"></div>

          <div id="rb-campos-dinamicos" style="display:none;">
            <!-- Tipo Sub (Para Periféricos, Redes, etc) -->
            <div class="form-group" id="group-tipo_sub" style="display:none;">
              <label class="form-label">Tipo Específico</label>
              <input type="text" class="form-control" id="rb-tipo_sub" tabindex="2" autocomplete="off" placeholder="Ej. Switch, Mouse, Teclado...">
            </div>

            <style>
              .quick-chips { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
              .q-chip { 
                background: var(--bg-hover); border: 1px solid var(--border); 
                padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; 
                color: var(--text-color); cursor: pointer; transition: all 0.2s;
              }
              .q-chip:hover, .q-chip:active { background: var(--accent); color: white; border-color: var(--accent); }
            </style>

            <!-- Marca -->
            <div class="form-group" id="group-marca" style="display:none;">
              <label class="form-label">Marca</label>
              <input type="text" class="form-control" id="rb-marca" tabindex="3" autocomplete="off" list="dl-marcas" placeholder="Ej. DELL, HP, LENOVO...">
              <div class="quick-chips">
                <span class="q-chip" onclick="document.getElementById('rb-marca').value='DELL'; document.getElementById('rb-marca').dispatchEvent(new Event('input'))">DELL</span>
                <span class="q-chip" onclick="document.getElementById('rb-marca').value='HP'; document.getElementById('rb-marca').dispatchEvent(new Event('input'))">HP</span>
                <span class="q-chip" onclick="document.getElementById('rb-marca').value='LENOVO'; document.getElementById('rb-marca').dispatchEvent(new Event('input'))">LENOVO</span>
                <span class="q-chip" onclick="document.getElementById('rb-marca').value='APPLE'; document.getElementById('rb-marca').dispatchEvent(new Event('input'))">APPLE</span>
              </div>
              <datalist id="dl-marcas">
                ${APP_CONFIG.catalogos.marcas.map(m => `<option value="${m}">`).join('')}
              </datalist>
            </div>

            <!-- Modelo -->
            <div class="form-group" id="group-modelo" style="display:none;">
              <label class="form-label">Modelo</label>
              <input type="text" class="form-control" id="rb-modelo" tabindex="4" autocomplete="off" placeholder="Ej. Latitude 3420">
            </div>

            <!-- Serie -->
            <div class="form-group" id="group-serie" style="display:none;">
              <label class="form-label">Número de Serie / SN</label>
              <input type="text" class="form-control" id="rb-serie" tabindex="5" autocomplete="off" placeholder="Si no tiene, dejar en blanco o poner N/A">
            </div>

            <!-- Procesador -->
            <div class="form-group" id="group-procesador" style="display:none;">
              <label class="form-label">Procesador</label>
              <input type="text" class="form-control" id="rb-procesador" tabindex="6" autocomplete="off" placeholder="Ej. Intel Core i5 11va Gen">
              <div class="quick-chips">
                <span class="q-chip" onclick="document.getElementById('rb-procesador').value='Intel Core i3'; document.getElementById('rb-procesador').dispatchEvent(new Event('input'))">i3</span>
                <span class="q-chip" onclick="document.getElementById('rb-procesador').value='Intel Core i5'; document.getElementById('rb-procesador').dispatchEvent(new Event('input'))">i5</span>
                <span class="q-chip" onclick="document.getElementById('rb-procesador').value='Intel Core i7'; document.getElementById('rb-procesador').dispatchEvent(new Event('input'))">i7</span>
                <span class="q-chip" onclick="document.getElementById('rb-procesador').value='AMD Ryzen 5'; document.getElementById('rb-procesador').dispatchEvent(new Event('input'))">Ryzen 5</span>
                <span class="q-chip" onclick="document.getElementById('rb-procesador').value='Apple M1'; document.getElementById('rb-procesador').dispatchEvent(new Event('input'))">M1</span>
              </div>
            </div>

            <!-- RAM -->
            <div class="form-group" id="group-ram" style="display:none;">
              <label class="form-label">RAM</label>
              <input type="text" class="form-control" id="rb-ram" tabindex="7" autocomplete="off" placeholder="Ej. 16GB">
              <div class="quick-chips">
                <span class="q-chip" onclick="document.getElementById('rb-ram').value='8GB'; document.getElementById('rb-ram').dispatchEvent(new Event('input'))">8GB</span>
                <span class="q-chip" onclick="document.getElementById('rb-ram').value='16GB'; document.getElementById('rb-ram').dispatchEvent(new Event('input'))">16GB</span>
                <span class="q-chip" onclick="document.getElementById('rb-ram').value='32GB'; document.getElementById('rb-ram').dispatchEvent(new Event('input'))">32GB</span>
              </div>
            </div>

            <!-- HD/SSD -->
            <div class="form-group" id="group-hd_ssd" style="display:none;">
              <label class="form-label">Almacenamiento</label>
              <input type="text" class="form-control" id="rb-hd_ssd" tabindex="8" autocomplete="off" placeholder="Ej. 512GB SSD">
              <div class="quick-chips">
                <span class="q-chip" onclick="document.getElementById('rb-hd_ssd').value='256GB SSD'; document.getElementById('rb-hd_ssd').dispatchEvent(new Event('input'))">256 SSD</span>
                <span class="q-chip" onclick="document.getElementById('rb-hd_ssd').value='512GB SSD'; document.getElementById('rb-hd_ssd').dispatchEvent(new Event('input'))">512 SSD</span>
                <span class="q-chip" onclick="document.getElementById('rb-hd_ssd').value='1TB SSD'; document.getElementById('rb-hd_ssd').dispatchEvent(new Event('input'))">1TB SSD</span>
                <span class="q-chip" onclick="document.getElementById('rb-hd_ssd').value='1TB HDD'; document.getElementById('rb-hd_ssd').dispatchEvent(new Event('input'))">1TB HDD</span>
              </div>
            </div>

            <!-- Pulgadas -->
            <div class="form-group" id="group-pulgadas" style="display:none;">
              <label class="form-label">Pulgadas</label>
              <input type="text" class="form-control" id="rb-pulgadas" tabindex="9" autocomplete="off" placeholder="Ej. 24&quot;">
              <div class="quick-chips">
                <span class="q-chip" onclick="document.getElementById('rb-pulgadas').value='14&quot;'; document.getElementById('rb-pulgadas').dispatchEvent(new Event('input'))">14"</span>
                <span class="q-chip" onclick="document.getElementById('rb-pulgadas').value='15.6&quot;'; document.getElementById('rb-pulgadas').dispatchEvent(new Event('input'))">15.6"</span>
                <span class="q-chip" onclick="document.getElementById('rb-pulgadas').value='21.5&quot;'; document.getElementById('rb-pulgadas').dispatchEvent(new Event('input'))">21.5"</span>
                <span class="q-chip" onclick="document.getElementById('rb-pulgadas').value='24&quot;'; document.getElementById('rb-pulgadas').dispatchEvent(new Event('input'))">24"</span>
                <span class="q-chip" onclick="document.getElementById('rb-pulgadas').value='27&quot;'; document.getElementById('rb-pulgadas').dispatchEvent(new Event('input'))">27"</span>
              </div>
            </div>

            <!-- Observacion / Descripción -->
            <div class="form-group" id="group-observacion" style="display:none;">
              <label class="form-label">Descripción / Observaciones</label>
              <input type="text" class="form-control" id="rb-observacion" tabindex="10" autocomplete="off" placeholder="Detalles extra...">
            </div>

            <!-- Cantidad (Para cables) -->
            <div class="form-group" id="group-cantidad" style="display:none;">
              <label class="form-label">Cantidad (Ingreso Masivo)</label>
              <input type="number" class="form-control" id="rb-cantidad" tabindex="11" value="1" min="1">
              <small style="color:var(--text-muted); font-size:0.75rem;">Se crearán N registros idénticos.</small>
            </div>

            <!-- Foto -->
            <div class="form-group" id="group-foto" style="display:none; margin-top: 20px;">
              <label class="form-label">Foto de Etiqueta / Equipo (Opcional)</label>
              <div style="display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap;">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer; display:flex; align-items:center; gap:6px; flex: 1; justify-content: center; min-width: 140px;">
                  📁 Subir Archivo
                  <input type="file" id="rb-foto-input" accept="image/*" style="display:none;">
                </label>
                <button class="btn btn-secondary btn-sm" id="rb-btn-camara" style="display:flex; align-items:center; gap:6px; flex: 1; justify-content: center; min-width: 140px;">
                  📸 Usar Cámara
                </button>
              </div>
              <div id="rb-camara-container" style="display:none; margin-top:10px; position:relative;">
                <video id="rb-video" style="width:100%; max-width:300px; border-radius:8px; border:1px solid var(--border);" autoplay playsinline></video>
                <button class="btn btn-primary btn-sm" id="rb-btn-capturar" style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%);">Capturar</button>
              </div>
              <div id="rb-foto-preview-container" style="display:none; margin-top:10px; position:relative; width:120px;">
                <img id="rb-foto-preview" src="" style="width:100%; border-radius:8px; border:1px solid var(--border);">
                <button id="rb-btn-borrar-foto" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:12px;">✕</button>
              </div>
            </div>

            <div style="margin-top: 24px; display:flex; justify-content:flex-end;">
              <button class="btn btn-primary" id="rb-btn-guardar" tabindex="12" style="font-size: 1rem; padding: 10px 24px;">💾 Guardar Registro</button>
            </div>
          </div>
        </div>

        <!-- PREVIEW CARD -->
        <div class="card rb-preview-card">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">Vista Previa del Bien</div>
          <div id="rb-live-preview" style="display: flex; flex-direction: column; gap: 8px;">
            <div style="color: var(--text-muted); font-style: italic; font-size: 0.85rem;">Selecciona una categoría para comenzar...</div>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      const btnCamara = document.getElementById('rb-btn-camara');
      if (btnCamara) btnCamara.style.display = 'none';
    }
  }

  function _bindEvents() {
    const categoriaSelect = document.getElementById('rb-categoria');
    categoriaSelect.addEventListener('change', (e) => _onCategoriaChange(e.target.value));

    ['rb-marca','rb-modelo','rb-serie','rb-procesador','rb-ram','rb-hd_ssd','rb-pulgadas','rb-observacion','rb-tipo_sub'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', _actualizarPreviewCard);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const tabIndex = parseInt(e.target.getAttribute('tabindex') || '0');
            const nextElement = document.querySelector(`[tabindex="${tabIndex + 1}"]`);
            if (nextElement && nextElement.offsetParent !== null) {
              nextElement.focus();
            } else {
              document.getElementById('rb-btn-guardar').focus();
            }
          }
        });
      }
    });

    const modeloInput = document.getElementById('rb-modelo');
    if (modeloInput) {
      modeloInput.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        for (const [marca, modelos] of Object.entries(marcasPrediccion)) {
          if (modelos.some(m => text.includes(m))) {
            const marcaInput = document.getElementById('rb-marca');
            if (marcaInput && marcaInput.value !== marca) {
              marcaInput.value = marca;
              marcaInput.style.backgroundColor = 'rgba(34,197,94,0.1)';
              setTimeout(() => marcaInput.style.backgroundColor = '', 500);
              _actualizarPreviewCard();
            }
            break;
          }
        }
      });
    }

    const fotoInput = document.getElementById('rb-foto-input');
    if (fotoInput) fotoInput.addEventListener('change', _manejarFoto);

    const btnCamara = document.getElementById('rb-btn-camara');
    if (btnCamara) btnCamara.addEventListener('click', _capturarWebcam);

    const btnCapturar = document.getElementById('rb-btn-capturar');
    if (btnCapturar) btnCapturar.addEventListener('click', _tomarSnapshot);

    const btnBorrarFoto = document.getElementById('rb-btn-borrar-foto');
    if (btnBorrarFoto) btnBorrarFoto.addEventListener('click', _borrarFoto);

    const btnGuardar = document.getElementById('rb-btn-guardar');
    if (btnGuardar) btnGuardar.addEventListener('click', guardar);
  }

  function _onCategoriaChange(catId) {
    const cat = categorias.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('rb-campos-dinamicos').style.display = 'block';

    const todosCampos = ['tipo_sub','marca','modelo','serie','procesador','ram','hd_ssd','pulgadas','observacion','cantidad','foto'];
    todosCampos.forEach(c => {
      const group = document.getElementById('group-' + c);
      if (group) {
        group.style.display = cat.campos.includes(c) || (c === 'cantidad' && catId === 'CABLE') ? 'block' : 'none';
      }
    });

    const presetsContainer = document.getElementById('rb-presets-container');
    if (cat.presets.length > 0) {
      presetsContainer.style.display = 'flex';
      presetsContainer.innerHTML = cat.presets.map(p => 
        `<button class="btn btn-secondary" style="display:inline-flex; padding:4px 10px; border-radius:16px; font-size:0.72rem; font-weight:600; border:1px solid var(--border); background:var(--bg-hover); cursor:pointer; transition:all .15s;" onmouseover="this.style.background='var(--accent)'; this.style.color='white';" onmouseout="this.style.background='var(--bg-hover)'; this.style.color='var(--text-color)';" onclick="RegistroBienesView._aplicarPreset('${DOM.esc(p)}', '${catId}')">${DOM.esc(p)}</button>`
      ).join('');
    } else {
      presetsContainer.style.display = 'none';
    }

    _actualizarPreviewCard();
    
    setTimeout(() => {
      const visibles = Array.from(document.querySelectorAll('#rb-campos-dinamicos input')).filter(el => el.offsetParent !== null && el.type !== 'file');
      if (visibles.length > 0) visibles[0].focus();
    }, 100);
  }

  async function _manejarFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      currentPhotoBase64 = await ImageUtils.compressToBase64(file, 1024, 0.8);
      _mostrarFotoPreview();
    } catch (err) {
      Toast.error('Error al procesar la imagen');
    }
  }

  async function _capturarWebcam() {
    const video = document.getElementById('rb-video');
    const container = document.getElementById('rb-camara-container');
    if (!video || !container) return;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      container.style.display = 'block';
    } catch (err) {
      Toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }

  function _tomarSnapshot() {
    const video = document.getElementById('rb-video');
    const container = document.getElementById('rb-camara-container');
    if (!video || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    container.style.display = 'none';

    _mostrarFotoPreview();
  }

  function _mostrarFotoPreview() {
    const previewContainer = document.getElementById('rb-foto-preview-container');
    const previewImg = document.getElementById('rb-foto-preview');
    if (previewContainer && previewImg && currentPhotoBase64) {
      previewImg.src = currentPhotoBase64.startsWith('data:') ? currentPhotoBase64 : 'data:image/jpeg;base64,' + currentPhotoBase64;
      previewContainer.style.display = 'block';
      _actualizarPreviewCard();
    }
  }

  function _borrarFoto() {
    currentPhotoBase64 = null;
    const previewContainer = document.getElementById('rb-foto-preview-container');
    const input = document.getElementById('rb-foto-input');
    if (previewContainer) previewContainer.style.display = 'none';
    if (input) input.value = '';
    _actualizarPreviewCard();
  }

  function _actualizarPreviewCard() {
    const livePreview = document.getElementById('rb-live-preview');
    if (!livePreview) return;

    const catId = document.getElementById('rb-categoria')?.value;
    const cat = categorias.find(c => c.id === catId);
    if (!cat) return;

    const getVal = (id) => DOM.esc(document.getElementById('rb-' + id)?.value || '');
    
    const marca = getVal('marca');
    const modelo = getVal('modelo');
    const serie = getVal('serie');
    const tipoSub = getVal('tipo_sub');
    const ram = getVal('ram');
    const proc = getVal('procesador');
    const hd = getVal('hd_ssd');
    const obs = getVal('observacion');

    let titulo = `${cat.icon} ${cat.label}`;
    let subtitulo = '';
    
    if (catId === 'LAPTOP/PC' || catId === 'MONITOR') {
      subtitulo = `${marca} ${modelo}`.trim();
    } else {
      subtitulo = `${tipoSub} ${marca} ${modelo}`.trim();
    }
    
    if (!subtitulo) subtitulo = '<span style="color:var(--text-muted); font-style:italic;">(Sin detalles)</span>';

    const detalles = [];
    if (serie) detalles.push(`<strong>SN:</strong> ${serie}`);
    if (proc) detalles.push(`<strong>CPU:</strong> ${proc}`);
    if (ram) detalles.push(`<strong>RAM:</strong> ${ram}`);
    if (hd) detalles.push(`<strong>HD:</strong> ${hd}`);
    if (obs) detalles.push(`<strong>Obs:</strong> ${obs}`);

    let fotoHtml = '';
    if (currentPhotoBase64) {
      const src = currentPhotoBase64.startsWith('data:') ? currentPhotoBase64 : 'data:image/jpeg;base64,' + currentPhotoBase64;
      fotoHtml = `<div style="margin-top:10px; border-radius:6px; overflow:hidden; border:1px solid var(--border);"><img src="${src}" style="width:100%; display:block;"></div>`;
    }

    livePreview.innerHTML = `
      <div style="font-weight: 700; color: var(--accent); font-size: 0.9rem;">${titulo}</div>
      <div style="font-size: 1rem; font-weight: 600; margin-top: 4px;">${subtitulo}</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px; display:flex; flex-direction:column; gap:4px;">
        ${detalles.map(d => `<div>${d}</div>`).join('')}
      </div>
      ${fotoHtml}
      <div id="rb-preview-codigo" style="margin-top: 12px; padding: 6px; background: rgba(34,197,94,0.1); border-radius: 4px; border: 1px dashed var(--success); color: var(--success); text-align: center; font-size: 0.75rem; font-weight: 700;">
        ✨ Calculando siguiente código...
      </div>
    `;

    _generarSiguienteCodigo().then(code => {
      const elCode = document.getElementById('rb-preview-codigo');
      if (elCode) {
        elCode.innerHTML = `✨ CÓDIGO SUGERIDO: ${code}`;
      }
    });
  }

  async function guardar() {
    if (isSaving) return;
    
    const catId = document.getElementById('rb-categoria')?.value;
    if (!catId) { Toast.warning('Selecciona una categoría'); return; }

    const getVal = (id) => (document.getElementById('rb-' + id)?.value || '').trim();
    
    const marca = getVal('marca');
    const modelo = getVal('modelo');
    let serie = getVal('serie');
    const tipoSub = getVal('tipo_sub');
    const cant = parseInt(document.getElementById('rb-cantidad')?.value || '1', 10);

    const cat = categorias.find(c => c.id === catId);
    if (cat.campos.includes('marca') && !marca && catId !== 'OTRO') {
      Toast.warning('La marca es obligatoria para este tipo de bien');
      document.getElementById('rb-marca')?.focus();
      return;
    }

    if (!serie) serie = "N/A";

    const btnGuardar = document.getElementById('rb-btn-guardar');
    try {
      isSaving = true;
      btnGuardar.disabled = true;
      btnGuardar.innerHTML = '<span class="spinner"></span> Guardando...';

      // 1. Generar código correlativo localmente (instantáneo)
      const startCode = await _generarSiguienteCodigo();
      let baseCodeNum = parseInt(startCode.replace('WYR-', ''), 10);

      // 2. La foto se subirá en segundo plano (background) para no bloquear la pantalla.
      // Guardamos el base64 en memoria para pasarlo a la cola.
      let fotoData = '';
      if (currentPhotoBase64) {
        fotoData = currentPhotoBase64;
      }

      btnGuardar.innerHTML = '<span class="spinner"></span> Registrando bien...';

      const registros = [];
      const fechaHoy = new Date().toLocaleDateString('es-PE');
      const sucursal = document.getElementById('rb-sucursal')?.value || '';
      
      let tipoFinal = catId;
      if (catId === 'LAPTOP/PC') tipoFinal = modelo.toLowerCase().includes('laptop') ? 'LAPTOP' : 'PC';
      if (catId === 'CABLE' || catId === 'PERIFERICO' || catId === 'REDES' || catId === 'REPUESTO') {
        const catUpper = tipoSub.toUpperCase();
        const catalogos = APP_CONFIG.catalogos.tiposEquipo.map(t=>t.toUpperCase());
        if (catalogos.includes(catUpper)) tipoFinal = catUpper;
        else if (catId === 'CABLE') tipoFinal = 'CABLE';
        else if (catId === 'PERIFERICO') tipoFinal = 'ACCESORIO';
        else if (catId === 'REDES') tipoFinal = 'ROUTER'; 
        else if (catId === 'REPUESTO') tipoFinal = 'REPUESTO';
      }

      const totalAGuardar = (catId === 'CABLE' && cant > 1) ? cant : 1;

      for (let i = 0; i < totalAGuardar; i++) {
        const codigo = 'WYR-' + (baseCodeNum + i);
        const descObs = tipoSub ? `[${tipoSub}] ${getVal('observacion')}`.trim() : getVal('observacion');
        
        const rowData = {
          SERIE: serie,
          CODIGO: codigo,
          TIP_EQUIP: tipoFinal,
          MARCA: marca,
          MODELO: modelo,
          PROCESADOR: getVal('procesador'),
          RAM: getVal('ram'),
          HD_SSD: getVal('hd_ssd'),
          PULGADAS: getVal('pulgadas'),
          SUCURSAL: sucursal,
          ESTADO: "C",
          OBSERVACION: descObs,
          FEC_COMPRA: fechaHoy,
          DOC_COMPRA: "" // La foto se subirá en background y se actualizará con la URL real
        };

        // 3. Guardar localmente en IndexedDB para disponibilidad inmediata
        await LocalCache.put('equipos', { ...rowData, _id: codigo });

        // 4. Encolar la escritura para Google Sheets en segundo plano
        const sheetName = APP_CONFIG.sheets?.sheetName || 'InventarioTI';
        await SyncEngine.syncWrite(sheetName, rowData, {
          accion: 'CREATE',
          entidad: 'REGISTRO_BIENES',
          usuario: (window.AuthService && AuthService.getUsuarioActual()) ? AuthService.getUsuarioActual().username : 'Sistema',
          base64Photo: fotoData // Lo pasamos a SyncEngine para que lo suba asíncronamente
        });

        registros.push(codigo);
      }

      SupabaseAPI.invalidateCache();
      
      Toast.success(`✅ Registro Exitoso: ${registros.join(', ')}`);

      _limpiarFormulario();

    } catch (err) {
      Toast.error('Error al guardar: ' + err.message);
    } finally {
      isSaving = false;
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '💾 Guardar Registro';
    }
  }

  function _limpiarFormulario() {
    const modoRafaga = document.getElementById('rb-modo-rafaga')?.checked;
    
    if (modoRafaga) {
      const serieInput = document.getElementById('rb-serie');
      if (serieInput) {
        serieInput.value = '';
        serieInput.focus();
      }
      const obsInput = document.getElementById('rb-observacion');
      if (obsInput) obsInput.value = '';
    } else {
      ['rb-marca','rb-modelo','rb-serie','rb-procesador','rb-ram','rb-hd_ssd','rb-pulgadas','rb-observacion','rb-tipo_sub'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const elCant = document.getElementById('rb-cantidad');
      if (elCant) elCant.value = '1';
      
      _borrarFoto();
      
      const visibles = Array.from(document.querySelectorAll('#rb-campos-dinamicos input')).filter(el => el.offsetParent !== null && el.type !== 'file');
      if (visibles.length > 0) visibles[0].focus();
    }
    
    _actualizarPreviewCard();
  }

  function onLeave() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function _aplicarPresetInternal(presetText, catId) {
    if (catId === 'LAPTOP/PC' || catId === 'REPUESTO') {
      if (presetText.includes('GB') && !presetText.includes('SSD') && !presetText.includes('DDR')) {
        document.getElementById('rb-ram').value = presetText;
        document.getElementById('rb-hd_ssd').focus();
      } else if (presetText.includes('SSD') || presetText.includes('HDD')) {
        document.getElementById('rb-hd_ssd').value = presetText;
      } else if (presetText.includes('i5') || presetText.includes('i7')) {
        document.getElementById('rb-procesador').value = 'Intel Core ' + presetText;
      } else if (catId === 'REPUESTO') {
        document.getElementById('rb-tipo_sub').value = presetText;
      }
    } else if (catId === 'MONITOR') {
      if (presetText.includes('"')) {
        document.getElementById('rb-pulgadas').value = presetText;
      }
    } else if (catId === 'CABLE' || catId === 'PERIFERICO' || catId === 'REDES') {
      document.getElementById('rb-tipo_sub').value = presetText;
      document.getElementById('rb-observacion').focus();
    }
    _actualizarPreviewCard();
  }

  return { 
    render, 
    onLeave,
    _aplicarPreset: _aplicarPresetInternal
  };

})();

window.RegistroBienesView = RegistroBienesView;
