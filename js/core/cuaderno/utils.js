/* ============================================================
   CUADERNO — Utilidades base
   ============================================================ */

window.CuadernoUtils = (function() {

  function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function el(root, name) {
    return root ? root.querySelector('[data-el="' + name + '"]') : null;
  }

  function on(target, event, handler, opts) {
    if (!target) return function() {};
    target.addEventListener(event, handler, opts);
    return function() { target.removeEventListener(event, handler, opts); };
  }

  function debounce(fn, delay) {
    var t = null;
    return function() {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function() { fn.apply(ctx, args); }, delay);
    };
  }

  function sanitizeHTML(html) {
    if (!html) return '';
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var allowed = {
      P:1, BR:1, B:1, I:1, U:1, STRONG:1, EM:1, UL:1, OL:1, LI:1,
      H1:1, H2:1, H3:1, H4:1, SPAN:1, DIV:1, A:1, CODE:1, PRE:1, BLOCKQUOTE:1
    };
    var todos = doc.body.querySelectorAll('*');
    for (var i = todos.length - 1; i >= 0; i--) {
      var nodo = todos[i];
      if (!allowed[nodo.tagName]) {
        while (nodo.firstChild) nodo.parentNode.insertBefore(nodo.firstChild, nodo);
        nodo.remove();
      } else {
        var attrs = Array.from(nodo.attributes);
        attrs.forEach(function(a) {
          if (nodo.tagName === 'A' && a.name === 'href') return;
          nodo.removeAttribute(a.name);
        });
      }
    }
    return doc.body.innerHTML;
  }

  function escapar(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var COLORES = ['#ef233c', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  function colorAleatorio() {
    return COLORES[Math.floor(Math.random() * COLORES.length)];
  }

  return {
    uid: uid,
    el: el,
    on: on,
    debounce: debounce,
    sanitizeHTML: sanitizeHTML,
    escapar: escapar,
    colorAleatorio: colorAleatorio,
    COLORES: COLORES
  };
})();

console.log('✅ CuadernoUtils cargado');
