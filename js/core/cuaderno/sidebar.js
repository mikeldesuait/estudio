/* ============================================================
   CUADERNO — Sidebar con lista de cuadernos
   ============================================================ */

window.CuadernoSidebar = (function() {

  var U = window.CuadernoUtils;

  function init(root, state) {
    var lista = U.el(root, 'lista-cuadernos');
    var btnNuevo = root.querySelector('[data-action="nuevo-cuaderno"]');

    U.on(btnNuevo, 'click', function() {
      var nombre = prompt('Nombre del cuaderno:', 'Nuevo cuaderno');
      if (!nombre) return;
      state.acciones.crearCuaderno(nombre.trim());
    });

    var unsub = state.suscribir(render);
    render(state.data);

    function render(data) {
      lista.innerHTML = '';

      if (!data.cuadernos.length) {
        var vacio = document.createElement('li');
        vacio.className = 'cd-lista-vacia';
        vacio.textContent = 'Sin cuadernos. Pulsa + para crear uno.';
        lista.appendChild(vacio);
        return;
      }

      data.cuadernos.forEach(function(nb) {
        var li = document.createElement('li');
        li.className = 'cd-item-cuaderno';
        if (nb.id === data.cuadernoActivoId) li.classList.add('cd-activo');

        var dot = document.createElement('span');
        dot.className = 'cd-dot';
        dot.style.background = nb.color;
        dot.title = 'Cambiar color';
        dot.addEventListener('click', function(e) {
          e.stopPropagation();
          var colores = U.COLORES;
          var idx = colores.indexOf(nb.color);
          var sig = colores[(idx + 1) % colores.length];
          state.acciones.cambiarColorCuaderno(nb.id, sig);
        });

        var nombre = document.createElement('span');
        nombre.className = 'cd-nombre';
        nombre.textContent = nb.nombre;
        nombre.title = 'Doble clic para renombrar';
        nombre.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          var nuevo = prompt('Renombrar cuaderno:', nb.nombre);
          if (nuevo) state.acciones.renombrarCuaderno(nb.id, nuevo.trim());
        });

        var count = document.createElement('span');
        count.className = 'cd-count';
        count.textContent = nb.hojas.length;

        var del = document.createElement('button');
        del.className = 'cd-del';
        del.textContent = '✕';
        del.title = 'Eliminar cuaderno';
        del.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm('¿Eliminar "' + nb.nombre + '"?')) {
            state.acciones.eliminarCuaderno(nb.id);
          }
        });

        li.append(dot, nombre, count, del);
        li.addEventListener('click', function() {
          state.acciones.seleccionarCuaderno(nb.id);
        });

        lista.appendChild(li);
      });
    }

    return unsub;
  }

  return { init: init };
})();

console.log('✅ CuadernoSidebar cargado');
