/* ============================================================
   ECONOMIA — API pública + render + eventos + modal
   ============================================================ */

window.Economia = (function() {

  var State = window.EconomiaState;
  var Tpl = window.EconomiaTemplate;
  var Seed = window.EconomiaSeed;
  var U = window.EconomiaUtils;

  var contenedor = null;
  var mesActualYM = U.mesActual();
  var modalConfig = null;

  // ---- Categorías (iconos + colores) -----------------------
  var CATS = {
    vivienda:      { icono: '🏠', color: '#3b82f6', nombre: 'Vivienda' },
    suministros:   { icono: '💡', color: '#f59e0b', nombre: 'Suministros' },
    telecom:       { icono: '📱', color: '#06b6d4', nombre: 'Telecom' },
    seguros:       { icono: '🛡️', color: '#64748b', nombre: 'Seguros' },
    suscripciones: { icono: '📺', color: '#8b5cf6', nombre: 'Suscripciones' },
    deudas:        { icono: '💳', color: '#ef4444', nombre: 'Deudas' },
    educacion:     { icono: '🎓', color: '#14b8a6', nombre: 'Educación' },
    salud:         { icono: '🏥', color: '#ec4899', nombre: 'Salud' },
    transporte:    { icono: '🚗', color: '#f97316', nombre: 'Transporte' },
    comida:        { icono: '🍔', color: '#fb923c', nombre: 'Comida' },
    ocio:          { icono: '🎉', color: '#f472b6', nombre: 'Ocio' },
    restaurantes:  { icono: '🍽️', color: '#e11d48', nombre: 'Restaurantes' },
    ropa:          { icono: '👕', color: '#a78bfa', nombre: 'Ropa' },
    hogar:         { icono: '🛋️', color: '#78716c', nombre: 'Hogar' },
    regalos:       { icono: '🎁', color: '#eab308', nombre: 'Regalos' },
    otros:         { icono: '📦', color: '#94a3b8', nombre: 'Otros' }
  };

  var TIPOS_INGRESO = {
    nomina:        'Nómina',
    autonomo:      'Autónomo',
    esporadico:    'Trabajo esporádico',
    ayuda:         'Ayuda / subvención',
    alquiler:      'Alquiler cobrado',
    devolucion:    'Devolución',
    otros:         'Otros'
  };

  var DESTINOS_EXTRA = {
    'fondo-emergencia': '🚨 Fondo de emergencia',
    'objetivo':         '🎯 Objetivo de ahorro',
    'deuda':            '💳 Amortizar deuda',
    'libre':            '🎉 Uso libre'
  };

  var PERSONAS_DEF = [
    { id: 'miguel',     nombre: 'Miguel',     color: '#3b82f6' },
    { id: 'pareja',     nombre: 'Pareja',     color: '#ec4899' },
    { id: 'compartido', nombre: 'Compartido', color: '#10b981' }
  ];

  // ============================================================
  // MONTAJE
  // ============================================================
  function montar(cont) {
    contenedor = cont;
    contenedor.innerHTML = Tpl.html();
    Seed.cargarSiVacio();
    enlazarEventosGlobales();
    renderTodo();
    State.suscribir(renderTodo);
  }

  function enlazarEventosGlobales() {
    // Tabs
    contenedor.querySelectorAll('.eco-tab').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tab = btn.dataset.tab;
        contenedor.querySelectorAll('.eco-tab').forEach(function(b) {
          b.classList.toggle('eco-tab-activa', b.dataset.tab === tab);
        });
        contenedor.querySelectorAll('.eco-panel').forEach(function(p) {
          p.classList.toggle('eco-panel-activo', p.dataset.panel === tab);
        });
      });
    });

    // Mes prev / next
    contenedor.querySelector('#ecoMesPrev').addEventListener('click', function() { cambiarMes(-1); });
    contenedor.querySelector('#ecoMesNext').addEventListener('click', function() { cambiarMes(1); });

    // Exportar / importar / reset
    contenedor.querySelector('#ecoExportar').addEventListener('click', exportar);
    contenedor.querySelector('#ecoImportar').addEventListener('click', importar);
    contenedor.querySelector('#ecoReset').addEventListener('click', resetear);

    // Botones "Añadir" (delegación)
    contenedor.addEventListener('click', function(e) {
      var btnNuevo = e.target.closest('[data-nuevo]');
      if (btnNuevo) {
        e.preventDefault();
        abrirModalNuevo(btnNuevo.dataset.nuevo);
        return;
      }
      var btnCerrar = e.target.closest('[data-cerrar]');
      if (btnCerrar) {
        e.preventDefault();
        cerrarModal();
        return;
      }
      var btnEditar = e.target.closest('[data-editar]');
      if (btnEditar) {
        e.preventDefault();
        abrirModalEditar(btnEditar.dataset.editar, btnEditar.dataset.tipo);
        return;
      }
      var btnBorrar = e.target.closest('[data-borrar]');
      if (btnBorrar) {
        e.preventDefault();
        if (confirm('¿Borrar este elemento?')) {
          State.removeItem(btnBorrar.dataset.coleccion, btnBorrar.dataset.borrar);
        }
        return;
      }
      var btnAportar = e.target.closest('[data-aportar]');
      if (btnAportar) {
        e.preventDefault();
        aportarAObjetivo(btnAportar.dataset.aportar);
        return;
      }
    });

    // Modal: guardar
    contenedor.querySelector('#ecoModalGuardar').addEventListener('click', guardarModal);
  }

  function cambiarMes(delta) {
    var partes = mesActualYM.split('-');
    var d = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1 + delta, 1);
    mesActualYM = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderTodo();
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderTodo() {
    renderHeader();
    renderKPIs();
    renderResumen();
    renderIngresos();
    renderGastos();
    renderObjetivos();
    renderPresupuesto();
  }

  function renderHeader() {
    contenedor.querySelector('#ecoMesActual').textContent = U.nombreMes(mesActualYM);
    var tag = contenedor.querySelector('#ecoMesTagGastos');
    if (tag) tag.textContent = '· ' + U.nombreMes(mesActualYM);
  }

  function renderKPIs() {
    var base = State.ingresoBaseMensual();
    var extra = State.totalIngresosExtraMes(mesActualYM);
    var gasto = State.totalGastosMes(mesActualYM);
    var balance = base + extra - gasto;

    contenedor.querySelector('#ecoKpiIngreso').textContent = U.eur(base);
    contenedor.querySelector('#ecoKpiIngresoSub').textContent = 'Ingreso recurrente familiar';

    contenedor.querySelector('#ecoKpiExtra').textContent = U.eur(extra);
    var nExtras = State.ingresosExtraMes(mesActualYM).length;
    contenedor.querySelector('#ecoKpiExtraSub').textContent = nExtras + (nExtras === 1 ? ' extra este mes' : ' extras este mes');

    contenedor.querySelector('#ecoKpiGasto').textContent = U.eur(gasto);
    var nGastos = State.gastosPuntualesMes(mesActualYM).length;
    contenedor.querySelector('#ecoKpiGastoSub').textContent = nGastos + ' puntuales + fijos';

    var elBal = contenedor.querySelector('#ecoKpiBalance');
    elBal.textContent = U.eur(balance);
    contenedor.querySelector('#ecoKpiBalanceSub').textContent = balance >= 0 ? 'Ahorro este mes' : 'Déficit este mes';
    var elBalBox = elBal.closest('.eco-kpi-balance');
    if (elBalBox) {
      elBalBox.classList.toggle('eco-pos', balance >= 0);
      elBalBox.classList.toggle('eco-neg', balance < 0);
    }
  }

  // ---- RESUMEN ---------------------------------------------
  function renderResumen() {
    renderDonut();
    renderDesglose();
    renderSugerencias();
  }

  function renderDonut() {
    var el = contenedor.querySelector('#ecoDonut');
    var porCat = State.gastosPorCategoria(mesActualYM);
    var total = Object.values(porCat).reduce(function(a, b) { return a + b; }, 0);

    if (total === 0) {
      el.innerHTML = '<div class="eco-vacio">Aún no hay gastos este mes.</div>';
      return;
    }

    var svg = '<svg class="eco-donut-svg" viewBox="0 0 200 200">';
    var cx = 100, cy = 100, r = 70, grosor = 26;
    var angulo = -Math.PI / 2;
    var radioInterno = r - grosor / 2;

    Object.keys(porCat).sort(function(a, b) { return porCat[b] - porCat[a]; }).forEach(function(cat) {
      var valor = porCat[cat];
      var pct = valor / total;
      var a = pct * Math.PI * 2;
      var color = (CATS[cat] && CATS[cat].color) || '#94a3b8';

      var x1 = cx + r * Math.cos(angulo);
      var y1 = cy + r * Math.sin(angulo);
      var x2 = cx + r * Math.cos(angulo + a);
      var y2 = cy + r * Math.sin(angulo + a);

      var grande = a > Math.PI ? 1 : 0;

      var path;
      if (pct >= 0.9999) {
        path = 'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z ' +
               'M ' + cx + ' ' + (cy - radioInterno) + ' A ' + radioInterno + ' ' + radioInterno + ' 0 1 0 ' + (cx - 0.01) + ' ' + (cy - radioInterno) + ' Z';
      } else {
        path = 'M ' + x1 + ' ' + y1 +
               ' A ' + r + ' ' + r + ' 0 ' + grande + ' 1 ' + x2 + ' ' + y2 +
               ' L ' + (cx + radioInterno * Math.cos(angulo + a)) + ' ' + (cy + radioInterno * Math.sin(angulo + a)) +
               ' A ' + radioInterno + ' ' + radioInterno + ' 0 ' + grande + ' 0 ' + (cx + radioInterno * Math.cos(angulo)) + ' ' + (cy + radioInterno * Math.sin(angulo)) +
               ' Z';
      }

      svg += '<path d="' + path + '" fill="' + color + '" fill-rule="evenodd"></path>';
      angulo += a;
    });

    svg += '<text x="100" y="98" text-anchor="middle" class="eco-donut-centro-valor">' + U.eur(total) + '</text>';
    svg += '<text x="100" y="115" text-anchor="middle" class="eco-donut-centro-label">este mes</text>';
    svg += '</svg>';
    el.innerHTML = svg;
  }

  function renderDesglose() {
    var el = contenedor.querySelector('#ecoDesglose');
    var porCat = State.gastosPorCategoria(mesActualYM);
    var total = Object.values(porCat).reduce(function(a, b) { return a + b; }, 0);

    if (total === 0) {
      el.innerHTML = '<div class="eco-vacio">Sin datos.</div>';
      return;
    }

    var html = Object.keys(porCat).sort(function(a, b) { return porCat[b] - porCat[a]; }).map(function(cat) {
      var info = CATS[cat] || { icono: '📦', color: '#94a3b8', nombre: cat };
      var pct = (porCat[cat] / total) * 100;
      return ''
        + '<div class="eco-desglose-item">'
        +   '<div class="eco-desglose-color" style="background:' + info.color + '"></div>'
        +   '<span class="eco-desglose-nombre">' + info.icono + ' ' + info.nombre + '</span>'
        +   '<span class="eco-desglose-importe">' + U.eur(porCat[cat]) + '</span>'
        +   '<span class="eco-desglose-pct">' + pct.toFixed(0) + '%</span>'
        + '</div>';
    }).join('');
    el.innerHTML = html;
  }

  function renderSugerencias() {
    var el = contenedor.querySelector('#ecoSugerencias');
    var lista = State.sugerencias(mesActualYM);
    if (lista.length === 0) {
      el.innerHTML = '<div class="eco-vacio">Todo en orden ✨</div>';
      return;
    }
    el.innerHTML = lista.map(function(s) {
      return '<div class="eco-sugerencia eco-sugerencia-' + s.tipo + '">' + s.texto + '</div>';
    }).join('');
  }

  // ---- INGRESOS --------------------------------------------
  function renderIngresos() {
    renderLista('ecoIngresosFijos', 'ingresosFijos', 'ingreso-fijo');
    renderLista('ecoIngresosExtra', 'ingresosExtra', 'ingreso-extra');
  }

  // ---- GASTOS ----------------------------------------------
  function renderGastos() {
    renderLista('ecoGastosFijos', 'gastos', 'gasto-fijo', function(g) {
      return g.periodicidad !== 'puntual';
    });
    renderLista('ecoGastosPuntuales', 'gastos', 'gasto-puntual', function(g) {
      return g.periodicidad === 'puntual' && g.fecha && g.fecha.slice(0, 7) === mesActualYM;
    });
  }

  // ---- Render genérico de listas ---------------------------
  function renderLista(selector, coleccion, tipo, filtro) {
    var el = contenedor.querySelector('#' + selector);
    if (!el) return;
    var lista = State.get()[coleccion] || [];
    if (filtro) lista = lista.filter(filtro);

    if (lista.length === 0) {
      el.innerHTML = '<div class="eco-vacio">Sin elementos. Pulsa "Añadir" para empezar.</div>';
      return;
    }

    el.innerHTML = '<div class="eco-lista">' + lista.map(function(item) {
      return renderItemHTML(item, coleccion, tipo);
    }).join('') + '</div>';
  }

  function renderItemHTML(item, coleccion, tipo) {
    var cat = (CATS[item.categoria] || { icono: '📦', color: '#94a3b8', nombre: 'Otros' });
    var periodicidad = item.periodicidad || (tipo === 'ingreso-extra' ? 'puntual' : 'mensual');

    var importeHTML = U.eur(item.importe);
    var subImporte = '';

    if (periodicidad !== 'puntual' && periodicidad !== 'mensual') {
      subImporte = U.eur(U.aMensual(item.importe, periodicidad)) + '/mes';
    } else if (periodicidad === 'puntual' && item.fecha) {
      subImporte = U.fechaCorta(item.fecha);
    }

    var meta = [];
    if (tipo === 'ingreso-fijo' || tipo === 'ingreso-extra') {
      var per = PERSONAS_DEF.find(function(p) { return p.id === item.persona; });
      if (per) meta.push(per.nombre);
      if (item.tipo) meta.push(TIPOS_INGRESO[item.tipo] || item.tipo);
      if (tipo === 'ingreso-fijo') {
        meta.push(periodicidad);
      } else if (item.destino) {
        meta.push(DESTINOS_EXTRA[item.destino] || item.destino);
      } else {
        meta.push('<span style="color:#f59e0b">sin asignar</span>');
      }
    } else {
      meta.push(cat.nombre);
      if (periodicidad !== 'puntual') meta.push(periodicidad);
      if (item.necesario) {
        meta.push('<span class="eco-item-tag eco-tag-nec">necesario</span>');
      } else {
        meta.push('<span class="eco-item-tag eco-tag-inn">innecesario</span>');
      }
    }

    return ''
      + '<div class="eco-item">'
      +   '<div class="eco-item-cat">' + cat.icono + '</div>'
      +   '<div class="eco-item-info">'
      +     '<div class="eco-item-nombre">' + item.nombre + '</div>'
      +     '<div class="eco-item-meta">' + meta.join(' · ') + '</div>'
      +   '</div>'
      +   '<div class="eco-item-importe">' + importeHTML + (subImporte ? '<small>' + subImporte + '</small>' : '') + '</div>'
      +   '<div class="eco-item-acciones">'
      +     '<button class="eco-item-btn" data-editar="' + item.id + '" data-tipo="' + tipo + '" title="Editar"><i class="fas fa-pen"></i></button>'
      +     '<button class="eco-item-btn eco-item-btn-peligro" data-borrar="' + item.id + '" data-coleccion="' + coleccion + '" title="Borrar"><i class="fas fa-trash"></i></button>'
      +   '</div>'
      + '</div>';
  }

  // ---- OBJETIVOS -------------------------------------------
  function renderObjetivos() {
    var el = contenedor.querySelector('#ecoObjetivos');
    var lista = State.get().objetivos || [];
    if (lista.length === 0) {
      el.innerHTML = '<div class="eco-vacio">Sin objetivos. Crea uno para empezar a ahorrar.</div>';
      return;
    }
    el.innerHTML = lista.map(function(obj) {
      var est = State.estadoObjetivo(obj);
      return ''
        + '<div class="eco-objetivo">'
        +   '<div class="eco-objetivo-head">'
        +     '<div class="eco-objetivo-titulo">' + (obj.icono || '🎯') + ' ' + obj.nombre + (est.completado ? ' <span class="eco-objetivo-completado">¡Conseguido!</span>' : '') + '</div>'
        +     '<div class="eco-objetivo-pct">' + est.porcentaje.toFixed(0) + '%</div>'
        +   '</div>'
        +   '<div class="eco-barra"><div class="eco-barra-fill" style="width:' + est.porcentaje + '%;background:' + (obj.color || '#3b82f6') + '"></div></div>'
        +   '<div class="eco-objetivo-meta">'
        +     '<div>Ahorrado<strong>' + U.eur(obj.importeActual || 0) + '</strong></div>'
        +     '<div>Objetivo<strong>' + U.eur(obj.importeObjetivo || 0) + '</strong></div>'
        +     '<div>Falta<strong>' + U.eur(est.falta) + '</strong></div>'
        +   '</div>'
        +   (est.mesesRestantes !== null && !est.completado
              ? '<div class="eco-objetivo-meta" style="margin-top:8px;grid-template-columns:1fr"><div>Faltan <strong>' + est.mesesRestantes + ' meses</strong> · Ahorrar <strong>' + U.eur(est.mensualNecesaria) + '/mes</strong></div></div>'
              : '')
        +   '<div style="display:flex;gap:8px;margin-top:12px">'
        +     '<button class="eco-btn eco-btn-primario" data-aportar="' + obj.id + '"><i class="fas fa-plus"></i> Aportar</button>'
        +     '<button class="eco-btn eco-btn-ghost" data-editar="' + obj.id + '" data-tipo="objetivo"><i class="fas fa-pen"></i></button>'
        +     '<button class="eco-btn eco-btn-ghost" data-borrar="' + obj.id + '" data-coleccion="objetivos"><i class="fas fa-trash"></i></button>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  // ---- PRESUPUESTO -----------------------------------------
  function renderPresupuesto() {
    var el = contenedor.querySelector('#ecoPresupuesto');
    var obj = State.presupuestoObjetivo();
    var comp = State.comparativaPresupuesto(mesActualYM);

    function barra(titulo, real, objetivo, color) {
      var pct = objetivo > 0 ? (real / objetivo) * 100 : 0;
      var pctMostrar = Math.min(150, pct);
      var estado, estadoTexto, colorFinal = color;
      if (pct <= 100) {
        estado = 'eco-presu-ok';
        estadoTexto = '✓ Dentro del presupuesto (' + pct.toFixed(0) + '%)';
      } else if (pct <= 115) {
        estado = 'eco-presu-alerta';
        estadoTexto = '⚠️ Algo por encima (' + pct.toFixed(0) + '%)';
        colorFinal = '#f59e0b';
      } else {
        estado = 'eco-presu-exceso';
        estadoTexto = '✗ Excedido (' + pct.toFixed(0) + '%)';
        colorFinal = '#ef4444';
      }
      return ''
        + '<div class="eco-presu-item">'
        +   '<div class="eco-presu-head">'
        +     '<span class="eco-presu-titulo">' + titulo + '</span>'
        +     '<span class="eco-presu-valores"><strong>' + U.eur(real) + '</strong> / ' + U.eur(objetivo) + '</span>'
        +   '</div>'
        +   '<div class="eco-presu-barra">'
        +     '<div class="eco-presu-barra-fill" style="width:' + pctMostrar + '%;background:' + colorFinal + '"></div>'
        +     '<div class="eco-presu-barra-marca" style="left:100%"></div>'
        +   '</div>'
        +   '<div class="eco-presu-estado ' + estado + '">' + estadoTexto + '</div>'
        + '</div>';
    }

    var html = ''
      + '<p style="font-size:13px;color:var(--text-2);margin:0 0 16px">Basado en tu <strong>ingreso base familiar</strong> de ' + U.eur(obj.base) + '/mes.</p>'
      + barra('🏠 Necesidades (50%)', comp.necesidades.real, comp.necesidades.objetivo, '#3b82f6')
      + barra('🎉 Estilo de vida (30%)', comp.estilo.real, comp.estilo.objetivo, '#8b5cf6')
      + barra('💰 Ahorro (20%)', Math.max(0, comp.ahorro.real), comp.ahorro.objetivo, '#10b981');

    var fondo = State.fondoEmergenciaRecomendado(6);
    html += ''
      + '<div style="margin-top:24px;padding:14px;border-radius:10px;background:var(--hover,#f7fafc);border:1px solid var(--border,#e2e8f0)">'
      +   '<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text-2);margin-bottom:6px">🚨 Fondo de emergencia recomendado</div>'
      +   '<div style="font-size:20px;font-weight:700">' + U.eur(fondo) + '</div>'
      +   '<div style="font-size:12.5px;color:var(--text-2);margin-top:4px">Equivale a 6 meses de tus gastos fijos (' + U.eur(State.gastosFijosMensual()) + '/mes)</div>'
      + '</div>';

    el.innerHTML = html;
  }

  // ============================================================
  // MODAL
  // ============================================================
  function abrirModalNuevo(tipo) {
    modalConfig = { tipo: tipo, coleccion: coleccionDeTipo(tipo), item: null };
    contenedor.querySelector('#ecoModalTitulo').textContent = tituloModal(tipo, false);
    contenedor.querySelector('#ecoModalBody').innerHTML = formHTML(tipo, {});
    contenedor.querySelector('#ecoModal').hidden = false;
    setTimeout(function() {
      var primerInput = contenedor.querySelector('.eco-modal-body input, .eco-modal-body select');
      if (primerInput) primerInput.focus();
    }, 50);
  }

  function abrirModalEditar(id, tipo) {
    var col = coleccionDeTipo(tipo);
    var item = State.get()[col].find(function(x) { return x.id === id; });
    if (!item) return;
    modalConfig = { tipo: tipo, coleccion: col, item: item };
    contenedor.querySelector('#ecoModalTitulo').textContent = tituloModal(tipo, true);
    contenedor.querySelector('#ecoModalBody').innerHTML = formHTML(tipo, item);
    contenedor.querySelector('#ecoModal').hidden = false;
  }

  function cerrarModal() {
    contenedor.querySelector('#ecoModal').hidden = true;
    modalConfig = null;
  }

  function guardarModal() {
    if (!modalConfig) return;
    var datos = leerFormulario(modalConfig.tipo);
    if (!datos) return;
    if (modalConfig.item) {
      State.updateItem(modalConfig.coleccion, modalConfig.item.id, datos);
    } else {
      State.addItem(modalConfig.coleccion, datos);
    }
    cerrarModal();
  }

  function coleccionDeTipo(tipo) {
    if (tipo === 'ingreso-fijo') return 'ingresosFijos';
    if (tipo === 'ingreso-extra') return 'ingresosExtra';
    if (tipo === 'gasto-fijo' || tipo === 'gasto-puntual') return 'gastos';
    if (tipo === 'objetivo') return 'objetivos';
    return null;
  }

  function tituloModal(tipo, editando) {
    var base = {
      'ingreso-fijo':   'ingreso fijo',
      'ingreso-extra':  'ingreso extra',
      'gasto-fijo':     'gasto fijo',
      'gasto-puntual':  'gasto puntual',
      'objetivo':       'objetivo de ahorro'
    }[tipo] || 'elemento';
    return (editando ? 'Editar ' : 'Añadir ') + base;
  }

  // ---- FORMULARIOS -----------------------------------------
  function formHTML(tipo, datos) {
    var d = datos || {};
    var campos = [];

    if (tipo === 'ingreso-fijo' || tipo === 'ingreso-extra') {
      campos.push(campoSelect('persona', 'Persona', PERSONAS_DEF.map(function(p) {
        return { v: p.id, t: p.nombre };
      }), d.persona || 'miguel'));

      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Salario, Paga extra...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));

      if (tipo === 'ingreso-fijo') {
        campos.push(campoSelect('periodicidad', 'Periodicidad', [
          { v: 'mensual', t: 'Mensual' },
          { v: 'trimestral', t: 'Trimestral' },
          { v: 'semestral', t: 'Semestral' },
          { v: 'anual', t: 'Anual' }
        ], d.periodicidad || 'mensual'));

        campos.push(campoSelect('tipo', 'Tipo', Object.keys(TIPOS_INGRESO).map(function(k) {
          return { v: k, t: TIPOS_INGRESO[k] };
        }), d.tipo || 'nomina'));
      } else {
        campos.push(campoSelect('tipo', 'Tipo', Object.keys(TIPOS_INGRESO).map(function(k) {
          return { v: k, t: TIPOS_INGRESO[k] };
        }), d.tipo || 'esporadico'));
        campos.push(campoTexto('fecha', 'Fecha', d.fecha || U.hoy(), '', 'date'));
        campos.push(campoSelect('destino', 'Destino', [
          { v: '', t: '— Sin asignar —' }
        ].concat(Object.keys(DESTINOS_EXTRA).map(function(k) {
          return { v: k, t: DESTINOS_EXTRA[k] };
        })), d.destino || ''));
      }
    }

    if (tipo === 'gasto-fijo' || tipo === 'gasto-puntual') {
      campos.push(campoTexto('nombre', 'Nombre', d.nombre || '', 'ej: Alquiler, Compra...'));
      campos.push(campoNumero('importe', 'Importe (€)', d.importe || '', '0.00'));

      if (tipo === 'gasto-fijo') {
        campos.push(campoSelect('periodicidad', 'Periodicidad', [
          { v: 'mensual', t: 'Mensual' },
          { v: 'trimestral', t: 'Trimestral' },
          { v: 'semestral', t: 'Semestral' },
          { v: 'anual', t: 'Anual' }
        ], d.periodicidad || 'mensual'));
      } else {
        campos.push(campoTexto('fecha', 'Fecha', d.fecha || U.hoy(), '', 'date'));
      }

      campos.push(campoSelect('categoria', 'Categoría', Object.keys(CATS).map(function(k) {
        return { v: k, t: CATS[k].icono + ' ' + CATS[k].nombre };
      }), d.categoria || 'otros'));

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

  function campoTexto(name, label, valor, placeholder, type) {
    return ''
      + '<div class="eco-campo">'
      +   '<label>' + label + '</label>'
      +   '<input type="' + (type || 'text') + '" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '">'
      + '</div>';
  }

  function campoNumero(name, label, valor, placeholder) {
    return ''
      + '<div class="eco-campo">'
      +   '<label>' + label + '</label>'
      +   '<input type="number" step="0.01" min="0" name="' + name + '" value="' + escapar(valor) + '" placeholder="' + escapar(placeholder || '') + '">'
      + '</div>';
  }

  function campoSelect(name, label, opciones, valor) {
    var opts = opciones.map(function(o) {
      var sel = String(o.v) === String(valor) ? ' selected' : '';
      return '<option value="' + escapar(o.v) + '"' + sel + '>' + escapar(o.t) + '</option>';
    }).join('');
    return ''
      + '<div class="eco-campo">'
      +   '<label>' + label + '</label>'
      +   '<select name="' + name + '">' + opts + '</select>'
      + '</div>';
  }

  function campoCheck(name, label, checked) {
    return ''
      + '<label class="eco-check">'
      +   '<input type="checkbox" name="' + name + '"' + (checked ? ' checked' : '') + '>'
      +   '<span class="eco-check-label">' + label + '</span>'
      + '</label>';
  }

  function campoColor(name, label, valor) {
    return ''
      + '<div class="eco-campo">'
      +   '<label>' + label + '</label>'
      +   '<input type="color" name="' + name + '" value="' + escapar(valor || '#3b82f6') + '">'
      + '</div>';
  }

  function leerFormulario(tipo) {
    var body = contenedor.querySelector('.eco-modal-body');
    function val(n) { var el = body.querySelector('[name="' + n + '"]'); return el ? el.value : ''; }
    function chk(n) { var el = body.querySelector('[name="' + n + '"]'); return el ? el.checked : false; }
    function num(n) { var v = parseFloat(val(n)); return isNaN(v) ? 0 : v; }

    var obj = {};
    if (tipo === 'ingreso-fijo') {
      obj = { persona: val('persona'), nombre: val('nombre').trim(), importe: num('importe'), periodicidad: val('periodicidad'), tipo: val('tipo'), activo: true };
      if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; }
    } else if (tipo === 'ingreso-extra') {
      obj = { persona: val('persona'), nombre: val('nombre').trim(), importe: num('importe'), tipo: val('tipo'), fecha: val('fecha'), categoria: val('tipo'), destino: val('destino') || null, notas: '' };
      if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; }
    } else if (tipo === 'gasto-fijo') {
      obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: val('periodicidad'), categoria: val('categoria'), necesario: chk('necesario') };
      if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; }
    } else if (tipo === 'gasto-puntual') {
      obj = { nombre: val('nombre').trim(), importe: num('importe'), periodicidad: 'puntual', fecha: val('fecha'), categoria: val('categoria'), necesario: chk('necesario') };
      if (!obj.nombre || obj.importe <= 0) { alert('Nombre e importe son obligatorios'); return null; }
    } else if (tipo === 'objetivo') {
      obj = { nombre: val('nombre').trim(), icono: val('icono') || '🎯', importeObjetivo: num('importeObjetivo'), importeActual: num('importeActual'), fechaLimite: val('fechaLimite') || null, color: val('color') || '#3b82f6', prioridad: 'media' };
      if (!obj.nombre || obj.importeObjetivo <= 0) { alert('Nombre y objetivo son obligatorios'); return null; }
    }
    return obj;
  }

  // ---- APORTAR A OBJETIVO ----------------------------------
  function aportarAObjetivo(id) {
    var obj = State.get().objetivos.find(function(o) { return o.id === id; });
    if (!obj) return;
    var cant = prompt('¿Cuánto quieres aportar a "' + obj.nombre + '"?', '100');
    if (cant === null) return;
    var v = parseFloat(cant.replace(',', '.'));
    if (isNaN(v) || v <= 0) { alert('Cantidad inválida'); return; }
    State.updateItem('objetivos', id, { importeActual: (obj.importeActual || 0) + v });
  }

  // ---- EXPORT / IMPORT / RESET -----------------------------
  function exportar() {
    var json = State.storage.exportar();
    U.descargarJSON('economia-' + U.hoy() + '.json', json);
  }

  function importar() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = function() {
      var f = inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function() {
        try {
          State.storage.importar(r.result);
          State.set('personas', State.get().personas); // fuerza notificar
          alert('✅ Importado correctamente');
        } catch (e) {
          alert('❌ Error: ' + e.message);
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  function resetear() {
    if (!confirm('⚠️ Esto borrará TODOS los datos de economía. ¿Continuar?')) return;
    State.storage.borrar();
    location.reload();
  }

  // ---- helper escape ---------------------------------------
  function escapar(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { montar: montar, CATS: CATS };
})();

console.log('✅ Economia cargado');
