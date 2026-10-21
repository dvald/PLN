/* Tema 4 · Modelado del lenguaje — funciones de cálculo de la demo.
   Reimplementación en JavaScript de:
     Clases/Clase06_Tema4_Suavizado/ngramas.py      (modelos de n-gramas)
     Clases/Clase05_Tema4_BolsaPalabras/analisis_bow.py (bolsa de palabras y TF-IDF)
   Comprobada frente a Python con Demos/fuentes/probar_lib_04.js (resultado en prueba_lib_04.json).
   Sin dependencias; funciona en el navegador (window.LM04) y en Node (module.exports). */
(function (root) {
  "use strict";
  const PALABRA = /[a-záéíóúüñ]+/g;
  const FIN_FRASE = /[.!?]+/;
  const INI = "<s>", FIN = "</s>", DESC = "<UNK>";
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // ---------------------------------------------------------------- texto
  function tokens(texto) {
    return (texto.toLowerCase().match(PALABRA) || []);
  }
  function frases(texto) {
    const out = [];
    for (const trozo of texto.toLowerCase().split(FIN_FRASE)) {
      const t = trozo.match(PALABRA);
      if (t && t.length) out.push(t);
    }
    return out;
  }
  function eventos(listaFrases, n) {
    const ev = [];
    for (const f of listaFrases) {
      const seq = Array(n - 1).fill(INI).concat(f, [FIN]);
      for (let i = n - 1; i < seq.length; i++) ev.push([seq.slice(i - n + 1, i), seq[i]]);
    }
    return ev;
  }
  const clave = (h) => h.join("\u0001");
  const clave2 = (h, w) => clave(h) + "\u0002" + w;
  function recorta(h, k) { return k > 1 ? h.slice(h.length - (k - 1)) : []; }

  // ---------------------------------------------------------------- recuentos
  class Recuentos {
    constructor(listaFrases, n) {
      this.n = n;
      this.c = {}; this.ch = {}; this.sig = {};
      for (let k = 1; k <= n; k++) { this.c[k] = new Map(); this.ch[k] = new Map(); this.sig[k] = new Map(); }
      for (const [h, w] of eventos(listaFrases, n)) {
        for (let k = 1; k <= n; k++) {
          const hk = recorta(h, k), kh = clave(hk), kc = clave2(hk, w);
          this.c[k].set(kc, (this.c[k].get(kc) || 0) + 1);
          this.ch[k].set(kh, (this.ch[k].get(kh) || 0) + 1);
          if (!this.sig[k].has(kh)) this.sig[k].set(kh, new Set());
          this.sig[k].get(kh).add(w);
        }
      }
      this.N = this.ch[1].get("") || 0;
      const tipos = new Set();
      for (const s of this.sig[1].values()) for (const w of s) tipos.add(w);
      this.tipos = [...tipos].sort(cmp);
      // Kneser-Ney: recuentos de continuación
      this.cont = {}; this.contH = {}; this.contSig = {};
      for (let k = 1; k < n; k++) { this.cont[k] = new Map(); this.contH[k] = new Map(); this.contSig[k] = new Map(); }
      for (let k = 2; k <= n; k++) {
        for (const [kh, s] of this.sig[k]) {
          const h = kh === "" ? [] : kh.split("\u0001");
          const hInf = clave(h.slice(1));
          for (const w of s) {
            const kc = hInf + "\u0002" + w;
            this.cont[k - 1].set(kc, (this.cont[k - 1].get(kc) || 0) + 1);
            this.contH[k - 1].set(hInf, (this.contH[k - 1].get(hInf) || 0) + 1);
            if (!this.contSig[k - 1].has(hInf)) this.contSig[k - 1].set(hInf, new Set());
            this.contSig[k - 1].get(hInf).add(w);
          }
        }
      }
    }
    C(k, h, w) { return this.c[k].get(clave2(h, w)) || 0; }
    CH(k, h) { return this.ch[k].get(clave(h)) || 0; }
    vistas(k, h) { return this.sig[k].get(clave(h)) || new Set(); }
  }

  // ---------------------------------------------------------------- estimadores
  function pMle(R, w, h, k) {
    k = k == null ? R.n : k;
    const hk = recorta(h, k), den = R.CH(k, hk);
    if (den === 0) return null;
    return R.C(k, hk, w) / den;
  }
  function pAddk(R, w, h, kSuave, V, k) {
    k = k == null ? R.n : k;
    const hk = recorta(h, k);
    return (R.C(k, hk, w) + kSuave) / (R.CH(k, hk) + kSuave * V);
  }
  function pInterp(R, w, h, lambdas) {
    let p = R.C(1, [], w) / R.N;
    let acum = lambdas[0];
    for (let k = 2; k <= lambdas.length; k++) {
      const lk = lambdas[k - 1];
      let pk = pMle(R, w, h, k);
      const inferior = p;
      if (pk === null) pk = inferior;
      acum += lk;
      p = acum > 0 ? (lk * pk + (acum - lk) * inferior) / acum : inferior;
    }
    return p;
  }
  function pBackoff(R, w, h, d, k, cache) {
    k = k == null ? R.n : k;
    if (k === 1) return R.C(1, [], w) / R.N;
    const hk = recorta(h, k), den = R.CH(k, hk);
    if (den === 0) return pBackoff(R, w, h, d, k - 1, cache);
    const c = R.C(k, hk, w);
    if (c > 0) return (c - d) / den;
    return alfaBackoff(R, hk, d, k, cache) * pBackoff(R, w, h, d, k - 1, cache);
  }
  function alfaBackoff(R, hk, d, k, cache) {
    const key = k + "|" + clave(hk) + "|" + d;
    if (cache && cache.has(key)) return cache.get(key);
    const den = R.CH(k, hk), vistas = R.vistas(k, hk);
    const masa = d * vistas.size / den;
    let inf = 0;
    for (const v of vistas) inf += pBackoff(R, v, hk, d, k - 1, cache);
    const resto = 1 - inf;
    const a = resto > 1e-12 ? masa / resto : 0;
    if (cache) cache.set(key, a);
    return a;
  }
  function sStupid(R, w, h, factor, k) {
    factor = factor == null ? 0.4 : factor;
    k = k == null ? R.n : k;
    if (k === 1) return R.C(1, [], w) / R.N;
    const hk = recorta(h, k), c = R.C(k, hk, w);
    if (c > 0) return c / R.CH(k, hk);
    return factor * sStupid(R, w, h, factor, k - 1);
  }
  function pKn(R, w, h, V, d, k) {
    k = k == null ? R.n : k;
    if (k === 0) return 1 / V;
    const hk = recorta(h, k);
    let num, den, tipos;
    if (k === R.n) { num = R.C(k, hk, w); den = R.CH(k, hk); tipos = R.vistas(k, hk).size; }
    else {
      const kh = clave(hk);
      num = R.cont[k].get(kh + "\u0002" + w) || 0; den = R.contH[k].get(kh) || 0;
      tipos = (R.contSig[k].get(kh) || new Set()).size;
    }
    const inferior = pKn(R, w, h, V, d, k - 1);
    if (den === 0) return inferior;
    return Math.max(num - d, 0) / den + (d * tipos / den) * inferior;
  }
  function perplejidad(prob, listaFrases, n) {
    let log = 0, N = 0, ceros = 0;
    for (const [h, w] of eventos(listaFrases, n)) {
      const p = prob(w, h);
      N += 1;
      if (p === null || !(p > 0)) { ceros += 1; continue; }
      log += Math.log(p);
    }
    if (ceros) return { PP: Infinity, N, ceros };
    return { PP: Math.exp(-log / N), N, ceros: 0 };
  }

  /* Modelo de la demo: frases de entrenamiento, orden n, método y parámetros.
     Regla para palabras de prueba no vistas en el entrenamiento (igual en generar_datos_04.py):
     se sustituyen por <UNK> y |V| suma un tipo más. */
  function modeloDemo(textoEntrenamiento, n) {
    const F = frases(textoEntrenamiento);
    const R = new Recuentos(F, n);
    return { F, R };
  }
  function prepararPrueba(R, textoPrueba) {
    const conocidas = new Set(R.tipos);
    const P = frases(textoPrueba);
    let oov = [];
    const Pm = P.map((f) => f.map((w) => { if (conocidas.has(w)) return w; oov.push(w); return DESC; }));
    const V = R.tipos.length + (oov.length ? 1 : 0);
    return { P: Pm, V, oov };
  }
  function funcionProb(R, metodo, par, V) {
    const cache = new Map();
    switch (metodo) {
      case "mle": return (w, h) => pMle(R, w, h);
      case "laplace": return (w, h) => pAddk(R, w, h, 1, V);
      case "addk": return (w, h) => pAddk(R, w, h, par.k, V);
      case "interp": return (w, h) => pInterp(R, w, h, par.lambdas);
      case "backoff": return (w, h) => pBackoff(R, w, h, par.d, null, cache);
      case "kn": return (w, h) => pKn(R, w, h, V, par.d);
      case "stupid": return (w, h) => sStupid(R, w, h, 0.4);
      default: throw new Error("método desconocido " + metodo);
    }
  }

  // ---------------------------------------------------------------- bolsa de palabras
  function vocabulario(docs) { return [...new Set(docs.flat())].sort(cmp); }
  function binaria(doc, voc) { const s = new Set(doc); return voc.map((w) => (s.has(w) ? 1 : 0)); }
  function cuenta(doc) { const c = new Map(); for (const w of doc) c.set(w, (c.get(w) || 0) + 1); return c; }
  function tf(doc, voc) { const c = cuenta(doc); return voc.map((w) => c.get(w) || 0); }
  function wtf(doc, voc) { const c = cuenta(doc), n = doc.length; return voc.map((w) => (n ? (c.get(w) || 0) / n : 0)); }
  function df(docs, voc) { const sets = docs.map((d) => new Set(d)); return voc.map((w) => sets.filter((s) => s.has(w)).length); }
  function idfTema(docs, voc) { const N = docs.length; return df(docs, voc).map((x) => Math.log(N / x)); }
  function idfSklearn(docs, voc) { const N = docs.length; return df(docs, voc).map((x) => Math.log((1 + N) / (1 + x)) + 1); }
  function tfidf(doc, idf, voc) { return tf(doc, voc).map((f, i) => f * idf[i]); }
  function normaL2(v) { const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)); return n ? v.map((x) => x / n) : v.slice(); }
  function coseno(a, b) {
    let num = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { num += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na === 0 || nb === 0 ? 0 : num / (Math.sqrt(na) * Math.sqrt(nb));
  }
  function ordena(pares, k) {
    return pares.slice().sort((p, q) => (q[1] - p[1]) || cmp(p[0], q[0])).slice(0, k).map((p) => p[0]);
  }

  /* Quijote: matriz dispersa por capítulos (índices al vocabulario y frecuencias) */
  function quijoteIndice(Q) {
    const N = Q.caps.length, V = Q.vocab.length;
    const dfq = new Int32Array(V);
    for (const [idx] of Q.caps) for (const j of idx) dfq[j] += 1;
    const pos = new Map(Q.vocab.map((w, j) => [w, j]));
    return { N, V, dfq, pos };
  }
  function topCapitulo(Q, I, i, modo, k) {
    const [idx, cnt] = Q.caps[i];
    const pares = idx.map((j, t) => {
      const f = cnt[t], d = I.dfq[j];
      let peso = f;
      if (modo === "tfidf") peso = f * Math.log(I.N / d);
      else if (modo === "sklearn") peso = f * (Math.log((1 + I.N) / (1 + d)) + 1);
      return [Q.vocab[j], peso];
    });
    return ordena(pares, k);
  }
  function buscar(Q, I, consulta, ponderar, k) {
    const q = new Map();
    for (const w of tokens(consulta)) if (I.pos.has(w)) { const j = I.pos.get(w); q.set(j, (q.get(j) || 0) + 1); }
    const idf = (j) => (ponderar ? Math.log(I.N / I.dfq[j]) : 1);
    let nq = 0;
    for (const [j, f] of q) nq += (f * idf(j)) ** 2;
    nq = Math.sqrt(nq);
    const s = Q.caps.map(([idx, cnt]) => {
      let num = 0, nd = 0;
      for (let t = 0; t < idx.length; t++) {
        const j = idx[t], v = cnt[t] * idf(j);
        nd += v * v;
        if (q.has(j)) num += v * q.get(j) * idf(j);
      }
      return nd === 0 || nq === 0 ? 0 : num / (Math.sqrt(nd) * nq);
    });
    const orden = s.map((v, i) => i).sort((a, b) => (s[b] - s[a]) || (a - b)).slice(0, k);
    return { orden, s, desconocidas: tokens(consulta).filter((w) => !I.pos.has(w)) };
  }

  const API = { INI, FIN, DESC, tokens, frases, eventos, recorta, Recuentos, pMle, pAddk, pInterp, pBackoff,
    alfaBackoff, sStupid, pKn, perplejidad, modeloDemo, prepararPrueba, funcionProb, vocabulario, binaria, tf,
    wtf, df, idfTema, idfSklearn, tfidf, normaL2, coseno, ordena, quijoteIndice, topCapitulo, buscar };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.LM04 = API;
})(typeof window !== "undefined" ? window : globalThis);
