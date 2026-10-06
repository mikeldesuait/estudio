/* ============================================================
   CUADERNO — Estado global + Pub/Sub + Acciones (v2, hojas)
   ============================================================ */

window.CuadernoState = (function() {

  var U = window.CuadernoUtils;
  var S = window.CuadernoSchema;
  var Storage = window.CuadernoStorage;

  function crear(opciones) {
    var storage = Storage.crear(opciones.namespace || 'estudio:cuaderno');
    var cargado = S.migrar(storage.cargar());
    var listeners = new Set();

    var state = {
      data: cargado,
      opciones: opciones,

      suscribir: function(fn) {
        listeners.add(fn);
        return function() { listeners.delete(fn); };
      },

      notificar: function() {
        listeners.forEach(function(fn) { fn(state.data); });
      },

      persistir: function() {
        storage.guardar(state.data);
        if (opciones.onGuardar) opciones.onGuardar(state.data);
      },

      exportarJSON: function() {
        return JSON.stringify(state.data, null, 2);
      },

      importarJSON: function(json) {
        var incoming = S.migrar(JSON.parse(json));
        state.data = incoming;
        state.persistir();
        state.notificar();
      }
    };

    var acciones = {

      // ─── Cuadernos ───

      crearCuaderno: function(nombre, color) {
        var nb = S.cuadernoPorDefecto(
          nombre || 'Nuevo cuaderno',
          color || U.colorAleatorio()
        );
        state.data.cuadernos.push(nb);
        state.data.cuadernoActivoId = nb.id;
        state.persistir();
        state.notificar();
        return nb;
      },

      eliminarCuaderno: function(id) {
        var d = state.data;
        var idx = d.cuadernos.findIndex(function(n) { return n.id === id; });
        if (idx === -1) return;
        d.cuadernos.splice(idx, 1);
        if (d.cuadernoActivoId === id) {
          d.cuadernoActivoId = d.cuadernos[0] ? d.cuadernos[0].id : null;
        }
        state.persistir();
        state.notificar();
      },

      seleccionarCuaderno: function(id) {
        state.data.cuadernoActivoId = id;
        state.persistir();
        state.notificar();
      },

      renombrarCuaderno: function(id, nombre) {
        var nb = state.data.cuadernos.find(function(n) { return n.id === id; });
        if (!nb) return;
        nb.nombre = nombre;
        nb.actualizado = Date.now();
        state.persistir();
        state.notificar();
      },

      cambiarColorCuaderno: function(id, color) {
        var nb = state.data.cuadernos.find(function(n) { return n.id === id; });
        if (!nb) return;
        nb.color = color;
        nb.actualizado = Date.now();
        state.persistir();
        state.notificar();
      },

      cuadernoActivo: function() {
        var d = state.data;
        return d.cuadernos.find(function(n) { return n.id === d.cuadernoActivoId; }) || null;
      },

      // ─── Hojas ───

      // Crea una hoja nueva al final del cuaderno activo y la devuelve
      crearHojaAlFinal: function() {
        var nb = acciones.cuadernoActivo();
        if (!nb) return null;
        var nueva = S.hojaPorDefecto();
        nb.hojas.push(nueva);
        state.persistir();
        state.notificar();
        return nueva;
      },

      // Crea una hoja nueva justo después de la indicada y la devuelve
      crearHojaDespuesDe: function(hojaId) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return null;
        var idx = nb.hojas.findIndex(function(h) { return h.id === hojaId; });
        var nueva = S.hojaPorDefecto();
        if (idx === -1) {
          nb.hojas.push(nueva);
        } else {
          nb.hojas.splice(idx + 1, 0, nueva);
        }
        state.persistir();
        state.notificar();
        return nueva;
      },

      // Devuelve la hoja siguiente a la indicada, o null
      hojaSiguiente: function(hojaId) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return null;
        var idx = nb.hojas.findIndex(function(h) { return h.id === hojaId; });
        if (idx === -1 || idx + 1 >= nb.hojas.length) return null;
        return nb.hojas[idx + 1];
      },

      // Devuelve la hoja anterior a la indicada, o null
      hojaAnterior: function(hojaId) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return null;
        var idx = nb.hojas.findIndex(function(h) { return h.id === hojaId; });
        if (idx <= 0) return null;
        return nb.hojas[idx - 1];
      },

      // Actualiza el contenido de una hoja concreta
      actualizarContenido: function(hojaId, html) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return;
        var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
        if (!hoja) return;
        hoja.contenido = html;
        hoja.actualizada = Date.now();
        state.persistir();
      },

      // Sustituye el contenido de una hoja (para el corte)
      setContenido: function(hojaId, html) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return;
        var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
        if (!hoja) return;
        hoja.contenido = html;
        hoja.actualizada = Date.now();
        state.persistir();
      },

      // Antepone HTML al contenido existente de una hoja
      prependContenido: function(hojaId, html) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return;
        var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
        if (!hoja) return;
        hoja.contenido = html + (hoja.contenido || '');
        hoja.actualizada = Date.now();
        state.persistir();
      },

      // ─── Plantilla (a nivel de cuaderno) ───

      cambiarPlantilla: function(plantilla) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return;
        nb.plantilla = plantilla;
        state.persistir();
        state.notificar();
      },

      // ─── UI ───

      setHerramienta: function(herr) {
        state.data.ui.herramienta = herr;
        state.persistir();
        state.notificar();
      },

      setColorDibujo: function(tool, color) {
        if (tool !== 'lapiz' && tool !== 'resaltador') return;
        if (!state.data.ui[tool]) state.data.ui[tool] = {};
        state.data.ui[tool].color = color;
        state.persistir();
        state.notificar();
      },

      setGrosorDibujo: function(tool, grosor) {
        if (tool !== 'lapiz' && tool !== 'resaltador') return;
        if (!state.data.ui[tool]) state.data.ui[tool] = {};
        state.data.ui[tool].grosor = grosor;
        state.persistir();
        state.notificar();
      },

      // ─── Versiones "sin notificar" para usar en operaciones en bloque ───

      crearHojaAlFinalSinNotificar: function() {
        var nb = acciones.cuadernoActivo();
        if (!nb) return null;
        var nueva = S.hojaPorDefecto();
        nb.hojas.push(nueva);
        state.persistir();
        return nueva;
      },

      prependContenidoSinNotificar: function(hojaId, html) {
        var nb = acciones.cuadernoActivo();
        if (!nb) return;
        var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
        if (!hoja) return;
        hoja.contenido = html + (hoja.contenido || '');
        hoja.actualizada = Date.now();
        state.persistir();
      },

      // ─── Vínculo con asignatura ───

      abrirOCrearPorAsignatura: function(asignaturaId, nombreAsignatura) {
        var d = state.data;
        var existente = d.cuadernos.find(function(n) { return n.asignaturaId === asignaturaId; });
        if (existente) {
          d.cuadernoActivoId = existente.id;
          state.persistir();
          state.notificar();
          return existente;
        }
        var nuevo = S.cuadernoPorDefecto(nombreAsignatura || asignaturaId, U.colorAleatorio());
        nuevo.asignaturaId = asignaturaId;
        d.cuadernos.push(nuevo);
        d.cuadernoActivoId = nuevo.id;
        state.persistir();
        state.notificar();
        return nuevo;
      }
    };

    state.acciones = acciones;
    return state;
  }

  return { crear: crear };
})();

console.log('✅ CuadernoState cargado (v2)');
