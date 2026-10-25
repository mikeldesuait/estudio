/* ============================================================
   ECONOMIA — Template HTML (Vista de Mando)
   ============================================================ */

window.EconomiaTemplate = (function() {
  function html() {
    return ''
      + '<div class="eco-wrap">'
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

      +   '<nav class="eco-tabs" style="border-bottom: 2px solid var(--border); margin-bottom: 20px;">'
      +     '<button class="eco-tab eco-tab-activa" data-tab="real" style="font-size:16px;padding:12px 24px;">💶 Economía Real (Día a día)</button>'
      +     '<button class="eco-tab" data-tab="prevision" style="font-size:16px;padding:12px 24px;">📊 Previsión y Presupuesto</button>'
      +   '</nav>'

      +   '<section class="eco-paneles">'

      // ================= REAL =================
      +     '<div class="eco-panel eco-panel-activo" data-panel="real">'
      
      // 1. SALDO REAL (Manual)
      +       '<div class="eco-card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;border-left:4px solid #10b981;">'
      +         '<div>'
      +           '<h2 style="margin:0 0 4px 0;font-size:16px;color:var(--text-2);">🏦 Saldo Real en Cuentas</h2>'
      +           '<div style="font-size:12px;color:var(--text-2);">Tu dinero real en el banco + ingresos cobrados - gastos pagados.</div>'
      +         '</div>'
      +         '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">'
      +           '<div style="display:flex;align-items:center;gap:16px;">'
      +             '<div id="ecoSaldoDisplay" style="font-size:32px;font-weight:800;color:var(--text-1);">0,00 €</div>'
      +             '<button class="eco-btn eco-btn-primario" data-nuevo="movimiento" style="padding:8px 12px;font-size:14px;border-radius:8px;"><i class="fas fa-bolt"></i> Añadir Registro</button>'
      +           '</div>'
      +           '<div style="font-size:12px;color:var(--text-2); display:flex; align-items:center; gap:4px;" title="Introduce el dinero que tenías en la cuenta al comenzar este ciclo (día 20).">Saldo al inicio: <input type="number" step="0.01" id="ecoSaldoBase" style="width:80px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;font-family:inherit;font-size:12px;text-align:right;"> €</div>'
      +         '</div>'
      +       '</div>'
      
      // 2. TARJETAS DE PREVISIÓN DESPLEGABLES
      +       '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 16px;">'
      
      +         '<details class="eco-card" style="border-left:4px solid #ef4444; margin:0; padding:14px;">'
      +           '<summary style="cursor:pointer; list-style:none; outline:none;">'
      +             '<h2 style="margin:0 0 4px 0; font-size:13px; color:#ef4444;">📌 Gastos del ciclo</h2>'
      +             '<div id="ecoRealGastosPend" style="font-size:22px; font-weight:800; color:#ef4444;">0,00 € <span style="font-size:12px;font-weight:400;color:var(--text-2);">pendientes</span></div>'
      +             '<div id="ecoRealGastosTotalCiclo" style="font-size:11px; color:var(--text-2); opacity:0.7; margin-top:2px;"></div>'
      +           '</summary>'
      +           '<div id="ecoRealGastosLista" style="margin-top:12px; border-top:1px solid var(--border); padding-top:8px;"></div>'
      +         '</details>'

      +         '<details class="eco-card" style="border-left:4px solid #10b981; margin:0; padding:14px;">'
      +           '<summary style="cursor:pointer; list-style:none; outline:none;">'
      +             '<h2 style="margin:0 0 4px 0; font-size:13px; color:#10b981;">📥 Ingresos del ciclo</h2>'
      +             '<div id="ecoRealIngresosPend" style="font-size:22px; font-weight:800; color:#10b981;">0,00 € <span style="font-size:12px;font-weight:400;color:var(--text-2);">pendientes</span></div>'
      +             '<div id="ecoRealIngresosTotalCiclo" style="font-size:11px; color:var(--text-2); opacity:0.7; margin-top:2px;"></div>'
      +           '</summary>'
      +           '<div id="ecoRealIngresosLista" style="margin-top:12px; border-top:1px solid var(--border); padding-top:8px;"></div>'
      +         '</details>'

      +         '<div class="eco-card" style="border-left:4px solid #3b82f6; margin:0; padding:14px; display:flex; flex-direction:column; justify-content:center;">'
      +           '<h2 style="margin:0 0 4px 0; font-size:13px; color:#3b82f6;">🧾 Previsión Final</h2>'
      +           '<div id="ecoRealPrevision" style="font-size:22px; font-weight:800; color:#3b82f6;">0,00 €</div>'
      +           '<div style="font-size:11px; color:var(--text-2); margin-top:4px;">Saldo + Ingresos - Gastos</div>'
      +         '</div>'
      +       '</div>'

      // 3. HISTORIAL DE MOVIMIENTOS REALES
      +       '<div class="eco-card">'
      +         '<div class="eco-card-head">'
      +           '<h2>🧾 Movimientos validados (Historial)</h2>'
      +         '</div>'
      +         '<div id="ecoRealLista"></div>'
      +       '</div>'
      +     '</div>'

      // ================= PREVISIÓN =================
      +     '<div class="eco-panel" data-panel="prevision">'
      +       '<section class="eco-kpis" style="margin-bottom:20px;">'
      +         '<div class="eco-kpi eco-kpi-ingreso"><span class="eco-kpi-label">Ingreso base</span><span class="eco-kpi-valor" id="ecoKpiIngreso">—</span><span class="eco-kpi-sub" id="ecoKpiIngresoSub">—</span></div>'
      +         '<div class="eco-kpi eco-kpi-gasto"><span class="eco-kpi-label">Gastos fijos</span><span class="eco-kpi-valor" id="ecoKpiGasto">—</span><span class="eco-kpi-sub" id="ecoKpiGastoSub">—</span></div>'
      +         '<div class="eco-kpi eco-kpi-balance"><span class="eco-kpi-label">Balance previsto</span><span class="eco-kpi-valor" id="ecoKpiBalance">—</span><span class="eco-kpi-sub" id="ecoKpiBalanceSub">—</span></div>'
      +       '</section>'
      +       '<div class="eco-tabs" style="margin-bottom:16px;" id="ecoSubTabsPrev">'
      +         '<button class="eco-tab eco-tab-activa" data-tab="prev-ingresos">Ingresos Fijos</button>'
      +         '<button class="eco-tab" data-tab="prev-gastos">Gastos Fijos</button>'
      +         '<button class="eco-tab" data-tab="prev-objetivos">Objetivos</button>'
      +         '<button class="eco-tab" data-tab="prev-presupuesto">Presupuesto 50/30/20</button>'
      +       '</div>'
      +     '</div>'

      // ================= PANELES DE PREVISIÓN =================
      +     '<div class="eco-panel" data-panel="prev-ingresos">'
      +       '<div class="eco-card"><div class="eco-card-head"><h2>Ingresos fijos</h2><button class="eco-btn eco-btn-primario" data-nuevo="ingreso-fijo"><i class="fas fa-plus"></i> Añadir</button></div><div id="ecoIngresosFijos"></div></div>'
      +     '</div>'
      +     '<div class="eco-panel" data-panel="prev-gastos">'
      +       '<div class="eco-card"><div class="eco-card-head"><h2>Gastos fijos / recurrentes</h2><button class="eco-btn eco-btn-primario" data-nuevo="gasto-fijo"><i class="fas fa-plus"></i> Añadir</button></div><div id="ecoGastosFijos"></div></div>'
      +     '</div>'
      +     '<div class="eco-panel" data-panel="prev-objetivos">'
      +       '<div class="eco-card"><div class="eco-card-head"><h2>Objetivos de ahorro</h2><button class="eco-btn eco-btn-primario" data-nuevo="objetivo"><i class="fas fa-plus"></i> Añadir</button></div><div id="ecoObjetivos"></div></div>'
      +     '</div>'
      +     '<div class="eco-panel" data-panel="prev-presupuesto">'
      +       '<div class="eco-card"><div id="ecoPresupuesto"></div></div>'
      +     '</div>'

      +   '</section>'

      // ---- MODAL ----
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
      +   '<div style="text-align:right; font-size:11px; color:var(--text-2); opacity:0.5; margin-top:20px; padding-right:10px;">v.1.2</div>'
      + '</div>';
  }
  return { html: html };
})();
console.log('✅ EconomiaTemplate cargado');
