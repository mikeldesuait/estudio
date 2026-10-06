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

  return { montar: montar, desmontar: desmontar };
})();

console.log('✅ Cuaderno (API) cargado');
