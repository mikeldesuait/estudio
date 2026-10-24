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
    return registros.filter((r) => (!desde || r.fecha >= desde)).filter((r) => (!hasta || r.fecha <= hasta)).filter((r) => (!med || (r.tomas && r.tomas.some(t => t.medicamento === med)))).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  }

  function renderTabla() {
    const tbody = $('#tbodyRegistros'); const lista = registrosFiltrados();
    if (lista.length === 0) { tbody.innerHTML = '<tr><td colspan="8" class="vacio">Sin registros todavía. Pulsa «+ Nuevo registro».</td></tr>'; return; }
    tbody.innerHTML = lista.map((r) => {
      const tomasHtml = (r.tomas || []).map(t => `<div><strong>${esc(t.medicamento)}</strong> (${esc(t.cantidad)} pastilla/s) a las ${esc(t.horaToma || '—')}</div>`).join('');
      return '<tr><td>' + esc(fmtFecha(r.fecha)) + '</td><td>' + esc(r.hora) + '</td><td>' + esc(r.tipoDolor) + '</td><td><span class="intensidad-badge">' + esc(r.intensidad) + '/10</span></td><td>' + tomasHtml + '</td><td>' + esc(r.sensacion || '—') + '</td><td>' + esc(r.notas || '—') + '</td><td class="no-print"><div class="acciones"><button data-accion="editar" data-id="' + r.id + '">Editar</button><button data-accion="borrar" data-id="' + r.id + '">Borrar</button></div></td></tr>';
    }).join('');
  }

  function renderResumen() {
    const lista = registrosFiltrados();
    let totalHemicraneal = 0; let totalDiazepam = 0;
    lista.forEach(r => {
      (r.tomas || []).forEach(t => {
        if (t.medicamento === 'Hemicraneal') totalHemicraneal += Number(t.cantidad) || 0;
        if (t.medicamento === 'Diazepam') totalDiazepam += Number(t.cantidad) || 0;
      });
    });
    const diasConDolor = new Set(lista.map(r => r.fecha)).size;
    const intensidadMedia = lista.length ? (lista.reduce((s, r) => s + (Number(r.intensidad) || 0), 0) / lista.length).toFixed(1) : '—';
    $('#resumen').innerHTML = '<strong>Resumen:</strong> ' + lista.length + ' día(s) registrado(s) · ' + diasConDolor + ' día(s) con dolor · Intensidad media: <strong>' + intensidadMedia + '/10</strong> · Hemicraneal: <strong>' + totalHemicraneal + '</strong> comprimidos · Diazepam: <strong>' + totalDiazepam + '</strong> comprimidos';
  }

  function renderTodo() { renderTabla(); renderResumen(); $('#headerDate').textContent = 'Hoy: ' + fmtFecha(hoyISO()); }

  function crearFilaToma(toma = {}) {
    const div = document.createElement('div');
    div.className = 'toma-row';
    div.innerHTML = `
      <select class="toma-medicamento">
        <option value="">— Ninguno —</option>
        <option value="Paracetamol">Paracetamol</option>
        <option value="Ibuprofeno">Ibuprofeno</option>
        <option value="Aspirina">Aspirina</option>
        <option value="Enantyum">Enantyum</option>
        <option value="Nolotil">Nolotil</option>
        <option value="Hemicraneal">Hemicraneal</option>
        <option value="Diazepam">Diazepam</option>
        <option value="Omeprazol">Omeprazol</option>
        <option value="Amoxicilina">Amoxicilina</option>
        <option value="Antigripal">Antigripal</option>
        <option value="Frenadol">Frenadol</option>
        <option value="Ilsapeptilo">Ilsapeptilo</option>
        <option value="Primperan">Primperan</option>
        <option value="Ventolin">Ventolin</option>
        <option value="Orfidal">Orfidal</option>
        <option value="Lorazepam">Lorazepam</option>
        <option value="Diclofenaco">Diclofenaco</option>
        <option value="Naproxeno">Naproxeno</option>
        <option value="Tranxilium">Tranxilium</option>
        <option value="Otro">Otro</option>
      </select>
      <input type="number" class="toma-cantidad" min="0" step="0.5" value="${toma.cantidad || 1}" placeholder="Cant.">
      <input type="time" class="toma-hora" value="${toma.horaToma || ahoraHHMM()}">
      <button type="button" class="btn-remove-toma" onclick="this.parentElement.remove()">✕</button>
    `;
    if (toma.medicamento) div.querySelector('.toma-medicamento').value = toma.medicamento;
    return div;
  }

  function abrirModal(reg) {
    $('#modalTitulo').textContent = reg ? 'Editar registro' : 'Nuevo registro';
    $('#regId').value = reg ? reg.id : ''; $('#regFecha').value = reg ? reg.fecha : hoyISO(); $('#regHora').value = reg ? reg.hora : ahoraHHMM();
    $('#regTipoDolor').value = reg ? reg.tipoDolor : ''; $('#regIntensidad').value = reg ? reg.intensidad : 5;
    $('#regSensacion').value = reg ? (reg.sensacion || '') : ''; $('#regNotas').value = reg ? (reg.notas || '') : '';
    
    const cont = $('#tomasContainer');
    cont.innerHTML = '';
    if (reg && reg.tomas && reg.tomas.length > 0) {
      reg.tomas.forEach(t => cont.appendChild(crearFilaToma(t)));
    } else {
      cont.appendChild(crearFilaToma());
    }
    $('#modalOverlay').style.display = 'flex';
  }

  function cerrarModal() { $('#modalOverlay').style.display = 'none'; $('#formRegistro').reset(); }

  function guardarRegistro(ev) {
    ev.preventDefault();
    const id = $('#regId').value;
    
    const tomas = [];
    document.querySelectorAll('#tomasContainer .toma-row').forEach(row => {
      const med = row.querySelector('.toma-medicamento').value;
      if (med) {
        tomas.push({
          medicamento: med,
          cantidad: Number(row.querySelector('.toma-cantidad').value) || 0,
          horaToma: row.querySelector('.toma-hora').value
        });
      }
    });

    const datos = { 
      id: id || uid(), 
      fecha: $('#regFecha').value, 
      hora: $('#regHora').value, 
      tipoDolor: $('#regTipoDolor').value, 
      intensidad: Number($('#regIntensidad').value), 
      tomas: tomas,
      sensacion: $('#regSensacion').value.trim(), 
      notas: $('#regNotas').value.trim(), 
      creado: new Date().toISOString() 
    };

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
    $('#btnAddToma').addEventListener('click', () => { $('#tomasContainer').appendChild(crearFilaToma()); });
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
