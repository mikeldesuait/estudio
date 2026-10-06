/* ============================================================
   CUADERNO — Toolbar v2 (hojas apiladas + paletas de color)
   ============================================================ */

window.CuadernoToolbar = (function() {

  var U = window.CuadernoUtils;

  var COLORES_TEXTO = [
    { nombre: 'Negro',   valor: '#1f2937' },
    { nombre: 'Rojo',    valor: '#ef233c' },
    { nombre: 'Azul',    valor: '#2563eb' },
    { nombre: 'Verde',   valor: '#059669' },
    { nombre: 'Naranja', valor: '#ea580c' },
    { nombre: 'Morado',  valor: '#7c3aed' }
  ];

  var COLORES_RESALTADO = [
    { nombre: 'Amarillo',   valor: '#fde047' },
    { nombre: 'Verde',      valor: '#86efac' },
    { nombre: 'Rosa',       valor: '#fbcfe8' },
    { nombre: 'Azul claro', valor: '#bfdbfe' },
    { nombre: 'Naranja',    valor: '#fed7aa' }
  ];

  // ─── Paletas de dibujo (lápiz y resaltador) ───
  var COLORES_LAPIZ = [
    { nombre: 'Negro',   valor: '#1f2937' },
    { nombre: 'Rojo',    valor: '#ef233c' },
    { nombre: 'Azul',    valor: '#2563eb' },
    { nombre: 'Verde',   valor: '#059669' },
    { nombre: 'Naranja', valor: '#ea580c' },
    { nombre: 'Morado',  valor: '#7c3aed' }
  ];

  var COLORES_RESALTADOR_DIBUJO = [
    { nombre: 'Amarillo',   valor: '#fde047' },
    { nombre: 'Verde',      valor: '#86efac' },
    { nombre: 'Rosa',       valor: '#fbcfe8' },
    { nombre: 'Azul claro', valor: '#bfdbfe' },
    { nombre: 'Naranja',    valor: '#fed7aa' }
  ];

  var GROSORES_LAPIZ = [
    { nombre: 'Fino',    valor: 1 },
    { nombre: 'Normal',  valor: 2 },
    { nombre: 'Grueso',  valor: 4 }
  ];

  var GROSORES_RESALTADOR = [
    { nombre: 'Fino',    valor: 8 },
    { nombre: 'Normal',  valor: 14 },
    { nombre: 'Grueso',  valor: 22 }
  ];

  var paletaAbierta = null;

  function init(root, state) {
    var contenedorHojas = U.el(root, 'contenedor-hojas');

    // Botones de herramienta
    var botonesHerr = root.querySelectorAll('.cd-btn-herr');
    botonesHerr.forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.acciones.setHerramienta(btn.dataset.herr);
      });
    });

    // Formato (B/I/U/undo/redo)
    var botonesFmt = root.querySelectorAll('.cd-btn-fmt');
    botonesFmt.forEach(function(btn) {
      btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
      btn.addEventListener('click', function() {
        var cmd = btn.dataset.cmd;
        var action = btn.dataset.action;
        var activo = document.activeElement;
        var esEditor = activo && activo.classList && activo.classList.contains('cd-capa-texto');

        if (!esEditor) return;

        if (cmd) {
          document.execCommand(cmd, false, null);
          state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
        } else if (action === 'undo') {
          var enDibujo = document.body.classList.contains('cd-mododibujo');
          if (enDibujo && root._cdDeshacerDibujo) {
            root._cdDeshacerDibujo();
          } else if (esEditor) {
            document.execCommand('undo');
            state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
          }
        } else if (action === 'redo') {
          var enDibujo2 = document.body.classList.contains('cd-mododibujo');
          if (enDibujo2 && root._cdRehacerDibujo) {
            root._cdRehacerDibujo();
          } else if (esEditor) {
            document.execCommand('redo');
            state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
          }
        }
      });
    });

    // Paletas de color
    var btnPaletaTexto = root.querySelector('[data-action="paleta-texto"]');
    var btnPaletaResaltado = root.querySelector('[data-action="paleta-resaltado"]');

    U.on(btnPaletaTexto, 'mousedown', function(e) { e.preventDefault(); });
    U.on(btnPaletaResaltado, 'mousedown', function(e) { e.preventDefault(); });

    U.on(btnPaletaTexto, 'click', function(e) {
      e.stopPropagation();
      abrirPaleta(btnPaletaTexto, 'texto');
    });

    U.on(btnPaletaResaltado, 'click', function(e) {
      e.stopPropagation();
      abrirPaleta(btnPaletaResaltado, 'resaltado');
    });

    document.addEventListener('click', function(e) {
      if (!paletaAbierta) return;
      if (paletaAbierta.el.contains(e.target)) return;
      cerrarPaleta();
    });

    // Suscripción: activar/desactivar modo según herramienta
    var unsub = state.suscribir(function(data) {
      var herr = data.ui.herramienta;

      // Actualizar clases activas en los botones
      botonesHerr.forEach(function(b) {
        b.classList.toggle('cd-activo', b.dataset.herr === herr);
      });

      // Modo texto vs modo dibujo en el body
      if (herr === 'texto') {
        document.body.classList.remove('cd-mododibujo');
        document.body.classList.remove('cd-herr-lapiz');
        document.body.classList.remove('cd-herr-resaltador');
        document.body.classList.remove('cd-herr-borrador');
      } else {
        document.body.classList.add('cd-mododibujo');
        document.body.classList.remove('cd-herr-lapiz');
        document.body.classList.remove('cd-herr-resaltador');
        document.body.classList.remove('cd-herr-borrador');
        document.body.classList.add('cd-herr-' + herr);
      }

      // Mostrar/ocultar selectores de dibujo
      if (typeof actualizarGrupoDibujo === 'function') {
        actualizarGrupoDibujo(herr);
      }

      // Ajustar contenteditable de las capas de texto
      contenedorHojas.querySelectorAll('.cd-capa-texto').forEach(function(txt) {
        if (herr === 'texto') {
          txt.setAttribute('contenteditable', 'true');
        } else {
          txt.setAttribute('contenteditable', 'false');
        }
      });
    });

    // ─── Paletas ───

    function abrirPaleta(boton, tipo) {
      if (paletaAbierta && paletaAbierta.el === boton) {
        cerrarPaleta();
        return;
      }
      cerrarPaleta();

      var colores = tipo === 'texto' ? COLORES_TEXTO : COLORES_RESALTADO;

      var cont = document.createElement('div');
      cont.className = 'cd-paleta';

      colores.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'cd-paleta-color';
        btn.title = c.nombre;
        btn.style.background = c.valor;
        if (c.valor === '#1f2937') btn.style.border = '2px solid #4b5563';

        btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          aplicarColor(tipo, c.valor);
          cerrarPaleta();
        });

        cont.appendChild(btn);
      });

      var rect = boton.getBoundingClientRect();
      cont.style.position = 'fixed';
      cont.style.top = (rect.bottom + 6) + 'px';
      cont.style.left = rect.left + 'px';
      cont.style.zIndex = '10000';

      document.body.appendChild(cont);
      paletaAbierta = { tipo: tipo, el: boton, contenedor: cont };
    }

    function cerrarPaleta() {
      if (paletaAbierta && paletaAbierta.contenedor) {
        paletaAbierta.contenedor.remove();
      }
      paletaAbierta = null;
    }

    function aplicarColor(tipo, valor) {
      var activo = document.activeElement;
      var esEditor = activo && activo.classList && activo.classList.contains('cd-capa-texto');

      if (!esEditor) {
        // Buscar el primer editor visible
        activo = contenedorHojas.querySelector('.cd-capa-texto');
      }
      if (!activo) return;

      activo.focus();

      if (tipo === 'texto') {
        document.execCommand('foreColor', false, valor);
        var icono = btnPaletaTexto.querySelector('.cd-icono-color');
        if (icono) icono.style.color = valor;
      } else {
        document.execCommand('hiliteColor', false, valor);
        var iconoR = btnPaletaResaltado.querySelector('.cd-icono-resaltado');
        if (iconoR) iconoR.style.background = valor;
      }

      state.acciones.actualizarContenido(activo.dataset.hojaId, activo.innerHTML);
    }

    // Icono inicial del resaltado
    var iconoIni = btnPaletaResaltado ? btnPaletaResaltado.querySelector('.cd-icono-resaltado') : null;
    if (iconoIni) iconoIni.style.background = COLORES_RESALTADO[0].valor;

    // ─── Selectores de color y grosor de dibujo ───
    var grupoDibujo = root.querySelector('[data-el="grupo-dibujo"]');
    var btnColorDibujo = root.querySelector('[data-action="color-dibujo"]');
    var btnGrosorDibujo = root.querySelector('[data-action="grosor-dibujo"]');
    var swatchColor = root.querySelector('[data-el="swatch-color"]');
    var previewGrosor = root.querySelector('[data-el="preview-grosor"]');

    U.on(btnColorDibujo, 'mousedown', function(e) { e.preventDefault(); });
    U.on(btnGrosorDibujo, 'mousedown', function(e) { e.preventDefault(); });

    U.on(btnColorDibujo, 'click', function(e) {
      e.stopPropagation();
      abrirPaletaDibujo(btnColorDibujo, 'color');
    });

    U.on(btnGrosorDibujo, 'click', function(e) {
      e.stopPropagation();
      abrirPaletaDibujo(btnGrosorDibujo, 'grosor');
    });

    // Mostrar/ocultar el grupo según herramienta
    function actualizarGrupoDibujo(herr) {
      var mostrar = herr === 'lapiz' || herr === 'resaltador';
      grupoDibujo.style.display = mostrar ? 'flex' : 'none';
      if (mostrar) actualizarSwatch(herr);
    }

    function actualizarSwatch(herr) {
      var ui = state.data.ui || {};
      var prefs = ui[herr] || {};
      var color = prefs.color || (herr === 'lapiz' ? '#1f2937' : '#fde047');
      var grosor = prefs.grosor || (herr === 'lapiz' ? 2 : 14);

      if (swatchColor) swatchColor.style.background = color;
      if (previewGrosor) {
        previewGrosor.style.background = color;
        previewGrosor.style.width = Math.min(grosor, 20) + 'px';
        previewGrosor.style.height = Math.min(grosor, 20) + 'px';
      }
    }

    function abrirPaletaDibujo(boton, tipo) {
      if (paletaAbierta && paletaAbierta.el === boton) {
        cerrarPaleta();
        return;
      }
      cerrarPaleta();

      var herr = state.data.ui.herramienta;
      var cont = document.createElement('div');
      cont.className = 'cd-paleta';

      if (tipo === 'color') {
        var colores = herr === 'resaltador' ? COLORES_RESALTADOR_DIBUJO : COLORES_LAPIZ;
        colores.forEach(function(c) {
          var btn = document.createElement('button');
          btn.className = 'cd-paleta-color';
          btn.title = c.nombre;
          btn.style.background = c.valor;
          btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            state.acciones.setColorDibujo(herr, c.valor);
            actualizarSwatch(herr);
            cerrarPaleta();
          });
          cont.appendChild(btn);
        });
      } else {
        var grosores = herr === 'resaltador' ? GROSORES_RESALTADOR : GROSORES_LAPIZ;
        grosores.forEach(function(g) {
          var btn = document.createElement('button');
          btn.className = 'cd-paleta-grosor';
          btn.title = g.nombre;
          var dot = document.createElement('span');
          dot.className = 'cd-paleta-grosor-dot';
          dot.style.width = Math.min(g.valor * 2, 24) + 'px';
          dot.style.height = Math.min(g.valor * 2, 24) + 'px';
          btn.appendChild(dot);
          btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            state.acciones.setGrosorDibujo(herr, g.valor);
            actualizarSwatch(herr);
            cerrarPaleta();
          });
          cont.appendChild(btn);
        });
      }

      var rect = boton.getBoundingClientRect();
      cont.style.position = 'fixed';
      cont.style.top = (rect.bottom + 6) + 'px';
      cont.style.left = rect.left + 'px';
      cont.style.zIndex = '10000';

      document.body.appendChild(cont);
      paletaAbierta = { tipo: tipo, el: boton, contenedor: cont };
    }

    return function() {
      if (typeof unsub === 'function') unsub();
      cerrarPaleta();
    };
  }

  return { init: init };
})();

console.log('✅ CuadernoToolbar cargado (v2)');
