/* ============================================================
   ECONOMIA — Lógica Definitiva (Caja Real y Previsión)
   ============================================================ */

window.Economia = (function() {
  var State = window.EconomiaState;
  var Tpl = window.EconomiaTemplate;
  var Seed = window.EconomiaSeed;
  var U = window.EconomiaUtils;
  var contenedor = null;
  var mesActualYM = U.mesActual();
  var modalConfig = null;

  var CATS = { vivienda: { icono: '🏠' }, suministros: { icono: '💡' }, telecom: { icono: '📱' }, seguros: { icono: '🛡️' }, suscripciones: { icono: '📺' }, deudas: { icono: '💳' }, educacion: { icono: '🎓' }, salud: { icono: '🏥' }, transporte: { icono: '🚗' }, comida: { icono: '🍔' }, ocio: { icono: '🎉' }, restaurantes: { icono: '🍽️' }, ropa: { icono: '👕' }, hogar: { icono: '🛋️' }, regalos: { icono: '🎁' }, otros: { icono: '📦' } };
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
    contenedor.querySelector('#ecoActualizar').addEventListener('click', function() {
      // Recarga forzada ignorando la caché pero manteniendo el localStorage intacto
      var url = new URL(window.location.href);
      url.searchParams.set('v', Date.now()); // Añade un parámetro de tiempo para saltar caché
      window.location.href = url.toString();
    });
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
      State.get().gastos.filter(function(g){ return g.periodicidad !== 'puntual'; }).forEach(function(g){ if(g.pagado) State.updateItem('gastos', g.id, { pagado: false }); });
      (State.get().ingresosFijos || []).forEach(function(i){ if(i.pagado) State.updateItem('ingresosFijos', i.id, { pagado: false }); });
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
        State.get().gastos.filter(function(g){ return g.periodicidad !== 'puntual'; }).forEach(function(g){ if(g.pagado) State.updateItem('gastos', g.id, { pagado: false }); });
        (State.get().ingresosFijos || []).forEach(function(i){ if(i.pagado) State.updateItem('ingresosFijos', i.id, { pagado: false }); });
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
      if (g.fecha && g.fecha < '2026-10-20') return false;
      return g.periodicidad === 'puntual' && g.fecha && U.fechaEnCiclo(g.fecha, mesActualYM, diaCobro);
    });

    var ingresosReales = movsCiclo.filter(function(g) { return !g.necesario; }).reduce(function(acc, g) { return acc + (parseFloat(g.importe) || 0); }, 0);
    var gastosReales = movsCiclo.filter(function(g) { return g.necesario; }).reduce(function(acc, g) { return acc + (parseFloat(g.importe) || 0); }, 0);
    var saldoVivo = base + ingresosReales - gastosReales;
    
    var display = contenedor.querySelector('#ecoSaldoDisplay');
    if (display) { display.textContent = U.eur(saldoVivo); display.style.color = saldoVivo >= 0 ? '#10b981' : '#ef4444'; }
    var inputBase = contenedor.querySelector('#ecoSaldoBase');
    if (inputBase && document.activeElement !== inputBase) inputBase.value = base;

    // Fijos pendientes y totales
    var fijosGastos = State.get().gastos.filter(function(g) { return g.periodicidad !== 'puntual'; });
    var fijosIngresos = State.get().ingresosFijos || [];
    
    var totalGastosPend = 0, totalIngresosPend = 0;
    var totalGastosPagados = 0, totalIngresosPagados = 0;

    fijosGastos.forEach(function(g) {
      if (g.pagado) totalGastosPagados += U.aMensual(g.importe, g.periodicidad);
      else totalGastosPend += U.aMensual(g.importe, g.periodicidad);
    });
    fijosIngresos.forEach(function(i) {
      if (i.pagado) totalIngresosPagados += U.aMensual(i.importe, i.periodicidad);
      else totalIngresosPend += U.aMensual(i.importe, i.periodicidad);
    });

    var totalGastosCiclo = totalGastosPend + totalGastosPagados;
    var totalIngresosCiclo = totalIngresosPend + totalIngresosPagados;
    var previsionFinal = saldoVivo + totalIngresosPend - totalGastosPend;

    // Actualizar Tarjetas
    var elG = contenedor.querySelector('#ecoRealGastosPend');
    if (elG) elG.innerHTML = U.eur(totalGastosPend) + ' <span style="font-size:12px;font-weight:400;color:var(--text-2);">pendientes</span>';
    var elGT = contenedor.querySelector('#ecoRealGastosTotalCiclo');
    if (elGT) elGT.textContent = 'Total ciclo: ' + U.eur(totalGastosCiclo);

    var elI = contenedor.querySelector('#ecoRealIngresosPend');
    if (elI) elI.innerHTML = U.eur(totalIngresosPend) + ' <span style="font-size:12px;font-weight:400;color:var(--text-2);">pendientes</span>';
    var elIT = contenedor.querySelector('#ecoRealIngresosTotalCiclo');
    if (elIT) elIT.textContent = 'Total ciclo: ' + U.eur(totalIngresosCiclo);

    var elP = contenedor.querySelector('#ecoRealPrevision');
    if (elP) { elP.textContent = U.eur(previsionFinal); elP.style.color = previsionFinal >= 0 ? '#3b82f6' : '#ef4444'; }

    // Rellenar listas de los desplegables
    var listaGastos = contenedor.querySelector('#ecoRealGastosLista');
    if (listaGastos) {
      if (fijosGastos.length === 0) listaGastos.innerHTML = '<div style="font-size:12px;color:var(--text-2);">Sin gastos fijos definidos.</div>';
      else listaGastos.innerHTML = fijosGastos.map(function(g) {
        var cat = CATS[g.categoria] || { icono: '📦' };
        var check = g.pagado ? '<span style="color:#10b981; font-weight:bold; margin-right:8px; font-size:16px;">✓</span>' : '<span style="color:var(--text-2); margin-right:8px; font-size:16px;">○</span>';
        var estilo = g.pagado ? 'text-decoration:line-through; opacity:0.6;' : '';
        var fecha = g.pagado ? '' : '<span style="color:#ef4444; font-size:11px; margin-left:6px;">(Día ' + (g.diaCobro||1) + ')</span>';
        return '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); font-size:13px;"><div style="'+estilo+'">'+check+cat.icono+' '+g.nombre+fecha+'</div><div style="'+estilo+'color:#ef4444; font-weight:600;">-'+U.eur(g.importe)+'</div></div>';
      }).join('');
    }

    var listaIngresos = contenedor.querySelector('#ecoRealIngresosLista');
    if (listaIngresos) {
      if (fijosIngresos.length === 0) listaIngresos.innerHTML = '<div style="font-size:12px;color:var(--text-2);">Sin ingresos fijos definidos.</div>';
      else listaIngresos.innerHTML = fijosIngresos.map(function(i) {
        var check = i.pagado ? '<span style="color:#10b981; font-weight:bold; margin-right:8px; font-size:16px;">✓</span>' : '<span style="color:var(--text-2); margin-right:8px; font-size:16px;">○</span>';
        var estilo = i.pagado ? 'text-decoration:line-through; opacity:0.6;' : '';
        var fecha = i.pagado ? '' : '<span style="color:#10b981; font-size:11px; margin-left:6px;">(Día ' + (i.diaCobro||1) + ')</span>';
        return '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); font-size:13px;"><div style="'+estilo+'">'+check+'💼 '+i.nombre+fecha+'</div><div style="'+estilo+'color:#10b981; font-weight:600;">+'+U.eur(i.importe)+'</div></div>';
      }).join('');
    }

    var listaReal = contenedor.querySelector('#ecoRealLista');
    if (listaReal) {
      var movsOrdenados = movsCiclo.sort(function(a,b) { return b.fecha.localeCompare(a.fecha); });
      if (movsOrdenados.length === 0) listaReal.innerHTML = '<div class="eco-vacio">Aún no has validado movimientos este ciclo.</div>';
      else {
        listaReal.innerHTML = '<div class="eco-lista">' + movsOrdenados.map(function(item) {
          var esIngreso = !item.necesario; 
          var cat = CATS[item.categoria] || { icono: '📦' };
          var signo = esIngreso ? '+' : '-';
          var color = esIngreso ? '#10b981' : '#ef4444';
          var notaHTML = item.notas ? ' · <em style="color:#f59e0b;">' + item.notas + '</em>' : '';
          return '<div class="eco-item"><div class="eco-item-cat" style="background:'+(esIngreso?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)')+';">'+cat.icono+'</div><div class="eco-item-info"><div class="eco-item-nombre">'+item.nombre+'</div><div class="eco-item-meta">'+U.fechaCorta(item.fecha)+notaHTML+'</div></div><div class="eco-item-importe" style="color:'+color+';font-weight:700;">'+signo+' '+U.eur(item.importe)+'</div><div class="eco-item-acciones"><button class="eco-item-btn" data-editar="'+item.id+'" data-tipo="gasto-puntual" title="Editar"><i class="fas fa-pen"></i></button><button class="eco-item-btn eco-item-btn-peligro" data-borrar="'+item.id+'" data-coleccion="gastos" title="Borrar"><i class="fas fa-trash"></i></button></div></div>';
        }).join('') + '</div>';
      }
    }
  }

  // ---------------- LÓGICA PREVISIÓN ----------------
  function renderPrevision() {
    var base = State.ingresoBaseMensual();
    var extra = State.totalIngresosExtraMes(mesActualYM);
    var gastoFijo = State.gastosFijosMensual();
    var balancePrevisto = base + extra - gastoFijo;

    contenedor.querySelector('#ecoKpiIngreso').textContent = U.eur(base);
    contenedor.querySelector('#ecoKpiGasto').textContent = U.eur(gastoFijo);
    
    var elBal = contenedor.querySelector('#ecoKpiBalance');
    elBal.textContent = U.eur(balancePrevisto);
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
    if (lista.length === 0) { el.innerHTML = '<div class="eco-vacio">Sin elementos.</div>'; return; }
    
    el.innerHTML = '<div class="eco-lista">' + lista.map(function(item) {
      var cat = (CATS[item.categoria] || { icono: '📦', nombre: 'Otros' });
      var per = PERSONAS_DEF.find(function(p) { return p.id === item.persona; });
      var meta = [];
      if (tipo === 'ingreso-fijo') { meta.push(per ? per.nombre : item.persona); meta.push(item.periodicidad); } 
      else { meta.push(cat.nombre); meta.push(item.periodicidad); }

      return '<div class="eco-item"><div class="eco-item-cat">' + cat.icono + '</div><div class="eco-item-info"><div class="eco-item-nombre">' + item.nombre + '</div><div class="eco-item-meta">' + meta.join(' · ') + '</div></div><div class="eco-item-importe">' + U.eur(item.importe) + (item.periodicidad!=='mensual'?'<small>'+U.eur(U.aMensual(item.importe,item.periodicidad))+'/mes</small>':'') + '</div><div class="eco-item-acciones"><button class="eco-item-btn" data-editar="' + item.id + '" data-tipo="' + tipo + '" title="Editar"><i class="fas fa-pen"></i></button><button class="eco-item-btn eco-item-btn-peligro" data-borrar="' + item.id + '" data-coleccion="' + coleccion + '" title="Borrar"><i class="fas fa-trash"></i></button></div></div>';
    }).join('') + '</div>';
  }

  function renderObjetivos() {
    var el = contenedor.querySelector('#ecoObjetivos');
    var lista = State.get().objetivos || [];
    if (lista.length === 0) { el.innerHTML = '<div class="eco-vacio">Sin objetivos.</div>'; return; }
    el.innerHTML = lista.map(function(obj) {
      var est = State.estadoObjetivo(obj);
      return '<div class="eco-objetivo"><div class="eco-objetivo-head"><div class="eco-objetivo-titulo">' + (obj.icono || '🎯') + ' ' + obj.nombre + (est.completado ? ' <span class="eco-objetivo-completado">¡Conseguido!</span>' : '') + '</div><div class="eco-objetivo-pct">' + est.porcentaje.toFixed(0) + '%</div></div><div class="eco-barra"><div class="eco-barra-fill" style="width:' + est.porcentaje + '%;background:' + (obj.color || '#3b82f6') + '"></div></div><div class="eco-objetivo-meta"><div>Ahorrado<strong>' + U.eur(obj.importeActual || 0) + '</strong></div><div>Objetivo<strong>' + U.eur(obj.importeObjetivo || 0) + '</strong></div><div>Falta<strong>' + U.eur(est.falta) + '</strong></div></div><div style="display:flex;gap:8px;margin-top:12px"><button class="eco-btn eco-btn-primario" data-aportar="' + obj.id + '"><i class="fas fa-plus"></i> Aportar</button><button class="eco-btn eco-btn-ghost" data-editar="' + obj.id + '" data-tipo="objetivo"><i class="fas fa-pen"></i></button><button class="eco-btn eco-btn-ghost" data-borrar="' + obj.id + '" data-coleccion="objetivos"><i class="fas fa-trash"></i></button></div></div>';
    }).join('');
  }

  function renderPresupuesto() {
    var el = contenedor.querySelector('#ecoPresupuesto');
    var obj = State.presupuestoObjetivo();
    var comp = State.comparativaPresupuesto(mesActualYM);
    var diaCobro = State.get().presupuesto.diaCobro || 1;

    function barra(titulo, real, objetivo, color) {
      var pct = objetivo > 0 ? (real / objetivo) * 100 : 0;
      var colorFinal = pct <= 100 ? color : (pct <= 115 ? '#f59e0b' : '#ef4444');
      return '<div class="eco-presu-item"><div class="eco-presu-head"><span class="eco-presu-titulo">' + titulo + '</span><span class="eco-presu-valores"><strong>' + U.eur(real) + '</strong> / ' + U.eur(objetivo) + '</span></div><div class="eco-presu-barra"><div class="eco-presu-barra-fill" style="width:' + Math.min(150, pct) + '%;background:' + colorFinal + '"></div></div></div>';
    }

    var html = '<div style="margin-bottom:12px;font-size:13px;color:var(--text-2)"><label>Ciclo inicia el día: </label><input type="number" id="ecoDiaCobro" value="'+diaCobro+'" style="width:50px;padding:2px;border:1px solid var(--border);border-radius:4px;"></div>';
    html += barra('🏠 Necesidades (50%)', comp.necesidades.real, comp.necesidades.objetivo, '#3b82f6');
    html += barra('🎉 Estilo de vida (30%)', comp.estilo.real, comp.estilo.objetivo, '#8b5cf6');
    html += barra('💰 Ahorro (20%)', Math.max(0, comp.ahorro.real), comp.ahorro.objetivo, '#10b981');
    el.innerHTML = html;

    var inDia = el.querySelector('#ecoDiaCobro');
    if (inDia) inDia.addEventListener('change', function(e) { var p = State.get().presupuesto; p.diaCobro = parseInt(e.target.value)||1; State.set('presupuesto', p); });
  }

  // ---------------- MODAL ----------------
  function abrirModalNuevo(tipo) {
    modalConfig = { tipo: tipo, coleccion: coleccionDeTipo(tipo), item: null };
    contenedor.querySelector('#ecoModalTitulo').textContent = tipo === 'movimiento' ? 'Registro Rápido' : 'Añadir ' + tipo.replace('-',' ');
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
      + '<div class="eco-campo"><label>Notas (opcional)</label><input type="text" id="inputCobroNota" placeholder="ej: Horas extra..."></div>';
    
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
      + '<div class="eco-campo"><label>Notas (opcional)</label><input type="text" id="inputPagoNota" placeholder="ej: Subida de precio..."></div>';
    
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
    
    if (modalConfig.tipo === 'cobrar' || modalConfig.tipo === 'pagar') {
      var impReal = parseFloat(contenedor.querySelector('#input' + (modalConfig.tipo==='cobrar'?'Cobro':'Pago') + 'Real').value) || 0;
      var fecha = contenedor.querySelector('#input' + (modalConfig.tipo==='cobrar'?'Cobro':'Pago') + 'Fecha').value;
      var nota = contenedor.querySelector('#input' + (modalConfig.tipo==='cobrar'?'Cobro':'Pago') + 'Nota').value.trim();
      var esIngreso = modalConfig.tipo === 'cobrar';
      
      var col = esIngreso ? 'ingresosFijos' : 'gastos';
      State.updateItem(col, modalConfig.item.id, { pagado: true });
      
      State.addItem('gastos', {
        nombre: modalConfig.item.nombre + (esIngreso ? ' (Cobrado)' : ' (Pagado)'),
        importe: impReal,
        periodicidad: 'puntual',
        fecha: fecha,
        categoria: esIngreso ? 'otros' : modalConfig.item.categoria,
        necesario: !esIngreso,
        notas: nota
      });
      
      cerrarModal();
      return;
    }

    if (modalConfig.tipo === 'movimiento') {
      var tipoMov = contenedor.querySelector('#movTipo').value; 
      var imp = parseFloat(contenedor.querySelector('#movImporte').value) || 0;
      var fechaMov = contenedor.querySelector('#movFecha').value;
      var notaMov = contenedor.querySelector('#movNota').value.trim();
      
      if (tipoMov.startsWith('validar')) {
        var col = tipoMov === 'validar_ingreso' ? 'ingresosFijos' : 'gastos';
        var selectId = tipoMov === 'validar_ingreso' ? '#movFijoIngresoId' : '#movFijoGastoId';
        var idFijo = contenedor.querySelector(selectId).value;
        if (!idFijo) { alert('Selecciona un movimiento fijo'); return; }
        State.updateItem(col, idFijo, { pagado: true });
        State.addItem('gastos', {
          nombre: contenedor.querySelector(selectId + ' option:checked').text + (tipoMov==='validar_ingreso'?' (Cobrado)':' (Pagado)'),
          importe: imp,
          periodicidad: 'puntual',
          fecha: fechaMov,
          categoria: 'otros',
          necesario: tipoMov === 'validar_gasto',
          notas: notaMov
        });
      } else {
        var nom = contenedor.querySelector('#movNombre').value.trim();
        if (!nom || imp <= 0) { alert('Nombre e importe obligatorios'); return; }
        State.addItem('gastos', {
          nombre: nom,
          importe: imp,
          periodicidad: 'puntual',
          fecha: fechaMov,
          categoria: contenedor.querySelector('#movCategoria').value,
          necesario: tipoMov === 'gasto_nuevo',
          notas: notaMov
        });
      }
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
    if (tipo === 'ingreso-fijo') return 'ingresosFijos';
    if (tipo === 'gasto-fijo') return 'gastos';
    if (tipo === 'objetivo') return 'objetivos';
    return null;
  }

  function formHTML(tipo, d) {
    d = d || {};
    var campos = [];
    
    if (tipo === 'movimiento') {
      campos.push('<div class="eco-campo"><label>Tipo de movimiento</label><select id="movTipo" onchange="var v=this.value; document.getElementById(\'divFijoGasto\').style.display=v===\'validar_gasto\'?\'block\':\'none\'; document.getElementById(\'divFijoIngreso\').style.display=v===\'validar_ingreso\'?\'block\':\'none\'; document.getElementById(\'divNombre\').style.display=v.startsWith(\'validar\')?\'none\':\'block\';"><option value="gasto_nuevo">🔴 Gasto no previsto</option><option value="ingreso_nuevo">🟢 Ingreso no previsto</option><option value="validar_gasto">Validar Gasto Fijo</option><option value="validar_ingreso">Validar Ingreso Fijo</option></select></div>');
      
      campos.push('<div class="eco-campo" id="divNombre"><label>Nombre / Concepto</label><input type="text" id="movNombre" placeholder="ej: Compra Mercadillo"></div>');
      
      var optsGastos = State.get().gastos.filter(function(g){return g.periodicidad !== 'puntual' && !g.pagado;}).map(function(g){return '<option value="'+g.id+'">'+g.nombre+' ('+U.eur(g.importe)+')</option>';}).join('');
      var optsIngresos = (State.get().ingresosFijos||[]).filter(function(i){return !i.pagado;}).map(function(i){return '<option value="'+i.id+'">'+i.nombre+' ('+U.eur(i.importe)+')</option>';}).join('');
      
      campos.push('<div class="eco-campo" id="divFijoGasto" style="display:none;"><label>Selecciona el Gasto Fijo</label><select id="movFijoGastoId">'+optsGastos+'</select></div>');
      campos.push('<div class="eco-campo" id="divFijoIngreso" style="display:none;"><label>Selecciona el Ingreso Fijo</label><select id="movFijoIngresoId">'+optsIngresos+'</select></div>');

      campos.push('<div class="eco-campo"><label>Importe (€)</label><input type="number" step="0.01" id="movImporte" placeholder="0.00"></div>');
      campos.push('<div class="eco-campo"><label>Fecha</label><input type="date" id="movFecha" value="'+U.hoy()+'"></div>');
      campos.push('<div class="eco-campo"><label>Categoría</label><select id="movCategoria">'+Object.keys(CATS).map(function(k){return '<option value="'+k+'">'+CATS[k].icono+' '+k+'</option>';}).join('')+'</select></div>');
      campos.push('<div class="eco-campo"><label>Notas (opcional)</label><input type="text" id="movNota" placeholder="..."></div>');
    }

    if (tipo === 'ingreso-fijo') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Salario...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoNumero('diaCobro', 'Día de cobro (1-31)', d.diaCobro || '', 'ej: 20'));
    }
    if (tipo === 'gasto-fijo') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Alquiler...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoNumero('diaCobro', 'Día de cobro (1-31)', d.diaCobro || '', 'ej: 25'));
      campos.push(campoSelect('categoria', 'Categoría', Object.keys(CATS).map(function(k) { return { v: k, t: CATS[k].icono + ' ' + CATS[k].nombre }; }), d.categoria || 'otros'));
    }
    if (tipo === 'gasto-puntual') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Compra...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));
      campos.push(campoTexto('fecha', 'Fecha', d.fecha || U.hoy(), '', 'date'));
    }
    if (tipo === 'objetivo') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Viaje'));
      campos.push(campoNumero('importeObjetivo', 'Objetivo (€)', d.importeObjetivo || '', '0.00'));
      campos.push(campoNumero('importeActual', 'Ahorrado (€)', d.importeActual || 0, '0.00'));
    }
    return campos.join('');
  }

  function campoTexto(name, label, valor, placeholder, type) { return '<div class="eco-campo"><label>' + label + '</label><input type="' + (type || 'text') + '" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '"></div>'; }
  function campoNumero(name, label, valor, placeholder) { return '<div class="eco-campo"><label>' + label + '</label><input type="number" step="0.01" min="0" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '"></div>'; }
  function campoSelect(name, label, opciones, valor) { var opts = opciones.map(function(o) { var sel = String(o.v) === String(valor) ? ' selected' : ''; return '<option value="' + escapar(o.v) + '"' + sel + '>' + escapar(o.t) + '</option>'; }).join(''); return '<div class="eco-campo"><label>' + label + '</label><select name="' + name + '">' + opts + '</select></div>'; }

  function leerFormulario(tipo) {
    var body = contenedor.querySelector('.eco-modal-body');
    function val(n) { var el = body.querySelector('[name="' + n + '"]'); return el ? el.value : ''; }
    function num(n) { var v = parseFloat(val(n)); return isNaN(v) ? 0 : v; }
    var obj = {};
    if (tipo === 'ingreso-fijo') { obj = { nombre: val('nombre').trim(), importe: num('importe'), diaCobro: num('diaCobro'), periodicidad: 'mensual', pagado: false }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe obligatorios'); return null; } } 
    if (tipo === 'gasto-fijo') { obj = { nombre: val('nombre').trim(), importe: num('importe'), diaCobro: num('diaCobro'), periodicidad: 'mensual', categoria: val('categoria'), necesario: true, pagado: false }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe obligatorios'); return null; } } 
    if (tipo === 'gasto-puntual') { obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: 'puntual', fecha: val('fecha'), necesario: true }; if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe obligatorios'); return null; } return obj; }
    if (tipo === 'objetivo') { obj = { nombre: val('nombre').trim(), importeObjetivo: num('importeObjetivo'), importeActual: num('importeActual') }; }
    return obj;
  }

  function aportarAObjetivo(id) {
    var obj = State.get().objetivos.find(function(o) { return o.id === id; });
    if (!obj) return;
    var cant = prompt('¿Cuánto quieres aportar a "' + obj.nombre + '"?', '100');
    if (cant === null) return;
    var v = parseFloat(cant.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    State.updateItem('objetivos', id, { importeActual: (obj.importeActual || 0) + v });
  }

  function exportar() { var json = State.storage.exportar(); U.descargarJSON('economia.json', json); }
  function importar() { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json'; inp.onchange = function() { var f = inp.files[0]; if (!f) return; var r = new FileReader(); r.onload = function() { try { State.storage.importar(r.result); State.set('personas', State.get().personas); alert('✅ Importado'); } catch (e) { alert('❌ Error'); } }; r.readAsText(f); }; inp.click(); }
  function resetear() { if (!confirm('⚠️ Borrar TODO?')) return; State.storage.borrar(); location.reload(); }
  function escapar(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  return { montar: montar, CATS: CATS };
})();
console.log('✅ Economia cargado');
