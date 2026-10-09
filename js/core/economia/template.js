/* ============================================================
   ECONOMIA — Template HTML
   ============================================================ */

window.EconomiaTemplate = (function() {

  function html() {
    return ''
      + '<div class="eco-wrap">'

      // ============ HEADER ============
      +   '<header class="eco-header">'
      +     '<div class="eco-header-titulo">'
      +       '<h1>💶 Economía Familiar</h1>'
      +       '<div class="eco-mes">'
      +         '<button class="eco-mes-btn" id="ecoMesPrev" title="Mes anterior">‹</button>'
      +         '<span id="ecoMesActual">—</span>'
      +         '<button class="eco-mes-btn" id="ecoMesNext" title="Mes siguiente">›</button>'
      +       '</div>'
      +     '</div>'
      +     '<div class="eco-header-acciones">'
      +       '<button class="eco-btn eco-btn-ghost" id="ecoExportar" title="Exportar JSON"><i class="fas fa-download"></i></button>'
      +       '<button class="eco-btn eco-btn-ghost" id="ecoImportar" title="Importar JSON"><i class="fas fa-upload"></i></button>'
      +       '<button class="eco-btn eco-btn-ghost" id="ecoReset" title="Borrar todo"><i class="fas fa-trash"></i></button>'
      +     '</div>'
      +   '</header>'

      // ============ KPIs ============
      +   '<section class="eco-kpis">'
      +     '<div class="eco-kpi eco-kpi-ingreso">'
      +       '<span class="eco-kpi-label">Ingreso base</span>'
      +       '<span class="eco-kpi-valor" id="ecoKpiIngreso">—</span>'
      +       '<span class="eco-kpi-sub" id="ecoKpiIngresoSub">—</span>'
      +     '</div>'
      +     '<div class="eco-kpi eco-kpi-extra">'
      +       '<span class="eco-kpi-label">Extras del mes</span>'
      +       '<span class="eco-kpi-valor" id="ecoKpiExtra">—</span>'
      +       '<span class="eco-kpi-sub" id="ecoKpiExtraSub">—</span>'
      +     '</div>'
      +     '<div class="eco-kpi eco-kpi-gasto">'
      +       '<span class="eco-kpi-label">Gastos del mes</span>'
      +       '<span class="eco-kpi-valor" id="ecoKpiGasto">—</span>'
      +       '<span class="eco-kpi-sub" id="ecoKpiGastoSub">—</span>'
      +     '</div>'
      +     '<div class="eco-kpi eco-kpi-balance">'
      +       '<span class="eco-kpi-label">Balance</span>'
      +       '<span class="eco-kpi-valor" id="ecoKpiBalance">—</span>'
      +       '<span class="eco-kpi-sub" id="ecoKpiBalanceSub">—</span>'
      +     '</div>'
      +   '</section>'

      // ============ TABS ============
      +   '<nav class="eco-tabs">'
      +     '<button class="eco-tab eco-tab-activa" data-tab="resumen">Resumen</button>'
      +     '<button class="eco-tab" data-tab="ingresos">Ingresos</button>'
      +     '<button class="eco-tab" data-tab="gastos">Gastos</button>'
      +     '<button class="eco-tab" data-tab="objetivos">Objetivos</button>'
      +     '<button class="eco-tab" data-tab="presupuesto">Presupuesto</button>'
      +   '</nav>'

      // ============ PANELES ============
      +   '<section class="eco-paneles">'

      // ---- Panel: RESUMEN ----
      +     '<div class="eco-panel eco-panel-activo" data-panel="resumen">'
      +       '<div class="eco-resumen-grid">'
      +         '<div class="eco-card eco-card-donut">'
      +           '<h2>Gastos por categoría</h2>'
      +           '<div id="ecoDonut"></div>'
      +         '</div>'
      +         '<div class="eco-card eco-card-desglose">'
      +           '<h2>Desglose</h2>'
      +           '<div id="ecoDesglose"></div>'
      +         '</div>'
      +         '<div class="eco-card eco-card-sugerencias">'
      +           '<h2>💡 Sugerencias</h2>'
      +           '<div id="ecoSugerencias"></div>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      // ---- Panel: INGRESOS ----
      +     '<div class="eco-panel" data-panel="ingresos">'
      +       '<div class="eco-col">'
      +         '<div class="eco-card">'
      +           '<div class="eco-card-head">'
      +             '<h2>Ingresos fijos</h2>'
      +             '<button class="eco-btn eco-btn-primario" data-nuevo="ingreso-fijo"><i class="fas fa-plus"></i> Añadir</button>'
      +           '</div>'
      +           '<div id="ecoIngresosFijos"></div>'
      +         '</div>'
      +         '<div class="eco-card">'
      +           '<div class="eco-card-head">'
      +             '<h2>Ingresos extra</h2>'
      +             '<button class="eco-btn eco-btn-primario" data-nuevo="ingreso-extra"><i class="fas fa-plus"></i> Añadir</button>'
      +           '</div>'
      +           '<div id="ecoIngresosExtra"></div>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      // ---- Panel: GASTOS ----
      +     '<div class="eco-panel" data-panel="gastos">'
      +       '<div class="eco-col">'
      +         '<div class="eco-card">'
      +           '<div class="eco-card-head">'
      +             '<h2>Gastos fijos / recurrentes</h2>'
      +             '<button class="eco-btn eco-btn-primario" data-nuevo="gasto-fijo"><i class="fas fa-plus"></i> Añadir</button>'
      +           '</div>'
      +           '<div id="ecoGastosFijos"></div>'
      +         '</div>'
      +         '<div class="eco-card">'
      +           '<div class="eco-card-head">'
      +             '<h2>Gastos puntuales <span class="eco-mes-tag" id="ecoMesTagGastos"></span></h2>'
      +             '<button class="eco-btn eco-btn-primario" data-nuevo="gasto-puntual"><i class="fas fa-plus"></i> Añadir</button>'
      +           '</div>'
      +           '<div id="ecoGastosPuntuales"></div>'
      +         '</div>'
      +       '</div>'
      +     '</div>'

      // ---- Panel: OBJETIVOS ----
      +     '<div class="eco-panel" data-panel="objetivos">'
      +       '<div class="eco-card">'
      +         '<div class="eco-card-head">'
      +           '<h2>Objetivos de ahorro</h2>'
      +           '<button class="eco-btn eco-btn-primario" data-nuevo="objetivo"><i class="fas fa-plus"></i> Añadir</button>'
      +         '</div>'
      +         '<div id="ecoObjetivos"></div>'
      +       '</div>'
      +     '</div>'

      // ---- Panel: PRESUPUESTO ----
      +     '<div class="eco-panel" data-panel="presupuesto">'
      +       '<div class="eco-card">'
      +         '<h2>Regla 50 / 30 / 20</h2>'
      +         '<div id="ecoPresupuesto"></div>'
      +       '</div>'
      +     '</div>'

      +   '</section>'

      // ============ MODAL ============
      +   '<div class="eco-modal" id="ecoModal" hidden>'
      +     '<div class="eco-modal-backdrop" data-cerrar="1"></div>'
      +     '<div class="eco-modal-caja">'
      +       '<header class="eco-modal-head">'
      +         '<h3 id="ecoModalTitulo">—</h3>'
      +         '<button class="eco-modal-cerrar" data-cerrar="1"><i class="fas fa-times"></i></button>'
      +       '</header>'
      +       '<div class="eco-modal-body" id="ecoModalBody"></div>'
      +       '<footer class="eco-modal-foot">'
      +         '<button class="eco-btn eco-btn-ghost" data-cerrar="1">Cancelar</button>'
      +         '<button class="eco-btn eco-btn-primario" id="ecoModalGuardar">Guardar</button>'
      +       '</footer>'
      +     '</div>'
      +   '</div>'

      + '</div>';
  }

  return { html: html };
})();

console.log('✅ EconomiaTemplate cargado');
