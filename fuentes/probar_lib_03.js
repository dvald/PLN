// Comprueba que Demos/03_extraccion_informacion_lib.js reproduce a Python (analisis_t3.py).
// Uso (desde la raíz): node Demos/fuentes/probar_lib_03.js
const fs = require("fs");
const path = require("path");
const L = require("../03_extraccion_informacion_lib.js");
globalThis.window = globalThis.window || {};
require("../03_extraccion_informacion_datos.js");
const D = globalThis.window.DATOS03;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_03.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version, ejemplos: {} };
let ok = true;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const e of D.ejemplos) {
  const pos = e.tokens.map(t => t.pos);
  const txt = s => e.tokens.slice(s[0], s[1]).map(t => t.t).join(" ");
  const ing = L.chunkear(pos, D.regla_ingles), esp = L.chunkear(pos, D.regla_espanol);
  const r = {
    chunks_ingles: eq(ing.spans.map(txt), e.py_chunks.ingles),
    chunks_espanol: eq(esp.spans.map(txt), e.py_chunks.espanol),
    iob_espanol: eq(esp.iob, e.py_chunks.iob_espanol),
    relaciones: eq(L.relaciones(e.tokens, e.ents, D.patrones), e.py_relaciones),
    clinicas: eq(L.entidadesClinicas(e.texto, D.glosario, D.negadores).map(x => [x.texto, x.tipo, x.negado]), e.py_clinicas),
  };
  res.ejemplos[e.id] = r;
  ok = ok && Object.values(r).every(Boolean);
}
const fallos = [];
for (const [w, tag] of Object.entries(ref.regexp_tagger)) {
  const j = L.etiquetaReglas(w, D.reglas_es);
  if (j !== tag) fallos.push([w, tag, j]);
}
res.etiquetador_reglas = { comparadas: Object.keys(ref.regexp_tagger).length, diferencias: fallos.length, ejemplos: fallos.slice(0, 10) };
ok = ok && fallos.length === 0;
res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_03.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
