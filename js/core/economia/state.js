/* ============================================================
   ECONOMIA — Estado + cálculos + pub/sub
   ============================================================ */

window.EconomiaState = (function() {

  var storage = window.EconomiaStorage.crear('estudio:economia');
  var U = window.EconomiaUtils;

  var estado = storage.cargar();
  var suscriptores = [];

  function suscribir(fn) {
    suscriptores.push(fn);
    return function() {
      suscriptores = suscriptores.filter(function(f) { return f !== fn; });
    };
  }

  function notificar() {
    storage.guardar(estado);
    suscriptores.forEach(function(fn) {
      try { fn(estado); } catch (e) { console.error('[economia] suscriptor error', e); }
    });
  }

  function get() { return estado; }

  function set(clave, valor) {
    estado[clave] = valor;
    notificar();
  }

  function addItem(clave, item) {
    if (!item.id) item.id = U.uid();
    estado[clave].push(item);
    notificar();
    return item;
  }

  function updateItem(clave, id, cambios) {
    var lista = estado[clave];
    var idx = lista.findIndex(function(x) { return x.id === id; });
    if (idx < 0) return null;
    lista[idx] = Object.assign({}, lista[idx], cambios);
    notificar();
    return lista[idx];
  }

  function removeItem(clave, id) {
    estado[clave] = estado[clave].filter(function(x) { return x.id !== id; });
    notificar();
  }

  // ---- CÁLCULOS --------------------------------------------
  function ingresoBaseMensual() {
    return estado.ingresosFijos
      .filter(function(i) { return i.activo !== false; })
      .reduce(function(acc, i) {
        return acc + U.aMensual(i.importe, i.periodicidad);
      }, 0);
  }

  function ingresoBasePorPersona() {
    var mapa = {};
    estado.personas.forEach(function(p) { mapa[p.id] = 0; });
    estado.ingresosFijos
      .filter(function(i) { return i.activo !== false; })
      .forEach(function(i) {
        var pid = i.persona || 'compartido';
        if (!(pid in mapa)) mapa[pid] = 0;
        mapa[pid] += U.aMensual(i.importe, i.periodicidad);
      });
    return mapa;
  }

  function ingresosExtraMes(ym) {
    ym = ym || U.mesActual();
    return estado.ingresosExtra.filter(function(i) {
      return i.fecha && i.fecha.slice(0, 7) === ym;
    });
  }

  function totalIngresosExtraMes(ym) {
    return ingresosExtraMes(ym).reduce(function(a, i) { return a + (parseFloat(i.importe) || 0); }, 0);
  }

  function totalIngresosMes(ym) {
    return ingresoBaseMensual() + totalIngresosExtraMes(ym);
  }

  function gastosFijosMensual() {
    return estado.gastos
      .filter(function(g) { return g.periodicidad !== 'puntual'; })
      .reduce(function(acc, g) {
        return acc + U.aMensual(g.importe, g.periodicidad);
      }, 0);
  }

  function gastosPuntualesMes(ym) {
    ym = ym || U.mesActual();
    return estado.gastos.filter(function(g) {
      return g.periodicidad === 'puntual' && g.fecha && g.fecha.slice(0, 7) === ym;
    });
  }

  function totalGastosPuntualesMes(ym) {
    return gastosPuntualesMes(ym).reduce(function(a, g) { return a + (parseFloat(g.importe) || 0); }, 0);
  }

  function totalGastosMes(ym) {
    return gastosFijosMensual() + totalGastosPuntualesMes(ym);
  }

  function gastosPorCategoria(ym) {
    ym = ym || U.mesActual();
    var mapa = {};
    estado.gastos.forEach(function(g) {
      var cat = g.categoria || 'otros';
      var imp = 0;
      if (g.periodicidad === 'puntual') {
        if (g.fecha && g.fecha.slice(0, 7) === ym) imp = parseFloat(g.importe) || 0;
      } else {
        imp = U.aMensual(g.importe, g.periodicidad);
      }
      if (!(cat in mapa)) mapa[cat] = 0;
      mapa[cat] += imp;
    });
    return mapa;
  }

  function gastosPorNecesidad(ym) {
    ym = ym || U.mesActual();
    var necesario = 0, innecesario = 0;
    estado.gastos.forEach(function(g) {
      var imp = 0;
      if (g.periodicidad === 'puntual') {
        if (g.fecha && g.fecha.slice(0, 7) === ym) imp = parseFloat(g.importe) || 0;
      } else {
        imp = U.aMensual(g.importe, g.periodicidad);
      }
      if (g.necesario) necesario += imp;
      else innecesario += imp;
    });
    return { necesario: necesario, innecesario: innecesario };
  }

  function presupuestoObjetivo() {
    var base = ingresoBaseMensual();
    var p = estado.presupuesto;
    return {
      base: base,
      necesidades: base * (p.necesidades / 100),
      estilo: base * (p.estilo / 100),
      ahorro: base * (p.ahorro / 100)
    };
  }

  function comparativaPresupuesto(ym) {
    var obj = presupuestoObjetivo();
    var nec = gastosPorNecesidad(ym);
    return {
      necesidades: { real: nec.necesario, objetivo: obj.necesidades, diff: nec.necesario - obj.necesidades },
      estilo: { real: nec.innecesario, objetivo: obj.estilo, diff: nec.innecesario - obj.estilo },
      ahorro: { real: totalIngresosMes(ym) - totalGastosMes(ym), objetivo: obj.ahorro }
    };
  }

  function estadoObjetivo(obj) {
    var falta = Math.max(0, (obj.importeObjetivo || 0) - (obj.importeActual || 0));
    var pct = obj.importeObjetivo ? (obj.importeActual / obj.importeObjetivo) * 100 : 0;
    var mesesRestantes = null;
    if (obj.fechaLimite) {
      var hoy = new Date();
      var lim = new Date(obj.fechaLimite);
      mesesRestantes = Math.max(0, (lim.getFullYear() - hoy.getFullYear()) * 12 + (lim.getMonth() - hoy.getMonth()));
    }
    var mensualNecesaria = mesesRestantes && mesesRestantes > 0 ? falta / mesesRestantes : falta;
    return {
      falta: falta,
      porcentaje: U.clamp(pct, 0, 100),
      mesesRestantes: mesesRestantes,
      mensualNecesaria: mensualNecesaria,
      completado: falta <= 0
    };
  }

  function fondoEmergenciaRecomendado(meses) {
    meses = meses || 6;
    return gastosFijosMensual() * meses;
  }

  function sugerencias(ym) {
    ym = ym || U.mesActual();
    var out = [];
    var comp = comparativaPresupuesto(ym);

    if (comp.necesidades.diff > 50) {
      out.push({ tipo: 'aviso', texto: 'Tus gastos necesarios superan el objetivo en ' + U.eur(comp.necesidades.diff) + '. Revisa vivienda o transporte.' });
    }
    if (comp.estilo.diff > 30) {
      out.push({ tipo: 'aviso', texto: 'Gastas ' + U.eur(comp.estilo.diff) + ' más de lo presupuestado en estilo de vida.' });
    }
    if (comp.ahorro.real < comp.ahorro.objetivo) {
      var dif = comp.ahorro.objetivo - comp.ahorro.real;
      out.push({ tipo: 'aviso', texto: 'Te faltan ' + U.eur(dif) + ' para llegar al objetivo de ahorro del 20%.' });
    } else if (comp.ahorro.real > comp.ahorro.objetivo) {
      out.push({ tipo: 'exito', texto: '¡Vas bien! Has ahorrado ' + U.eur(comp.ahorro.real - comp.ahorro.objetivo) + ' por encima del objetivo.' });
    }

    var extraSinAsignar = estado.ingresosExtra
      .filter(function(i) { return i.fecha && i.fecha.slice(0, 7) === ym && !i.destino; })
      .reduce(function(a, i) { return a + (parseFloat(i.importe) || 0); }, 0);
    if (extraSinAsignar > 0) {
      out.push({ tipo: 'info', texto: 'Tienes ' + U.eur(extraSinAsignar) + ' en extras sin asignar. ¿Fondo de emergencia u objetivo?' });
    }

    var subs = estado.gastos
      .filter(function(g) { return g.categoria === 'suscripciones' && g.periodicidad !== 'puntual'; })
      .reduce(function(a, g) { return a + U.aMensual(g.importe, g.periodicidad); }, 0);
    if (subs > 0) {
      out.push({ tipo: 'info', texto: 'En suscripciones: ' + U.eur(subs) + '/mes = ' + U.eur(subs * 12) + '/año.' });
    }

    var nec = gastosPorNecesidad(ym);
    if (nec.innecesario > 100) {
      out.push({ tipo: 'info', texto: 'Si recortas todo lo innecesario ahorrarías ' + U.eur(nec.innecesario) + '/mes.' });
    }

    return out;
  }

  return {
    get: get,
    set: set,
    addItem: addItem,
    updateItem: updateItem,
    removeItem: removeItem,
    suscribir: suscribir,
    notificar: notificar,
    storage: storage,

    ingresoBaseMensual: ingresoBaseMensual,
    ingresoBasePorPersona: ingresoBasePorPersona,
    ingresosExtraMes: ingresosExtraMes,
    totalIngresosExtraMes: totalIngresosExtraMes,
    totalIngresosMes: totalIngresosMes,
    gastosFijosMensual: gastosFijosMensual,
    gastosPuntualesMes: gastosPuntualesMes,
    totalGastosPuntualesMes: totalGastosPuntualesMes,
    totalGastosMes: totalGastosMes,
    gastosPorCategoria: gastosPorCategoria,
    gastosPorNecesidad: gastosPorNecesidad,
    presupuestoObjetivo: presupuestoObjetivo,
    comparativaPresupuesto: comparativaPresupuesto,
    estadoObjetivo: estadoObjetivo,
    fondoEmergenciaRecomendado: fondoEmergenciaRecomendado,
    sugerencias: sugerencias
  };
})();

console.log('✅ EconomiaState cargado');
