// Comprueba que Demos/07_sentimientos_lib.js reproduce a Python (Temas/Tema07/recursos/t7_comun.py, NLTK y los
// cálculos de Demos/fuentes/generar_datos_07.py). Uso (desde la raíz): node Demos/fuentes/probar_lib_07.js
const fs = require("fs");
const path = require("path");
const L = require("../07_sentimientos_lib.js");
globalThis.window = globalThis.window || {};
require("../07_sentimientos_datos.js");
const D = globalThis.window.DATOS07;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_07.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version };
let ok = true;
function anota(nombre, cond, detalle) { res[nombre] = Object.assign({ ok: !!cond }, detalle || {}); ok = ok && !!cond; }
const OPCIONES = {
  todas: {}, sin_reglas: { usar_negacion: false, usar_intensidad: false, usar_adversativos: false, usar_irrealidad: false },
  desplazamiento: { negacion: "desplazamiento" }, sin_negacion: { usar_negacion: false }, sin_intensidad: { usar_intensidad: false },
  sin_adversativos: { usar_adversativos: false }, sin_irrealidad: { usar_irrealidad: false },
};

// 1. tokens y oraciones
const fTok = Object.entries(ref.tokens).filter(([t, tk]) => JSON.stringify(L.tokens(t)) !== JSON.stringify(tk)).map(([t]) => t);
const fOr = D.resenas.filter((r) => JSON.stringify(L.oraciones(r.texto)) !== JSON.stringify(ref.oraciones[r.id])).map((r) => r.id);
anota("tokens_y_oraciones", fTok.length === 0 && fOr.length === 0, { frases_prueba: Object.keys(ref.tokens).length, resenas: D.resenas.length, fallos: fTok.concat(fOr) });

// 2. puntuación del léxico: 180 reseñas × 7 combinaciones de reglas y 414 frases
const fLex = [];
for (const [k, op] of Object.entries(OPCIONES)) {
  for (const r of D.resenas) {
    const p = L.puntuarTexto(r.texto, D.lexico, D.modificadores, op).puntuacion;
    if (Math.abs(p - ref.lexico[k][r.id]) > 1e-9) fLex.push(`${k}/${r.id}: ${p} ≠ ${ref.lexico[k][r.id]}`);
  }
}
for (const f of D.frases) {
  const p = L.puntuarTexto(f.texto, D.lexico, D.modificadores).puntuacion;
  if (Math.abs(p - ref.lexico_frases[f.id_frase]) > 1e-9) fLex.push(`frase ${f.id_frase}`);
}
anota("lexico", fLex.length === 0, { casos: 180 * 7 + D.frases.length, fallos: fLex.slice(0, 10) });

// 3. trazas paso a paso (texto de cada paso) en las frases de clase
const fTr = [];
for (const [t, porOpc] of Object.entries(ref.trazas)) {
  for (const [k, oraciones] of Object.entries(porOpc)) {
    const js = L.puntuarTexto(t, D.lexico, D.modificadores, OPCIONES[k]).oraciones;
    const a = JSON.stringify(js.map((o) => [o.oracion, o.puntuacion, o.traza.map((x) => [x.token, x.valor, x.pasos])]));
    const b = JSON.stringify(oraciones.map(([o, p, tr]) => [o, p, tr.map(([tk, v, pasos]) => [tk, v, pasos])]));
    if (a !== b) fTr.push(`${k}: ${t}`);
  }
}
anota("trazas", fTr.length === 0, { casos: Object.keys(ref.trazas).length * 7, fallos: fTr.slice(0, 5) });

// 4. negación marcada: regla española y mark_negation de NLTK
const fNeg = [];
for (const r of D.resenas) {
  const [es, nl] = ref.negacion[r.id];
  if (L.marcarNegacion(r.texto) !== es) fNeg.push(`es/${r.id}`);
  if (L.markNegationNltk(r.texto) !== nl) fNeg.push(`nltk/${r.id}`);
}
for (const [t, [es, nl]] of Object.entries(ref.negacion_extra)) {
  if (L.marcarNegacion(t) !== es || L.markNegationNltk(t) !== nl) fNeg.push(t);
}
anota("negacion", fNeg.length === 0, { casos: 2 * (D.resenas.length + Object.keys(ref.negacion_extra).length), fallos: fNeg.slice(0, 8) });

// 5. estrellas frente a texto con varios umbrales
const fEst = Object.entries(ref.estrellas).filter(([k, v]) => {
  const [p, n] = k.split("-").map(Number);
  return L.cruceEstrellas(D.resenas, p, n).coinciden !== v;
}).map(([k]) => k);
anota("estrellas", fEst.length === 0, { umbrales: Object.keys(ref.estrellas).length, fallos: fEst });

// 6. agregación de frases (40 reseñas polares de prueba)
const fd = L.frasesDe(D.frases);
const pru = D.resenas.filter((r) => r.conjunto === "prueba" && r.polaridad !== "mixta");
const agr = {};
for (const k of ["suma", "mayoria", "ultima_frase", "solo_subjetivas"]) agr[k] = pru.filter((r) => L.agregar(k, fd[r.id], D.frases_prueba_beto) === r.polaridad).length;
anota("agregacion", JSON.stringify(agr) === JSON.stringify(ref.agregacion), { js: agr });

// 7. aspectos (sustantivos frecuentes) con umbrales 1 a 4
const fAsp = [];
for (const [u, v] of Object.entries(ref.aspectos)) {
  const a = L.aspectosUmbral(D, Number(u));
  if (a.aciertos !== v.aciertos || a.extraidos !== v.extraidos || a.oro !== v.oro || JSON.stringify(a.candidatos) !== JSON.stringify(v.candidatos)) fAsp.push(u);
}
anota("aspectos", fAsp.length === 0, { umbrales: Object.keys(ref.aspectos).length, fallos: fAsp });

// 8. PMI de Turney con cuatro pares de referencias
const fTu = [];
for (const [k, v] of Object.entries(ref.turney)) {
  const [a, b] = k.split("|");
  const t = L.turney(D, a, b);
  if (JSON.stringify([t.hits, t.frases, t.sin_coocurrencia, t.cubiertos, t.aciertos]) !== JSON.stringify([v.hits, v.frases, v.sin_coocurrencia, v.cubiertos, v.aciertos])) fTu.push(k);
}
anota("turney", fTu.length === 0, { pares: Object.keys(ref.turney).length, fallos: fTu });

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_07.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
