/* ============================================================
   ECONOMIA — Datos de ejemplo (solo primera vez)
   ============================================================ */

window.EconomiaSeed = (function() {

  function cargarSiVacio() {
    var estado = window.EconomiaState.get();
    var yaTieneDatos = (estado.ingresosFijos.length +
                        estado.ingresosExtra.length +
                        estado.gastos.length) > 0;
    if (yaTieneDatos) return false;

    var U = window.EconomiaUtils;
    var ym = U.mesActual();

    // Ingresos fijos
    window.EconomiaState.addItem('ingresosFijos', {
      persona: 'miguel', nombre: 'Salario Miguel', tipo: 'nomina',
      importe: 1500, periodicidad: 'mensual', activo: true, notas: ''
    });
    window.EconomiaState.addItem('ingresosFijos', {
      persona: 'pareja', nombre: 'Salario Pareja', tipo: 'nomina',
      importe: 1200, periodicidad: 'mensual', activo: true, notas: ''
    });

    // Ingresos extra
    window.EconomiaState.addItem('ingresosExtra', {
      persona: 'miguel', nombre: 'Paga extra verano', tipo: 'extra',
      importe: 1200, fecha: ym + '-15', categoria: 'paga-extra',
      destino: 'fondo-emergencia', notas: 'Ejemplo'
    });
    window.EconomiaState.addItem('ingresosExtra', {
      persona: 'miguel', nombre: 'Chapuza fontaneria', tipo: 'extra',
      importe: 300, fecha: ym + '-22', categoria: 'chapuza',
      destino: null, notas: 'Pendiente asignar'
    });

    // Gastos fijos
    [
      { nombre: 'Alquiler',         importe: 800,   periodicidad: 'mensual',    categoria: 'vivienda',      necesario: true,  diaCobro: 1 },
      { nombre: 'Luz',              importe: 65,    periodicidad: 'mensual',    categoria: 'suministros',   necesario: true,  diaCobro: 5 },
      { nombre: 'Agua',             importe: 30,    periodicidad: 'trimestral', categoria: 'suministros',   necesario: true,  diaCobro: 10 },
      { nombre: 'Internet + movil', importe: 55,    periodicidad: 'mensual',    categoria: 'telecom',       necesario: true,  diaCobro: 3 },
      { nombre: 'Seguro coche',     importe: 480,   periodicidad: 'anual',      categoria: 'seguros',       necesario: true,  diaCobro: 15 },
      { nombre: 'Gimnasio',         importe: 35,    periodicidad: 'mensual',    categoria: 'suscripciones', necesario: false, diaCobro: 8 },
      { nombre: 'Netflix',          importe: 12.99, periodicidad: 'mensual',    categoria: 'suscripciones', necesario: false, diaCobro: 12 },
      { nombre: 'Spotify',          importe: 10.99, periodicidad: 'mensual',    categoria: 'suscripciones', necesario: false, diaCobro: 20 }
    ].forEach(function(g) {
      window.EconomiaState.addItem('gastos', g);
    });

    // Gastos puntuales del mes
    [
      { nombre: 'Compra Mercadona', importe: 85.40, categoria: 'comida',       necesario: true  },
      { nombre: 'Cena fuera',       importe: 42.00, categoria: 'restaurantes', necesario: false },
      { nombre: 'Gasolina',         importe: 60.00, categoria: 'transporte',   necesario: true  },
      { nombre: 'Camiseta',         importe: 25.00, categoria: 'ropa',         necesario: false }
    ].forEach(function(g, idx) {
      g.periodicidad = 'puntual';
      g.fecha = ym + '-' + String(3 + idx).padStart(2, '0');
      window.EconomiaState.addItem('gastos', g);
    });

    // Objetivo: fondo de emergencia
    window.EconomiaState.addItem('objetivos', {
      nombre: 'Fondo de emergencia',
      importeObjetivo: 12000,
      importeActual: 3500,
      fechaLimite: (new Date().getFullYear() + 2) + '-12-31',
      prioridad: 'alta',
      color: '#16a085',
      icono: '🚨'
    });

    console.log('✅ Datos de ejemplo cargados');
    return true;
  }

  return { cargarSiVacio: cargarSiVacio };
})();

console.log('✅ EconomiaSeed cargado');
