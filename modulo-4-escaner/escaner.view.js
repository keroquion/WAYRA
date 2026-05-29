/**
 * modulo-4-escaner/escaner.view.js
 * Módulo de escáner móvil para consultar información del equipo o buscar por serie.
 */

const EscanerView = (() => {
  let _html5QrcodeScanner = null;
  
  async function render() {
    const el = document.getElementById('view-escaner');
    if (!el) return;
    
    el.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">📷 Búsqueda por Escáner</div>
          <div class="page-subtitle">Escanea un código de barras o busca manualmente para ver detalles del equipo</div>
        </div>
      </div>
      
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Búsqueda Manual -->
        <div class="card" style="padding: 15px; margin-bottom: 20px;">
          <label class="form-label">Buscar por Serie o Código</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="escaner-input" class="form-control" placeholder="Ej: ABC12345..." onkeydown="if(event.key==='Enter') EscanerView.buscar(this.value)">
            <button class="btn btn-primary" onclick="EscanerView.buscar(document.getElementById('escaner-input').value)">🔍 Buscar</button>
          </div>
        </div>
        
        <!-- Botón de Cámara -->
        <div style="text-align:center; margin-bottom: 20px;">
          <button class="btn btn-secondary" id="btn-toggle-camera" onclick="EscanerView.toggleCamera()" style="width: 100%; padding: 15px; font-size: 1.1rem; border-radius: 12px;">
            📸 Activar Cámara para Escanear
          </button>
        </div>
        
        <!-- Contenedor del Escáner -->
        <div id="reader-container" style="display:none; margin-bottom: 20px;">
          <div id="reader" style="width:100%; border-radius: 8px; overflow: hidden; border: 2px solid var(--border);"></div>
          <p style="text-align:center; font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">Apunta la cámara al código de barras o QR</p>
        </div>
        
        <!-- Resultados -->
        <div id="escaner-resultado">
          <div style="text-align:center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 10px;">🔎</div>
            Ingresa un código o activa la cámara para buscar un equipo en la base de datos.
          </div>
        </div>
        
      </div>
    `;

    // Si había un valor anterior en el input, podemos mantenerlo, pero por ahora lo dejamos vacío.
  }

  function toggleCamera() {
    const readerContainer = document.getElementById('reader-container');
    const btn = document.getElementById('btn-toggle-camera');
    
    if (readerContainer.style.display === 'none') {
      readerContainer.style.display = 'block';
      btn.innerHTML = '🛑 Detener Cámara';
      btn.classList.replace('btn-secondary', 'btn-danger');
      iniciarEscaner();
    } else {
      readerContainer.style.display = 'none';
      btn.innerHTML = '📸 Activar Cámara para Escanear';
      btn.classList.replace('btn-danger', 'btn-secondary');
      detenerEscaner();
    }
  }

  function iniciarEscaner() {
    if (typeof Html5Qrcode === 'undefined') {
      Toast.error('La librería del escáner no está cargada. Verifica tu conexión a internet.');
      toggleCamera();
      return;
    }
    
    _html5QrcodeScanner = new Html5Qrcode("reader");
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    _html5QrcodeScanner.start(
      { facingMode: "environment" }, 
      config,
      (decodedText, decodedResult) => {
        // Éxito al escanear
        document.getElementById('escaner-input').value = decodedText;
        if (navigator.vibrate) navigator.vibrate(200);
        Toast.success('Código detectado: ' + decodedText);
        buscar(decodedText);
        
        // Detener cámara automáticamente después de escanear
        toggleCamera(); 
      },
      (errorMessage) => {
        // Ignorar errores continuos de escaneo ya que se disparan en cada frame sin éxito
      }
    ).catch((err) => {
      Toast.error("Error al iniciar cámara. Comprueba los permisos.");
      console.error(err);
      toggleCamera();
    });
  }

  function detenerEscaner() {
    if (_html5QrcodeScanner) {
      _html5QrcodeScanner.stop().then(() => {
        _html5QrcodeScanner.clear();
        _html5QrcodeScanner = null;
      }).catch(err => {
        console.error("Error al detener escáner", err);
      });
    }
  }

  async function buscar(query) {
    query = query.trim();
    if (!query) {
      Toast.warning('Ingresa un código para buscar');
      document.getElementById('escaner-input').focus();
      return;
    }
    
    const resEl = document.getElementById('escaner-resultado');
    resEl.innerHTML = `<div style="text-align:center; padding: 40px;"><span class="spinner"></span><div style="margin-top:10px; color:var(--text-muted)">Buscando equipo en la base de datos...</div></div>`;
    
    try {
      // Buscar en la base local (o remota si no está en caché) a través de SheetsAPI
      const data = await SheetsAPI.fetchAll();
      const qLower = query.toLowerCase();
      
      // Buscar coincidencias exactas o parciales en CODIGO, SERIE, etc
      const resultados = data.filter(r => {
        return (r.CODIGO && r.CODIGO.toLowerCase().includes(qLower)) ||
               (r.SERIE && r.SERIE.toLowerCase().includes(qLower));
      });
      
      mostrarResultados(resultados, query);
    } catch (err) {
      resEl.innerHTML = `
        <div class="card" style="padding:20px; text-align:center; color:var(--danger); border-left: 4px solid var(--danger);">
          <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
          Error al buscar: ${err.message}
        </div>`;
    }
  }
  
  function mostrarResultados(resultados, query) {
    const resEl = document.getElementById('escaner-resultado');
    
    if (!resultados || resultados.length === 0) {
      resEl.innerHTML = `
        <div class="card" style="padding:30px; text-align:center; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:10px;">📭</div>
          <div style="font-size: 1.1rem; font-weight: 500; color: var(--text-color);">No se encontró ningún equipo</div>
          <div style="margin-top: 5px;">No hay coincidencias para: <strong>${query}</strong></div>
          <button class="btn btn-secondary btn-sm" style="margin-top: 15px;" onclick="document.getElementById('escaner-input').value=''; document.getElementById('escaner-input').focus();">Nueva búsqueda</button>
        </div>`;
      return;
    }
    
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                  <h4 style="margin:0;">Resultados Encontrados: <span style="background:var(--accent); color:white; padding:2px 8px; border-radius:12px; font-size:0.9rem;">${resultados.length}</span></h4>
                </div>
                <div style="display:flex; flex-direction:column; gap:15px;">`;
    
    resultados.forEach(r => {
      // Extraemos la fecha si existe (usando un campo común como FECHA o FECHA_INGRESO)
      const fechaInfo = r.FECHA || r.FECHA_INGRESO || r.FECHA_COMPRA;
      
      html += `
        <div class="card" style="padding:15px; border-left: 4px solid var(--accent); position: relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div>
              <strong style="font-size:1.2rem; display:block;">${Formatters.safe(r.CODIGO)}</strong>
              <span style="font-size:0.85rem; color:var(--text-muted);">${Formatters.safe(r.TIP_EQUIP)} • ${Formatters.safe(r.MARCA)}</span>
            </div>
            ${Formatters.estadoBadge(r.ESTADO)}
          </div>
          
          <div style="display:grid; grid-template-columns: 1fr; gap:8px; font-size:0.95rem; background: var(--bg-hover); padding: 10px; border-radius: 6px;">
            <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
              <span style="color:var(--text-muted)">N° Serie:</span> 
              <strong style="font-family: monospace; font-size:1.05rem;">${Formatters.safe(r.SERIE) || '-'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
              <span style="color:var(--text-muted)">Modelo:</span> 
              <span>${Formatters.safe(r.MODELO) || '-'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
              <span style="color:var(--text-muted)">Sucursal:</span> 
              <span>${Formatters.safe(r.SUCURSAL) || '-'}</span>
            </div>
            ${fechaInfo ? `
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--text-muted)">Fecha:</span> 
              <span>${Formatters.safe(fechaInfo)}</span>
            </div>` : ''}
          </div>
          
          ${(r.DETALLES || r.FALLA || r.OBSERVACIONES) ? `
          <div style="margin-top:12px; font-size:0.9rem; padding:10px; border: 1px dashed var(--border); border-radius:6px;">
            ${r.DETALLES ? `<div style="margin-bottom:4px;"><strong>Detalles:</strong> ${Formatters.safe(r.DETALLES)}</div>` : ''}
            ${r.FALLA ? `<div style="margin-bottom:4px;"><strong style="color:var(--warning);">Falla:</strong> ${Formatters.safe(r.FALLA)}</div>` : ''}
            ${r.OBSERVACIONES ? `<div><strong>Obs:</strong> ${Formatters.safe(r.OBSERVACIONES)}</div>` : ''}
          </div>` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
    resEl.innerHTML = html;
  }

  function onLeave() {
    detenerEscaner();
  }

  return { render, toggleCamera, buscar, onLeave };
})();

window.EscanerView = EscanerView;
