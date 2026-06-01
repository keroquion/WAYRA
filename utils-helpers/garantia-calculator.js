/**
 * utils-helpers/garantia-calculator.js — Inventario Pro v3
 * Calculadora de cobertura de garantía y soporte técnico.
 *
 * Reglas de negocio:
 *   - Garantía: 6 meses desde la fecha de compra
 *   - Soporte Técnico: 3 años desde la fecha de compra
 *
 * Períodos configurables via APP_CONFIG.cobertura (si existe).
 */

const GarantiaCalculator = (() => {

  /** Obtiene los períodos de cobertura (configurables) */
  function _getPeriodos() {
    const cfg = window.APP_CONFIG?.cobertura || {};
    return {
      mesesGarantia: cfg.mesesGarantia || 6,
      anosSoporte:   cfg.anosSoporte   || 3,
    };
  }

  /**
   * Parsea una fecha de compra en múltiples formatos comunes.
   * Soporta: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, timestamps.
   * @param {string|number|Date} fechaStr
   * @returns {Date|null}
   */
  function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    if (fechaStr instanceof Date) return isNaN(fechaStr) ? null : fechaStr;

    const str = String(fechaStr).trim();
    if (!str || str === '-' || str === '—') return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str);
      return isNaN(d) ? null : d;
    }

    // DD/MM/YYYY o DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmy) {
      const [, dia, mes, anio] = dmy;
      const d = new Date(+anio, +mes - 1, +dia);
      return isNaN(d) ? null : d;
    }

    // Timestamp numérico (Excel serial date o Unix)
    if (/^\d+$/.test(str)) {
      const num = +str;
      // Excel serial date (número < 100000)
      if (num > 25569 && num < 100000) {
        const d = new Date((num - 25569) * 86400 * 1000);
        return isNaN(d) ? null : d;
      }
      // Unix timestamp en ms
      if (num > 1000000000000) {
        const d = new Date(num);
        return isNaN(d) ? null : d;
      }
    }

    // Intentar parsing nativo como último recurso
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }

  /**
   * Calcula el estado de garantía y soporte a partir de la fecha de compra.
   * @param {string|Date} fechaCompra — la fecha de compra (FEC_COMPRA del Sheet)
   * @returns {Object} resultado con vigencia, días restantes y status
   */
  function calcular(fechaCompra) {
    const fecha = parseFecha(fechaCompra);
    const { mesesGarantia, anosSoporte } = _getPeriodos();

    if (!fecha) {
      return {
        fechaCompra: null,
        garantia: { vigente: false, diasRestantes: 0, fechaVencimiento: null, porcentaje: 0 },
        soporte:  { vigente: false, diasRestantes: 0, fechaVencimiento: null, porcentaje: 0 },
        status: 'SIN_FECHA',
        statusLabel: 'Sin fecha de compra',
        statusColor: 'var(--text-muted)',
        statusIcon: '❓',
      };
    }

    const ahora = new Date();

    // Calcular fecha de vencimiento garantía
    const vencGarantia = new Date(fecha);
    vencGarantia.setMonth(vencGarantia.getMonth() + mesesGarantia);

    // Calcular fecha de vencimiento soporte
    const vencSoporte = new Date(fecha);
    vencSoporte.setFullYear(vencSoporte.getFullYear() + anosSoporte);

    // Días restantes
    const diasGarantia = Math.max(0, Math.ceil((vencGarantia - ahora) / (1000 * 60 * 60 * 24)));
    const diasSoporte  = Math.max(0, Math.ceil((vencSoporte  - ahora) / (1000 * 60 * 60 * 24)));

    // Días totales para porcentaje
    const totalDiasGarantia = Math.ceil((vencGarantia - fecha) / (1000 * 60 * 60 * 24));
    const totalDiasSoporte  = Math.ceil((vencSoporte  - fecha) / (1000 * 60 * 60 * 24));
    const pctGarantia = totalDiasGarantia > 0 ? Math.max(0, Math.min(100, (diasGarantia / totalDiasGarantia) * 100)) : 0;
    const pctSoporte  = totalDiasSoporte  > 0 ? Math.max(0, Math.min(100, (diasSoporte  / totalDiasSoporte)  * 100)) : 0;

    const garantiaVigente = diasGarantia > 0;
    const soporteVigente  = diasSoporte  > 0;

    let status, statusLabel, statusColor, statusIcon;
    if (garantiaVigente) {
      status = 'CON_GARANTIA';
      statusLabel = `Con Garantía (${_formatDias(diasGarantia)})`;
      statusColor = 'var(--success)';
      statusIcon = '🟢';
    } else if (soporteVigente) {
      status = 'SOLO_SOPORTE';
      statusLabel = `Solo Soporte Técnico (${_formatDias(diasSoporte)})`;
      statusColor = 'var(--warning)';
      statusIcon = '🟡';
    } else {
      status = 'SIN_COBERTURA';
      statusLabel = 'Sin Cobertura';
      statusColor = 'var(--danger)';
      statusIcon = '🔴';
    }

    return {
      fechaCompra: fecha,
      garantia: {
        vigente: garantiaVigente,
        diasRestantes: diasGarantia,
        fechaVencimiento: vencGarantia,
        porcentaje: Math.round(pctGarantia),
        meses: mesesGarantia,
      },
      soporte: {
        vigente: soporteVigente,
        diasRestantes: diasSoporte,
        fechaVencimiento: vencSoporte,
        porcentaje: Math.round(pctSoporte),
        anios: anosSoporte,
      },
      status,
      statusLabel,
      statusColor,
      statusIcon,
    };
  }

  /** Formatea días a texto legible: "4 meses" o "2 años, 3 meses" */
  function _formatDias(dias) {
    if (dias <= 0) return 'vencido';
    if (dias < 30) return `${dias} día${dias !== 1 ? 's' : ''}`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    let str = `${anios} año${anios !== 1 ? 's' : ''}`;
    if (mesesRestantes > 0) str += `, ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`;
    return str;
  }

  return { calcular, parseFecha };
})();

window.GarantiaCalculator = GarantiaCalculator;
