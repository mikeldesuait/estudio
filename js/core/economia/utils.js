/* ============================================================
   ECONOMIA — Utilidades (formato, fechas, normalización)
   ============================================================ */

window.EconomiaUtils = (function() {

  function eur(n) {
    if (n === null || n === undefined || isNaN(n)) n = 0;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(n);
  }

  function eurCorto(n) {
    if (n === null || n === undefined || isNaN(n)) n = 0;
    var abs = Math.abs(n);
    if (abs >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k €';
    return Math.round(n) + ' €';
  }

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function mesActual() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function nombreMes(ym) {
    if (!ym) return '';
    var partes = ym.split('-');
    var d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  function fechaCorta(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function aMensual(importe, periodicidad) {
    importe = parseFloat(importe) || 0;
    switch (periodicidad) {
      case 'mensual':    return importe;
      case 'trimestral': return importe / 3;
      case 'semestral':  return importe / 6;
      case 'anual':      return importe / 12;
      case 'puntual':    return 0;
      default:           return importe;
    }
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function redondear(n, decimales) {
    decimales = decimales === undefined ? 2 : decimales;
    var f = Math.pow(10, decimales);
    return Math.round(n * f) / f;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function porcentaje(parte, total) {
    if (!total) return 0;
    return (parte / total) * 100;
  }

  function descargarJSON(nombre, contenido) {
    var blob = new Blob([contenido], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getRangoCiclo(ym, diaCobro) {
    diaCobro = parseInt(diaCobro) || 1;
    var partes = ym.split('-');
    var anio = parseInt(partes[0]);
    var mes = parseInt(partes[1]) - 1;
    if (diaCobro === 1) {
      var ini = new Date(anio, mes, 1);
      var fin = new Date(anio, mes + 1, 0);
      return { inicio: formatearISO(ini), fin: formatearISO(fin) };
    }
    var ini = new Date(anio, mes, diaCobro);
    var fin = new Date(anio, mes + 1, diaCobro - 1);
    return { inicio: formatearISO(ini), fin: formatearISO(fin) };
  }

  function formatearISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fechaEnCiclo(fechaISO, ym, diaCobro) {
    var rango = getRangoCiclo(ym, diaCobro);
    return fechaISO >= rango.inicio && fechaISO <= rango.fin;
  }

  return {
    getRangoCiclo: getRangoCiclo,
    fechaEnCiclo: fechaEnCiclo,
    formatearISO: formatearISO,
    eur: eur,
    eurCorto: eurCorto,
    hoy: hoy,
    mesActual: mesActual,
    nombreMes: nombreMes,
    fechaCorta: fechaCorta,
    aMensual: aMensual,
    uid: uid,
    redondear: redondear,
    clamp: clamp,
    porcentaje: porcentaje,
    descargarJSON: descargarJSON
  };
})();

console.log('✅ EconomiaUtils cargado');
