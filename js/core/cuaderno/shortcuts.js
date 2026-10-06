/* ============================================================
   CUADERNO — Atajos de teclado
   ============================================================ */

window.CuadernoShortcuts = (function() {

  function init(root, state) {
    var contenedor = root.querySelector('[data-el="contenedor-hojas"]');

    function onKeydown(e) {
      // Solo aplicamos si el foco está dentro del cuaderno
      if (!root.contains(e.target)) return;

      // Solo atajos con Ctrl (o Cmd en Mac)
      var ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      var activo = document.activeElement;
      var esEditor = activo && activo.classList && activo.classList.contains('cd-capa-texto');

      var tecla = e.key.toLowerCase();

      // ─── Ctrl+B / Ctrl+I / Ctrl+U: formato ───
      if (esEditor && (tecla === 'b' || tecla === 'i' || tecla === 'u')) {
        e.preventDefault();
        var cmd = tecla === 'b' ? 'bold' : tecla === 'i' ? 'italic' : 'underline';
        document.execCommand(cmd, false, null);
        state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
        return;
      }

      // ─── Ctrl+Z: deshacer ───
      if (tecla === 'z' && !e.shiftKey) {
        e.preventDefault();

        // Si estamos en modo dibujo, deshacer el último trazo
        var enModoDibujo = document.body.classList.contains('cd-mododibujo');
        if (enModoDibujo && root._cdDeshacerDibujo) {
          root._cdDeshacerDibujo();
          return;
        }

        // Si estamos en modo texto, deshacer el texto
        if (esEditor) {
          document.execCommand('undo');
          state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
        }
        return;
      }

      // ─── Ctrl+Y / Ctrl+Shift+Z: rehacer ───
      if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) {
        e.preventDefault();

        var enModoDibujo2 = document.body.classList.contains('cd-mododibujo');
        if (enModoDibujo2 && root._cdRehacerDibujo) {
          root._cdRehacerDibujo();
          return;
        }

        if (esEditor) {
          document.execCommand('redo');
          state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
        }
        return;
      }

      // ─── Ctrl+S: guardar (evitar el "Guardar página") ───
      if (tecla === 's') {
        e.preventDefault();
        // Forzar guardado del cuaderno actual
        if (esEditor) {
          state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
        }
        state.persistir();
        mostrarAvisoGuardado();
        return;
      }
    }

    document.addEventListener('keydown', onKeydown);

    // ─── Aviso visual de "Guardado" ───
    function mostrarAvisoGuardado() {
      var aviso = document.createElement('div');
      aviso.className = 'cd-aviso-guardado';
      aviso.textContent = '💾 Guardado';
      document.body.appendChild(aviso);

      setTimeout(function() {
        aviso.classList.add('cd-aviso-visible');
      }, 10);

      setTimeout(function() {
        aviso.classList.remove('cd-aviso-visible');
        setTimeout(function() { aviso.remove(); }, 300);
      }, 1200);
    }

    // Cleanup
    return function() {
      document.removeEventListener('keydown', onKeydown);
    };
  }

  return { init: init };
})();

console.log('✅ CuadernoShortcuts cargado');
