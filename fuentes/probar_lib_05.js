// Comprueba que Demos/05_modelado_neuronal_lib.js reproduce a Python (analisis_embeddings.py, gensim
// compute_ngrams, analisis_bert.atencion con numpy) y que la simulación del enmascarado da las
// proporciones de BERT. Uso (desde la raíz): node Demos/fuentes/probar_lib_05.js
const fs = require("fs");
const path = require("path");
const L = require("../05_modelado_neuronal_lib.js");
globalThis.window = globalThis.window || {};
require("../05_modelado_neuronal_datos.js");
const D = globalThis.window.DATOS05;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_05.json"), "utf8"));
const TOL = 1e-9;
const cerca = (a, b) => (a === null || b === null) ? a === b : Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
const igualM = (A, B, f = cerca) => A.length === B.length && A.every((fa, i) => fa.length === B[i].length && fa.every((x, j) => f(x, B[i][j])));
const res = { fecha: new Date().toISOString(), node: process.version, tolerancia_relativa: TOL };
let ok = true;

// n-gramas de caracteres frente a gensim
const fNg = ref.ngramas.filter((c) => JSON.stringify(L.ngramas(c.palabra, c.min, c.max)) !== JSON.stringify(c.ngramas))
  .map((c) => `${c.palabra} ${c.min}-${c.max}`);
// «rocín»: los 14 n-gramas de la diapositiva de FastText (Clase 7), según gensim
const rocin = JSON.stringify(L.ngramas("rocín")) === JSON.stringify(ref.ngramas.find((c) => c.palabra === "rocín" && c.min === 3 && c.max === 6).ngramas);
const comp = L.compartidos("dulsinea", "dulcinea");
const compOk = JSON.stringify(comp) === JSON.stringify(D.fasttext_oov.compartidos_dulsinea_dulcinea);
res.ngramas = { casos: ref.ngramas.length, fallos: fNg, rocin_igual: rocin, compartidos_dulsinea_dulcinea: compOk };
ok = ok && fNg.length === 0 && rocin && compOk;

// tokens y pares de skip-gram
const fSg = ref.skipgram.filter((c) => JSON.stringify(L.tokens(c.frase)) !== JSON.stringify(c.tokens) ||
  JSON.stringify(L.paresSkipgram(c.tokens, c.ventana)) !== JSON.stringify(c.pares)).map((c) => `${c.frase} v=${c.ventana}`);
res.skipgram = { casos: ref.skipgram.length, fallos: fSg };
ok = ok && fSg.length === 0;

// atención frente a numpy
const fAt = [];
for (const c of ref.atencion) {
  const r = L.atencion(c.Q, c.K, c.V, c.escalar, c.causal);
  const pt = r.puntuaciones.map((f) => f.map((x) => (x === -Infinity ? null : x)));
  if (!(igualM(pt, c.puntuaciones) && igualM(r.pesos, c.pesos) && igualM(r.salida, c.salida))) {
    fAt.push(`${c.Q.length}x${c.Q[0].length} escalar=${c.escalar} causal=${c.causal}`);
  }
  if (!r.pesos.every((f) => cerca(f.reduce((a, b) => a + b, 0), 1))) fAt.push("filas que no suman 1");
}
res.atencion = { casos: ref.atencion.length, fallos: fAt };
ok = ok && fAt.length === 0;

// lectura de matrices escritas a mano
const mats = { "0.5 0.3\n0.2 0.7": [[0.5, 0.3], [0.2, 0.7]], "0,5 0,3; 0,2 0,7": [[0.5, 0.3], [0.2, 0.7]],
               "0.5,0.3\n0.2,0.7": [[0.5, 0.3], [0.2, 0.7]], "1 2\n3": null, "a b": null };
const fMat = Object.entries(mats).filter(([t, m]) => JSON.stringify(L.leerMatriz(t)) !== JSON.stringify(m)).map(([t]) => t);
res.leer_matriz = { casos: Object.keys(mats).length, fallos: fMat };
ok = ok && fMat.length === 0;

// resumen de la búsqueda frente a Python
const fBus = Object.entries(ref.puestos).filter(([m, p]) => JSON.stringify(L.resumenPuestos(p)) !== JSON.stringify(ref.resumen_busqueda[m]))
  .map(([m]) => m);
const fBus2 = D.busqueda.filter((b, i) => Object.keys(ref.puestos).some((m) => b.metodos[m].puesto !== ref.puestos[m][i])).map((b) => b.capitulo);
res.busqueda = { metodos: Object.keys(ref.puestos).length, fallos: fBus.concat(fBus2) };
ok = ok && fBus.length === 0 && fBus2.length === 0;

// coseno
const fCos = ref.coseno.filter((c) => !cerca(L.coseno(c.a, c.b), c.c)).length;
res.coseno = { casos: ref.coseno.length, fallos: fCos };
ok = ok && fCos === 0;

// simulación del enmascarado: proporciones a largo plazo (ilustración, no el colador de transformers)
const toks = L.tokens("maría buscó a garfield su gato doméstico para darle de comer y después salió a pasear con su perro por el parque del barrio mientras caía la tarde");
const st = L.estadisticaMLM(toks, 20000, 7, ["casa", "perro", "lanza", "venta"]);
const pct = { elegidos: 100 * st.elegidos / st.candidatos, mask: 100 * st.mask / st.elegidos,
              azar: 100 * st.azar / st.elegidos, igual: 100 * st.igual / st.elegidos };
const simOk = Math.abs(pct.elegidos - 15) < 0.5 && Math.abs(pct.mask - 80) < 1 && Math.abs(pct.azar - 10) < 1 && Math.abs(pct.igual - 10) < 1;
res.simulacion_mlm = { repeticiones: 20000, porcentajes: Object.fromEntries(Object.entries(pct).map(([k, v]) => [k, Math.round(v * 100) / 100])), ok: simOk };
ok = ok && simOk;

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_05.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
