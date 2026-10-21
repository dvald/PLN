// Biblioteca de cálculo de la demo del Tema 6 (Demos/06_topicos.html). Sin dependencias.
// Reproduce lo que en Python hacen CountVectorizer y MultinomialNB de scikit-learn, numpy.linalg.svd (salvo el
// signo, que se fija como svd_flip de scikit-learn), NMF por actualizaciones multiplicativas (Lee y Seung, 2001),
// LDA por muestreo de Gibbs colapsado (Griffiths y Steyvers, 2004) y la evaluación de tramos del laboratorio.
// Comprobado frente a Python con Demos/fuentes/probar_lib_06.js (resultado en Demos/fuentes/prueba_lib_06.json).
(function (raiz) {
  "use strict";

  // ---------------------------------------------------------------- generador pseudoaleatorio (mulberry32)
  function mulberry32(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1) >>> 0;
      t = (((t + (Math.imul(t ^ (t >>> 7), t | 61) >>> 0)) >>> 0) ^ t) >>> 0;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------- tokenización (= r"(?u)\b[^\W\d_]+\b" en minúsculas)
  const RX_PALABRA = /(?<![\p{L}\p{N}_])\p{L}+(?![\p{L}\p{N}_])/gu;
  function tokens(texto) {
    return (texto.toLowerCase().match(RX_PALABRA) || []);
  }
  function ngramas(toks, n, vacias) {
    const t = vacias ? toks.filter((w) => !vacias.has(w)) : toks;
    const out = [];
    for (let i = 0; i + n <= t.length; i++) out.push(t.slice(i, i + n).join(" "));
    return out;
  }
  function contar(lista) {
    const c = new Map();
    for (const x of lista) c.set(x, (c.get(x) || 0) + 1);
    return c;
  }

  // Estadísticas de la matriz documento-término (columnas, ceros, n-gramas en un solo documento)
  function estadisticasMatriz(docs, n, vacias) {
    const df = new Map();
    let nnz = 0;
    for (const d of docs) {
      const c = contar(ngramas(tokens(d), n, vacias));
      nnz += c.size;
      for (const g of c.keys()) df.set(g, (df.get(g) || 0) + 1);
    }
    const cols = df.size;
    let unicos = 0;
    for (const v of df.values()) if (v === 1) unicos++;
    return { columnas: cols, ceros_pct: 100 * (1 - nnz / (docs.length * cols)), en_un_solo_documento_pct: 100 * unicos / cols };
  }

  // ---------------------------------------------------------------- chi-cuadrado 2x2 (Manning et al., 2008, §13.5.2)
  function chi2x2(n11, n10, n01, n00) {
    const n = n11 + n10 + n01 + n00;
    const t1 = n11 + n10, c1 = n11 + n01;
    const obs = [[n00, n01], [n10, n11]]; // [et][ec]
    let chi = 0;
    for (const et of [0, 1]) {
      for (const ec of [0, 1]) {
        const pt = et ? t1 / n : 1 - t1 / n;
        const pc = ec ? c1 / n : 1 - c1 / n;
        const e = n * pt * pc;
        if (e > 0) chi += (obs[et][ec] - e) ** 2 / e;
      }
    }
    return { chi: chi, positiva: n11 > n * (t1 / n) * (c1 / n) };
  }
  function distintivos(docs, etiquetas, n, seccion, opciones) {
    const op = Object.assign({ top: 6, minimo: 2, contenido: false, vacias: null }, opciones || {});
    const pres = docs.map((d) => new Set(ngramas(tokens(d), n, null)));
    const voc = new Set();
    pres.forEach((s) => s.forEach((g) => voc.add(g)));
    const enSec = etiquetas.map((e) => e === seccion);
    const nSec = enSec.filter(Boolean).length, nResto = docs.length - nSec;
    const res = [];
    for (const g of voc) {
      if (op.contenido && op.vacias && g.split(" ").some((w) => op.vacias.has(w))) continue;
      let n11 = 0, n10 = 0;
      pres.forEach((s, i) => { if (s.has(g)) { if (enSec[i]) n11++; else n10++; } });
      if (n11 < op.minimo) continue;
      const r = chi2x2(n11, n10, nSec - n11, nResto - n10);
      if (r.positiva) res.push({ ngrama: g, chi2: r.chi, docs_seccion: n11, docs_resto: n10 });
    }
    res.sort((a, b) => (b.chi2 - a.chi2) || (a.ngrama < b.ngrama ? -1 : a.ngrama > b.ngrama ? 1 : 0));
    return res.slice(0, op.top);
  }

  // ---------------------------------------------------------------- Naive Bayes multinomial (= MultinomialNB)
  function nbEntrenar(docs, etiquetas, opciones) {
    const op = Object.assign({ alfa: 1.0, vacias: null }, opciones || {});
    const clases = Array.from(new Set(etiquetas)).sort();
    const vocab = new Map();
    const porDoc = docs.map((d) => contar(ngramas(tokens(d), 1, op.vacias)));
    porDoc.forEach((c) => { for (const w of c.keys()) if (!vocab.has(w)) vocab.set(w, 0); });
    Array.from(vocab.keys()).sort().forEach((w, i) => vocab.set(w, i));
    const V = vocab.size;
    const cuentas = clases.map(() => new Float64Array(V));
    const nDocs = clases.map(() => 0);
    porDoc.forEach((c, i) => {
      const k = clases.indexOf(etiquetas[i]);
      nDocs[k]++;
      for (const [w, v] of c) cuentas[k][vocab.get(w)] += v;
    });
    const total = nDocs.reduce((a, b) => a + b, 0);
    const logPrior = nDocs.map((x) => Math.log(x) - Math.log(total));
    const logLik = cuentas.map((fila) => {
      let s = 0;
      for (let j = 0; j < V; j++) s += fila[j] + op.alfa;
      const out = new Float64Array(V);
      for (let j = 0; j < V; j++) out[j] = Math.log(fila[j] + op.alfa) - Math.log(s);
      return out;
    });
    return { clases, vocab, V, logPrior, logLik, cuentas, nDocs, alfa: op.alfa, vacias: op.vacias };
  }
  function nbPuntuar(modelo, texto) {
    const c = contar(ngramas(tokens(texto), 1, modelo.vacias));
    const punt = {}, contrib = [], fuera = [];
    modelo.clases.forEach((cl, k) => { punt[cl] = modelo.logPrior[k]; });
    const conocidas = Array.from(c.keys()).filter((w) => modelo.vocab.has(w)).sort((a, b) => modelo.vocab.get(a) - modelo.vocab.get(b));
    for (const w of c.keys()) if (!modelo.vocab.has(w)) fuera.push(w);
    for (const w of conocidas) {
      const j = modelo.vocab.get(w), v = c.get(w);
      const fila = {};
      modelo.clases.forEach((cl, k) => { punt[cl] += v * modelo.logLik[k][j]; fila[cl] = v * modelo.logLik[k][j]; });
      contrib.push({ palabra: w, recuento: v, aportes: fila });
    }
    let mejor = modelo.clases[0];
    for (const cl of modelo.clases) if (punt[cl] > punt[mejor]) mejor = cl;
    return { puntuaciones: punt, prediccion: mejor, contribuciones: contrib, fuera_de_vocabulario: fuera };
  }

  // ---------------------------------------------------------------- álgebra pequeña
  function matmul(A, B) {
    const n = A.length, m = B[0].length, p = B.length;
    const C = [];
    for (let i = 0; i < n; i++) {
      const fila = [];
      for (let j = 0; j < m; j++) {
        let s = 0;
        for (let t = 0; t < p; t++) s += A[i][t] * B[t][j];
        fila.push(s);
      }
      C.push(fila);
    }
    return C;
  }
  function tr(A) { return A[0].map((_, j) => A.map((f) => f[j])); }
  function frobenius(A, B) {
    let s = 0;
    for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) s += (A[i][j] - B[i][j]) ** 2;
    return Math.sqrt(s);
  }

  // SVD por Jacobi cíclico sobre DᵀD. Signo como svd_flip(u_based_decision=False): el mayor |v| de cada fila de Vᵀ, positivo
  function svd(D) {
    const m = D[0].length;
    const A = matmul(tr(D), D).map((f) => f.slice());
    const Vm = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => (i === j ? 1 : 0)));
    for (let barrido = 0; barrido < 100; barrido++) {
      let off = 0;
      for (let p = 0; p < m; p++) for (let q = p + 1; q < m; q++) off += A[p][q] ** 2;
      if (off < 1e-26) break;
      for (let p = 0; p < m; p++) {
        for (let q = p + 1; q < m; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue;
          const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k = 0; k < m; k++) {
            const akp = A[k][p], akq = A[k][q];
            A[k][p] = c * akp - s * akq;
            A[k][q] = s * akp + c * akq;
          }
          for (let k = 0; k < m; k++) {
            const apk = A[p][k], aqk = A[q][k];
            A[p][k] = c * apk - s * aqk;
            A[q][k] = s * apk + c * aqk;
          }
          for (let k = 0; k < m; k++) {
            const vkp = Vm[k][p], vkq = Vm[k][q];
            Vm[k][p] = c * vkp - s * vkq;
            Vm[k][q] = s * vkp + c * vkq;
          }
        }
      }
    }
    const orden = Array.from({ length: m }, (_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    const sigma = [], Vt = [], U = D.map(() => []);
    for (const i of orden) {
      const s = Math.sqrt(Math.max(A[i][i], 0));
      let v = Vm.map((f) => f[i]);
      let imax = 0;
      v.forEach((x, j) => { if (Math.abs(x) > Math.abs(v[imax])) imax = j; });
      if (v[imax] < 0) v = v.map((x) => -x);
      sigma.push(s);
      Vt.push(v);
      D.forEach((fila, r) => {
        let acc = 0;
        for (let j = 0; j < m; j++) acc += fila[j] * v[j];
        U[r].push(s > 1e-12 ? acc / s : 0);
      });
    }
    return { U, sigma, Vt };
  }
  function reconstruir(r, k) {
    return r.U.map((u) => r.Vt[0].map((_, j) => {
      let s = 0;
      for (let t = 0; t < k; t++) s += u[t] * r.sigma[t] * r.Vt[t][j];
      return s;
    }));
  }

  // ---------------------------------------------------------------- NMF por actualizaciones multiplicativas (Frobenius)
  function nmfMU(V, k, semilla, iteraciones, eps) {
    iteraciones = iteraciones === undefined ? 2000 : iteraciones;
    eps = eps === undefined ? 1e-12 : eps;
    const rnd = mulberry32(semilla);
    const n = V.length, m = V[0].length;
    let total = 0;
    for (const f of V) { let rs = 0; for (const x of f) rs += x; total += rs; }
    const escala = Math.sqrt(total / (n * m) / k);
    let W = Array.from({ length: n }, () => Array.from({ length: k }, () => rnd() * escala));
    let H = Array.from({ length: k }, () => Array.from({ length: m }, () => rnd() * escala));
    for (let it = 0; it < iteraciones; it++) {
      const Wt = tr(W);
      let num = matmul(Wt, V), den = matmul(matmul(Wt, W), H);
      H = H.map((f, i) => f.map((h, j) => h * num[i][j] / (den[i][j] + eps)));
      const Ht = tr(H);
      num = matmul(V, Ht); den = matmul(W, matmul(H, Ht));
      W = W.map((f, i) => f.map((w, j) => w * num[i][j] / (den[i][j] + eps)));
    }
    return { W, H, error: frobenius(V, matmul(W, H)) };
  }

  // ---------------------------------------------------------------- LDA: muestreo de Gibbs colapsado, paso a paso
  function gibbsNuevo(docs, K, Wn, alfa, beta, semilla) {
    const rnd = mulberry32(semilla);
    const z = docs.map((d) => d.map(() => Math.floor(rnd() * K)));
    const nkw = Array.from({ length: K }, () => new Array(Wn).fill(0));
    const nk = new Array(K).fill(0);
    const ndk = docs.map(() => new Array(K).fill(0));
    docs.forEach((doc, d) => doc.forEach((w, i) => { const k = z[d][i]; nkw[k][w]++; nk[k]++; ndk[d][k]++; }));
    return { docs, K, Wn, alfa, beta, rnd, z, nkw, nk, ndk, barridos: 0 };
  }
  function gibbsProbabilidades(e, d, i) {
    // probabilidades (sin normalizar) de cada tópico para el token i del documento d, quitando su asignación actual
    const w = e.docs[d][i], kAct = e.z[d][i];
    const p = [];
    for (let j = 0; j < e.K; j++) {
      const nkwj = e.nkw[j][w] - (j === kAct ? 1 : 0), nkj = e.nk[j] - (j === kAct ? 1 : 0), ndkj = e.ndk[d][j] - (j === kAct ? 1 : 0);
      p.push((nkwj + e.beta) / (nkj + e.Wn * e.beta) * (ndkj + e.alfa));
    }
    return p;
  }
  function gibbsBarrido(e) {
    e.docs.forEach((doc, d) => doc.forEach((w, i) => {
      const k = e.z[d][i];
      e.nkw[k][w]--; e.nk[k]--; e.ndk[d][k]--;
      const p = [];
      for (let j = 0; j < e.K; j++) p.push((e.nkw[j][w] + e.beta) / (e.nk[j] + e.Wn * e.beta) * (e.ndk[d][j] + e.alfa));
      let suma = 0;
      for (const x of p) suma += x;
      const u = e.rnd() * suma;
      let acum = 0, nuevo = e.K - 1;
      for (let j = 0; j < e.K; j++) { acum += p[j]; if (u < acum) { nuevo = j; break; } }
      e.z[d][i] = nuevo;
      e.nkw[nuevo][w]++; e.nk[nuevo]++; e.ndk[d][nuevo]++;
    }));
    e.barridos++;
    return e;
  }
  function gibbsEstimar(e) {
    const phi = e.nkw.map((fila, k) => fila.map((c) => (c + e.beta) / (e.nk[k] + e.Wn * e.beta)));
    const theta = e.ndk.map((fila, d) => fila.map((c) => (c + e.alfa) / (e.docs[d].length + e.K * e.alfa)));
    return { phi, theta };
  }

  // ---------------------------------------------------------------- reglas clínicas (regex de Python con \b de Unicode)
  const ANTES = "(?<![\\p{L}\\p{N}_])", DESPUES = "(?![\\p{L}\\p{N}_])";
  function regexPython(patron, flags) {
    let p = patron;
    if (p.startsWith("\\b")) p = ANTES + p.slice(2);
    if (p.endsWith("\\b")) p = p.slice(0, -2) + DESPUES;
    return new RegExp(p, flags);
  }
  function escapar(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function reglasClinicas(texto, farmacos, rxDosis, rxFrec) {
    const out = [];
    for (const f of farmacos) {
      const rx = new RegExp(ANTES + escapar(f) + DESPUES, "giu");
      for (const mm of texto.matchAll(rx)) out.push([mm.index, mm.index + mm[0].length, "FARMACO"]);
    }
    for (const mm of texto.matchAll(regexPython(rxDosis, "gu"))) out.push([mm.index, mm.index + mm[0].length, "DOSIS"]);
    for (const mm of texto.matchAll(regexPython(rxFrec, "gu"))) out.push([mm.index, mm.index + mm[0].length, "FRECUENCIA"]);
    out.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
    return out;
  }
  // JS mide posiciones en unidades UTF-16; Python, en puntos de código. Con texto del plano básico coinciden.

  // ---------------------------------------------------------------- evaluación de tramos (= evaluar() del laboratorio)
  function prf(tp, nPred, nRef) {
    const p = nPred ? tp / nPred : 0, r = nRef ? tp / nRef : 0;
    return { precision: p, exhaustividad: r, f1: p + r ? 2 * p * r / (p + r) : 0, aciertos: tp, predichas: nPred, referencia: nRef };
  }
  function evaluarTramos(predPorDoc, refPorDoc, ids) {
    const tp = { exacta: 0, parcial: 0, solo_limites: 0 };
    let nPred = 0, nRef = 0;
    const errores = [];
    for (const i of ids) {
      const R = refPorDoc[i] || [], P = predPorDoc[i] || [];
      nPred += P.length; nRef += R.length;
      for (const p of P) {
        const ex = R.filter((r) => r[0] === p[0] && r[1] === p[1] && r[2] === p[2]);
        const sl = R.filter((r) => r[0] === p[0] && r[1] === p[1]);
        const pa = R.filter((r) => r[2] === p[2] && r[0] < p[1] && p[0] < r[1]);
        if (ex.length) tp.exacta++;
        if (sl.length) tp.solo_limites++;
        if (pa.length) tp.parcial++;
        if (!ex.length) {
          const sol = R.filter((r) => r[0] < p[1] && p[0] < r[1]);
          const clase = sl.length ? "tipo equivocado" : pa.length ? "límites" : sol.length ? "límites y tipo" : "falso positivo";
          errores.push({ id: i, clase, predicho: p, referencia: sol });
        }
      }
      for (const r of R) if (!P.some((p) => p[0] < r[1] && r[0] < p[1])) errores.push({ id: i, clase: "no detectada", predicho: null, referencia: [r] });
    }
    const porClase = {};
    errores.forEach((e) => { porClase[e.clase] = (porClase[e.clase] || 0) + 1; });
    return { medidas: { exacta: prf(tp.exacta, nPred, nRef), parcial: prf(tp.parcial, nPred, nRef), solo_limites: prf(tp.solo_limites, nPred, nRef) },
             errores_por_clase: porClase, errores };
  }

  // ---------------------------------------------------------------- utilidades
  function jaccardEmparejado(t1, t2) {
    // coincidencia media de listas de palabras tras emparejar (búsqueda exhaustiva: k pequeño)
    const k = t1.length;
    const M = t1.map((a) => t2.map((b) => { const A = new Set(a), B = new Set(b); let i = 0; A.forEach((x) => { if (B.has(x)) i++; }); return i / (A.size + B.size - i); }));
    let mejor = -1;
    const perm = (resto, acc, suma) => {
      if (!resto.length) { if (suma > mejor) mejor = suma; return; }
      resto.forEach((j, idx) => perm(resto.slice(0, idx).concat(resto.slice(idx + 1)), acc.concat(j), suma + M[acc.length][j]));
    };
    perm(Array.from({ length: k }, (_, i) => i), [], 0);
    return mejor / k;
  }

  const API = { mulberry32, tokens, ngramas, contar, estadisticasMatriz, chi2x2, distintivos, nbEntrenar, nbPuntuar, matmul, tr,
                frobenius, svd, reconstruir, nmfMU, gibbsNuevo, gibbsProbabilidades, gibbsBarrido, gibbsEstimar, regexPython,
                reglasClinicas, prf, evaluarTramos, jaccardEmparejado };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  raiz.LIB06 = API;
})(typeof window !== "undefined" ? window : globalThis);
