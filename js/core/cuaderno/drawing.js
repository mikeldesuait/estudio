/* ============================================================
   CUADERNO — Dibujo en canvas (lápiz, resaltador, borrador)
   ============================================================ */

window.CuadernoDrawing = (function() {

  var U = window.CuadernoUtils;

  // Configuración base por herramienta (los colores/grosores vienen del state)
  var CONFIG = {
    lapiz: {
      multiplicar: false,
      alpha: 1
    },
    resaltador: {
      multiplicar: true,
      alpha: 0.4
    },
    borrador: {
      multiplicar: false,
      alpha: 1,
      grosor: 20       // radio de detección (fijo)
    }
  };

  // Obtener config completa de una herramienta (con state)
  function getConfig(state, tool) {
    var base = CONFIG[tool] || CONFIG.lapiz;
    if (tool === 'borrador') return base;

    var ui = state.data.ui || {};
    var prefs = ui[tool] || {};
    return {
      multiplicar: base.multiplicar,
      alpha: base.alpha,
      color: prefs.color || (tool === 'lapiz' ? '#1f2937' : '#fde047'),
      grosor: prefs.grosor || (tool === 'lapiz' ? 2 : 14)
    };
  }

  function init(root, state) {
    var contenedor = root.querySelector('[data-el="contenedor-hojas"]');
    if (!contenedor) return;

    // ─── Estado de dibujo ───
    var dibujando = false;
    var trazoActual = null;    // { hojaId, tool, color, grosor, puntos: [[x,y], ...] }
    var canvasActual = null;

    // ─── Pila de undo/redo por hoja ───
    // { hojaId: { undo: [estados], redo: [estados] } }
    var pilas = {};

    function getPila(hojaId) {
      if (!pilas[hojaId]) pilas[hojaId] = { undo: [], redo: [] };
      return pilas[hojaId];
    }

    function snapshotTrazos(hojaId) {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return null;
      var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
      if (!hoja) return null;
      return JSON.stringify(hoja.trazos || []);
    }

    function apilarUndo(hojaId) {
      var snap = snapshotTrazos(hojaId);
      if (!snap) return;
      var pila = getPila(hojaId);
      pila.undo.push(snap);
      pila.redo = [];   // al hacer una acción nueva, se borra el redo
      // Limitar a 50 acciones
      if (pila.undo.length > 50) pila.undo.shift();
    }

    // ─── Delegación de eventos ───
    U.on(contenedor, 'pointerdown', function(e) {
      var canvas = e.target.closest('.cd-capa-dibujo');
      if (!canvas) return;

      var herr = state.data.ui.herramienta;
      if (herr === 'texto') return;

      e.preventDefault();
      canvasActual = canvas;

      // Marcar la hoja como activa
      var hojaEl = canvas.closest('.cd-hoja');
      if (hojaEl) {
        contenedor.querySelectorAll('.cd-hoja').forEach(function(h) {
          h.classList.toggle('cd-hoja-activa', h === hojaEl);
        });
      }

      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (canvas._cdAncho / rect.width);
      var y = (e.clientY - rect.top) * (canvas._cdAlto / rect.height);

      // ─── Borrador: elimina trazos enteros ───
      if (herr === 'borrador') {
        dibujando = true;    // para que pointermove siga borrando
        borrarTrazosCercaDe(canvas.dataset.hojaId, x, y, 20);
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // ─── Lápiz / resaltador: nuevo trazo ───
      var config = getConfig(state, herr);

      trazoActual = {
        hojaId: canvas.dataset.hojaId,
        tool: herr,
        color: config.color,
        grosor: config.grosor,
        puntos: [[x, y]]
      };

      dibujando = true;
      canvas.setPointerCapture(e.pointerId);
    });

    U.on(contenedor, 'pointermove', function(e) {
      if (!dibujando) return;
      var canvas = canvasActual;
      if (!canvas) return;

      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) * (canvas._cdAncho / rect.width);
      var y = (e.clientY - rect.top) * (canvas._cdAlto / rect.height);

      // ─── Borrador: borrar trazos por donde pasa ───
      var herr = state.data.ui.herramienta;
      if (herr === 'borrador') {
        borrarTrazosCercaDe(canvas.dataset.hojaId, x, y, 20);
        return;
      }

      // ─── Lápiz / resaltador ───
      if (!trazoActual) return;

      // Interpolar si el movimiento es muy grande (para que no queden huecos)
      var ultimo = trazoActual.puntos[trazoActual.puntos.length - 1];
      var dx = x - ultimo[0];
      var dy = y - ultimo[1];
      var dist = Math.sqrt(dx*dx + dy*dy);
      var pasos = Math.max(1, Math.floor(dist / 3));

      for (var i = 1; i <= pasos; i++) {
        var px = ultimo[0] + (dx * i / pasos);
        var py = ultimo[1] + (dy * i / pasos);
        trazoActual.puntos.push([px, py]);
      }

      // Redibujar solo el tramo nuevo (rápido)
      dibujarUltimoTramo(canvas, trazoActual);
    });

    U.on(contenedor, 'pointerup', function(e) {
      if (!dibujando) return;
      dibujando = false;

      // Si era borrador, no guardamos trazo
      if (!trazoActual) {
        canvasActual = null;
        return;
      }

      if (trazoActual.puntos.length > 1) {
        // Guardar trazo en el state
        var nb = state.acciones.cuadernoActivo();
        if (nb) {
          var hoja = nb.hojas.find(function(h) { return h.id === trazoActual.hojaId; });
          if (hoja) {
            // Apilar estado ANTES de modificar
            apilarUndo(trazoActual.hojaId);

            if (!hoja.trazos) hoja.trazos = [];
            hoja.trazos.push({
              tool: trazoActual.tool,
              color: trazoActual.color,
              grosor: trazoActual.grosor,
              puntos: trazoActual.puntos
            });
            state.persistir();
          }
        }
      }

      trazoActual = null;
      canvasActual = null;
    });

    U.on(contenedor, 'pointercancel', function(e) {
      dibujando = false;
      trazoActual = null;
      canvasActual = null;
    });

    // ─── Borrador ───

    /**
     * Elimina los trazos cuya distancia a (x,y) sea menor que el radio.
     */
    function borrarTrazosCercaDe(hojaId, x, y, radio) {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return;
      var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
      if (!hoja || !hoja.trazos || !hoja.trazos.length) return;

      var r2 = radio * radio;   // radio fijo del borrador

      // Filtrar los trazos que tocan el punto
      var nuevos = hoja.trazos.filter(function(trazo) {
        for (var i = 0; i < trazo.puntos.length; i++) {
          var p = trazo.puntos[i];
          var dx = p[0] - x;
          var dy = p[1] - y;
          if (dx*dx + dy*dy <= r2) return false;   // toca → eliminar
        }
        return true;   // no toca → conservar
      });

      if (nuevos.length !== hoja.trazos.length) {
        // Apilar estado ANTES de aplicar el cambio
        apilarUndo(hojaId);

        hoja.trazos = nuevos;
        state.persistir();

        var canvas = contenedor.querySelector('[data-hoja-id="' + hojaId + '"] .cd-capa-dibujo');
        if (canvas) {
          root._cdRedibujarTrazos(canvas, hoja.trazos);
        }
      }
    }

    // ─── Funciones de dibujo ───

    function dibujarUltimoTramo(canvas, trazo) {
      var ctx = canvas._cdCtx;
      if (!ctx) {
        ctx = canvas.getContext('2d');
        canvas._cdCtx = ctx;
      }

      var config = trazo.tool === 'resaltador' ? CONFIG.resaltador : CONFIG.lapiz;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = trazo.color;
      ctx.lineWidth = trazo.grosor;
      ctx.globalAlpha = config.alpha;
      ctx.globalCompositeOperation = config.multiplicar ? 'multiply' : 'source-over';

      var puntos = trazo.puntos;
      var n = puntos.length;
      if (n < 2) { ctx.restore(); return; }

      // Dibujar solo los últimos 2 puntos
      var p1 = puntos[n - 2];
      var p2 = puntos[n - 1];

      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();

      ctx.restore();
    }

    // Al inicializar, redibujar los trazos de todas las hojas ya creadas
    // (por si pageView se inicializó antes que drawing)
    setTimeout(function() {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return;
      contenedor.querySelectorAll('.cd-hoja').forEach(function(hojaEl) {
        var hojaId = hojaEl.dataset.hojaId;
        var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
        if (!hoja || !hoja.trazos || !hoja.trazos.length) return;

        var canvas = hojaEl.querySelector('.cd-capa-dibujo');
        if (!canvas) return;

        root._cdRedibujarTrazos(canvas, hoja.trazos);
      });
    }, 100);

    // ─── Deshacer / Rehacer ───

    function deshacer(hojaId) {
      var pila = getPila(hojaId);
      if (!pila.undo.length) return false;

      var actual = snapshotTrazos(hojaId);
      var anterior = pila.undo.pop();
      pila.redo.push(actual);

      aplicarSnapshot(hojaId, anterior);
      return true;
    }

    function rehacer(hojaId) {
      var pila = getPila(hojaId);
      if (!pila.redo.length) return false;

      var actual = snapshotTrazos(hojaId);
      var siguiente = pila.redo.pop();
      pila.undo.push(actual);

      aplicarSnapshot(hojaId, siguiente);
      return true;
    }

    function aplicarSnapshot(hojaId, json) {
      var nb = state.acciones.cuadernoActivo();
      if (!nb) return;
      var hoja = nb.hojas.find(function(h) { return h.id === hojaId; });
      if (!hoja) return;

      hoja.trazos = JSON.parse(json);
      state.persistir();

      var canvas = contenedor.querySelector('[data-hoja-id="' + hojaId + '"] .cd-capa-dibujo');
      if (canvas) {
        root._cdRedibujarTrazos(canvas, hoja.trazos);
      }
    }

    // Obtener la hoja activa (con fallbacks)
    function getHojaActivaId() {
      // 1. Intento normal: la hoja con clase activa
      var activa = contenedor.querySelector('.cd-hoja.cd-hoja-activa');
      if (activa) return activa.dataset.hojaId;

      // 2. Fallback: la que tiene el foco
      var activo = document.activeElement;
      if (activo && activo.dataset && activo.dataset.hojaId) {
        return activo.dataset.hojaId;
      }

      // 3. Fallback: la hoja más visible
      var hojas = contenedor.querySelectorAll('.cd-hoja');
      if (!hojas.length) return null;

      var topCont = contenedor.scrollTop;
      var centro = topCont + contenedor.clientHeight / 2;
      var mejor = hojas[0];
      var mejorDist = Infinity;

      hojas.forEach(function(h) {
        var top = h.offsetTop;
        var bottom = top + h.offsetHeight;
        var centroHoja = (top + bottom) / 2;
        var dist = Math.abs(centroHoja - centro);
        if (dist < mejorDist) {
          mejorDist = dist;
          mejor = h;
        }
      });

      return mejor.dataset.hojaId;
    }

    // Exponer al exterior (para atajos y toolbar)
    root._cdDeshacerDibujo = function() {
      var hojaId = getHojaActivaId();
      if (!hojaId) {
        console.log('❌ No se encontró hoja activa');
        return false;
      }
      var ok = deshacer(hojaId);
      console.log(ok ? '↶ Deshecho en ' + hojaId : 'Nada que deshacer en ' + hojaId);
      return ok;
    };

    root._cdRehacerDibujo = function() {
      var hojaId = getHojaActivaId();
      if (!hojaId) {
        console.log('❌ No se encontró hoja activa');
        return false;
      }
      var ok = rehacer(hojaId);
      console.log(ok ? '↷ Rehecho en ' + hojaId : 'Nada que rehacer en ' + hojaId);
      return ok;
    };

    // Exponer redibujado completo (para cuando se recargue la hoja)
    root._cdRedibujarTrazos = function(canvas, trazos) {
      var ctx = canvas.getContext('2d');
      canvas._cdCtx = ctx;
      ctx.clearRect(0, 0, canvas._cdAncho, canvas._cdAlto);

      (trazos || []).forEach(function(trazo) {
        var config = trazo.tool === 'resaltador' ? CONFIG.resaltador : CONFIG.lapiz;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = trazo.color;
        ctx.lineWidth = trazo.grosor;
        ctx.globalAlpha = config.alpha;
        ctx.globalCompositeOperation = config.multiplicar ? 'multiply' : 'source-over';

        ctx.beginPath();
        trazo.puntos.forEach(function(p, i) {
          if (i === 0) ctx.moveTo(p[0], p[1]);
          else ctx.lineTo(p[0], p[1]);
        });
        ctx.stroke();
        ctx.restore();
      });
    };

    return function() {
      // Cleanup si hace falta
    };
  }

  return { init: init };
})();

console.log('✅ CuadernoDrawing cargado');
