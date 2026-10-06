/* ============================================================
   CUADERNO — Persistencia (localStorage con namespace)
   ============================================================ */

window.CuadernoStorage = (function() {

  function crear(namespace) {
    var clave = namespace + ':v1';

    return {
      cargar: function() {
        try {
          var raw = localStorage.getItem(clave);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          console.error('[cuaderno] Error cargando:', e);
          return null;
        }
      },

      guardar: function(data) {
        try {
          localStorage.setItem(clave, JSON.stringify(data));
          return true;
        } catch (e) {
          console.error('[cuaderno] Error guardando:', e);
          if (window.Navegacion && Navegacion.toast) {
            Navegacion.toast('⚠️ No se pudo guardar el cuaderno');
          }
          return false;
        }
      },

      borrar: function() {
        localStorage.removeItem(clave);
      },

      clave: clave
    };
  }

  return { crear: crear };
})();

console.log('✅ CuadernoStorage cargado');
