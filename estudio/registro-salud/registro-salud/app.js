(function () {
  'use strict';
  const STORAGE_KEY = 'salud:registro-enfermedades:v1';
  let registros = [];
  const $ = (sel) => document.querySelector(sel);
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const ahoraHHMM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const fmtFecha = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return d + '/' + m + '/' + y; };
  const uid = () => 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function cargar() {
    try { const raw = localStorage.getItem(STORAGE_KEY); registros = raw ? JSON.parse(raw) : []; if (!Array.isArray(registros)) registros = []; } catch (e) { registros = []; }
  }
  function guardar() { localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); }

  function registrosFiltrados() {
    const desde = $('#filtroDesde').value; const hasta = $('#filtroHasta').value; const med = $('#filtroMedicamento').value;
    return registros.filter((r) => (!desde || r.fecha >= desde)).filter((r) => (!hasta || r.fecha <= hasta)).filter((r) => (!med || r.medicamento === med)).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  }

  function renderTabla() {
    const tbody = $('#tbodyRegistros'); const lista = registrosFiltrados();
    if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="vacio">Sin registros todavía. Pulsa «+ Nuevo registro».</td></tr>'; return; }
    tbody.innerHTML = lista.map((r) => '<tr><td>' + esc(fmtFecha(r.fecha)) + '</td><td>' + esc(r.hora) + '</td><td>' + esc(r.tipoDolor) + '</td><td><span class="intensidad-badge">' + esc(r.intensidad) + '/10</span></td><td>' + esc(r.medicamento || '—') + '</td><td>' + esc(r.cantidad || 0) + '</td><td>' + esc(r.horaToma || '—') + '</td><td>' + esc(r.sensacion || '—') + '</td><td>' + esc(r.notas || '—') + '</td><td class="no-print"><div class="acciones"><button data-accion="editar" data-id="' + r.id + '">Editar</button><button data-accion="borrar" data-id="' + r.id + '">Borrar</button></div></td></tr>').join('');
  }

  function renderResumen() {
    const lista = registrosFiltrados();
    const totalHemicraneal = lista.filter(r => r.medicamento === 'Hemicraneal').reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
    const totalDiazepam = lista.filter(r => r.medicamento === 'Diazepam').reduce((s, r) => s + (Number(r.cantidad) || 0), 0);
    const diasConDolor = new Set(lista.map(r => r.fecha)).size;
    const intensidadMedia = lista.length ? (lista.reduce((s, r) => s + (Number(r.intensidad) || 0), 0) / lista.length).toFixed(1) : '—';
    $('#resumen').innerHTML = '<strong>Resumen:</strong> ' + lista.length + ' registro(s) · ' + diasConDolor + ' día(s) con dolor · Intensidad media: <strong>' + intensidadMedia + '/10</strong> · Hemicraneal: <strong>' + totalHemicraneal + '</strong> comprimidos · Diazepam: <strong>' + totalDiazepam + '</strong> comprimidos';
  }

  function renderTodo() { renderTabla(); renderResumen(); $('#headerDate').textContent = 'Hoy: ' + fmtFecha(hoyISO()); }

  function abrirModal(reg) {
    $('#modalTitulo').textContent = reg ? 'Editar registro' : 'Nuevo registro';
    $('#regId').value = reg ? reg.id : ''; $('#regFecha').value = reg ? reg.fecha : hoyISO(); $('#regHora').value = reg ? reg.hora : ahoraHHMM();
    $('#regTipoDolor').value = reg ? reg.tipoDolor : ''; $('#regIntensidad').value = reg ? reg.intensidad : 5;
    $('#regMedicamento').value = reg ? (reg.medicamento || '') : ''; $('#regCantidad').value = reg ? (reg.cantidad || 0) : 0;
    $('#regHoraToma').value = reg ? (reg.horaToma || '') : ''; $('#regSensacion').value = reg ? (reg.sensacion || '') : '';
    $('#regNotas').value = reg ? (reg.notas || '') : ''; $('#modalOverlay').style.display = 'flex';
  }

  function cerrarModal() { $('#modalOverlay').style.display = 'none'; $('#formRegistro').reset(); }

  function guardarRegistro(ev) {
    ev.preventDefault();
    const id = $('#regId').value;
    const datos = { id: id || uid(), fecha: $('#regFecha').value, hora: $('#regHora').value, tipoDolor: $('#regTipoDolor').value, intensidad: Number($('#regIntensidad').value), medicamento: $('#regMedicamento').value, cantidad: Number($('#regCantidad').value) || 0, horaToma: $('#regHoraToma').value, sensacion: $('#regSensacion').value.trim(), notas: $('#regNotas').value.trim(), creado: new Date().toISOString() };
    if (id) { const i = registros.findIndex(r => r.id === id); if (i >= 0) registros[i] = datos; } else { registros.push(datos); }
    guardar(); cerrarModal(); renderTodo();
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'registro-enfermedades-' + hoyISO() + '.json'; a.click(); URL.revokeObjectURL(a.href);
  }

  function importar() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
      reader.onload = () => { try { const data = JSON.parse(reader.result); if (!Array.isArray(data)) throw new Error('Formato inválido'); registros = data; guardar(); renderTodo(); alert('Importados ' + data.length + ' registros.'); } catch (err) { alert('Error importando: ' + err.message); } };
      reader.readAsText(file); };
    input.click();
  }

  function bind() {
    $('#btnRegistrar').addEventListener('click', () => abrirModal(null)); $('#btnCancelar').addEventListener('click', cerrarModal);
    $('#formRegistro').addEventListener('submit', guardarRegistro); $('#btnImprimir').addEventListener('click', () => window.print());
    $('#btnExport').addEventListener('click', exportar); $('#btnImport').addEventListener('click', importar);
    $('#btnLimpiarFiltros').addEventListener('click', () => { $('#filtroDesde').value = ''; $('#filtroHasta').value = ''; $('#filtroMedicamento').value = ''; renderTodo(); });
    ['#filtroDesde', '#filtroHasta', '#filtroMedicamento'].forEach(sel => { $(sel).addEventListener('change', renderTodo); });
    $('#tbodyRegistros').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-accion]'); if (!btn) return; const id = btn.dataset.id;
      if (btn.dataset.accion === 'borrar') { if (confirm('¿Borrar este registro?')) { registros = registros.filter(r => r.id !== id); guardar(); renderTodo(); } }
      else if (btn.dataset.accion === 'editar') { const reg = registros.find(r => r.id === id); if (reg) abrirModal(reg); }
    });
    $('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') cerrarModal(); });
  }

  document.addEventListener('DOMContentLoaded', () => { cargar(); bind(); renderTodo(); });
})();
