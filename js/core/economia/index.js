/* ============================================================
   ECONOMIA — Lógica Definitiva (Vista de Mando)
   ============================================================ */

window.Economia = (function() {
  var State = window.EconomiaState;
  var Tpl = window.EconomiaTemplate;
  var Seed = window.EconomiaSeed;
  var U = window.EconomiaUtils;
  var contenedor = null;
  var mesActualYM = U.mesActual();
  var modalConfig = null;

  var CATS = { vivienda: { icono: '🏠', color: '#3b82f6', nombre: 'Vivienda' }, suministros: { icono: '💡', color: '#f59e0b', nombre: 'Suministros' }, telecom: { icono: '📱', color: '#06b6d4', nombre: 'Telecom' }, seguros: { icono: '🛡️', color: '#64748b', nombre: 'Seguros' }, suscripciones: { icono: '📺', color: '#8b5cf6', nombre: 'Suscripciones' }, deudas: { icono: '💳', color: '#ef4444', nombre: 'Deudas' }, educacion: { icono: '🎓', color: '#14b8a6', nombre: 'Educación' }, salud: { icono: '🏥', color: '#ec4899', nombre: 'Salud' }, transporte: { icono: '🚗', color: '#f97316', nombre: 'Transporte' }, comida: { icono: '🍔', color: '#fb923c', nombre: 'Comida' }, ocio: { icono: '🎉', color: '#f472b6', nombre: 'Ocio' }, restaurantes: { icono: '🍽️', color: '#e11d48', nombre: 'Restaurantes' }, ropa: { icono: '👕', color: '#a78bfa', nombre: 'Ropa' }, hogar: { icono: '🛋️', color: '#78716c', nombre: 'Hogar' }, regalos: { icono: '🎁', color: '#eab308', nombre: 'Regalos' }, otros: { icono: '📦', color: '#94a3b8', nombre: 'Otros' } };
  var TIPOS_INGRESO = { nomina: 'Nómina', autonomo: 'Autónomo', esporadico: 'Trabajo esporádico', ayuda: 'Ayuda / subvención', alquiler: 'Alquiler cobrado', devolucion: 'Devolución', otros: 'Otros' };
  var PERSONAS_DEF = [{ id: 'miguel', nombre: 'Miguel' }, { id: 'pareja', nombre: 'Pareja' }, { id: 'compartido', nombre: 'Compartido' }];

  function montar(cont) {
    contenedor = cont;
    contenedor.innerHTML = Tpl.html();
    Seed.cargarSiVacio();
    enlazarEventos();
    renderTodo();
    State.suscribir(renderTodo);
  }

  function enlazarEventos() {
    contenedor.querySelectorAll('.eco-tab').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var tab = btn.dataset.tab;
        var nav = btn.closest('.eco-tabs');
        nav.querySelectorAll('.eco-tab').forEach(function(b) { b.classList.remove('eco-tab-activa'); });
        btn.classList.add('eco-tab-activa');
        contenedor.querySelectorAll('.eco-panel').forEach(function(p) { p.classList.remove('eco-panel-activo'); });
        
        var target = contenedor.querySelector('[data-panel="' + tab + '"]');
        if (target) target.classList.add('eco-panel-activo');
        
        var subTabs = contenedor.querySelector('#ecoSubTabsPrev');
        if (subTabs) subTabs.style.display = 'none';

        if (tab === 'prevision') {
          if (subTabs) subTabs.style.display = 'flex';
          var subTab = contenedor.querySelector('.eco-tab[data-tab="prev-ingresos"]');
          if (subTab) {
            contenedor.querySelectorAll('.eco-tab').forEach(function(b){b.classList.remove('eco-tab-activa');});
            btn.classList.add('eco-tab-activa');
            subTab.classList.add('eco-tab-activa');
          }
          contenedor.querySelector('[data-panel="prev-ingresos"]').classList.add('eco-panel-activo');
        } else if (tab.startsWith('prev-')) {
          if (subTabs) subTabs.style.display = 'flex';
          var btnMain = contenedor.querySelector('.eco-tab[data-tab="prevision"]');
          if (btnMain) btnMain.classList.add('eco-tab-activa');
        }
      });
    });

    contenedor.querySelector('#ecoMesPrev').addEventListener('click', function() { cambiarMes(-1); });
    contenedor.querySelector('#ecoMesNext').addEventListener('click', function() { cambiarMes(1); });
    contenedor.querySelector('#ecoExportar').addEventListener('click', exportar);
    contenedor.querySelector('#ecoImportar').addEventListener('click', importar);
    contenedor.querySelector('#ecoReset').addEventListener('click', resetear);

    var inputBase = contenedor.querySelector('#ecoSaldoBase');
    if (inputBase) {
      inputBase.addEventListener('change', function(e) {
        var val = parseFloat(e.target.value) || 0;
        State.setSaldo(val);
      });
    }

    contenedor.addEventListener('click', function(e) {
      var btnNuevo = e.target.closest('[data-nuevo]');
      if (btnNuevo) { e.preventDefault(); abrirModalNuevo(btnNuevo.dataset.nuevo); return; }
      var btnCerrar = e.target.closest('[data-cerrar]');
      if (btnCerrar) { e.preventDefault(); cerrarModal(); return; }
      var btnEditar = e.target.closest('[data-editar]');
      if (btnEditar) { e.preventDefault(); abrirModalEditar(btnEditar.dataset.editar, btnEditar.dataset.tipo); return; }
      var btnBorrar = e.target.closest('[data-borrar]');
      if (btnBorrar) { e.preventDefault(); if (confirm('¿Borrar este elemento?')) State.removeItem(btnBorrar.dataset.coleccion, btnBorrar.dataset.borrar); return; }
      var btnAportar = e.target.closest('[data-aportar]');
      if (btnAportar) { e.preventDefault(); aportarAObjetivo(btnAportar.dataset.aportar); return; }
      var btnCobrar = e.target.closest('[data-cobrar]');
      if (btnCobrar) { e.preventDefault(); abrirModalCobrar(btnCobrar.dataset.cobrar); return; }
      var btnPagar = e.target.closest('[data-pagar]');
      if (btnPagar) { e.preventDefault(); abrirModalPagar(btnPagar.dataset.pagar); return; }
    });

    contenedor.querySelector('#ecoModalGuardar').addEventListener('click', guardarModal);
  }

  function cambiarMes(delta) {
    var partes = mesActualYM.split('-');
    var d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1 + delta, 1);
    mesActualYM = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderTodo();
  }

  function renderTodo() {
    var ultimoCiclo = localStorage.getItem('eco_ultimo_ciclo_pagado');
    if (ultimoCiclo !== mesActualYM) {
      var gastosFijos = State.get().gastos.filter(function(g){ return g.periodicidad !== 'puntual'; });
      gastosFijos.forEach(function(g){ if (g.pagado) State.updateItem('gastos', g.id, { pagado: false }); });
      var ingresosFijos = State.get().ingresosFijos || [];
      ingresosFijos.forEach(function(i){ if (i.pagado) State.updateItem('ingresosFijos', i.id, { pagado: false }); });
      localStorage.setItem('eco_ultimo_ciclo_pagado', mesActualYM);
    }

    contenedor.querySelector('#ecoMesActual').textContent = U.nombreMes(mesActualYM);
    
    var headerAcciones = contenedor.querySelector('.eco-header-acciones');
    if (headerAcciones && !contenedor.querySelector('#ecoResetPagos')) {
      var btnReset = document.createElement('button');
      btnReset.className = 'eco-btn eco-btn-ghost';
      btnReset.id = 'ecoResetPagos';
      btnReset.innerHTML = '<i class="fas fa-sync-alt" title="Reiniciar pagos del ciclo"></i>';
      btnReset.title = 'Volver a marcar todos los gastos e ingresos como pendientes';
      btnReset.addEventListener('click', function() {
        if (!confirm('¿Volver a marcar TODOS los pagos e ingresos como pendientes?')) return;
        var gastos = State.get().gastos.filter(function(g){ return g.periodicidad !== 'puntual'; });
        gastos.forEach(function(g){ if(g.pagado) State.updateItem('gastos', g.id, { pagado: false }); });
        var ingresos = State.get().ingresosFijos || [];
        ingresos.forEach(function(i){ if(i.pagado) State.updateItem('ingresosFijos', i.id, { pagado: false }); });
        localStorage.removeItem('eco_ultimo_ciclo_pagado');
        location.reload();
      });
      headerAcciones.insertBefore(btnReset, headerAcciones.firstChild);
    }

    renderReal(); 
    renderPrevision();
  }

  // ---------------- LÓGICA REAL ----------------
  function renderReal() {
    var base = State.get().saldoCuentas || 0;
    
    var movsCiclo = State.get().gastos.filter(function(g) {
      var diaCobro = State.get().presupuesto.diaCobro || 1;
      return g.periodicidad === 'puntual' && g.fecha && U.fechaEnCiclo(g.fecha, mesActualYM, diaCobro);
    });

    var ingresosReales = movsCiclo.filter(function(g) { return !g.necesario; }).reduce(function(acc, g) { return acc + (parseFloat(g.importe) || 0); }, 0);
    var gastosReales = movsCiclo.filter(function(g) { return g.necesario; }).reduce(function(acc, g) { return acc + (parseFloat(g.importe) || 0); }, 0);
    var saldoVivo = base + ingresosReales - gastosReales;
    
    var display = contenedor.querySelector('#ecoSaldoDisplay');
    if (display) { display.textContent = U.eur(saldoVivo); display.style.color = saldoVivo >= 0 ? '#10b981' : '#ef4444'; }
    
    var inputBase = contenedor.querySelector('#ecoSaldoBase');
    if (inputBase && document.activeElement !== inputBase) inputBase.value = base;

    var fijosGastos = State.get().gastos.filter(function(g) { return g.periodicidad !== 'puntual' && !g.pagado; });
    var fijosIngresos = (State.get().ingresosFijos || []).filter(function(i) { return !i.pagado; });
    
    var todosPendientes = [];
    var diaHoy = new Date(); diaHoy.setHours(0,0,0,0);

    function calcularFecha(diaVencimiento) {
      var diaCobroCiclo = State.get().presupuesto.diaCobro || 1;
      var f = new Date(diaHoy.getFullYear(), diaHoy.getMonth(), diaVencimiento);
      if (diaVencimiento < diaCobroCiclo) {
          f = new Date(diaHoy.getFullYear(), diaHoy.getMonth() + 1, diaVencimiento);
      } else if (diaVencimiento >= diaCobroCiclo && diaHoy.getDate() < diaCobroCiclo) {
          f = new Date(diaHoy.getFullYear(), diaHoy.getMonth() - 1, diaVencimiento);
      }
      return f;
    }

    fijosGastos.forEach(function(g) {
      var f = calcularFecha(g.diaCobro || 1);
      todosPendientes.push({ tipo: 'gasto', item: g, fecha: f, importe: U.aMensual(g.importe, g.periodicidad), nombre: g.nombre, cat: CATS[g.categoria] || {icono:'📦'} });
    });
    fijosIngresos.forEach(function(i) {
      var f = calcularFecha(i.diaCobro || 1);
      todosPendientes.push({ tipo: 'ingreso', item: i, fecha: f, importe: U.aMensual(i.importe, i.periodicidad), nombre: i.nombre, cat: {icono:'💼'} });
    });

    todosPendientes.sort(function(a, b) { return a.fecha - b.fecha; });

    var totalGastos = 0, totalIngresos = 0, total5diasGastos = 0, total5diasIngresos = 0;
    
    todosPendientes.forEach(function(p) {
      if (p.tipo === 'gasto') totalGastos += p.importe;
      else totalIngresos += p.importe;

      var diff = Math.ceil((p.fecha.getTime() - diaHoy.getTime()) / (1000 * 3600 * 24));
      if (diff <= 5) {
        if (p.tipo === 'gasto') total5diasGastos += p.importe;
        else total5diasIngresos += p.importe;
      }
    });

    var total5dias = total5diasGastos + total5diasIngresos;
    var previsionFinal = saldoVivo + totalIngresos - totalGastos;

    contenedor.querySelector('#ecoAvisoTotal').textContent = U.eur(total5dias);
    contenedor.querySelector('#ecoAvisoLista').innerHTML = todosPendientes.filter(function(p){
      return Math.ceil((p.fecha.getTime() - diaHoy.getTime()) / (1000 * 3600 * 24)) <= 5;
    }).length + ' movimientos próximos';
    
    contenedor.querySelector('#ecoRealPendienteTotal').textContent = U.eur(totalGastos);
    contenedor.querySelector('#ecoRealIngresoTotal').textContent = U.eur(totalIngresos);
    var elTeQueda = contenedor.querySelector('#ecoRealTeQueda');
    elTeQueda.textContent = U.eur(previsionFinal);
    elTeQueda.style.color = previsionFinal >= 0 ? '#3b82f6' : '#ef4444';

    var lista = contenedor.querySelector('#ecoListaUnificada');
    if (todosPendientes.length === 0) {
      lista.innerHTML = '<div class="eco-vacio">No hay pagos ni ingresos pendientes. ¡Todo al día!</div>';
    } else {
      lista.innerHTML = '<div class="eco-lista">' + todosPendientes.map(function(p) {
        var diff = Math.ceil((p.fecha.getTime() - diaHoy.getTime()) / (1000 * 3600 * 24));
        var fechaStr = p.fecha.getDate() + '/' + (p.fecha.getMonth()+1);
        var alerta = diff < 0 ? '<span style="color:#ef4444;font-weight:700;">Vencida</span>' : (diff === 0 ? 'Hoy' : 'En ' + diff + ' días');
        var color = p.tipo === 'ingreso' ? '#10b981' : '#ef4444';
        var btnAccion = p.tipo === 'ingreso' 
          ? '<button class="eco-btn eco-btn-primario" data-cobrar="' + p.item.id + '" style="padding:4px 8px; font-size:12px; background:#10b981;"><i class="fas fa-check"></i> Confirmar</button>'
          : '<button class="eco-btn eco-btn-primario" data-pagar="' + p.item.id + '" style="padding:4px 8px; font-size:12px;"><i class="fas fa-check"></i> Validar</button>';

        return '<div class="eco-item">'
          + '<div class="eco-item-cat">' + p.cat.icono + '</div>'
          + '<div class="eco-item-info"><div class="eco-item-nombre">' + p.nombre + '</div><div class="eco-item-meta">' + fechaStr + ' · ' + alerta + '</div></div>'
          + '<div class="eco-item-importe" style="color:'+color+';">' + (p.tipo==='ingreso'?'+':'-') + ' ' + U.eur(p.importe) + '</div>'
          + '<div class="eco-item-acciones">' + btnAccion + '</div>'
          + '</div>';
      }).join('') + '</div>';
    }

    var listaReal = contenedor.querySelector('#ecoRealLista');
    var movs = movsCiclo.sort(function(a,b) { return b.fecha.localeCompare(a.fecha); });
    
    if (movs.length === 0) {
      listaReal.innerHTML = '<div class="eco-vacio">Aún no has apuntado ningún movimiento este ciclo. Usa el botón ⚡.</div>';
    } else {
      listaReal.innerHTML = '<div class="eco-lista">' + movs.map(function(item) {
        var esIngreso = !item.necesario; 
        var cat = CATS[item.categoria] || { icono: '📦', nombre: 'Otros' };
        var signo = esIngreso ? '+' : '-';
        var color = esIngreso ? '#10b981' : '#ef4444';
        var notaHTML = item.notas ? ' · <em style="color:#f59e0b;">' + item.notas + '</em>' : '';
        return '<div class="eco-item"><div class="eco-item-cat" style="background:'+(esIngreso?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)')+';">'+cat.icono+'</div><div class="eco-item-info"><div class="eco-item-nombre">'+item.nombre+'</div><div class="eco-item-meta">'+U.fechaCorta(item.fecha)+' · '+cat.nombre+notaHTML+'</div></div><div class="eco-item-importe" style="color:'+color+';font-weight:700;">'+signo+' '+U.eur(item.importe)+'</div><div class="eco-item-acciones"><button class="eco-item-btn" data-editar="'+item.id+'" data-tipo="gasto-puntual" title="Editar"><i class="fas fa-pen"></i></button><button class="eco-item-btn eco-item-btn-peligro" data-borrar="'+item.id+'" data-coleccion="gastos" title="Borrar"><i class="fas fa-trash"></i></button></div></div>';
      }).join('') + '</div>';
    }
  }

  // ---------------- LÓGICA PREVISIÓN ----------------
  function renderPrevision() {
    var base = State.ingresoBaseMensual();
    var extra = State.totalIngresosExtraMes(mesActualYM);
    var gastoFijo = State.gastosFijosMensual();
    var balancePrevisto = base + extra - gastoFijo;

    contenedor.querySelector('#ecoKpiIngreso').textContent = U.eur(base);
    contenedor.querySelector('#ecoKpiIngresoSub').textContent = 'Suma de ingresos fijos';
    contenedor.querySelector('#ecoKpiGasto').textContent = U.eur(gastoFijo);
    contenedor.querySelector('#ecoKpiGastoSub').textContent = 'Suma de gastos recurrentes';
    
    var elBal = contenedor.querySelector('#ecoKpiBalance');
    elBal.textContent = U.eur(balancePrevisto);
    contenedor.querySelector('#ecoKpiBalanceSub').textContent = balancePrevisto >= 0 ? 'Previsión positiva' : 'Previsión negativa (déficit)';
    var elBalBox = elBal.closest('.eco-kpi-balance');
    if (elBalBox) { elBalBox.classList.toggle('eco-pos', balancePrevisto >= 0); elBalBox.classList.toggle('eco-neg', balancePrevisto < 0); }

    renderLista('ecoIngresosFijos', 'ingresosFijos', 'ingreso-fijo');
    renderLista('ecoGastosFijos', 'gastos', 'gasto-fijo', function(g) { return g.periodicidad !== 'puntual'; });
    renderObjetivos();
    renderPresupuesto();
  }

  function renderLista(selector, coleccion, tipo, filtro) {
    var el = contenedor.querySelector('#' + selector);
    if (!el) return;
    var lista = State.get()[coleccion] || [];
    if (filtro) lista = lista.filter(filtro);
    if (lista.length === 0) { el.innerHTML = '<div class="eco-vacio">Sin elementos. Pulsa "Añadir" para empezar.</div>'; return; }
    
    el.innerHTML = '<div class="eco-lista">' + lista.map(function(item) {
      var cat = (CATS[item.categoria] || { icono: '📦', color: '#94a3b8', nombre: 'Otros' });
      var per = PERSONAS_DEF.find(function(p) { return p.id === item.persona; });
      var meta = [];
      if (tipo === 'ingreso-fijo') { meta.push(per ? per.nombre : item.persona); meta.push(TIPOS_INGRESO[item.tipo] || item.tipo); meta.push(item.periodicidad); } 
      else { meta.push(cat.nombre); meta.push(item.periodicidad); if (item.necesario) meta.push('necesario'); else meta.push('innecesario'); }

      return '<div class="eco-item"><div class="eco-item-cat">' + cat.icono + '</div><div class="eco-item-info"><div class="eco-item-nombre">' + item.nombre + '</div><div class="eco-item-meta">' + meta.join(' · ') + '</div></div><div class="eco-item-importe">' + U.eur(item.importe) + (item.periodicidad!=='mensual'?'<small>'+U.eur(U.aMensual(item.importe,item.periodicidad))+'/mes</small>':'') + '</div><div class="eco-item-acciones"><button class="eco-item-btn" data-editar="' + item.id + '" data-tipo="' + tipo + '" title="Editar"><i class="fas fa-pen"></i></button><button class="eco-item-btn eco-item-btn-peligro" data-borrar="' + item.id + '" data-coleccion="' + coleccion + '" title="Borrar"><i class="fas fa-trash"></i></button></div></div>';
    }).join('') + '</div>';
  }

  function renderObjetivos() {
    var el = contenedor.querySelector('#ecoObjetivos');
    var lista = State.get().objetivos || [];
    if (lista.length === 0) { el.innerHTML = '<div class="eco-vacio">Sin objetivos. Crea uno para empezar a ahorrar.</div>'; return; }
    el.innerHTML = lista.map(function(obj) {
      var est = State.estadoObjetivo(obj);
      return '<div class="eco-objetivo"><div class="eco-objetivo-head"><div class="eco-objetivo-titulo">' + (obj.icono || '🎯') + ' ' + obj.nombre + (est.completado ? ' <span class="eco-objetivo-completado">¡Conseguido!</span>' : '') + '</div><div class="eco-objetivo-pct">' + est.porcentaje.toFixed(0) + '%</div></div><div class="eco-barra"><div class="eco-barra-fill" style="width:' + est.porcentaje + '%;background:' + (obj.color || '#3b82f6') + '"></div></div><div class="eco-objetivo-meta"><div>Ahorrado<strong>' + U.eur(obj.importeActual || 0) + '</strong></div><div>Objetivo<strong>' + U.eur(obj.importeObjetivo || 0) + '</strong></div><div>Falta<strong>' + U.eur(est.falta) + '</strong></div></div>' + (est.mesesRestantes !== null && !est.completado ? '<div class="eco-objetivo-meta" style="margin-top:8px;grid-template-columns:1fr"><div>Faltan <strong>' + est.mesesRestantes + ' meses</strong> · Ahorrar <strong>' + U.eur(est.mensualNecesaria) + '/mes</strong></div></div>' : '') + '<div style="display:flex;gap:8px;margin-top:12px"><button class="eco-btn eco-btn-primario" data-aportar="' + obj.id + '"><i class="fas fa-plus"></i> Aportar</button><button class="eco-btn eco-btn-ghost" data-editar="' + obj.id + '" data-tipo="objetivo"><i class="fas fa-pen"></i></button><button class="eco-btn eco-btn-ghost" data-borrar="' + obj.id + '" data-coleccion="objetivos"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
  }

  function renderPresupuesto() {
    var el = contenedor.querySelector('#ecoPresupuesto');
    var obj = State.presupuestoObjetivo();
    var comp = State.comparativaPresupuesto(mesActualYM);
    var diaCobro = State.get().presupuesto.diaCobro || 1;
    var rango = U.getRangoCiclo(mesActualYM, diaCobro);
    var textoCiclo = diaCobro === 1 ? 'Basado en tu <strong>ingreso base familiar</strong> de ' + U.eur(obj.base) + '/mes.' : 'Ciclo actual: <strong>' + U.fechaCorta(rango.inicio) + ' al ' + U.fechaCorta(rango.fin) + '</strong>. Basado en un ingreso base de ' + U.eur(obj.base) + '/mes.';

    function barra(titulo, real, objetivo, color) {
      var pct = objetivo > 0 ? (real / objetivo) * 100 : 0;
      var pctMostrar = Math.min(150, pct);
      var estado, estadoTexto, colorFinal = color;
      if (pct <= 100) { estado = 'eco-presu-ok'; estadoTexto = '✓ Dentro del presupuesto (' + pct.toFixed(0) + '%)'; } 
      else if (pct <= 115) { estado = 'eco-presu-alerta'; estadoTexto = '⚠️ Algo por encima (' + pct.toFixed(0) + '%)'; colorFinal = '#f59e0b'; } 
      else { estado = 'eco-presu-exceso'; estadoTexto = '✗ Excedido (' + pct.toFixed(0) + '%)'; colorFinal = '#ef4444'; }
      return '<div class="eco-presu-item"><div class="eco-presu-head"><span class="eco-presu-titulo">' + titulo + '</span><span class="eco-presu-valores"><strong>' + U.eur(real) + '</strong> / ' + U.eur(objetivo) + '</span></div><div class="eco-presu-barra"><div class="eco-presu-barra-fill" style="width:' + pctMostrar + '%;background:' + colorFinal + '"></div><div class="eco-presu-barra-marca" style="left:100%"></div></div><div class="eco-presu-estado ' + estado + '">' + estadoTexto + '</div></div>';
    }

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px"><p style="font-size:13px;color:var(--text-2);margin:0;">' + textoCiclo + '</p><div style="display:flex;align-items:center;gap:8px;font-size:13px"><label for="ecoDiaCobro" style="font-weight:600;color:var(--text-2)">Ciclo inicia el día:</label><input type="number" id="ecoDiaCobro" min="1" max="28" value="'+diaCobro+'" style="width:60px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px"></div></div>';
    html += barra('🏠 Necesidades (50%)', comp.necesidades.real, comp.necesidades.objetivo, '#3b82f6') + barra('🎉 Estilo de vida (30%)', comp.estilo.real, comp.estilo.objetivo, '#8b5cf6') + barra('💰 Ahorro (20%)', Math.max(0, comp.ahorro.real), comp.ahorro.objetivo, '#10b981');
    el.innerHTML = html;

    var inDia = el.querySelector('#ecoDiaCobro');
    if (inDia) inDia.addEventListener('change', function(e) { var p = State.get().presupuesto; p.diaCobro = parseInt(e.target.value)||1; State.set('presupuesto', p); });
  }

  // ---------------- MODAL ----------------
  function abrirModalNuevo(tipo) {
    modalConfig = { tipo: tipo, coleccion: coleccionDeTipo(tipo), item: null };
    contenedor.querySelector('#ecoModalTitulo').textContent = 'Añadir ' + (tipo==='rapido'?'movimiento real':tipo.replace('-',' '));
    contenedor.querySelector('#ecoModalBody').innerHTML = formHTML(tipo, {});
    contenedor.querySelector('#ecoModal').hidden = false;
  }

  function abrirModalCobrar(id) {
    var i = State.get().ingresosFijos.find(function(x) { return x.id === id; });
    if (!i) return;
    modalConfig = { tipo: 'cobrar', coleccion: 'ingresosFijos', item: i };
    contenedor.querySelector('#ecoModalTitulo').textContent = 'Confirmar cobro: ' + i.nombre;
    
    var html = ''
      + '<div class="eco-campo"><label>Importe real cobrado (€)</label><input type="number" step="0.01" id="inputCobroReal" value="' + i.importe + '" style="font-size:20px;font-weight:700;"></div>'
      + '<div class="eco-campo"><label>Fecha de abono</label><input type="date" id="inputCobroFecha" value="' + U.hoy() + '"></div>'
      + '<div class="eco-campo"><label>Notas (opcional)</label><input type="text" id="inputCobroNota" placeholder="ej: Horas extra, plus..."></div>'
      + '<p style="font-size:12px;color:var(--text-2);margin-top:10px;">Al confirmar, se sumará a tu saldo real.</p>';
    
    contenedor.querySelector('#ecoModalBody').innerHTML = html;
    contenedor.querySelector('#ecoModal').hidden = false;
  }

  function abrirModalPagar(id) {
    var g = State.get().gastos.find(function(x) { return x.id === id; });
    if (!g) return;
    modalConfig = { tipo: 'pagar', coleccion: 'gastos', item: g };
    contenedor.querySelector('#ecoModalTitulo').textContent = 'Validar pago: ' + g.nombre;
    
    var html = ''
      + '<div class="eco-campo"><label>Importe real cobrado (€)</label><input type="number" step="0.01" id="inputPagoReal" value="' + g.importe + '" style="font-size:20px;font-weight:700;"></div>'
      + '<div class="eco-campo"><label>Fecha de cargo</label><input type="date" id="inputPagoFecha" value="' + U.hoy() + '"></div>'
      + '<div class="eco-campo"><label>Notas (opcional)</label><input type="text" id="inputPagoNota" placeholder="ej: Subida de precio, mes de frío..."></div>'
      + '<p style="font-size:12px;color:var(--text-2);margin-top:10px;">Al validar, se descontará de tu saldo real y desaparecerá de pendientes.</p>';
    
    contenedor.querySelector('#ecoModalBody').innerHTML = html;
    contenedor.querySelector('#ecoModal').hidden = false;
  }

  function abrirModalEditar(id, tipo) {
    var col = (tipo === 'gasto-puntual') ? 'gastos' : coleccionDeTipo(tipo);
    var item = State.get()[col].find(function(x) { return x.id === id; });
    if (!item) return;
    modalConfig = { tipo: tipo, coleccion: col, item: item };
    contenedor.querySelector('#ecoModalTitulo').textContent = 'Editar ' + tipo.replace('-',' ');
    contenedor.querySelector('#ecoModalBody').innerHTML = formHTML(tipo, item);
    contenedor.querySelector('#ecoModal').hidden = false;
  }

  function cerrarModal() { contenedor.querySelector('#ecoModal').hidden = true; modalConfig = null; }
  
  function guardarModal() {
    if (!modalConfig) return;
    
    if (modalConfig.tipo === 'cobrar') {
      var impReal = parseFloat(contenedor.querySelector('#inputCobroReal').value) || 0;
      var fechaCobro = contenedor.querySelector('#inputCobroFecha').value;
      var notaCobro = contenedor.querySelector('#inputCobroNota').value.trim();
      
      State.updateItem('ingresosFijos', modalConfig.item.id, { pagado: true });
      
      State.addItem('gastos', {
        nombre: modalConfig.item.nombre + ' (Cobrado)',
        importe: impReal,
        periodicidad: 'puntual',
        fecha: fechaCobro,
        categoria: 'otros',
        necesario: false, // false significa que es ingreso
        notas: notaCobro
      });
      
      cerrarModal();
      return;
    }

    if (modalConfig.tipo === 'pagar') {
      var impReal = parseFloat(contenedor.querySelector('#inputPagoReal').value) || 0;
      var fechaPago = contenedor.querySelector('#inputPagoFecha').value;
      var notaPago = contenedor.querySelector('#inputPagoNota').value.trim();
      
      State.updateItem('gastos', modalConfig.item.id, { pagado: true });
      
      State.addItem('gastos', {
        nombre: modalConfig.item.nombre + ' (Real)',
        importe: impReal,
        periodicidad: 'puntual',
        fecha: fechaPago,
        categoria: modalConfig.item.categoria,
        necesario: modalConfig.item.necesario,
        notas: notaPago
      });
      
      cerrarModal();
      return;
    }

    var datos = leerFormulario(modalConfig.tipo);
    if (!datos) return;
    if (modalConfig.item) { State.updateItem(modalConfig.coleccion, modalConfig.item.id, datos); } 
    else { State.addItem(modalConfig.coleccion, datos); }
    cerrarModal();
  }

  function coleccionDeTipo(tipo) {
    if (tipo === 'rapido') return 'gastos';
    if (tipo === 'ingreso-fijo') return 'ingresosFijos';
    if (tipo === 'gasto-fijo') return 'gastos';
    if (tipo === 'objetivo') return 'objetivos';
    return null;
  }

  function formHTML(tipo, d) {
    d = d || {};
    var campos = [];
    if (tipo === 'rapido') {
      campos.push(campoTexto('nombre', '¿En qué?', d.nombre || '', 'ej: Compra Mercadillo, Cena...'));
      campos.push(campoNumero('importe', 'Cantidad (€)', d.importe || '', '0.00'));
      campos.push(campoSelect('flujo', 'Movimiento', [{v:'gasto',t:'🔴 Gasto'}, {v:'ingreso',t:'🟢 Ingreso'}], 'gasto'));
      campos.push(campoSelect('categoria', 'Categoría', Object.keys(CATS).map(function(k) { return { v: k, t: CATS[k].icono + ' ' + CATS[k].nombre }; }), 'otros'));
      campos.push(campoTexto('fecha', 'Fecha', d.fecha || U.hoy(), '', 'date'));
    }
    if (tipo === 'ingreso-fijo') {
      campos.push(campoSelect('persona', 'Persona', PERSONAS_DEF.map(function(p) { return { v: p.id, t: p.nombre }; }), d.persona || 'miguel'));
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Salario...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoSelect('periodicidad', 'Periodicidad', [{ v: 'mensual', t: 'Mensual' }, { v: 'trimestral', t: 'Trimestral' }, { v: 'semestral', t: 'Semestral' }, { v: 'anual', t: 'Anual' }], d.periodicidad || 'mensual'));
      campos.push(campoNumero('diaCobro', 'Día de cobro (1-31)', d.diaCobro || '', 'ej: 20'));
      campos.push(campoSelect('tipo', 'Tipo', Object.keys(TIPOS_INGRESO).map(function(k) { return { v: k, t: TIPOS_INGRESO[k] }; }), d.tipo || 'nomina'));
    }
    if (tipo === 'gasto-fijo') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Alquiler, Luz...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoSelect('periodicidad', 'Periodicidad', [{ v: 'mensual', t: 'Mensual' }, { v: 'trimestral', t: 'Trimestral' }, { v: 'semestral', t: 'Semestral' }, { v: 'anual', t: 'Anual' }], d.periodicidad || 'mensual'));
      campos.push(campoNumero('diaCobro', 'Día de cobro (1-31)', d.diaCobro || '', 'ej: 25'));
      campos.push(campoSelect('categoria', 'Categoría', Object.keys(CATS).map(function(k) { return { v: k, t: CATS[k].icono + ' ' + CATS[k].nombre }; }), d.categoria || 'otros'));
      campos.push(campoCheck('necesario', 'Es un gasto necesario', d.necesario !== false));
    }
    if (tipo === 'gasto-puntual') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Compra...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoTexto('fecha', 'Fecha', d.fecha || U.hoy(), '', 'date'));
      campos.push(campoSelect('categoria', 'Categoría', Object.keys(CATS).map(function(k) { return { v: k, t: CATS[k].icono + ' ' + CATS[k].nombre }; }), d.categoria || 'otros'));
      campos.push(campoCheck('necesario', 'Es un gasto necesario', d.necesario !== false));
    }
    if (tipo === 'objetivo') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Fondo de emergencia'));
      campos.push(campoTexto('icono', 'Icono (emoji)', d.icono || '🎯', '🚨'));
      campos.push(campoNumero('importeObjetivo', 'Objetivo (€)', d.importeObjetivo || '', '0.00'));
      campos.push(campoNumero('importeActual', 'Ahorrado actualmente (€)', d.importeActual || 0, '0.00'));
      campos.push(campoTexto('fechaLimite', 'Fecha límite (opcional)', d.fechaLimite || '', '', 'date'));
      campos.push(campoColor('color', 'Color', d.color || '#3b82f6'));
    }
    return campos.join('');
  }

  function campoTexto(name, label, valor, placeholder, type) { return '<div class="eco-campo"><label>' + label + '</label><input type="' + (type || 'text') + '" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '"></div>'; }
  function campoNumero(name, label, valor, placeholder) { return '<div class="eco-campo"><label>' + label + '</label><input type="number" step="0.01" min="0" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '"></div>'; }
  function campoSelect(name, label, opciones, valor) { var opts = opciones.map(function(o) { var sel = String(o.v) === String(valor) ? ' selected' : ''; return '<option value="' + escapar(o.v) + '"' + sel + '>' + escapar(o.t) + '</option>'; }).join(''); return '<div class="eco-campo"><label>' + label + '</label><select name="' + name + '">' + opts + '</select></div>'; }
  function campoCheck(name, label, checked) { return '<label class="eco-check"><input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '><span class="eco-check-label">' + label + '</span></label>'; }
  function campoColor(name, label, valor) { return '<div class="eco-campo"><label>' + label + '</label><input type="color" name="' + name + '" value="' + escapar(valor || '#3b82f6') + '"></div>'; }

  function leerFormulario(tipo) {
    var body = contenedor.querySelector('.eco-modal-body');
    function val(n) { var el = body.querySelector('[name="' + n + '"]'); return el ? el.value : ''; }
    function chk(n) { var el = body.querySelector('[name="' + n + '"]'); return el ? el.checked : false; }
    function num(n) { var v = parseFloat(val(n)); return isNaN(v) ? 0 : v; }
    var obj = {};
    if (tipo === 'rapido') {
      obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: 'puntual', fecha: val('fecha'), categoria: val('categoria'), necesario: val('flujo') === 'gasto' };
      if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; }
      return obj;
    }
    if (tipo === 'ingreso-fijo') { obj = { persona: val('persona'), nombre: val('nombre').trim(), importe: num('importe'), periodicidad: val('periodicidad'), diaCobro: num('diaCobro'), tipo: val('tipo'), activo: true, pagado: false }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; } } 
    if (tipo === 'gasto-fijo') { obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: val('periodicidad'), diaCobro: num('diaCobro'), categoria: val('categoria'), necesario: chk('necesario'), pagado: false }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; } } 
    if (tipo === 'gasto-puntual') { obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: 'puntual', fecha: val('fecha'), categoria: val('categoria'), necesario: chk('necesario') }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; } return obj; }
    if (tipo === 'objetivo') { obj = { nombre: val('nombre').trim(), icono: val('icono') || '🎯', importeObjetivo: num('importeObjetivo'), importeActual: num('importeActual'), fechaLimite: val('fechaLimite') || null, color: val('color') || '#3b82f6', prioridad: 'media' }; if (!obj.nombre || obj.importeObjetivo <= 0) { alert('Nombre y objetivo son obligatorios'); return null; } }
    return obj;
  }

  function aportarAObjetivo(id) {
    var obj = State.get().objetivos.find(function(o) { return o.id === id; });
    if (!obj) return;
    var cant = prompt('¿Cuánto quieres aportar a "' + obj.nombre + '"?', '100');
    if (cant === null) return;
    var v = parseFloat(cant.replace(',', '.'));
    if (isNaN(v) || v <= 0) { alert('Cantidad inválida'); return; }
    State.updateItem('objetivos', id, { importeActual: (obj.importeActual || 0) + v });
  }

  function exportar() { var json = State.storage.exportar(); U.descargarJSON('economia-' + U.hoy() + '.json', json); }
  function importar() { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = function() { var f = inp.files[0]; if (!f) return; var r = new FileReader(); r.onload = function() { try { State.storage.importar(r.result); State.set('personas', State.get().personas); alert('✅ Importado correctamente'); } catch (e) { alert('❌ Error: ' + e.message); } }; r.readAsText(f); }; inp.click(); }
  function resetear() { if (!confirm('⚠️ Esto borrará TODOS los datos de economía. ¿Continuar?')) return; State.storage.borrar(); location.reload(); }
  function escapar(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  return { montar: montar, CATS: CATS };
})();

console.log('✅ Economia cargado');
