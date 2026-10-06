/* ============================================================
   CUADERNO — Editor con corte automático entre hojas (v3)
   ============================================================ */

window.CuadernoEditor = (function() {

  var U = window.CuadernoUtils;

  var DEBOUNCE_GUARDAR = 400;
  var DEBOUNCE_CORTE = 250;

  function init(root, state) {
    var contenedor = U.el(root, 'contenedor-hojas');

    U.on(contenedor, 'input', function(e) {
      var target = e.target;
      if (!target.classList.contains('cd-capa-texto')) return;
      var hojaId = target.dataset.hojaId;
      guardarDebounced(hojaId, target);
      cortarDebounced(hojaId, target);
    });

    U.on(contenedor, 'paste', function(e) {
      var target = e.target;
      if (!target.classList.contains('cd-capa-texto')) return;
      e.preventDefault();
      var html = e.clipboardData ? e.clipboardData.getData('text/html') : '';
      var texto = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
      if (html) {
        var limpio = U.sanitizeHTML(html);
        document.execCommand('insertHTML', false, limpio);
      } else {
        document.execCommand('insertText', false, texto);
      }
      var hojaId = target.dataset.hojaId;
      guardarDebounced(hojaId, target);
      setTimeout(function() { comprobarYCortar(hojaId, target); }, 30);
    });

    var cascadaIteraciones = 0;

    var guardadoInvalidado = {};

    var guardarDebounced = U.debounce(function(hojaId, el) {
      if (guardadoInvalidado[hojaId]) return;
      state.acciones.actualizarContenido(hojaId, el.innerHTML);
    }, DEBOUNCE_GUARDAR);

    var cortarDebounced = U.debounce(function(hojaId, el) {
      comprobarYCortar(hojaId, el);
    }, DEBOUNCE_CORTE);

    function comprobarYCortar(hojaId, el) {
      try {
        cascadaIteraciones++;
        if (cascadaIteraciones > 50) {
          console.error('[corte] ⚠️ LÍMITE DE CASCADA (50). Abortando.');
          cascadaIteraciones = 0;
          return;
        }

        var elHoja = el.closest('.cd-hoja');
        if (!elHoja) return;

        // Altura útil = alto de la hoja menos el padding inferior de la capa
        var estilosTexto = window.getComputedStyle(el);
        var paddingInferior = parseFloat(estilosTexto.paddingBottom) || 0;
        var alturaHoja = elHoja.clientHeight - paddingInferior + 4;   // +4px margen para que no quede pegado

        // Medir con clon
        var medidor = document.createElement('div');
        var estilos = window.getComputedStyle(el);
        medidor.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;' +
          'width:' + el.clientWidth + 'px;' +
          'padding:' + estilos.padding + ';' +
          'font-family:' + estilos.fontFamily + ';' +
          'font-size:' + estilos.fontSize + ';' +
          'line-height:' + estilos.lineHeight + ';' +
          'font-weight:' + estilos.fontWeight + ';' +
          'white-space:pre-wrap;word-wrap:break-word;box-sizing:border-box;';
        medidor.innerHTML = el.innerHTML;
        document.body.appendChild(medidor);

        var alturaTexto = medidor.offsetHeight;
        document.body.removeChild(medidor);


        if (alturaTexto <= alturaHoja) {
          cascadaIteraciones = 0;
          return;
        }

        // Marcar esta hoja como "en corte" para que el guardado no la pise
        guardadoInvalidado[hojaId] = true;

        var corte = calcularCorte(el, alturaHoja);
        if (!corte) return;

        // ─── PASO 1: obtener o crear la siguiente hoja (SIN notificar) ───
        var siguiente = state.acciones.hojaSiguiente(hojaId);
        if (!siguiente) {
          siguiente = state.acciones.crearHojaAlFinalSinNotificar();
        }
        if (!siguiente) {
          return;
        }

        // ─── PASO 2: actualizar el contenido de esta hoja en el estado ───
        state.acciones.setContenido(hojaId, corte.cabe);

        // ─── PASO 3: prepend del sobrante a la siguiente (SIN notificar) ───
        state.acciones.prependContenidoSinNotificar(siguiente.id, corte.sobra);

        // ─── PASO 4: notificar UNA sola vez (re-render) ───
        state.notificar();

        // ─── PASO 5: cascada — comprobar la siguiente hoja ───
        setTimeout(function() {
          var sigEl = document.querySelector('[data-hoja-id="' + siguiente.id + '"] .cd-capa-texto');
          if (sigEl) {
            comprobarYCortar(siguiente.id, sigEl);
          } else {
          }
        }, 100);

      } catch (e) {
        console.error('[corte] ERROR:', e);
      }
    }

    function calcularCorte(el, alturaUtil) {

      var htmlOriginal = el.innerHTML;

      // Crear medidor fuera de la hoja
      var medidor = document.createElement('div');
      var estilos = window.getComputedStyle(el);
      medidor.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;' +
        'width:' + el.clientWidth + 'px;' +
        'padding:' + estilos.padding + ';' +
        'font-family:' + estilos.fontFamily + ';' +
        'font-size:' + estilos.fontSize + ';' +
        'line-height:' + estilos.lineHeight + ';' +
        'font-weight:' + estilos.fontWeight + ';' +
        'white-space:pre-wrap;word-wrap:break-word;box-sizing:border-box;';
      medidor.innerHTML = htmlOriginal;
      document.body.appendChild(medidor);

      // Recolectar nodos de texto
      var walker = document.createTreeWalker(medidor, NodeFilter.SHOW_TEXT, {
        acceptNode: function(n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodos = [];
      var n;
      while ((n = walker.nextNode())) nodos.push(n);

      if (!nodos.length) {
        document.body.removeChild(medidor);
        return null;
      }

      // Guardar originales
      var originales = nodos.map(function(nd) { return nd.nodeValue; });

      // Buscar el nodo de corte
      var rectMedidor = medidor.getBoundingClientRect();
      var nodoCorteIdx = -1;
      var palabraCorte = -1;

      for (var i = 0; i < nodos.length; i++) {
        var nodo = nodos[i];

        // Medir la posición REAL del último trozo del nodo con Range
        var rangeNodo = document.createRange();
        rangeNodo.selectNodeContents(nodo);
        var rectsNodo = rangeNodo.getClientRects();

        if (!rectsNodo.length) continue;

        var ultimaLinea = rectsNodo[rectsNodo.length - 1];
        var offsetNodo = ultimaLinea.bottom - rectMedidor.top;

        if (offsetNodo <= alturaUtil) {
          // Este nodo cabe entero
          continue;
        }

        // Este nodo se desborda → buscar la palabra exacta con Range
        var palabras = originales[i].split(/(\s+)/);
        var lo = 0, hi = palabras.length - 1, mejor = -1;

        while (lo <= hi) {
          var mid = Math.floor((lo + hi) / 2);
          nodo.nodeValue = palabras.slice(0, mid + 1).join('');

          var rng = document.createRange();
          rng.selectNodeContents(nodo);
          var rects = rng.getClientRects();
          var ultima = rects.length ? rects[rects.length - 1] : null;
          var offset = ultima ? (ultima.bottom - rectMedidor.top) : 0;

          if (offset <= alturaUtil) {
            mejor = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        // Si la búsqueda binaria no encontró nada, medir secuencialmente
        if (mejor === -1) {
          for (var k = 0; k < palabras.length; k++) {
            nodo.nodeValue = palabras.slice(0, k + 1).join('');
            var rng2 = document.createRange();
            rng2.selectNodeContents(nodo);
            var rects2 = rng2.getClientRects();
            var ultima2 = rects2.length ? rects2[rects2.length - 1] : null;
            var offset2 = ultima2 ? (ultima2.bottom - rectMedidor.top) : 0;

            if (offset2 <= alturaUtil) {
              mejor = k;
            } else {
              break;
            }
          }
        }

        nodo.nodeValue = originales[i];

        nodoCorteIdx = i;
        palabraCorte = mejor;
        break;
      }


      if (nodoCorteIdx === -1) {
        document.body.removeChild(medidor);
        return null;
      }

      // Reconstruir
      var nodoCortePadre = nodos[nodoCorteIdx].parentElement;
      var palabrasCorte = originales[nodoCorteIdx].split(/(\s+)/);

      // Si no se encontró palabra, mover el nodo ENTERO al sobra
      if (palabraCorte < 0) {
        // El nodo de corte va completo al sobra, y el cabe se queda con los nodos anteriores
        palabraCorte = -1;  // marca especial: mover entero
      }

      var parteCabe = palabrasCorte.slice(0, palabraCorte + 1).join('');
      var parteSobra = palabrasCorte.slice(palabraCorte + 1).join('');

      // Crear clones para cabe y sobra
      var divCabe = document.createElement('div');
      divCabe.innerHTML = htmlOriginal;
      var divSobra = document.createElement('div');
      divSobra.innerHTML = htmlOriginal;

      // Recolectar nodos en cada clon
      function recolectar(raiz) {
        var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
          acceptNode: function(nd) {
            if (!nd.nodeValue || !nd.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        var arr = [];
        var nn;
        while ((nn = w.nextNode())) arr.push(nn);
        return arr;
      }

      var nodosC = recolectar(divCabe);
      var nodosS = recolectar(divSobra);

      if (nodoCorteIdx >= nodosC.length || nodoCorteIdx >= nodosS.length) {
        document.body.removeChild(medidor);
        return null;
      }

      // CABE: cortar este nodo, vaciar los posteriores
      nodosC[nodoCorteIdx].nodeValue = parteCabe;
      for (var j = nodoCorteIdx + 1; j < nodosC.length; j++) {
        nodosC[j].nodeValue = '';
      }

      // SOBRA: vaciar anteriores, cortar este nodo
      for (var k = 0; k < nodoCorteIdx; k++) {
        nodosS[k].nodeValue = '';
      }
      nodosS[nodoCorteIdx].nodeValue = parteSobra;

      // Limpiar vacíos del sobra
      divSobra.querySelectorAll('p, div, li, h1, h2, h3, h4, blockquote').forEach(function(e) {
        if (!e.textContent.trim() && !e.querySelector('img, br, hr')) e.remove();
      });

      document.body.removeChild(medidor);


      return {
        cabe: divCabe.innerHTML,
        sobra: divSobra.innerHTML
      };
    }

    function colocarCursorAlFinalDe(el) {
      el.focus();
      var range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    return function() {};
  }

  return { init: init };
})();

console.log('✅ CuadernoEditor cargado (v3)');
