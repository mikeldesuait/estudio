/* ============================================================
   CUADERNO — Plantilla HTML (v2, hojas apiladas)
   ============================================================ */

window.CuadernoTemplate = (function() {

  function render() {
    return ''
      + '<div class="cd-sidebar">'
      +   '<div class="cd-sidebar-header">'
      +     '<h2>📓 Cuadernos</h2>'
      +     '<button class="cd-btn-nuevo" data-action="nuevo-cuaderno" title="Nuevo cuaderno">+</button>'
      +   '</div>'
      +   '<ul class="cd-lista-cuadernos" data-el="lista-cuadernos"></ul>'
      +   '<div class="cd-sidebar-footer">💾 Guardado automático</div>'
      + '</div>'

      + '<div class="cd-main">'

      +   '<div class="cd-toolbar">'

      +     '<div class="cd-grupo">'
      +       '<button class="cd-btn-sidebar" data-action="toggle-sidebar" title="Mostrar/ocultar lista de cuadernos">☰</button>'
      +     '</div>'

      +     '<div class="cd-grupo">'
      +       '<button class="cd-btn-herr" data-herr="texto" title="Escribir">✍️</button>'
      +       '<button class="cd-btn-herr" data-herr="lapiz" title="Lápiz">✏️</button>'
      +       '<button class="cd-btn-herr" data-herr="resaltador" title="Resaltador">🖍️</button>'
      +       '<button class="cd-btn-herr" data-herr="borrador" title="Borrador">🧽</button>'
      +     '</div>'

      +     '<div class="cd-grupo cd-grupo-dibujo" data-el="grupo-dibujo" style="display:none;">'
      +       '<button class="cd-btn-dibujo" data-action="color-dibujo" title="Color de dibujo">'
      +         '<span class="cd-swatch" data-el="swatch-color"></span>'
      +         '<span class="cd-flecha">▾</span>'
      +       '</button>'
      +       '<button class="cd-btn-dibujo" data-action="grosor-dibujo" title="Grosor">'
      +         '<span class="cd-preview-grosor" data-el="preview-grosor"></span>'
      +         '<span class="cd-flecha">▾</span>'
      +       '</button>'
      +     '</div>'

      +     '<div class="cd-grupo cd-grupo-formato">'
      +       '<button class="cd-btn-fmt" data-cmd="bold" title="Negrita"><b>B</b></button>'
      +       '<button class="cd-btn-fmt" data-cmd="italic" title="Cursiva"><i>I</i></button>'
      +       '<button class="cd-btn-fmt" data-cmd="underline" title="Subrayado"><u>U</u></button>'
      +       '<button class="cd-btn-color" data-action="paleta-texto" title="Color de texto">'
      +         '<span class="cd-icono-color" style="color:#1f2937">A</span>'
      +         '<span class="cd-flecha">▾</span>'
      +       '</button>'
      +       '<button class="cd-btn-color" data-action="paleta-resaltado" title="Color de resaltado">'
      +         '<span class="cd-icono-resaltado"></span>'
      +         '<span class="cd-flecha">▾</span>'
      +       '</button>'
      +       '<button class="cd-btn-fmt" data-action="undo" title="Deshacer">↶</button>'
      +       '<button class="cd-btn-fmt" data-action="redo" title="Rehacer">↷</button>'
      +     '</div>'

      +     '<div class="cd-grupo">'
      +       '<select class="cd-select-plantilla" data-el="select-plantilla" title="Plantilla de hoja">'
      +         '<option value="rayada">Rayada</option>'
      +         '<option value="cuadriculada">Cuadriculada</option>'
      +         '<option value="lisa">Lisa</option>'
      +       '</select>'
      +       '<button class="cd-btn" data-action="exportar-pdf" title="Exportar a PDF">📄 PDF</button>'
      +     '</div>'

      +     '<div class="cd-grupo">'
      +       '<span class="cd-indicador-hoja" data-el="indicador-hoja"></span>'
      +       '<button class="cd-btn" data-action="ir-primera" title="Primera hoja">⏮</button>'
      +       '<button class="cd-btn" data-action="hoja-prev" title="Hoja anterior">◀</button>'
      +       '<button class="cd-btn" data-action="hoja-next" title="Hoja siguiente">▶</button>'
      +       '<button class="cd-btn" data-action="ir-ultima" title="Última hoja">⏭</button>'
      +       '<button class="cd-btn" data-action="hoja-nueva" title="Nueva hoja al final">+ Hoja</button>'
      +     '</div>'

      +   '</div>'

      +   '<div class="cd-contenedor-hojas" data-el="contenedor-hojas"></div>'

      + '</div>';
  }

  return { render: render };
})();

console.log('✅ CuadernoTemplate cargado (v2)');
