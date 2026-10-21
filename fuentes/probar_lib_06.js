// Comprueba que Demos/06_topicos_lib.js reproduce a Python (scikit-learn, numpy y las implementaciones de referencia
// de Demos/fuentes/generar_datos_06.py). Uso (desde la raíz): node Demos/fuentes/probar_lib_06.js
const fs = require("fs");
const path = require("path");
const L = require("../06_topicos_lib.js");
globalThis.window = globalThis.window || {};
require("../06_topicos_datos.js");
const D = globalThis.window.DATOS06;
const ref = JSON.parse(fs.readFileSync(path.join(__dirname, "referencia_python_06.json"), "utf8"));
const res = { fecha: new Date().toISOString(), node: process.version };
let ok = true;
const cerca = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const igualM = (A, B, tol) => A.length === B.length && A.every((f, i) => f.length === B[i].length && f.every((x, j) => cerca(x, B[i][j], tol)));
function anota(nombre, cond, detalle) { res[nombre] = Object.assign({ ok: !!cond }, detalle || {}); ok = ok && !!cond; }

// generador pseudoaleatorio
const r = L.mulberry32(42);
const sec = Array.from({ length: 6 }, () => r());
anota("mulberry32", sec.every((x, i) => x === ref.mulberry32_42[i]), { js: sec.slice(0, 3) });

// tokenización
const fTok = Object.entries(ref.tokens_prueba).filter(([t, toks]) => JSON.stringify(L.tokens(t)) !== JSON.stringify(toks)).map(([t]) => t);
anota("tokens", fTok.length === 0, { casos: Object.keys(ref.tokens_prueba).length, fallos: fTok });

// n-gramas: columnas y n-gramas distintivos
const corpus = D.corpus, ent = corpus.filter((f) => f.conjunto === "entrenamiento");
const docs = ent.map((f) => f.titular + ". " + f.texto), etiq = ent.map((f) => f.seccion);
const vac = new Set(D.vacias);
const cols = {};
["1", "2", "3"].forEach((n) => { cols[n] = L.estadisticasMatriz(docs, +n, null); });
const colsOk = ["1", "2", "3"].every((n) => cols[n].columnas === ref.ngramas.columnas[n] &&
  cerca(cols[n].ceros_pct, ref.ngramas.matriz[n].ceros_pct, 1e-3) && cerca(cols[n].en_un_solo_documento_pct, ref.ngramas.matriz[n].en_un_solo_documento_pct, 1e-3));
const sinV = L.estadisticasMatriz(docs, 1, vac).columnas === ref.ngramas.columnas_sin_vacias_1;
const titular = JSON.stringify(L.ngramas(L.tokens("Los tipos de interés frenan la compra de vivienda"), 2, vac)) === JSON.stringify(ref.ngramas.bigramas_sin_vacias_titular);
let fDist = [];
for (const [clave, n, cont] of [["distintivos_bigramas", 2, false], ["distintivos_unigramas", 1, false], ["distintivos_bigramas_contenido", 2, true]]) {
  for (const s of Object.keys(ref.ngramas[clave])) {
    const js = L.distintivos(docs, etiq, n, s, { top: 6, contenido: cont, vacias: vac });
    const py = ref.ngramas[clave][s];
    const igual = js.length === py.length && js.every((x, i) => x.ngrama === py[i].ngrama && Math.abs(x.chi2 - py[i].chi2) < 0.006 &&
      x.docs_seccion === py[i].docs_seccion && x.docs_resto === py[i].docs_resto);
    if (!igual) fDist.push(`${clave}/${s}`);
  }
}
anota("ngramas", colsOk && sinV && titular && fDist.length === 0, { columnas: Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.columnas])), fallos_distintivos: fDist });

// Naive Bayes
const pru = corpus.filter((f) => f.conjunto === "prueba"), nue = corpus.filter((f) => f.conjunto === "nuevo");
const fNB = [];
for (const [clave, v] of Object.entries(ref.nb)) {
  const sinVac = clave.startsWith("palabras_sin_vacias");
  const alfa = parseFloat(clave.split("_").pop());
  const m = L.nbEntrenar(docs, etiq, { alfa, vacias: sinVac ? vac : null });
  const predOk = pru.every((f, i) => L.nbPuntuar(m, f.titular + ". " + f.texto).prediccion === v.prueba_pred[i]);
  const puntOk = pru.every((f, i) => { const p = L.nbPuntuar(m, f.titular + ". " + f.texto).puntuaciones; return v.clases.every((c) => cerca(p[c], v.prueba_puntuaciones[i][c], 1e-9)); });
  const libresOk = ref.nb_textos_libres.every((t, i) => { const p = L.nbPuntuar(m, t).puntuaciones; return v.clases.every((c) => cerca(p[c], v.libres[i][c], 1e-9)); });
  const nuevasOk = nue.every((f, i) => L.nbPuntuar(m, f.titular + ". " + f.texto).prediccion === v.nuevas_pred[i]);
  const priorOk = m.logPrior.every((x, i) => cerca(x, v.log_prior[i], 1e-12)) && m.V === v.vocabulario;
  if (!(predOk && puntOk && libresOk && nuevasOk && priorOk)) fNB.push(clave);
}
const mm = L.nbEntrenar(ref.nb_mano.textos.map((t) => t.texto), ref.nb_mano.textos.map((t) => t.clase), { alfa: 1 });
const pm = L.nbPuntuar(mm, ref.nb_mano.frase).puntuaciones;
const manoOk = Object.entries(ref.nb_mano.puntuaciones).every(([c, v]) => Math.abs(pm[c] - v) < 6e-5);
anota("naive_bayes", fNB.length === 0 && manoOk, { variantes: Object.keys(ref.nb).length, fallos: fNB, ejemplo_mano: pm });

// SVD
function compSVD(Dm, sigmaPy, VtAbsPy, recPy, k0) {
  const s = L.svd(Dm);
  const nComp = sigmaPy.filter((x) => x > 1e-9).length;
  const sOk = sigmaPy.every((x, i) => Math.abs(s.sigma[i] - x) < 1e-9);
  const vOk = s.Vt.slice(0, nComp).every((f, i) => f.every((x, j) => Math.abs(Math.abs(x) - VtAbsPy[i][j]) < 1e-8));
  const recOk = Object.entries(recPy).every(([k, R]) => igualM(L.reconstruir(s, +k), R, 1e-9));
  const signo = s.Vt.every((f) => { let im = 0; f.forEach((x, j) => { if (Math.abs(x) > Math.abs(f[im])) im = j; }); return f[im] >= 0; });
  return sOk && vOk && recOk && signo;
}
const svdOk = compSVD(ref.svd.D, ref.svd.sigma, ref.svd.Vt_abs, ref.svd.reconstruccion);
const svd2Ok = compSVD(ref.svd_otra.D, ref.svd_otra.sigma, ref.svd_otra.Vt_abs, { 2: ref.svd_otra.reconstruccion_2 });
const errOk = [1, 2, 3, 4, 5].every((k) => Math.abs(L.frobenius(ref.svd.D, L.reconstruir(L.svd(ref.svd.D), k)) - ref.svd.error[k]) < 1e-9);
anota("svd", svdOk && svd2Ok && errOk, { sigma: L.svd(ref.svd.D).sigma.map((x) => +x.toFixed(4)) });

// NMF (misma inicialización y mismo orden de operaciones que Python)
const fNMF = [];
for (const [clave, v] of Object.entries(ref.nmf_mu)) {
  const [k, sd] = clave.match(/k(\d+)_s(\d+)/).slice(1).map(Number);
  const o = L.nmfMU(ref.svd.D, k, sd);
  if (!(igualM(o.W, v.W, 1e-9) && igualM(o.H, v.H, 1e-9) && cerca(o.error, v.error, 1e-9))) fNMF.push(clave);
}
anota("nmf", fNMF.length === 0, { casos: Object.keys(ref.nmf_mu).length, fallos: fNMF, error_k2_s1: L.nmfMU(ref.svd.D, 2, 1).error });

// LDA por Gibbs (mismas asignaciones que Python)
const terminos = D.matriz.terminos;
const docsLDA = D.matriz.D.map((fila) => { const out = []; fila.forEach((c, t) => { for (let i = 0; i < c; i++) out.push(t); }); return out; });
const fG = [];
for (const [clave, v] of Object.entries(ref.gibbs)) {
  const e = L.gibbsNuevo(docsLDA, v.K, terminos.length, v.alfa, v.beta, v.semilla);
  for (let i = 0; i < v.barridos; i++) L.gibbsBarrido(e);
  const est = L.gibbsEstimar(e);
  if (!(JSON.stringify(e.z) === JSON.stringify(v.z) && igualM(est.phi, v.phi, 1e-12) && igualM(est.theta, v.theta, 1e-12))) fG.push(clave);
}
anota("gibbs", fG.length === 0, { casos: Object.keys(ref.gibbs).length, fallos: fG });

// Reglas clínicas
const C = D.clinico;
const fCl = [];
C.notas.forEach((n) => { if (JSON.stringify(L.reglasClinicas(n.texto, C.farmacos, C.regex_dosis, C.regex_frecuencia)) !== JSON.stringify(ref.clinico.notas[n.id])) fCl.push(n.id); });
Object.entries(ref.clinico.extra).forEach(([t, v]) => { if (JSON.stringify(L.reglasClinicas(t, C.farmacos, C.regex_dosis, C.regex_frecuencia)) !== JSON.stringify(v)) fCl.push(t.slice(0, 30)); });
const refC = {}, predC = {};
C.notas.forEach((n) => { refC[n.id] = n.referencia.filter((x) => ["FARMACO", "DOSIS", "FRECUENCIA"].includes(x[2])); predC[n.id] = n.reglas; });
const idsCE = C.notas.filter((n) => n.particion === "evaluacion").map((n) => n.id);
const porTipo = {};
["DOSIS", "FARMACO", "FRECUENCIA"].forEach((t) => {
  const r2 = {}, p2 = {};
  idsCE.forEach((i) => { r2[i] = refC[i].filter((x) => x[2] === t); p2[i] = predC[i].filter((x) => x[2] === t); });
  porTipo[t] = L.evaluarTramos(p2, r2, idsCE).medidas.exacta;
});
const medClOk = Object.entries(ref.clinico_medidas_eval).every(([t, v]) => Math.abs(porTipo[t].f1 - v.f1) < 6e-4 && porTipo[t].aciertos === v.aciertos);
anota("clinico", fCl.length === 0 && medClOk, { fallos: fCl });

// Entidades: medidas del laboratorio recalculadas en JS con los tramos guardados
const T = D.entidades.tramos;
const ids = { desarrollo: Object.keys(T).filter((i) => T[i].particion === "desarrollo"), evaluacion: Object.keys(T).filter((i) => T[i].particion === "evaluacion") };
const refT = {}, pred = { modelo: {}, reglas: {}, reglas_v2: {} };
Object.entries(T).forEach(([i, v]) => { refT[i] = v.referencia; pred.modelo[i] = v.modelo; pred.reglas[i] = v.reglas_v1; pred.reglas_v2[i] = v.reglas_v2; });
const fEnt = [];
for (const [sist, clave] of [["modelo", "modelo"], ["reglas", "reglas"], ["reglas_v2", "reglas_v2"]]) {
  for (const parte of ["desarrollo", "evaluacion"]) {
    const e = L.evaluarTramos(pred[sist], refT, ids[parte]);
    const py = ref.entidades[`${clave}_${parte}`];
    for (const modo of ["exacta", "parcial", "solo_limites"]) {
      if (e.medidas[modo].aciertos !== py[modo].aciertos || e.medidas[modo].predichas !== py[modo].predichas ||
          Math.abs(e.medidas[modo].f1 - py[modo].f1) > 6e-4) fEnt.push(`${sist}/${parte}/${modo}`);
    }
    const eref = ref.entidades_errores[`${clave}_${parte}`];
    if (eref && JSON.stringify(Object.entries(e.errores_por_clase).sort()) !== JSON.stringify(Object.entries(eref).sort())) fEnt.push(`${sist}/${parte}/errores`);
  }
}
anota("entidades", fEnt.length === 0, { fallos: fEnt });

// Estabilidad: el emparejamiento exhaustivo da lo mismo que el húngaro de scipy en los tópicos guardados
const lda = D.topicos.noticias.lda_k4;
const j01 = L.jaccardEmparejado(lda.temas_semilla_0, lda.temas_semilla_1);
anota("jaccard", j01 >= 0 && j01 <= 1, { semillas_0_1_top8: +j01.toFixed(3) });

res.resultado = ok ? "OK" : "FALLO";
fs.writeFileSync(path.join(__dirname, "prueba_lib_06.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
process.exit(ok ? 0 : 1);
