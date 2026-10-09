/* ============================================================
   ESTUDIO — Subrayado y resaltado para temas HTML
   Se inyecta automáticamente al cargar la página.
   Guarda las marcas en localStorage por URL del tema.
   ============================================================ */

(function() {
  'use strict';

  // ─── Configuración ───
  var STORAGE_PREFIX = 'estudio-subrayado:';
  var CLAVE_URL = window.location.pathname + window.location.search;

  // Colores disponibles
  var COLORES = {
    resaltar: [
      { nombre: 'Amarillo', valor: '#fef08a', emoji: '🟨' },
      { nombre: 'Verde',    valor: '#bbf7d0', emoji: '🟩' },
      { nombre: 'Rosa',     valor: '#fbcfe8', emoji: '🩷' }
    ],
    subrayar: [
      { nombre: 'Azul', valor: '#3b82f6', emoji: '🟦' },
      { nombre: 'Rojo', valor: '#ef4444', emoji: '🟥' }
    ]
  };

  // Excluir estas zonas (no se pueden marcar)
  var SELECTOR_EXCLUDE = 'script, style, .indice, .modo-btn, button, .estudio-subrayado-bar, #estudio-subrayado-bar, a[href^="#"]';

  // ─── Inyectar CSS ───
  function inyectarCSS() {
    var style = document.createElement('style');
    style.id = 'estudio-subrayado-css';
    style.textContent = `
/* ─── Barra de subrayado ─── */
#estudio-subrayado-bar {
  position: sticky;
  top: 0;
  z-index: 998;
  background: #f5ede0;
  border-bottom: 1px solid #d4c4a8;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  transition: background .2s, border-color .2s;
}

.dark-mode #estudio-subrayado-bar {
  background: #2f2b26;
  border-bottom-color: #3a352f;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}

#estudio-subrayado-bar .esb-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 5px 8px;
  transition: background .12s, border-color .12s, transform .1s;
  font-family: inherit;
}

#estudio-subrayado-bar .esb-btn:hover {
  background: rgba(139, 111, 71, 0.15);
  border-color: #d4c4a8;
  transform: translateY(-1px);
}

.dark-mode #estudio-subrayado-bar .esb-btn:hover {
  background: rgba(201, 168, 118, 0.2);
  border-color: #c9a876;
}

#estudio-subrayado-bar .esb-separador {
  width: 1px;
  height: 22px;
  background: #d4c4a8;
  margin: 0 4px;
}

.dark-mode #estudio-subrayado-bar .esb-separador {
  background: #3a352f;
}

#estudio-subrayado-bar .esb-label {
  color: #8b6f47;
  font-weight: 600;
  font-size: 12px;
  margin-right: 4px;
}

.dark-mode #estudio-subrayado-bar .esb-label {
  color: #c9a876;
}

#estudio-subrayado-bar .esb-aviso {
  color: #8b6f47;
  font-size: 12px;
  font-style: italic;
  opacity: 0;
  transition: opacity .25s;
  margin-left: auto;
}

.dark-mode #estudio-subrayado-bar .esb-aviso {
  color: #c9a876;
}

#estudio-subrayado-bar .esb-aviso.visible {
  opacity: 1;
}

/* ─── Marcas en el texto ─── */
.estudio-marca {
  border-radius: 3px;
  transition: background .15s;
  cursor: pointer;
}

.estudio-marca[data-tipo="resaltar"] {
  background-color: var(--esb-color, #fef08a);
  padding: 1px 2px;
  margin: 0 -2px;
}

.estudio-marca[data-tipo="subrayar"] {
  border-bottom: 3px solid var(--esb-color, #3b82f6);
  padding-bottom: 1px;
}

.dark-mode .estudio-marca[data-tipo="resaltar"] {
  /* Un poco más transparente en modo oscuro */
  filter: brightness(0.85);
}

/* ─── Menú contextual ─── */
#estudio-marca-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #d4c4a8;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  padding: 4px;
  z-index: 10000;
  display: none;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
  min-width: 140px;
}

.dark-mode #estudio-marca-menu {
  background: #2f2b26;
  border-color: #3a352f;
  color: #e8dfd0;
}

#estudio-marca-menu.visible {
  display: block;
}

#estudio-marca-menu button {
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  padding: 8px 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  color: inherit;
  border-radius: 5px;
}

#estudio-marca-menu button:hover {
  background: rgba(139, 111, 71, 0.15);
}

.dark-mode #estudio-marca-menu button:hover {
  background: rgba(201, 168, 118, 0.2);
}
    `;
    document.head.appendChild(style);
  }

  // ─── Crear la barra ───
  function crearBarra() {
    var bar = document.createElement('div');
    bar.id = 'estudio-subrayado-bar';

    // Botón de cada color
    ['resaltar', 'subrayar'].forEach(function(tipo, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className = 'esb-separador';
        bar.appendChild(sep);
      }

      COLORES[tipo].forEach(function(color) {
        var btn = document.createElement('button');
        btn.className = 'esb-btn';
        btn.dataset.tipo = tipo;
        btn.dataset.color = color.valor;
        btn.title = color.nombre + ' (' + tipo + ')';
        btn.textContent = color.emoji;
        btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
        btn.addEventListener('click', function() {
          aplicarMarca(tipo, color.valor);
        });
        bar.appendChild(btn);
      });
    });

    // Separador + limpiar
    var sep2 = document.createElement('span');
    sep2.className = 'esb-separador';
    bar.appendChild(sep2);

    var btnLimpiar = document.createElement('button');
    btnLimpiar.className = 'esb-btn';
    btnLimpiar.title = 'Quitar marca del texto seleccionado';
    btnLimpiar.textContent = '🧽';
    btnLimpiar.addEventListener('mousedown', function(e) { e.preventDefault(); });
    btnLimpiar.addEventListener('click', function() {
      quitarMarcaDeSeleccion();
    });
    bar.appendChild(btnLimpiar);

    // Separador + utilidades
    var sep3 = document.createElement('span');
    sep3.className = 'esb-separador';
    bar.appendChild(sep3);

    var btnExportar = document.createElement('button');
    btnExportar.className = 'esb-btn';
    btnExportar.title = 'Exportar marcas';
    btnExportar.textContent = '📤';
    btnExportar.addEventListener('click', exportarMarcas);
    bar.appendChild(btnExportar);

    var btnImportar = document.createElement('button');
    btnImportar.className = 'esb-btn';
    btnImportar.title = 'Importar marcas';
    btnImportar.textContent = '📥';
    btnImportar.addEventListener('click', importarMarcas);
    bar.appendChild(btnImportar);

    var btnBorrar = document.createElement('button');
    btnBorrar.className = 'esb-btn';
    btnBorrar.title = 'Borrar TODAS las marcas de este tema';
    btnBorrar.textContent = '🗑️';
    btnBorrar.addEventListener('click', borrarTodas);
    bar.appendChild(btnBorrar);

    // Aviso
    var aviso = document.createElement('span');
    aviso.className = 'esb-aviso';
    aviso.id = 'esb-aviso';
    bar.appendChild(aviso);

    // Insertar al principio del body
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ─── Mostrar aviso ───
  function aviso(texto) {
    var el = document.getElementById('esb-aviso');
    if (!el) return;
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(function() {
      el.classList.remove('visible');
    }, 2000);
  }

  // ─── Aplicar marca al texto seleccionado ───
  function aplicarMarca(tipo, color) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      aviso('👆 Selecciona texto primero');
      return;
    }

    var range = sel.getRangeAt(0);
    var texto = range.toString();
    if (!texto.trim()) {
      aviso('Selección vacía');
      return;
    }

    // Comprobar que la selección no está en una zona excluida
    if (estaEnZonaExcluida(range.startContainer)) {
      aviso('No se puede marcar esta zona');
      return;
    }

    // Guardar info para poder restaurar
    var infoMarca = {
      texto: texto,
      tipo: tipo,
      color: color,
      // Identificador del contenedor padre más cercano
      contextoSiguiente: (range.endContainer.textContent || '').slice(0, 40),
      contextoAnterior: (range.startContainer.textContent || '').slice(-40)
    };

    // Envolver la selección con un span
    try {
      envolverSeleccion(range, tipo, color);
    } catch (e) {
      console.error('Error al marcar:', e);
      aviso('Error al marcar');
      return;
    }

    // Guardar en localStorage
    guardarMarca(infoMarca);
    sel.removeAllRanges();
    aviso('✅ Marca guardada');
  }

  // ─── Envolver la selección en un span con la marca ───
  function envolverSeleccion(range, tipo, color) {
    var span = document.createElement('span');
    span.className = 'estudio-marca';
    span.dataset.tipo = tipo;
    span.style.setProperty('--esb-color', color);

    try {
      range.surroundContents(span);
    } catch (e) {
      // Si la selección cruza varios elementos, surroundContents falla.
      // En ese caso, extraemos el contenido y lo envolvemos.
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
  }

  // ─── ¿Está el nodo en una zona excluida? ───
  function estaEnZonaExcluida(nodo) {
    var el = nodo.nodeType === 3 ? nodo.parentElement : nodo;
    if (!el) return true;
    return !!el.closest(SELECTOR_EXCLUDE);
  }

  // ─── Obtener/guardar marcas en localStorage ───
  function obtenerMarcas() {
    try {
      var raw = localStorage.getItem(STORAGE_PREFIX + CLAVE_URL);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function guardarMarcas(marcas) {
    try {
      localStorage.setItem(STORAGE_PREFIX + CLAVE_URL, JSON.stringify(marcas));
    } catch (e) {
      console.error('Error al guardar marcas:', e);
    }
  }

  function guardarMarca(infoMarca) {
    var marcas = obtenerMarcas();
    marcas.push(infoMarca);
    guardarMarcas(marcas);
  }

  // ─── Quitar marca del texto seleccionado ───
  function quitarMarcaDeSeleccion() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      aviso('👆 Selecciona texto marcado');
      return;
    }

    var range = sel.getRangeAt(0);
    var span = range.startContainer.parentElement ?
      range.startContainer.parentElement.closest('.estudio-marca') : null;

    if (!span) {
      aviso('No hay marca aquí');
      return;
    }

    // Desenvolver el span (dejar solo el texto)
    var padre = span.parentNode;
    while (span.firstChild) padre.insertBefore(span.firstChild, span);
    padre.removeChild(span);
    padre.normalize();

    // Actualizar localStorage: quitamos las marcas que ya no existen
    sincronizarMarcasConDOM();
    aviso('🧽 Marca quitada');
  }

  // ─── Sincronizar localStorage con el DOM actual ───
  function sincronizarMarcasConDOM() {
    // Estrategia simple: recorrer el DOM y reconstruir la lista de marcas
    var marcas = [];
    document.querySelectorAll('.estudio-marca').forEach(function(span) {
      marcas.push({
        texto: span.textContent,
        tipo: span.dataset.tipo,
        color: span.style.getPropertyValue('--esb-color') || '',
        contextoSiguiente: (span.nextSibling && span.nextSibling.textContent || '').slice(0, 40),
        contextoAnterior: (span.previousSibling && span.previousSibling.textContent || '').slice(-40)
      });
    });
    guardarMarcas(marcas);
  }

  // ─── Restaurar marcas al cargar la página ───
  function restaurarMarcas() {
    var marcas = obtenerMarcas();
    if (!marcas.length) return;

    marcas.forEach(function(marca) {
      try {
        aplicarMarcaRestaurada(marca);
      } catch (e) {
        console.warn('No se pudo restaurar marca:', marca.texto, e);
      }
    });
  }

  function aplicarMarcaRestaurada(marca) {
    // Estrategia: buscar en el texto de los párrafos el fragmento guardado
    // y envolverlo con un span de marca.
    var texto = marca.texto;
    if (!texto) return;

    // Buscar todos los nodos de texto del body
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Excluir zonas
          if (estaEnZonaExcluida(node)) return NodeFilter.FILTER_REJECT;
          // Excluir el propio texto de la barra
          var p = node.parentElement;
          if (p && p.closest('#estudio-subrayado-bar')) return NodeFilter.FILTER_REJECT;
          // Excluir texto ya marcado (para no marcar dos veces)
          if (p && p.classList.contains('estudio-marca')) return NodeFilter.FILTER_REJECT;
          // Excluir nodos vacíos
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var node;
    while ((node = walker.nextNode())) {
      var idx = node.nodeValue.indexOf(texto);
      if (idx === -1) continue;

      // Encontrado
      var range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + texto.length);

      var span = document.createElement('span');
      span.className = 'estudio-marca';
      span.dataset.tipo = marca.tipo;
      span.style.setProperty('--esb-color', marca.color);

      try {
        range.surroundContents(span);
      } catch (e) {
        // Fallback
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      return;
    }
  }

  // ─── Exportar marcas a JSON ───
  function exportarMarcas() {
    var marcas = obtenerMarcas();
    var data = {
      url: CLAVE_URL,
      fecha: new Date().toISOString(),
      marcas: marcas
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'marcas-' + (CLAVE_URL.split('/').pop() || 'tema') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    aviso('📤 Marcas exportadas');
  }

  // ─── Importar marcas desde JSON ───
  function importarMarcas() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (data && Array.isArray(data.marcas)) {
            guardarMarcas(data.marcas);
            restaurarMarcas();
            aviso('📥 Marcas importadas');
          }
        } catch (err) {
          aviso('❌ Error al importar');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ─── Borrar todas las marcas de este tema ───
  function borrarTodas() {
    if (!confirm('¿Borrar TODAS las marcas de este tema?')) return;

    document.querySelectorAll('.estudio-marca').forEach(function(span) {
      var padre = span.parentNode;
      while (span.firstChild) padre.insertBefore(span.firstChild, span);
      padre.removeChild(span);
      padre.normalize();
    });

    localStorage.removeItem(STORAGE_PREFIX + CLAVE_URL);
    aviso('🗑️ Todas las marcas borradas');
  }

  // ─── Menú contextual al hacer clic derecho sobre una marca ───
  function crearMenuContextual() {
    var menu = document.createElement('div');
    menu.id = 'estudio-marca-menu';
    menu.innerHTML = `
      <button data-accion="quitar">🧽 Quitar marca</button>
      <button data-accion="cambiar-resaltar">🟨 Convertir a resaltado</button>
      <button data-accion="cambiar-subrayar">🟦 Convertir a subrayado</button>
    `;
    document.body.appendChild(menu);

    menu.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var accion = btn.dataset.accion;
      var span = menu._span;
      if (!span) return;

      if (accion === 'quitar') {
        var padre = span.parentNode;
        while (span.firstChild) padre.insertBefore(span.firstChild, span);
        padre.removeChild(span);
        padre.normalize();
        sincronizarMarcasConDOM();
        aviso('🧽 Marca quitada');
      } else if (accion === 'cambiar-resaltar') {
        span.dataset.tipo = 'resaltar';
        span.style.setProperty('--esb-color', '#fef08a');
        sincronizarMarcasConDOM();
      } else if (accion === 'cambiar-subrayar') {
        span.dataset.tipo = 'subrayar';
        span.style.setProperty('--esb-color', '#3b82f6');
        sincronizarMarcasConDOM();
      }

      menu.classList.remove('visible');
    });

    // Detectar clic derecho
    document.addEventListener('contextmenu', function(e) {
      var marca = e.target.closest('.estudio-marca');
      if (!marca) {
        menu.classList.remove('visible');
        return;
      }
      e.preventDefault();
      menu._span = marca;
      menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 150) + 'px';
      menu.classList.add('visible');
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', function(e) {
      if (!menu.contains(e.target)) {
        menu.classList.remove('visible');
      }
    });
  }

  // ─── Arranque ───
  function init() {
    inyectarCSS();
    crearBarra();
    crearMenuContextual();

    // Restaurar marcas después de un pequeño delay
    // (por si el body no está del todo listo)
    setTimeout(restaurarMarcas, 100);

    console.log('✅ Estudio Subrayado cargado |', CLAVE_URL);
  }

  // Arrancar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
