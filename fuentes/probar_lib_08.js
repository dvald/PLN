// Comprueba que Demos/08_modelado_neuronal_ii_lib.js reproduce a Python (referencia_python_08.json, generada por
// generar_datos_08.py con numpy y el tokenizador real de BETO) y que los datos de la demo son coherentes con
// las cifras de las diapositivas. Uso (desde la raíz): node Demos/fuentes/probar_lib_08.js
const fs = require("fs");
const path = require("path");
const L = require("../08_modelado_neuronal_ii_lib.js");
globalThis.window = globalThis.window || {};
require("../08_modelado_neuronal_ii_datos.js");
const D = globalThis.window.DATOS08;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_08.json"), "utf8"));
const TOL = 1e-9;
const cerca = (a, b) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
const igualV = (a, b) => a.length === b.length && a.every((x, i) => cerca(x, b[i]));
const res = { fecha: new Date().toISOString(), node: process.version, tolerancia_relativa: TOL };
let ok = true;

// softmax con temperatura y entropía (logits reales de Qwen y de BETO)
const fSm = ref.softmax.filter((c) => !(igualV(L.softmaxT(c.logits, c.T), c.p) && cerca(L.entropia(L.softmaxT(c.logits, c.T)), c.entropia)))
  .map((c) => `T=${c.T} n=${c.logits.length}`);
res.softmax = { casos: ref.softmax.length, fallos: fSm };
ok = ok && fSm.length === 0;

// Wilson
const fW = ref.wilson.filter((c) => !igualV(L.wilson(c.k, c.n), c.ic)).map((c) => `${c.k}/${c.n}`);
res.wilson = { casos: ref.wilson.length, fallos: fW };
ok = ok && fW.length === 0;

// alineación de etiquetas con subpalabras (word_ids reales de BETO)
const fAl = ref.alineacion.filter((c) => JSON.stringify(L.alinear(c.word_ids, c.etiquetas, c.modo)) !== JSON.stringify(c.resultado))
  .map((c) => `${c.etiquetas.join(" ")} (${c.modo})`);
const fDec = D.subpalabras.filter((s) => JSON.stringify(L.decodificar(s.word_ids, L.alinear(s.word_ids, s.etiquetas, "primera"))) !== JSON.stringify(s.etiquetas))
  .map((s) => s.palabras.join(" "));
res.alineacion = { casos: ref.alineacion.length, fallos: fAl, decodificacion_fallos: fDec };
ok = ok && fAl.length === 0 && fDec.length === 0;

// fragmentos y pesos de la media
const fSp = ref.spans.filter((c) => L.nSpans(c.T, c.L) !== c.n).map((c) => `T=${c.T} L=${c.L}`);
const fMe = ref.media_span.filter((c) => !(igualV(L.pesosMedia(c.T, c.i, c.j), c.pesos) && igualV(L.pesosMediaTema(c.T, c.i, c.j), c.pesos_tema)))
  .map((c) => `T=${c.T} [${c.i},${c.j}]`);
const formula = [1, 5, 9, 20].every((T) => L.nSpans(T, 1000) === (T * (T + 1)) / 2);
res.spans = { casos: ref.spans.length, fallos: fSp, media_fallos: fMe, formula_T_T1_2: formula,
              frase_clase: L.nSpans(D.spans.T, 1000) === D.spans.n_spans && L.nSpans(D.spans.T, 3) === D.spans.n_spans_L3 };
ok = ok && fSp.length === 0 && fMe.length === 0 && formula && res.spans.frase_clase;

// máscaras
const mc = L.mascara(6, "causal");
res.mascaras = { causal_6: L.contarPermitidas(mc), bidireccional_6: L.contarPermitidas(L.mascara(6, "bidireccional")),
                 cruzada_4x6: L.contarPermitidas(L.mascara(6, "cruzada", 4)) };
ok = ok && res.mascaras.causal_6 === 21 && res.mascaras.bidireccional_6 === 36 && res.mascaras.cruzada_4x6 === 24;

// muestreo reproducible: frecuencias de 20 000 muestras cerca de las probabilidades
{
  const p = L.softmaxT(D.siguiente[0].top.map((t) => t.logit), 1.0);
  const r = L.generador(2026);
  const c = Array(p.length).fill(0);
  for (let k = 0; k < 20000; k++) c[L.muestrear(p, r())] += 1;
  const maxdif = Math.max(...c.map((x, i) => Math.abs(x / 20000 - p[i])));
  res.muestreo = { muestras: 20000, max_diferencia_frecuencia: Number(maxdif.toFixed(4)) };
  ok = ok && maxdif < 0.015;
}

// coherencia de los datos con las diapositivas
const N = D.noticias;
const aciertos = (clave) => N.filter((n) => n.pred[clave] === n.seccion).length;
const esperado = { nb: 15, beto_congelado: 19, q05_cero: 9, q05_pocos: 7, q05_puntuacion: 11, q05_autoconsistencia: 7, q15_cero: 14, q15_pocos: 18 };
const fCo = Object.entries(esperado).filter(([k, v]) => aciertos(k) !== v).map(([k, v]) => `${k}: ${aciertos(k)} (esperado ${v})`);
const todos = [0, 1, 2, 3, 4].map((s) => aciertos(`ajuste_todo_${s}`));
const parcial = [0, 1, 2, 3, 4].map((s) => aciertos(`ajuste_parcial_${s}`));
const SEC = ["economía", "deportes", "salud", "tecnología"];
const cm = L.matrizConfusion(N.map((n) => n.seccion), N.map((n) => n.pred.beto_congelado), SEC);
res.datos = { fallos: fCo, ajuste_todo: todos, ajuste_parcial: parcial,
              confusion_beto_igual_python: JSON.stringify(cm) === JSON.stringify(D.congelado.prueba.matriz_confusion.filas_reales_columnas_predichas),
              cultura_q05: D.cultura.filter((c) => L.normaliza(c.q05) === "cultura").length,
              cultura_q15: D.cultura.filter((c) => L.normaliza(c.q15) === "cultura").length };
ok = ok && fCo.length === 0 && JSON.stringify(todos) === "[19,19,19,18,19]" && JSON.stringify(parcial) === "[19,19,19,19,19]" &&
  res.datos.confusion_beto_igual_python && res.datos.cultura_q05 === 0 && res.datos.cultura_q15 === 10;

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_08.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
