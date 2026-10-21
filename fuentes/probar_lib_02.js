// Comprueba que Demos/02_texto_como_dato_lib.js reproduce exactamente a Python/NLTK.
// Uso (desde la raíz): node Demos/fuentes/probar_lib_02.js
const fs = require("fs");
const path = require("path");
const L = require("../02_texto_como_dato_lib.js");
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_02.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version, tokenizadores: {}, stems: {} };
let ok = true;
for (const [clave, fn] of [["tokens", L.tokReglas], ["espacios", L.tokEspacios], ["regex_simple", L.tokRegexSimple]]) {
  res.tokenizadores[clave] = {};
  for (const [doc, toks] of Object.entries(ref[clave])) {
    const js = fn(fs.readFileSync(path.join(__dirname, "../../Clases/Clase03_Tema2_Tokenizacion/ejercicios/datos", doc + ".txt"), "utf8"));
    const iguales = js.length === toks.length && js.every((t, i) => t === toks[i]);
    let primera = null;
    if (!iguales) { const i = js.findIndex((t, k) => t !== toks[k]); primera = { i, js: js.slice(i, i + 5), py: toks.slice(i, i + 5) }; }
    res.tokenizadores[clave][doc] = { tokens_py: toks.length, tokens_js: js.length, iguales, primera_diferencia: primera };
    ok = ok && iguales;
  }
}
const fallos = [];
for (const [w, s] of Object.entries(ref.stems)) { const j = L.stemEs(w); if (j !== s) fallos.push([w, s, j]); }
res.stems = { comparados: Object.keys(ref.stems).length, diferencias: fallos.length, ejemplos: fallos.slice(0, 20) };
ok = ok && fallos.length === 0;

// Segmentación por reglas y flujo de normalización frente a Python, en los ejemplos de la demo
globalThis.window = globalThis.window || {};
require("../02_texto_como_dato_datos.js");
const D = globalThis.window.DATOS02;
const SW = new Set(D.stopwords_es);
const base = { minusculas: "todas", signos: true, numeros: false, vacias: true, stopwords: SW };
const casos = {
  "3 sin palabras vacías": { ...base, negacion: false, reducir: "no" },
  "3b vacías sin quitar negación": { ...base, negacion: true, reducir: "no" },
  "4a raíz (Snowball)": { ...base, negacion: false, reducir: "raiz" },
  "4b lema (spaCy)": { ...base, negacion: false, reducir: "lema" },
};
res.ejemplos_demo = {};
for (const ej of D.ejemplos) {
  const seg = L.unidades(ej.texto).flatMap(L.segReglas);
  const segOk = JSON.stringify(seg) === JSON.stringify(ej.oraciones.reglas_py);
  const toks = ej.spacy.map(([text, lemma, pos]) => ({ text, lemma, pos }));
  const pasos = {};
  for (const [paso, op] of Object.entries(casos)) {
    const js = L.normalizar(toks, op).filter(r => !r.quitado).map(r => r.out);
    pasos[paso] = JSON.stringify(js) === JSON.stringify(ej.python_pasos[paso]);
  }
  res.ejemplos_demo[ej.id] = { segmentacion_igual: segOk, normalizacion_igual: pasos };
  ok = ok && segOk && Object.values(pasos).every(Boolean);
}
res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_02.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
