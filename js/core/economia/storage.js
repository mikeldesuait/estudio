/* ============================================================
   ECONOMIA — Persistencia (localStorage con namespace)
   Patrón: window.EconomiaStorage.crear('estudio:economia')
   ============================================================ */

window.EconomiaStorage = (function() {

  var ESQUEMA_V1 = {
    version: 1,
    personas: [
      { id: 'miguel',     nombre: 'Miguel',     color: '#3b82f6' },
      { id: 'pareja',     nombre: 'Pareja',     color: '#ec4899' },
      { id: 'compartido', nombre: 'Compartido', color: '#10b981' }
    ],
    ingresosFijos: [],
    ingresosExtra: [],
    gastos: [],
    objetivos: [],
    presupuesto: {
      modo: '50-30-20',
      necesidades: 50,
      estilo: 30,
      ahorro: 20,
      objetivoAhorroMensual: 0
    }
  };

  function crear(namespace) {
    var clave = namespace + ':v1';

    return {
      cargar: function() {
        try {
          var raw = localStorage.getItem(clave);
          if (!raw) return JSON.parse(JSON.stringify(ESQUEMA_V1));
          var datos = JSON.parse(raw);
          return Object.assign(JSON.parse(JSON.stringify(ESQUEMA_V1)), datos);
        } catch (e) {
          console.error('[economia] Error cargando:', e);
          return JSON.parse(JSON.stringify(ESQUEMA_V1));
        }
      },

      guardar: function(data) {
        try {
          localStorage.setItem(clave, JSON.stringify(data));
          return true;
        } catch (e) {
          console.error('[economia] Error guardando:', e);
          if (window.Navegacion && Navegacion.toast) {
            Navegacion.toast('⚠️ No se pudo guardar economía');
          }
          return false;
        }
      },

      borrar: function() {
        localStorage.removeItem(clave);
      },

      exportar: function() {
        return JSON.stringify(this.cargar(), null, 2);
      },

      importar: function(json) {
        var datos = typeof json === 'string' ? JSON.parse(json) : json;
        if (!datos || typeof datos !== 'object') throw new Error('JSON inválido');
        var fusionado = Object.assign(JSON.parse(JSON.stringify(ESQUEMA_V1)), datos, { version: 1 });
        this.guardar(fusionado);
        return fusionado;
      },

      esquema: function() {
        return JSON.parse(JSON.stringify(ESQUEMA_V1));
      },

      clave: clave
    };
  }

  return { crear: crear, ESQUEMA_V1: ESQUEMA_V1 };
})();

console.log('✅ EconomiaStorage cargado');
