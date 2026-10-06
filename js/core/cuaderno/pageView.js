/* ============================================================
   CUADERNO — Vista de hojas apiladas (v2)
   ============================================================ */

window.CuadernoPageView = (function() {

  var U = window.CuadernoUtils;

  function init(root, state) {
    var contenedor  = U.el(root, 'contenedor-hojas');
    var selectPlant = U.el(root, 'select-plantilla');
    var indicador   = U.el(root, 'indicador-hoja');

    U.on(selectPlant, 'change', function() {
      state.acciones.cambiarPlantilla(selectPlant.value);
    });

    // Botones de navegación (scroll a hojas)
    U.on(root.querySelector('[data-action="hoja-prev"]'), 'click', function() {
      scrollRelativo(contenedor, -1);
    });
    U.on(root.querySelector('[data-action="hoja-next"]'), 'click', function() {
      scrollRelativo(contenedor, 1);
    });
    U.on(root.querySelector('[data-action="ir-primera"]'), 'click', function() {
      contenedor.scrollTop = 0;
    });
    U.on(root.querySelector('[data-action="ir-ultima"]'), 'click', function() {
      contenedor.scrollTop = contenedor.scrollHeight;
    });
    U.on(root.querySelector('[data-action="hoja-nueva"]'), 'click', function() {
      var nueva = state.acciones.crearHojaAlFinal();
      if (nueva) {
        setTimeout(function() {
          var el = contenedor.querySelector('[data-hoja-id="' + nueva.id + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var ce = el ? el.querySelector('.cd-capa-texto') : null;
          if (ce) ce.focus();
        }, 100);
      }
    });

    var unsub = state.suscribir(render);
    render(state.data);

    function render(data) {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) {
        contenedor.innerHTML = '<div style="padding:40px;color:#888">Crea un cuaderno para empezar.</div>';
        indicador.textContent = '';
        return;
      }

      // Plantilla
      var plantilla = nb.plantilla || 'rayada';
      if (selectPlant.value !== plantilla) selectPlant.value = plantilla;

      // Indicador (se actualizará dinámicamente con la hoja activa)
      actualizarIndicador(nb, null);

      // Si el cuaderno cambió, reconstruir todas las hojas
      if (contenedor.dataset.cuadernoId !== nb.id) {
        contenedor.dataset.cuadernoId = nb.id;
        contenedor.innerHTML = '';
        nb.hojas.forEach(function(hoja, i) {
          contenedor.appendChild(crearHojaEl(hoja, i, plantilla));
        });
        setTimeout(asegurarHojaActiva, 0);
        return;
      }

      // Si no, actualizar las hojas existentes (sin reemplazar el DOM de las que siguen igual)
      var idsActuales = Array.from(contenedor.querySelectorAll('.cd-hoja')).map(function(e) {
        return e.dataset.hojaId;
      });
      var idsNuevos = nb.hojas.map(function(h) { return h.id; });

      var cambió = idsActuales.length !== idsNuevos.length ||
                   idsActuales.some(function(id, i) { return id !== idsNuevos[i]; });

      if (cambió) {
        contenedor.innerHTML = '';
        nb.hojas.forEach(function(hoja, i) {
          contenedor.appendChild(crearHojaEl(hoja, i, plantilla));
        });
        // Marcar la primera como activa por defecto
        setTimeout(asegurarHojaActiva, 0);
      } else {
        // Actualizar contenido de cada hoja desde el state (por si el editor lo modificó)
        contenedor.querySelectorAll('.cd-hoja').forEach(function(elHoja) {
          actualizarClasePlantilla(elHoja, plantilla);

          var hojaId = elHoja.dataset.hojaId;
          var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
          if (!hoja) return;

          var textoEl = elHoja.querySelector('.cd-capa-texto');
          if (!textoEl) return;

          // Solo reemplazar si el contenido ha cambiado
          if (textoEl.innerHTML !== hoja.contenido) {
            textoEl.innerHTML = hoja.contenido || '';
          }
        });
      }
    }

    function crearHojaEl(hoja, indice, plantilla) {
      var div = document.createElement('div');
      div.className = 'cd-hoja';
      div.dataset.hojaId = hoja.id;
      div.dataset.hojaIndice = indice;
      actualizarClasePlantilla(div, plantilla);

      // Número de página
      var num = document.createElement('span');
      num.className = 'cd-numero-pagina';
      num.textContent = indice + 1;
      div.appendChild(num);

      // Capa de texto
      var texto = document.createElement('div');
      texto.className = 'cd-capa-texto';
      texto.setAttribute('contenteditable', 'true');
      texto.setAttribute('spellcheck', 'false');
      texto.dataset.hojaId = hoja.id;
      texto.innerHTML = hoja.contenido || '';
      div.appendChild(texto);

      // Capa de dibujo (canvas)
      var canvas = document.createElement('canvas');
      canvas.className = 'cd-capa-dibujo';
      canvas.dataset.hojaId = hoja.id;
      div.appendChild(canvas);

      // Redimensionar el canvas y redibujar los trazos guardados
      setTimeout(function() {
        ajustarCanvas(canvas, div);

        // Redibujar trazos existentes (si hay)
        if (hoja.trazos && hoja.trazos.length && root._cdRedibujarTrazos) {
          root._cdRedibujarTrazos(canvas, hoja.trazos);
        }
      }, 0);

      return div;
    }

    // Tamaño lógico de la hoja (debe coincidir con el CSS)
    var HOJA_ANCHO = 760;
    var HOJA_ALTO = 980;

    /**
     * Ajusta el canvas al tamaño lógico de la hoja, escalando por DPR.
     * Usa el tamaño lógico fijo (760x980) para no depender del timing del CSS.
     */
    function ajustarCanvas(canvas, hojaEl) {
      if (!canvas) return;

      var dpr = window.devicePixelRatio || 1;

      // Tamaño lógico (el del CSS, siempre 760x980)
      var anchoLogico = HOJA_ANCHO;
      var altoLogico = HOJA_ALTO;

      // Backing store en píxeles físicos
      canvas.width = Math.round(anchoLogico * dpr);
      canvas.height = Math.round(altoLogico * dpr);

      // Tamaño visual (el CSS lo confirma)
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      // Transform para dibujar en coordenadas lógicas
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Guardar referencias
      canvas._cdAncho = anchoLogico;
      canvas._cdAlto = altoLogico;
      canvas._cdDpr = dpr;
      canvas._cdCtx = ctx;
    }

    function actualizarClasePlantilla(el, plantilla) {
      el.className = 'cd-hoja cd-papel-' + plantilla;
    }

    // Scroll a la hoja anterior/siguiente según la que esté más visible
    function scrollRelativo(contenedor, direccion) {
      var hojas = Array.from(contenedor.querySelectorAll('.cd-hoja'));
      if (!hojas.length) return;

      var topCont = contenedor.scrollTop;
      var altCont = contenedor.clientHeight;
      var centro = topCont + altCont / 2;

      // Encontrar hoja actual (la que contiene el centro)
      var actual = hojas[0];
      for (var i = 0; i < hojas.length; i++) {
        var top = hojas[i].offsetTop;
        var alt = hojas[i].offsetHeight;
        if (centro >= top && centro < top + alt) {
          actual = hojas[i];
          break;
        }
      }

      var idx = hojas.indexOf(actual);
      var destinoIdx = idx + direccion;
      if (destinoIdx < 0) destinoIdx = 0;
      if (destinoIdx >= hojas.length) destinoIdx = hojas.length - 1;

      var destino = hojas[destinoIdx];
      contenedor.scrollTo({ top: destino.offsetTop - 20, behavior: 'smooth' });
    }

    // ─── Exportar a PDF con menú ───
    U.on(root.querySelector('[data-action="exportar-pdf"]'), 'click', function(e) {
      e.stopPropagation();
      abrirMenuExportar(e.currentTarget);
    });

    function abrirMenuExportar(boton) {
      // Si ya hay un menú abierto, cerrarlo
      cerrarMenuExportar();

      var menu = document.createElement('div');
      menu.className = 'cd-menu-exportar';
      menu.innerHTML = ''
        + '<button class="cd-menu-item" data-tipo="hoja">'
        +   '<span class="cd-menu-icono">📄</span>'
        +   '<div>'
        +     '<div class="cd-menu-titulo">Hoja actual</div>'
        +     '<div class="cd-menu-desc">Solo la hoja donde está el cursor</div>'
        +   '</div>'
        + '</button>'
        + '<button class="cd-menu-item" data-tipo="cuaderno">'
        +   '<span class="cd-menu-icono">📚</span>'
        +   '<div>'
        +     '<div class="cd-menu-titulo">Cuaderno entero</div>'
        +     '<div class="cd-menu-desc">Todas las hojas del cuaderno</div>'
        +   '</div>'
        + '</button>'
        + '<button class="cd-menu-item" data-tipo="seleccion">'
        +   '<span class="cd-menu-icono">☑️</span>'
        +   '<div>'
        +     '<div class="cd-menu-titulo">Seleccionar hojas…</div>'
        +     '<div class="cd-menu-desc">Elegir qué hojas exportar</div>'
        +   '</div>'
        + '</button>';

      // Posicionar debajo del botón
      var rect = boton.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.left = rect.left + 'px';
      menu.style.zIndex = '10000';

      document.body.appendChild(menu);

      // Listeners de cada opción
      menu.querySelectorAll('.cd-menu-item').forEach(function(item) {
        item.addEventListener('click', function(ev) {
          ev.stopPropagation();
          var tipo = item.dataset.tipo;
          cerrarMenuExportar();

          if (tipo === 'hoja') {
            exportarHojaActual();
          } else if (tipo === 'cuaderno') {
            exportarCuadernoEntero();
          } else if (tipo === 'seleccion') {
            abrirSelectorHojas();
          }
        });
      });

      // Cerrar al hacer clic fuera
      setTimeout(function() {
        document.addEventListener('click', cerrarMenuAlClickFuera);
      }, 10);
    }

    function cerrarMenuAlClickFuera(e) {
      var menu = document.querySelector('.cd-menu-exportar');
      if (!menu) return;
      if (menu.contains(e.target)) return;
      cerrarMenuExportar();
    }

    function cerrarMenuExportar() {
      var menu = document.querySelector('.cd-menu-exportar');
      if (menu) menu.remove();
      document.removeEventListener('click', cerrarMenuAlClickFuera);
    }

    // ─── Exportar: hoja actual ───
    function exportarHojaActual() {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return alert('Crea un cuaderno primero');

      // 1. Buscar la hoja activa (la que tiene la clase .cd-hoja-activa)
      var hojaActivaEl = contenedor.querySelector('.cd-hoja.cd-hoja-activa');
      var hojaActivaId = hojaActivaEl ? hojaActivaEl.dataset.hojaId : null;

      // 2. Si no hay, usar la que tiene el foco
      if (!hojaActivaId) {
        var activo = document.activeElement;
        if (activo && activo.classList && activo.classList.contains('cd-capa-texto')) {
          hojaActivaId = activo.dataset.hojaId;
        }
      }

      // 3. Si aún no hay, la más visible
      if (!hojaActivaId) {
        var idx = detectarHojaMasVisible(nb);
        hojaActivaId = nb.hojas[idx - 1] && nb.hojas[idx - 1].id;
      }

      // 4. Último fallback: la primera
      if (!hojaActivaId && nb.hojas.length) {
        hojaActivaId = nb.hojas[0].id;
      }

      var hoja = nb.hojas.find(function(h) { return h.id === hojaActivaId; });
      if (!hoja) return alert('No se encontró la hoja activa');

      // LIMPIAR marcas anteriores
      contenedor.querySelectorAll('.cd-hoja-exportar').forEach(function(h) {
        h.classList.remove('cd-hoja-exportar');
      });

      // Marcar solo la hoja activa
      var marcadas = 0;
      contenedor.querySelectorAll('.cd-hoja').forEach(function(h) {
        if (h.dataset.hojaId === hojaActivaId) {
          h.classList.add('cd-hoja-exportar');
          marcadas++;
        }
      });

      ejecutarImpresion(nb.nombre + ' — Hoja ' + (nb.hojas.indexOf(hoja) + 1), 'cd-export-hoja');
    }

    // ─── Exportar: cuaderno entero ───
    function exportarCuadernoEntero() {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return alert('Crea un cuaderno primero');
      ejecutarImpresion(nb.nombre + ' — Cuaderno', 'cd-export-cuaderno');
    }

    // ─── Exportar: selección (próxima iteración) ───
    function abrirSelectorHojas() {
      alert('Próximamente: podrás elegir qué hojas exportar.\n\nDe momento usa "Hoja actual" o "Cuaderno entero".');
    }

    // ─── Motor común de impresión: contenedor dedicado ───
    function ejecutarImpresion(titulo, claseModo) {

      var tituloOriginal = document.title;
      document.title = titulo;

      // NO limpiamos las marcas aquí: cada modo (hoja/cuaderno) las pone antes de llamar.

      // Qué hojas clonar
      var hojasOrigen;
      if (claseModo === 'cd-export-hoja') {
        hojasOrigen = contenedor.querySelectorAll('.cd-hoja.cd-hoja-exportar');
      } else {
        hojasOrigen = contenedor.querySelectorAll('.cd-hoja');
      }

      if (!hojasOrigen.length) {
        document.title = tituloOriginal;
        return;
      }

      // Crear contenedor de impresión dedicado
      var printRoot = document.createElement('div');
      printRoot.id = 'cd-print-root';

      // Clonar cada hoja
      hojasOrigen.forEach(function(hoja) {
        var clon = hoja.cloneNode(true);
        clon.classList.remove('cd-hoja-activa');
        clon.classList.remove('cd-hoja-exportar');
        clon.removeAttribute('contenteditable');

        // Quitar contenteditable de las capas de texto clonadas
        clon.querySelectorAll('[contenteditable]').forEach(function(c) {
          c.removeAttribute('contenteditable');
        });

        printRoot.appendChild(clon);
      });

      // Añadir al body
      document.body.appendChild(printRoot);
      document.body.classList.add('cd-print-mode');

      // Función de limpieza
      function limpiar() {
        var pr = document.getElementById('cd-print-root');
        if (pr) pr.remove();
        document.body.classList.remove('cd-print-mode');
        document.title = tituloOriginal;
        window.removeEventListener('afterprint', limpiar);
      }

      window.addEventListener('afterprint', limpiar);

      // Forzar reflow
      void document.body.offsetHeight;

      // Imprimir
      setTimeout(function() {
        window.print();
        // Fallback por si afterprint no dispara (Safari)
        setTimeout(limpiar, 2000);
      }, 100);
    }



    // Marca la primera hoja como activa si ninguna lo está
    function asegurarHojaActiva() {
      var hayActiva = contenedor.querySelector('.cd-hoja.cd-hoja-activa');
      if (hayActiva) return;
      var primera = contenedor.querySelector('.cd-hoja');
      if (primera) primera.classList.add('cd-hoja-activa');
    }

    // ─── Detección de hoja activa (para indicador + resaltado) ───
    var ultimaHojaActiva = null;

    function actualizarIndicador(nb, hojaActiva) {
      var total = nb.hojas.length;
      var indice = 1;
      if (hojaActiva) {
        var idx = nb.hojas.findIndex(function(h) { return h.id === hojaActiva; });
        if (idx !== -1) indice = idx + 1;
      } else {
        // Buscar la hoja más visible en el contenedor
        indice = detectarHojaMasVisible(nb);
      }
      indicador.textContent = 'Hoja ' + indice + ' / ' + total;
    }

    function detectarHojaMasVisible(nb) {
      var hojasEl = contenedor.querySelectorAll('.cd-hoja');
      if (!hojasEl.length) return 1;

      var topContenedor = contenedor.scrollTop;
      var centro = topContenedor + contenedor.clientHeight / 2;
      var mejorIdx = 0;
      var mejorDist = Infinity;

      hojasEl.forEach(function(h, i) {
        var top = h.offsetTop;
        var bottom = top + h.offsetHeight;
        var centroHoja = (top + bottom) / 2;
        var dist = Math.abs(centroHoja - centro);
        if (dist < mejorDist) {
          mejorDist = dist;
          mejorIdx = i;
        }
      });
      return mejorIdx + 1;
    }

    // Actualizar indicador al hacer scroll
    var scrollDebounced = U.debounce(function() {
      var nb = state.acciones.cuadernoActivo();
      if (nb) actualizarIndicador(nb, null);
    }, 100);

    U.on(contenedor, 'scroll', scrollDebounced);

    // Actualizar indicador y resaltar hoja al enfocar una capa de texto
    U.on(contenedor, 'focusin', function(e) {
      var target = e.target;
      if (!target.classList.contains('cd-capa-texto')) return;
      var hojaId = target.dataset.hojaId;
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return;

      actualizarIndicador(nb, hojaId);
      resaltarHoja(hojaId);
    });

    function resaltarHoja(hojaId) {
      contenedor.querySelectorAll('.cd-hoja').forEach(function(h) {
        h.classList.toggle('cd-hoja-activa', h.dataset.hojaId === hojaId);
      });
    }

    // Exponer utilidad para que editor pueda buscar hojas
    root._cdCrearHojaEl = crearHojaEl;
    root._cdActualizarPlantilla = actualizarClasePlantilla;

    return unsub;
  }

  return { init: init };
})();

console.log('✅ CuadernoPageView cargado (v2)');
