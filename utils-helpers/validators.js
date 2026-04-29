/**
 * utils-helpers/validators.js
 */
const Validators = (() => {
  function required(v, label='Campo') {
    if (!v || String(v).trim() === '') return `${label} es obligatorio`;
    return null;
  }
  function minLength(v, min, label='Campo') {
    if (String(v).length < min) return `${label} debe tener al menos ${min} caracteres`;
    return null;
  }
  function isNumeric(v, label='Campo') {
    if (isNaN(Number(v))) return `${label} debe ser un número`;
    return null;
  }
  function pin(v) {
    if (!/^\d{4}$/.test(v)) return 'El PIN debe tener exactamente 4 dígitos';
    return null;
  }
  function ruc(v) {
    if (!/^\d{11}$/.test(v)) return 'El RUC debe tener 11 dígitos';
    return null;
  }
  // Ejecuta un array de validadores y devuelve primer error
  function run(value, rules) {
    for (const rule of rules) {
      const err = rule(value);
      if (err) return err;
    }
    return null;
  }
  return { required, minLength, isNumeric, pin, ruc, run };
})();
window.Validators = Validators;
