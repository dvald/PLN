// Biblioteca de cálculo de la demo del Tema 10 (Demos/10_visualizacion.html). Sin dependencias.
// Reproduce lo que hacen en Python los análisis de las Clases 17, 19 y 20: coseno sobre TF-IDF, PCA (con el signo
// de svd_flip de scikit-learn), RadViz, frecuencias con palabras vacías, la regla de tamaños de WordCloud
// (relative_scaling), comparación de dos fuentes con suavizado de Laplace, tendencias por capítulo con media móvil
// (np.convolve, mode="same"), coocurrencias (método del ejercicio 8 del tema, adyacentes, misma frase, ventana), PMI,
// árbol de palabras, concordancia, TTR, MATTR, perfiles de n-gramas de caracteres, disimilitud CNG y relevancia.
// Comprobado frente a Python con Demos/fuentes/probar_lib_10.js (resultado en Demos/fuentes/prueba_lib_10.json).
(function (raiz) {
  "use strict";

  // ---------------------------------------------------------------- generador pseudoaleatorio (mismo que el Tema 6)
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
  // Tokenización del ejercicio 8 del tema (nltk.word_tokenize aproximado con \w+|[^\w\s], sin pasar a minúsculas)
  const RX_TEMA = /[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]/gu;
  function tokensTema(texto) {
    return texto.match(RX_TEMA) || [];
  }
  function contar(lista) {
    const c = new Map();
    for (const x of lista) c.set(x, (c.get(x) || 0) + 1);
    return c;
  }
  // Orden estable: frecuencia descendente y, a igualdad, orden de primera aparición (como Counter.most_common)
  function masComunes(mapa, k) {
    const arr = Array.from(mapa.entries());
    const orden = new Map(arr.map(([w], i) => [w, i]));
    arr.sort((a, b) => b[1] - a[1] || orden.get(a[0]) - orden.get(b[0]));
    return k == null ? arr : arr.slice(0, k);
  }

  // ---------------------------------------------------------------- nivel de palabras
  // frecuencias a partir de pares [palabra, recuento] (ordenados) quitando palabras vacías
  function filtrarVacias(pares, vacias) {
    return pares.filter(([w]) => !vacias || !vacias.has(w));
  }
  // words_ de WordCloud: frecuencias divididas por la mayor
  function normalizar(pares) {
    if (!pares.length) return [];
    const m = pares[0][1];
    return pares.map(([w, c]) => [w, c / m]);
  }
  // Regla de tamaños de WordCloud 1.9.6 (generate_from_frequencies), sin colisiones:
  // font_size = round((rs * (freq / last_freq) + (1 - rs)) * font_size); last_freq = freq
  function tamanosWordCloud(normal, rs, maximo) {
    let fs = maximo, ultima = 1;
    return normal.map(([w, f]) => {
      if (rs !== 0) fs = Math.round((rs * (f / ultima) + (1 - rs)) * fs);
      ultima = f;
      return [w, fs];
    });
  }
  // log2 de la frecuencia relativa (con Laplace) en B frente a A; n = total de palabras, V = vocabulario
  function comparar(a, b, nA, nB, VA, VB) {
    const ma = new Map(a), mb = new Map(b);
    const pal = new Set([...ma.keys(), ...mb.keys()]);
    const out = [];
    for (const w of pal) {
      const ca = ma.get(w) || 0, cb = mb.get(w) || 0;
      out.push([w, ca, cb, Math.log2(((cb + 1) / (nB + VB)) / ((ca + 1) / (nA + VA)))]);
    }
    return out.sort((x, y) => x[3] - y[3] || (x[0] < y[0] ? -1 : 1));
  }
  // serie por 1000 palabras a partir de pares [capítulo, recuento] dispersos
  function serie(pares, longitudes) {
    const s = new Array(longitudes.length).fill(0);
    for (const [i, c] of pares) s[i] = 1000 * c / longitudes[i];
    return s;
  }
  // np.convolve(s, np.ones(v) / v, mode="same") con v impar
  function suavizar(s, v) {
    if (v <= 1) return s.slice();
    const h = Math.floor(v / 2), out = new Array(s.length).fill(0);
    for (let i = 0; i < s.length; i++) {
      let t = 0;
      for (let j = i - h; j <= i + h; j++) if (j >= 0 && j < s.length) t += s[j];
      out[i] = t / v;
    }
    return out;
  }

  // ---------------------------------------------------------------- nivel de estructura
  // Coocurrencias con un objetivo en una lista de frases.
  // metodo: "tema" (bigramas sin recuento, minúsculas después: procedimiento del ejercicio 8),
  //         "adyacentes" (palabra anterior y siguiente, con recuento), "frase" (misma frase), "ventana" (±k sin vacías)
  function coocurrencias(frases, objetivo, metodo, vacias, k) {
    if (metodo === "tema") {
      const big = new Set(), pal = new Set();
      for (const f of frases) {
        const t = tokensTema(f);
        for (let i = 0; i + 1 < t.length; i++) big.add(t[i] + "\u0000" + t[i + 1]);
        for (const x of t) {
          const l = x.toLowerCase();
          if (!vacias.has(l) && /^\p{L}+$/u.test(x)) pal.add(l);
        }
      }
      return Array.from(pal).sort().filter((w) => big.has(w + "\u0000" + objetivo) || big.has(objetivo + "\u0000" + w))
        .map((w) => [w, 1]);
    }
    const c = new Map();
    const suma = (w) => c.set(w, (c.get(w) || 0) + 1);
    for (const f of frases) {
      const t = tokens(f);
      if (metodo === "adyacentes") {
        t.forEach((x, i) => {
          if (x !== objetivo) return;
          for (const y of [i ? t[i - 1] : null, i + 1 < t.length ? t[i + 1] : null]) if (y && !vacias.has(y)) suma(y);
        });
      } else if (metodo === "frase") {
        if (!t.includes(objetivo)) continue;
        const vistos = new Set();
        for (const x of t) {
          if (x === objetivo || vacias.has(x) || vistos.has(x)) continue;
          vistos.add(x);
          suma(x);
        }
      } else {
        const tc = t.filter((x) => !vacias.has(x) || x === objetivo);
        tc.forEach((x, i) => {
          if (x !== objetivo) return;
          tc.slice(Math.max(0, i - k), i).concat(tc.slice(i + 1, i + 1 + k)).forEach(suma);
        });
      }
    }
    return masComunes(c);
  }
  // PMI por oraciones: co = [[palabra, oraciones compartidas]], df = {palabra: oraciones}, N, nObj
  function pmi(co, df, N, nObj, minimo) {
    return co.filter(([, c]) => c >= minimo)
      .map(([w, c]) => [w, c, Math.log2((c / N) / ((nObj / N) * (df[w] / N)))])
      .sort((a, b) => b[2] - a[2] || (a[0] < b[0] ? -1 : 1));
  }
  // Continuaciones de una raíz (lista de palabras) en listas de tokens
  function continuaciones(listas, raiz, prof) {
    const rz = raiz.split(" "), out = [];
    for (const f of listas) {
      for (let i = 0; i + rz.length <= f.length; i++) {
        let igual = true;
        for (let j = 0; j < rz.length; j++) if (f[i + j] !== rz[j]) { igual = false; break; }
        if (igual) out.push(f.slice(i + rz.length, i + rz.length + prof));
      }
    }
    return out;
  }
  // Árbol de palabras (mismo recorrido que analisis_contenido.py: hijos más frecuentes, empates por primera aparición)
  function arbol(conts, prof, ramas, minimo) {
    function nodo(prefijo, nivel) {
      const c = new Map();
      for (const x of conts) {
        if (x.length <= nivel) continue;
        let igual = true;
        for (let j = 0; j < nivel; j++) if (x[j] !== prefijo[j]) { igual = false; break; }
        if (igual) c.set(x[nivel], (c.get(x[nivel]) || 0) + 1);
      }
      return masComunes(c, ramas).filter(([, n]) => n >= minimo)
        .map(([w, n]) => ({ palabra: w, n, hijos: nivel + 1 < prof ? nodo(prefijo.concat([w]), nivel + 1) : [] }));
    }
    return nodo([], 0);
  }
  function kwic(listas, raiz, ancho) {
    const rz = raiz.split(" "), out = [];
    for (const f of listas) {
      for (let i = 0; i + rz.length <= f.length; i++) {
        let igual = true;
        for (let j = 0; j < rz.length; j++) if (f[i + j] !== rz[j]) { igual = false; break; }
        if (igual) out.push([f.slice(Math.max(0, i - ancho), i).join(" "), raiz, f.slice(i + rz.length, i + rz.length + ancho).join(" ")]);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- nivel de sustancia
  function ttr(t) { return t.length ? new Set(t).size / t.length : 0; }
  // MATTR (Covington y McFall, 2010): media de la TTR en ventanas móviles (igual que analisis_sustancia.py)
  function mattr(t, ventana) {
    if (t.length < ventana) return ttr(t);
    const c = new Map();
    for (let i = 0; i < ventana; i++) c.set(t[i], (c.get(t[i]) || 0) + 1);
    let suma = c.size / ventana, n = 1;
    for (let i = ventana; i < t.length; i++) {
      c.set(t[i], (c.get(t[i]) || 0) + 1);
      const sale = t[i - ventana], v = c.get(sale) - 1;
      if (v === 0) c.delete(sale); else c.set(sale, v);
      suma += c.size / ventana;
      n++;
    }
    return suma / n;
  }
  function limpio(texto) { return texto.toLowerCase().replace(/\s+/g, " ").trim(); }
  // Perfil de n-gramas de caracteres: frecuencias relativas (limpia el texto antes, como analisis_sustancia.py)
  function perfil(texto, n) {
    const c = new Map();
    const cars = Array.from(limpio(texto));
    for (let i = 0; i + n <= cars.length; i++) {
      const g = cars.slice(i, i + n).join("");
      c.set(g, (c.get(g) || 0) + 1);
    }
    let tot = 0;
    for (const v of c.values()) tot += v;
    const p = new Map();
    for (const [g, v] of c) p.set(g, v / tot);
    return p;
  }
  // Adaptación dirigida de CNG sobre los L n-gramas de la base (empates: orden alfabético).
  // No es la CNG simétrica sobre la unión de ambos perfiles truncados; véase la explicación de la demo.
  function cng(base, obj, L) {
    const top = Array.from(base.entries()).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, L);
    let total = 0;
    const filas = top.map(([g, fb]) => {
      const fo = obj.get(g) || 0;
      const d = Math.pow(2 * (fb - fo) / (fb + fo), 2);
      total += d;
      return [g, fb, fo, d, fb > fo ? 1 : -1];
    });
    return { total, filas };
  }
  // Relevancia de LDAvis: λ log φ + (1 − λ) log(φ / p)
  function relevancia(phi, pw, lam) {
    return phi.map((f, i) => lam * Math.log(f + 1e-12) + (1 - lam) * Math.log((f + 1e-12) / pw[i]));
  }
  function ordenDesc(v) {
    return v.map((x, i) => [x, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((p) => p[1]);
  }

  // ---------------------------------------------------------------- similitud y proyecciones
  // vectores TF-IDF dispersos {índice: valor}, ya normalizados (L2)
  function cosenoDisperso(a, b) {
    let s = 0;
    for (const k in a) if (k in b) s += a[k] * b[k];
    return s;
  }
  function vecinosOriginales(vectores, i, k) {
    const sims = vectores.map((v, j) => [j, j === i ? -Infinity : cosenoDisperso(vectores[i], v)]);
    sims.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    return sims.slice(0, k);
  }
  function vecinosMapa(Y, i, k) {
    const d = Y.map((p, j) => [j, j === i ? Infinity : (p[0] - Y[i][0]) ** 2 + (p[1] - Y[i][1]) ** 2]);
    d.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return d.slice(0, k);
  }
  function radviz(theta, grados) {
    const anc = grados.map((g) => [Math.cos(g * Math.PI / 180), Math.sin(g * Math.PI / 180)]);
    return theta.map((t) => [0, 1].map((d) => t.reduce((s, x, k) => s + x * anc[k][d], 0)));
  }
  // PCA de una matriz pequeña (filas = documentos): autovectores de la covarianza por iteración de potencias con
  // deflación; signo como svd_flip de scikit-learn (la mayor carga en valor absoluto, positiva).
  function pca(M, m) {
    const n = M.length, p = M[0].length;
    const media = Array.from({ length: p }, (_, j) => M.reduce((s, f) => s + f[j], 0) / n);
    const Xc = M.map((f) => f.map((x, j) => x - media[j]));
    let S = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Xc.reduce((s, f) => s + f[a] * f[b], 0) / (n - 1)));
    const traza = S.reduce((s, f, i) => s + f[i], 0);
    const comps = [], vals = [];
    for (let c = 0; c < m; c++) {
      let v = Array.from({ length: p }, (_, j) => 1 + j * 0.001);
      let lam = 0;
      for (let it = 0; it < 2000; it++) {
        const w = S.map((f) => f.reduce((s, x, j) => s + x * v[j], 0));
        const nrm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
        const nv = w.map((x) => x / nrm);
        const dif = nv.reduce((s, x, j) => s + Math.abs(x - v[j]), 0);
        v = nv;
        lam = nrm;
        if (dif < 1e-13) break;
      }
      let jmax = 0;
      v.forEach((x, j) => { if (Math.abs(x) > Math.abs(v[jmax])) jmax = j; });
      if (v[jmax] < 0) v = v.map((x) => -x);
      comps.push(v);
      vals.push(lam);
      S = S.map((f, a) => f.map((x, b) => x - lam * v[a] * v[b]));
    }
    const Y = Xc.map((f) => comps.map((v) => f.reduce((s, x, j) => s + x * v[j], 0)));
    return { Y, componentes: comps, autovalores: vals, varianza: vals.map((l) => (traza > 0 ? l / traza : 0)), media };
  }

  // ---------------------------------------------------------------- formato español
  function dec(x, d) {
    if (!isFinite(x)) return "—";
    return x.toFixed(d == null ? 2 : d).replace(".", ",").replace(/^-0(,0+)?$/, "0$1");
  }
  function miles(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  const L = { mulberry32, tokens, tokensTema, contar, masComunes, filtrarVacias, normalizar, tamanosWordCloud,
    comparar, serie, suavizar, coocurrencias, pmi, continuaciones, arbol, kwic, ttr, mattr, limpio, perfil, cng,
    relevancia, ordenDesc, cosenoDisperso, vecinosOriginales, vecinosMapa, radviz, pca, dec, miles };
  if (typeof module !== "undefined" && module.exports) module.exports = L;
  raiz.T10 = L;
})(typeof window !== "undefined" ? window : globalThis);
