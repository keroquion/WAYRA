/**
 * modulo-0-datos/print-inventario.js
 * Generación de vista para exportar a PDF (Lista y Catálogo).
 */

const PrintInventario = (() => {

  function abrir(filas, columnas, tipo = 'lista') {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const fechaGen = new Date().toLocaleString('es-PE');
    const empresa = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.empresa) ? APP_CONFIG.empresa.nombre : 'Empresa';
    
    // Configuración base HTML
    let html = `<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Inventario - ${tipo === 'catalogo' ? 'Catálogo' : 'Lista'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; padding: 20px; background: #fff; }
        .header { margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .header h1 { font-size: 16px; color: #2563eb; margin-bottom: 4px; }
        .header p { color: #64748b; font-size: 11px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #2563eb; color: #fff; padding: 6px; text-align: left; border: 1px solid #94a3b8; font-size: 10px; }
        td { padding: 5px; border: 1px solid #cbd5e1; font-size: 10px; }
        tr:nth-child(even) td { background: #f8fafc; }
        
        .catalogo-grid { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; }
        .catalogo-card { 
          width: calc(33.33% - 10px); 
          border: 1px solid #cbd5e1; 
          border-radius: 6px; 
          padding: 10px; 
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .foto-container { height: 120px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; margin-bottom: 10px; border-radius: 4px; overflow: hidden; }
        .foto-container img { max-width: 100%; max-height: 100%; object-fit: cover; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
        .info-label { font-weight: bold; color: #475569; font-size: 9px; }
        .info-val { font-size: 10px; color: #0f172a; text-align: right; max-width: 60%; word-break: break-word; }
        
        .no-print { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; background: #f1f5f9; padding: 10px; border-radius: 6px; position: sticky; top: 0; z-index: 10; }
        button { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button.close { background: #ef4444; }
        
        @media print {
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4 portrait; }
          body { padding: 0; }
        }
      </style>
    </head><body>
      <div class="no-print">
        <strong style="font-size:14px">Vista de Impresión</strong>
        <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
        <button class="close" onclick="window.close()">✕ Cerrar</button>
        <span style="font-size:11px; color:#64748b; margin-left:auto">Selecciona "Guardar como PDF" en el diálogo.</span>
      </div>
      <div class="header">
        <h1>📦 REPORTE DE INVENTARIO - ${tipo === 'catalogo' ? 'CATÁLOGO FOTOGRÁFICO' : 'LISTA DETALLADA'}</h1>
        <p>Empresa: <strong>${empresa}</strong> | Total Equipos: <strong>${filas.length}</strong> | Generado: ${fechaGen}</p>
      </div>
    `;

    if (tipo === 'lista') {
      const ths = columnas.map(c => `<th>${c.label}</th>`).join('');
      const trs = filas.map(f => {
        const tds = columnas.map(c => `<td>${f[c.key] || '—'}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      html += `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    } 
    else if (tipo === 'catalogo') {
      // Definimos columnas clave para mostrar en la tarjeta
      const clavesPrincipales = ['SERIE', 'CODIGO', 'MARCA', 'MODELO', 'ESTADO', 'SUCURSAL'];
      
      const cards = filas.map(f => {
        let fotoUrl = '';
        if (f._fotos && f._fotos.length > 0) {
          fotoUrl = f._fotos[0].url || f._fotos[0].preview || f._fotos[0];
          if (typeof fotoUrl === 'object' && fotoUrl.url) fotoUrl = fotoUrl.url;
        }

        const imgHtml = fotoUrl 
          ? `<img src="${fotoUrl}" />` 
          : `<span style="color:#94a3b8; font-size:12px;">Sin foto</span>`;

        let infoHtml = '';
        columnas.forEach(c => {
          if (clavesPrincipales.includes(c.key) && f[c.key]) {
            infoHtml += `<div class="info-row"><span class="info-label">${c.label}</span><span class="info-val"><strong>${f[c.key]}</strong></span></div>`;
          }
        });
        
        return `
          <div class="catalogo-card">
            <div class="foto-container">${imgHtml}</div>
            ${infoHtml}
          </div>
        `;
      }).join('');

      html += `<div class="catalogo-grid">${cards}</div>`;
    }

    html += `</body></html>`;
    
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return { abrir };
})();

window.PrintInventario = PrintInventario;
