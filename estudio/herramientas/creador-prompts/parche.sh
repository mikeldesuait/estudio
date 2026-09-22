#!/bin/bash
set -e
ARCHIVO="asignatura.html"
BACKUP="asignatura.backup.$(date +%Y%m%d_%H%M%S).html"
cp "$ARCHIVO" "$BACKUP"
echo "📦 Backup: $BACKUP"

python3 << 'PYEOF'
with open("asignatura.html", "r", encoding="utf-8") as f:
    c = f.read()

func_aux = '''function epigrafeTieneSubs(num) {
    var tiene = false;
    estado.esqueleto.forEach(function(t) {
        if (t.num === num && t.subs && t.subs.length > 0) tiene = true;
        (t.subs || []).forEach(function(s) {
            if (s.num === num && s.subs && s.subs.length > 0) tiene = true;
        });
    });
    return tiene;
}

'''

if 'function epigrafeTieneSubs' not in c:
    c = c.replace('async function generarContenidoEpigrafe(num, titulo) {',
                  func_aux + 'async function generarContenidoEpigrafe(num, titulo) {')
    print("  ✅ epigrafeTieneSubs añadida")

viejo_gen = '''async function generarContenidoEpigrafe(num, titulo) {
    var contexto = estado.contextoConEsqueleto || estado.contextoFijo || construirContextoFijo();
    var mensajes = contexto.concat([{ role: 'user', content: getOrdenContenido(estado.modalidad, num, titulo) }]);
    var res = await llamarDeepSeek(mensajes);
    return res.contenido;
}'''

nuevo_gen = '''async function generarContenidoEpigrafe(num, titulo) {
    var contexto = estado.contextoConEsqueleto || estado.contextoFijo || construirContextoFijo();
    var tieneSubs = epigrafeTieneSubs(num);
    var mensajes = contexto.concat([{ role: 'user', content: getOrdenContenido(estado.modalidad, num, titulo, tieneSubs) }]);
    var res = await llamarDeepSeek(mensajes);
    return res.contenido;
}'''

if viejo_gen in c:
    c = c.replace(viejo_gen, nuevo_gen)
    print("  ✅ generarContenidoEpigrafe actualizada")

viejo_firma = 'function getOrdenContenido(modalidad, numEpigrafe, tituloEpigrafe) {'
nueva_firma = 'function getOrdenContenido(modalidad, numEpigrafe, tituloEpigrafe, tieneSubs) {'
if viejo_firma in c:
    c = c.replace(viejo_firma, nueva_firma)
    print("  ✅ firma actualizada")

marca = "'- Longitud: la justa para que el epígrafe quede entendido. Ni telegrama ni tostón.';"
bloque = """'- Longitud: la justa para que el epígrafe quede entendido. Ni telegrama ni tostón.';

    if (tieneSubs) {
        reglasComunes += '\\n' +
'- INSTRUCCIÓN ESPECIAL: este epígrafe tiene SUBEPÍGRAFES. ' +
'NO desarrolles el contenido de cada subepígrafe: eso se hará por separado. ' +
'Tu trabajo aquí es SOLO hacer un encuadre general del conjunto: de qué trata, qué partes cubre y cómo se relacionan. ' +
'El bloque 📖 CONTENIDO debe ser BREVE (3-6 frases). ' +
'PROHIBIDO repetir información que se desarrollará en los subepígrafes.';
    }"""

if "INSTRUCCIÓN ESPECIAL: este epígrafe tiene SUBEPÍGRAFES" not in c:
    if marca in c:
        c = c.replace(marca, bloque, 1)
        print("  ✅ instrucción especial añadida")

with open("asignatura.html", "w", encoding="utf-8") as f:
    f.write(c)
print("💾 Guardado")
PYEOF

echo ""
echo "🔍 Verificación:"
grep -n "function epigrafeTieneSubs" asignatura.html
grep -n "function getOrdenContenido" asignatura.html
grep -n "var tieneSubs = epigrafeTieneSubs" asignatura.html
grep -n "INSTRUCCIÓN ESPECIAL" asignatura.html
