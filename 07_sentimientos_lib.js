// Biblioteca de la demo del Tema 7 (análisis de sentimientos). Réplica en JavaScript de
// Temas/Tema07/recursos/t7_comun.py y de los cálculos de Demos/fuentes/generar_datos_07.py.
// Comprobada contra Python con Demos/fuentes/probar_lib_07.js (resultado en Demos/fuentes/prueba_lib_07.json).
(function (raiz) {
  "use strict";
  const TOKEN = /\p{L}+|[¿?¡!.,;:()«»"]/gu;
  const PUNT_CLAUSULA = new Set([",", ";", ":", "(", ")", "«", "»", '"']);
  const FIN_ORACION = new Set([".", "!", "?"]);
  const NEG_NLTK = /^(?:never|no|nothing|nowhere|noone|none|not|havent|hasnt|hadnt|cant|couldnt|shouldnt|wont|wouldnt|dont|doesnt|didnt|isnt|arent|aint)$|n't/;
  const PUNT_NLTK = /^[.:;!?]$/;
  const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  function tokensCrudos(t) { return t.match(TOKEN) || []; }
  function tokens(t) { return tokensCrudos(t).map((x) => x.toLowerCase()); }
  function oraciones(t) { return (t.match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter((s) => s.length > 0); }
  function r4(x) { return Math.round(x * 1e4) / 1e4; }

  // Formato «g» de Python con coma decimal (+2, -0,5, 1,5)
  function g(x, signo = true) {
    let s = String(Number(x.toPrecision(6)));
    if (s === "-0") s = "0";
    if (signo && !s.startsWith("-")) s = "+" + s;
    return s.replace(".", ",");
  }

  function multipalabra(toks, i, frases) {
    for (const f of frases) {
      const fs = f.split(" ");
      let ok = true;
      for (let k = 0; k < fs.length; k++) if (toks[i + k] !== fs[k]) { ok = false; break; }
      if (ok) return fs.length;
    }
    return 0;
  }

  const OPC_DEF = { negacion: "cambio", usar_negacion: true, usar_intensidad: true, usar_adversativos: true, usar_irrealidad: true, ventana: 3 };

  function puntuarOracion(oracion, lex, mods, opciones) {
    const o = Object.assign({}, OPC_DEF, opciones || {});
    const toks = tokens(oracion);
    const negadores = new Set(mods.negadores);
    const inten = mods.intensificadores, atenu = mods.atenuantes;
    const advers = mods.adversativos_previo_debil, concesivos = mods.concesivos_clausula_debil;
    const irreal = new Set(mods.irrealidad);
    const pregunta = toks.includes("¿") || toks.includes("?");
    const clausula = [], inicio = { 0: 0 }, marcas = [], aunque = new Set();
    let idc = 0, i = 0;
    while (i < toks.length) {
      const nadv = multipalabra(toks, i, advers);
      if (PUNT_CLAUSULA.has(toks[i])) { idc += 1; inicio[idc] = i + 1; }
      else if (nadv) {
        marcas.push(i); idc += 1; inicio[idc] = i + nadv;
        for (let k = 0; k < nadv; k++) clausula.push(idc);
        i += nadv; continue;
      } else if (concesivos.includes(toks[i])) { idc += 1; inicio[idc] = i + 1; aunque.add(idc); }
      clausula.push(idc); i += 1;
    }
    const traza = [];
    let total = 0;
    toks.forEach((t, i) => {
      if (!tiene(lex, t)) return;
      let v = lex[t];
      const pasos = [`${t} = ${lex[t] > 0 ? "+" : ""}${lex[t]}`];
      const cl = clausula[i];
      const ini = tiene(inicio, cl) ? inicio[cl] : 0;
      const primera = ini < toks.length ? toks[ini] : "";
      if (o.usar_irrealidad && (pregunta || irreal.has(primera))) {
        traza.push({ pos: i, token: t, valor: 0, pasos: pasos.concat(["irrealidad: se ignora"]) });
        return;
      }
      if (o.usar_negacion) {
        let neg = false;
        for (let j = Math.max(0, i - o.ventana); j < i; j++) {
          if (clausula[j] !== cl || !negadores.has(toks[j])) continue;
          if (toks[j] === "poco" && j > 0 && toks[j - 1] === "un") continue;
          neg = true;
        }
        if (neg) {
          if (o.negacion === "cambio") { v = -v; pasos.push(`negación: cambio de signo → ${g(v)}`); }
          else { v = v > 0 ? v - 3 : v + 3; pasos.push(`negación: desplazamiento → ${g(v)}`); }
        }
      }
      if (o.usar_intensidad) {
        let f = null;
        if (i >= 2 && toks[i - 2] === "un" && toks[i - 1] === "poco") f = atenu["un poco"];
        else if (i >= 1 && tiene(inten, toks[i - 1])) f = inten[toks[i - 1]];
        else if (i >= 1 && tiene(atenu, toks[i - 1])) f = atenu[toks[i - 1]];
        else if (i >= 2 && negadores.has(toks[i - 1]) && tiene(inten, toks[i - 2])) f = inten[toks[i - 2]];
        if (f !== null) { v *= f; pasos.push(`modificador ×${g(f, false)} → ${g(v)}`); }
      }
      if (o.usar_adversativos) {
        if (marcas.some((m) => m > i)) { v *= 0.5; pasos.push(`antes de «pero»: ×0,5 → ${g(v)}`); }
        else if (aunque.has(cl)) { v *= 0.5; pasos.push(`cláusula con «aunque»: ×0,5 → ${g(v)}`); }
      }
      total += v;
      traza.push({ pos: i, token: t, valor: r4(v), pasos });
    });
    return { puntuacion: r4(total), traza, tokens: toks };
  }

  function puntuarTexto(texto, lex, mods, opciones) {
    const res = oraciones(texto).map((o) => Object.assign({ oracion: o }, puntuarOracion(o, lex, mods, opciones)));
    return { puntuacion: r4(res.reduce((a, b) => a + b.puntuacion, 0)), oraciones: res };
  }

  function etiqueta(p, umbral = 0) { return p > umbral ? "positiva" : (p < -umbral ? "negativa" : "neutra"); }

  function marcarNegacion(texto) {
    const NEG = new Set(["no", "nunca", "jamás", "tampoco", "ni", "sin"]);
    const out = [];
    let activo = false;
    for (const t of tokens(texto)) {
      if (PUNT_CLAUSULA.has(t) || FIN_ORACION.has(t) || t === "¿" || t === "¡" || t === "pero" || t === "aunque") { activo = false; continue; }
      if (NEG.has(t)) { activo = true; out.push(t); continue; }
      out.push(activo ? "NO_" + t : t);
    }
    return out.join(" ");
  }

  // mark_negation de NLTK 3.10 (lista inglesa, distingue mayúsculas; solo . : ; ! ? cierran el alcance)
  function markNegationNltk(texto) {
    const out = [];
    let neg = false;
    for (const w of tokensCrudos(texto)) {
      if (NEG_NLTK.test(w)) {
        if (!neg) { neg = true; out.push(w); continue; }
        out.push(w + "_NEG");
      } else if (neg && PUNT_NLTK.test(w)) { neg = false; out.push(w); }
      else if (neg) out.push(w + "_NEG");
      else out.push(w);
    }
    return out.join(" ");
  }

  function deEstrellas(e, pos, neg) { return e >= pos ? "positiva" : (e <= neg ? "negativa" : "neutra"); }

  function cruceEstrellas(resenas, pos, neg) {
    const cruce = {};
    let coinciden = 0;
    for (const r of resenas) {
      const e = Number(r.estrellas);
      cruce[r.polaridad] = cruce[r.polaridad] || {};
      cruce[r.polaridad][e] = (cruce[r.polaridad][e] || 0) + 1;
      const l = deEstrellas(e, pos, neg);
      if (l === r.polaridad || (l === "neutra" && r.polaridad === "mixta")) coinciden += 1;
    }
    return { cruce, coinciden };
  }

  // Agregación de frases con las probabilidades precalculadas (BETO + regresión logística, Clase 13)
  function agregar(regla, frases, pb) {
    const p = frases.map((f) => pb[f.id_frase][0]);
    const suma = (xs) => xs.reduce((a, x) => a + (x - 0.5), 0);
    if (regla === "suma") return suma(p) > 0 ? "positiva" : "negativa";
    if (regla === "mayoria") {
      const v = p.filter((x) => x > 0.5).length;
      if (v > p.length / 2) return "positiva";
      if (v < p.length / 2) return "negativa";
      return p[p.length - 1] > 0.5 ? "positiva" : "negativa";
    }
    if (regla === "ultima_frase") return p[p.length - 1] > 0.5 ? "positiva" : "negativa";
    let s = p.filter((x, k) => pb[frases[k].id_frase][1] === "subjetiva");
    if (!s.length) s = p;
    return suma(s) > 0 ? "positiva" : "negativa";
  }

  function frasesDe(frases) {
    const m = {};
    for (const f of frases) (m[f.id] = m[f.id] || []).push(f);
    return m;
  }

  function aspectosUmbral(D, u) {
    const fd = frasesDe(D.frases);
    const frec = {};
    for (const dom of ["restaurante", "alojamiento", "tecnologia", "compras"]) {
      const df = {};
      for (const r of D.resenas) {
        if (r.dominio !== dom || r.conjunto !== "entrenamiento") continue;
        const ns = new Set();
        for (const f of fd[r.id]) for (const n of D.nombres[f.id_frase]) ns.add(n);
        for (const n of ns) df[n] = (df[n] || 0) + 1;
      }
      frec[dom] = new Set(Object.keys(df).filter((n) => df[n] >= u));
    }
    let tp = 0, fp = 0, fn = 0;
    const detalle = [];
    for (const f of D.frases) {
      if (f.conjunto !== "prueba") continue;
      const oro = new Set(f.aspectos.split(" ").filter(Boolean).map((a) => a.slice(0, -1)));
      const pred = new Set(D.nombres[f.id_frase].filter((n) => frec[f.dominio].has(n)));
      let a = 0;
      for (const x of pred) if (oro.has(x)) a += 1;
      tp += a; fp += pred.size - a; fn += oro.size - a;
      detalle.push({ f, oro: [...oro], pred: [...pred] });
    }
    const candidatos = {};
    for (const d in frec) candidatos[d] = frec[d].size;
    return { candidatos, aciertos: tp, extraidos: tp + fp, oro: tp + fn, frecuentes: frec, detalle };
  }

  function turney(D, pos, neg) {
    const ent = D.resenas.filter((r) => r.conjunto === "entrenamiento").map((r) => r.id);
    const lem = (id) => D.lemas[id];
    const hp = ent.filter((i) => lem(i).includes(pos)).length;
    const hn = ent.filter((i) => lem(i).includes(neg)).length;
    const conteo = {}, cp = {}, cn = {};
    for (const i of ent) {
      const tp = lem(i).includes(pos), tn = lem(i).includes(neg);
      for (const f of D.frases2[i]) {
        conteo[f] = (conteo[f] || 0) + 1;
        cp[f] = (cp[f] || 0) + (tp ? 1 : 0);
        cn[f] = (cn[f] || 0) + (tn ? 1 : 0);
      }
    }
    const so = {};
    for (const f in conteo) so[f] = Math.log2(((cp[f] + 0.01) * (hn + 0.01)) / ((cn[f] + 0.01) * (hp + 0.01)));
    let cub = 0, acc = 0;
    const pru = D.resenas.filter((r) => r.conjunto === "prueba" && r.polaridad !== "mixta");
    for (const r of pru) {
      const vals = D.frases2[r.id].filter((f) => tiene(so, f) && (cp[f] || cn[f])).map((f) => so[f]);
      if (vals.length) cub += 1;
      if (etiqueta(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0) === r.polaridad) acc += 1;
    }
    const frases = Object.keys(conteo);
    const utiles = frases.filter((f) => cp[f] || cn[f]).map((f) => ({ frase: f, so: so[f], docs: conteo[f], pos: cp[f], neg: cn[f] }));
    return { hits: [hp, hn], frases: frases.length, sin_coocurrencia: frases.length - utiles.length, cubiertos: cub, aciertos: acc, utiles };
  }

  const API = { tokens, tokensCrudos, oraciones, g, puntuarOracion, puntuarTexto, etiqueta, marcarNegacion, markNegationNltk,
    deEstrellas, cruceEstrellas, agregar, frasesDe, aspectosUmbral, turney };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  raiz.LIB07 = API;
})(typeof window !== "undefined" ? window : globalThis);
