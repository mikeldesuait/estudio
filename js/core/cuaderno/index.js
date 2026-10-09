/* ============================================================
   CUADERNO — API pública
   Uso: Cuaderno.montar(rootElement, opciones)
   ============================================================ */

window.Cuaderno = (function() {

  var instancias = new WeakMap();

  function montar(rootElement, opciones) {
    if (!rootElement) {
      console.error('[cuaderno] Root no proporcionado');
      return null;
    }

    if (instancias.has(rootElement)) {
      desmontar(rootElement);
    }

    var opts = Object.assign({
      namespace: 'estudio:cuaderno',
      cuadernoId: null,
      hojaId: null,
      asignaturaId: null,
      onGuardar: null
    }, opciones || {});

    rootElement.innerHTML = window.CuadernoTemplate.render();
    rootElement.classList.add('cd-root');
    document.body.classList.add('cd-cuaderno-montado');

    var state = window.CuadernoState.crear(opts);

    if (opts.asignaturaId) {
      state.acciones.abrirOCrearPorAsignatura(opts.asignaturaId, opts.asignaturaId);
    } else if (opts.cuadernoId) {
      var existe = state.data.cuadernos.find(function(n) { return n.id === opts.cuadernoId; });
      if (existe) {
        state.data.cuadernoActivoId = opts.cuadernoId;
        state.persistir();
      }
    }

    if (!state.data.cuadernoActivoId && state.data.cuadernos.length) {
      state.data.cuadernoActivoId = state.data.cuadernos[0].id;
    }

    var unsuscribers = [];
    if (window.CuadernoSidebar)   unsuscribers.push(window.CuadernoSidebar.init(rootElement, state));
    if (window.CuadernoPageView)  unsuscribers.push(window.CuadernoPageView.init(rootElement, state));
    if (window.CuadernoEditor)    unsuscribers.push(window.CuadernoEditor.init(rootElement, state));
    if (window.CuadernoToolbar)   unsuscribers.push(window.CuadernoToolbar.init(rootElement, state));
    if (window.CuadernoDrawing)   unsuscribers.push(window.CuadernoDrawing.init(rootElement, state));
    if (window.CuadernoShortcuts) unsuscribers.push(window.CuadernoShortcuts.init(rootElement, state));

    state.notificar();

    // ─── Sidebar responsive ───
    initSidebarResponsive(rootElement);

    var instancia = {
      root: rootElement,
      state: state,

      desmontar: function() {
        unsuscribers.forEach(function(u) { if (typeof u === 'function') u(); });
        rootElement.innerHTML = '';
        rootElement.classList.remove('cd-root');
        document.body.classList.remove('cd-cuaderno-montado');
        instancias.delete(rootElement);
      },

      abrirCuaderno: function(id) { state.acciones.seleccionarCuaderno(id); },
      abrirPorAsignatura: function(id, nombre) { state.acciones.abrirOCrearPorAsignatura(id, nombre); },
      exportar: function() { return state.exportarJSON(); },
      importar: function(json) { state.importarJSON(json); }
    };

    instancias.set(rootElement, instancia);
    return instancia;
  }

  function desmontar(rootElement) {
    var inst = instancias.get(rootElement);
    if (inst) inst.desmontar();
  }

  // ─── Sidebar responsive ───
  var STORAGE_KEY = 'estudio:cuaderno:sidebar-pref';
  var ANCHO_BREAKPOINT = 750;

  function initSidebarResponsive(root) {
    var boton = root.querySelector('[data-action="toggle-sidebar"]');
    if (!boton) return;

    // Aplicar estado inicial
    aplicarEstadoInicial(root);

    // Listener del botón
    boton.addEventListener('click', function() {
      var oculta = root.classList.toggle('cd-sidebar-oculta');
      // Guardar preferencia
      try {
        localStorage.setItem(STORAGE_KEY, oculta ? 'oculta' : 'visible');
      } catch (e) {}
    });

    // Listener de resize: si no hay preferencia guardada, adaptar
    var resizeDebounced = null;
    window.addEventListener('resize', function() {
      clearTimeout(resizeDebounced);
      resizeDebounced = setTimeout(function() {
        var pref = null;
        try { pref = localStorage.getItem(STORAGE_KEY); } catch (e) {}
        if (pref) return; // si hay preferencia manual, no hacemos nada
        adaptarAlAncho(root);
      }, 200);
    });
  }

  function aplicarEstadoInicial(root) {
    var pref = null;
    try { pref = localStorage.getItem(STORAGE_KEY); } catch (e) {}

    if (pref === 'oculta') {
      root.classList.add('cd-sidebar-oculta');
    } else if (pref === 'visible') {
      root.classList.remove('cd-sidebar-oculta');
    } else {
      // Sin preferencia → aplicar regla automática
      adaptarAlAncho(root);
    }
  }

  function adaptarAlAncho(root) {
    var ancho = window.innerWidth;
    if (ancho < ANCHO_BREAKPOINT) {
      root.classList.add('cd-sidebar-oculta');
    } else {
      root.classList.remove('cd-sidebar-oculta');
    }
  }

  return { montar: montar, desmontar: desmontar };
})();

console.log('✅ Cuaderno (API) cargado');
