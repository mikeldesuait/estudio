/* ============================================================
   CUADERNO — Esquema de datos + migraciones
   ============================================================ */

window.CuadernoSchema = (function() {

  var VERSION_ACTUAL = 2;

  function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function hojaPorDefecto() {
    return {
      id: uid(),
      contenido: '',
      trazos: [],
      creada: Date.now(),
      actualizada: Date.now()
    };
  }

  function cuadernoPorDefecto(nombre, color) {
    return {
      id: uid(),
      nombre: nombre || 'Nuevo cuaderno',
      color: color || '#3b82f6',
      asignaturaId: null,
      plantilla: 'rayada',
      hojas: [hojaPorDefecto()],
      creado: Date.now(),
      actualizado: Date.now()
    };
  }

  function estadoPorDefecto() {
    return {
      version: VERSION_ACTUAL,
      cuadernos: [],
      cuadernoActivoId: null,
      ui: {
        herramienta: 'texto',
        lapiz: { color: '#1f2937', grosor: 2 },
        resaltador: { color: '#fde047', grosor: 14 }
      }
    };
  }

  function migrar(data) {
    if (!data) return estadoPorDefecto();

    // Migración de v1 (documento continuo) a v2 (hojas separadas)
    if (data.version === 1) {
      data.cuadernos = (data.cuadernos || []).map(function(nb) {
        // Si el cuaderno tenía contenido continuo, meterlo en una hoja
        if (nb.contenido && !nb.hojas) {
          nb.hojas = [{
            id: uid(),
            contenido: nb.contenido,
            trazos: [],
            creada: Date.now(),
            actualizada: Date.now()
          }];
          delete nb.contenido;
        }
        // Garantizar que cada cuaderno tenga al menos una hoja
        if (!nb.hojas || !nb.hojas.length) {
          nb.hojas = [hojaPorDefecto()];
        }
        // Garantizar campos
        if (!nb.plantilla) nb.plantilla = 'rayada';
        return nb;
      });
      data.version = 2;
      // Quitar campos del modelo viejo
      delete data.indiceHoja;
    }

    var base = estadoPorDefecto();
    return Object.assign({}, base, data, {
      ui: Object.assign({}, base.ui, data.ui || {})
    });
  }

  return {
    VERSION_ACTUAL: VERSION_ACTUAL,
    estadoPorDefecto: estadoPorDefecto,
    cuadernoPorDefecto: cuadernoPorDefecto,
    hojaPorDefecto: hojaPorDefecto,
    migrar: migrar
  };
})();

console.log('✅ CuadernoSchema cargado (v2)');
