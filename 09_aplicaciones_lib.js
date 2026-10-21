// Biblioteca de la demo del Tema 9 (Aplicaciones de PLN). Funciones puras, sin dependencias.
// Reproduce en el navegador los cálculos de Python de la asignatura (comprobado con Demos/fuentes/probar_lib_09.js):
//   - chrF de sacrebleu 2.6.0 (n-gramas de caracteres sin espacios, orden efectivo, F-beta)
//   - TfidfVectorizer de scikit-learn 1.9.1 (minúsculas, idf suavizado, normalización L2)
//   - ROUGE-1, frases y cifras ajenas (Temas/Tema09/recursos/t9_comun.py)
//   - agente de marcos para reservar tutorías (Temas/Tema09/recursos/agente_tutorias.py)
//   - normalizador de cifras y alineamiento de la WER (t9_comun.py)
(function (raiz) {
  "use strict";
  const W = "[\\p{L}\\p{N}_]";                 // \w de Python con Unicode
  const B = "(?<![\\p{L}\\p{N}_])";            // \b al inicio de una palabra
  const E = "(?![\\p{L}\\p{N}_])";             // \b al final de una palabra
  const re = (s, f) => new RegExp(s.replace(/\\w/g, W).replace(/\\bI/g, B).replace(/\\bF/g, E), "u" + (f || ""));

  // ------------------------------------------------------------------ chrF
  function ngramas(texto, n) {
    const s = Array.from(texto.split(/\s+/).join(""));
    const c = new Map();
    for (let i = 0; i + n <= s.length; i++) {
      const g = s.slice(i, i + n).join("");
      c.set(g, (c.get(g) || 0) + 1);
    }
    return c;
  }
  function suma(c) { let t = 0; for (const v of c.values()) t += v; return t; }
  function coincidencias(a, b) { let t = 0; for (const [k, v] of a) if (b.has(k)) t += Math.min(v, b.get(k)); return t; }
  function estadisticas(ref, hip, nMax) {
    const st = [];
    for (let n = 1; n <= nMax; n++) {
      const r = ngramas(ref, n), h = ngramas(hip, n);
      st.push({ n, hip: suma(h), ref: suma(r), coinc: coincidencias(h, r) });
    }
    return st;
  }
  function chrfDesdeEst(st, beta) {
    let P = 0, R = 0, ef = 0;
    const ordenes = st.map((o) => {
      const p = o.hip > 0 ? o.coinc / o.hip : null, r = o.ref > 0 ? o.coinc / o.ref : null;
      if (o.hip > 0 && o.ref > 0) { P += p; R += r; ef += 1; }
      return Object.assign({ p, r, efectivo: o.hip > 0 && o.ref > 0 }, o);
    });
    if (ef === 0) return { ordenes, P: 0, R: 0, puntuacion: 0 };
    P /= ef; R /= ef;
    const f = beta * beta;
    const puntuacion = (P + R) ? 100 * (1 + f) * P * R / (f * P + R) : 0;
    return { ordenes, P, R, puntuacion };
  }
  function chrf(ref, hip, nMax = 6, beta = 2) { return chrfDesdeEst(estadisticas(ref, hip, nMax), beta); }
  function chrfCorpus(hips, refs, nMax = 6, beta = 2) {
    const tot = [];
    hips.forEach((h, k) => estadisticas(refs[k], h, nMax).forEach((o, i) => {
      tot[i] = tot[i] || { n: o.n, hip: 0, ref: 0, coinc: 0 };
      tot[i].hip += o.hip; tot[i].ref += o.ref; tot[i].coinc += o.coinc;
    }));
    return chrfDesdeEst(tot, beta).puntuacion;
  }

  // ------------------------------------------------------------------ TF-IDF (scikit-learn)
  function tokensTfidf(texto, minimo) {
    return texto.toLowerCase().match(new RegExp(W + "{" + minimo + ",}", "gu")) || [];
  }
  function Tfidf(docs, minimo) {
    this.minimo = minimo;
    const df = new Map();
    const conteos = docs.map((d) => {
      const c = new Map();
      for (const t of tokensTfidf(d, minimo)) c.set(t, (c.get(t) || 0) + 1);
      for (const t of c.keys()) df.set(t, (df.get(t) || 0) + 1);
      return c;
    });
    const n = docs.length;
    this.idf = new Map();
    for (const [t, v] of df) this.idf.set(t, Math.log((1 + n) / (1 + v)) + 1);
    this.vectores = conteos.map((c) => this.pesar(c));
  }
  Tfidf.prototype.pesar = function (c) {
    const v = new Map(); let norma = 0;
    for (const [t, k] of c) { if (!this.idf.has(t)) continue; const w = k * this.idf.get(t); v.set(t, w); norma += w * w; }
    norma = Math.sqrt(norma);
    if (norma > 0) for (const [t, w] of v) v.set(t, w / norma);
    return v;
  };
  Tfidf.prototype.transformar = function (texto) {
    const c = new Map();
    for (const t of tokensTfidf(texto, this.minimo)) c.set(t, (c.get(t) || 0) + 1);
    return this.pesar(c);
  };
  function producto(a, b) { let s = 0; const [x, y] = a.size < b.size ? [a, b] : [b, a]; for (const [t, w] of x) if (y.has(t)) s += w * y.get(t); return s; }

  // ------------------------------------------------------------------ Resumen
  function frases(texto) {
    return texto.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/u).map((f) => f.trim()).filter(Boolean);
  }
  function palabras(texto) { return texto.toLowerCase().match(new RegExp(W + "+", "gu")) || []; }
  function rouge1(ref, hip) {
    const cuenta = (l) => l.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
    const r = cuenta(palabras(ref)), h = cuenta(palabras(hip));
    const comunes = coincidencias(h, r);
    const p = comunes / Math.max(1, suma(h)), e = comunes / Math.max(1, suma(r));
    return { precision: p, exhaustividad: e, f1: p + e ? 2 * p * e / (p + e) : 0 };
  }
  function cifrasAjenas(fuente, resumen) {
    const presentes = new Set(fuente.match(/\d+(?:[.,]\d+)*/g) || []);
    return (resumen.match(/\d+(?:[.,]\d+)*/g) || []).filter((n) => !presentes.has(n));
  }

  // ------------------------------------------------------------------ Agente de marcos
  const HORAS = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
  const INTENCIONES = [
    ["cancelar", re("\\bI(cancel\\w*|anul\\w*|quit\\w*|borr\\w*)\\bF")],
    ["consultar_horario", re("\\bI(horario\\w*|cuándo puedo|a qué hora|hay tutorías|tenéis tutorías)\\bF")],
    ["reservar", re("\\bI(reserv\\w*|cita|tutoría\\w*|apúnta\\w*)\\bF")],
    ["negar", re("^no\\bF")],
    ["confirmar", re("^(sí|vale|perfecto|de acuerdo|confírm\\w*)\\bF")],
    ["despedida", re("\\bI(adiós|hasta luego|hasta pronto)\\bF")],
    ["saludo", re("^(hola|buenos días|buenas tardes|buenas noches|buenas)\\bF")],
  ];
  const REGLA_EXTRA = ["cancelar", re("\\bIno puedo ir\\bF")];
  const PREGUNTAS = { tema: "¿De qué tema es la tutoría (1 a 10)?", dia: "¿Qué día te viene bien?", hora: "¿A qué hora?",
    modalidad: "¿Prefieres videollamada o foro?" };
  function quitarBordes(t) { return t.replace(/^[ ¿?¡!.]+|[ ¿?¡!.]+$/gu, ""); }
  function huecos(texto) {
    const t = texto.toLowerCase(), h = {};
    let m = t.match(re("\\bItema\\s+(\\d{1,2})\\bF"));
    if (m && +m[1] >= 1 && +m[1] <= 10) h.tema = m[1];
    m = t.match(re("\\bI(lunes|martes|miércoles|jueves|viernes)\\bF"));
    if (m) h.dia = m[1];
    m = t.match(re("\\bI(\\d{1,2}):(\\d{2})\\bF"));
    if (m) h.hora = String(+m[1]).padStart(2, "0") + ":" + m[2];
    else {
      m = t.match(re("\\bIlas\\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\\s+y\\s+(media|cuarto))?\\bF"));
      if (m) {
        let hh = HORAS[m[1]]; if (hh <= 8) hh += 12;
        h.hora = String(hh).padStart(2, "0") + ":" + ({ media: "30", cuarto: "15" }[m[2]] || "00");
      }
    }
    m = t.match(re("\\bI(videollamada|foro)\\bF"));
    if (m) h.modalidad = m[1];
    return h;
  }
  function comprender(texto, conReglaExtra) {
    const t = quitarBordes(texto.toLowerCase());
    const reglas = conReglaExtra ? [INTENCIONES[0], REGLA_EXTRA].concat(INTENCIONES.slice(1)) : INTENCIONES;
    for (const [nombre, patron] of reglas) if (patron.test(t)) return { intencion: nombre, huecos: huecos(texto), regla: patron.source };
    const h = huecos(texto);
    return { intencion: Object.keys(h).length ? "informar" : "fuera_de_dominio", huecos: h, regla: null };
  }
  function disponible(dia, hora) { const hh = +hora.slice(0, 2); return dia === "viernes" ? hh >= 9 && hh < 13 : hh >= 16 && hh < 20; }
  function Agente(conReglaExtra) { this.marco = {}; this.tarea = null; this.esperando = false; this.extra = !!conReglaExtra; }
  Agente.prototype.responder = function (texto) {
    const nlu = comprender(texto, this.extra), i = nlu.intencion, h = nlu.huecos;
    const r = (s) => ({ nlu, respuesta: s, marco: Object.assign({}, this.marco) });
    if (i === "saludo") return r("¡Hola! Puedo reservar, cancelar o informarte del horario de tutorías.");
    if (i === "despedida") return r("¡Hasta pronto!");
    if (i === "fuera_de_dominio") return r("Solo puedo ayudarte con las tutorías de la asignatura.");
    if (i === "consultar_horario") return r("Hay tutorías de lunes a jueves de 16:00 a 20:00 y los viernes de 9:00 a 13:00, por videollamada o foro.");
    if (i === "cancelar") {
      this.tarea = null; this.marco = {}; this.esperando = false;
      return r(h.dia ? `He cancelado tu tutoría del ${h.dia}.` : "¿Qué tutoría quieres cancelar? Dime el día.");
    }
    if (i === "negar" && this.esperando) {
      this.esperando = false; delete this.marco.dia; delete this.marco.hora;
      return r("De acuerdo. " + PREGUNTAS.dia);
    }
    if (i === "confirmar" && this.esperando) {
      const m = this.marco; this.tarea = null; this.marco = {}; this.esperando = false;
      return r(`Reservada: tema ${m.tema}, ${m.dia} a las ${m.hora} por ${m.modalidad}.`);
    }
    if (i === "reservar" || i === "informar" || this.tarea === "reservar") {
      this.tarea = "reservar";
      Object.assign(this.marco, h);
      if (this.marco.dia && this.marco.hora && !disponible(this.marco.dia, this.marco.hora)) {
        const d = this.marco.dia, hr = this.marco.hora; delete this.marco.dia; delete this.marco.hora;
        return r(`El ${d} a las ${hr} no hay tutorías (lunes a jueves de 16:00 a 20:00; viernes de 9:00 a 13:00). ` + PREGUNTAS.dia);
      }
      for (const k of ["tema", "dia", "hora", "modalidad"]) if (!(k in this.marco)) return r(PREGUNTAS[k]);
      this.esperando = true;
      const m = this.marco;
      return r(`¿Confirmo la tutoría del tema ${m.tema} el ${m.dia} a las ${m.hora} por ${m.modalidad}?`);
    }
    return r("No te he entendido. ¿Quieres reservar, cancelar o consultar el horario?");
  };

  // ------------------------------------------------------------------ Normalización de cifras
  const UNI = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
    "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
    "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const DEC = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };
  const CEN = { 1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos", 6: "seiscientos", 7: "setecientos",
    8: "ochocientos", 9: "novecientos" };
  function apocope(p) {
    if (p.endsWith("veintiuno")) return p.slice(0, -9) + "veintiún";
    if (p === "uno" || p.endsWith(" uno")) return p.slice(0, -3) + "un";
    return p;
  }
  function menorMil(n) {
    if (n < 30) return UNI[n];
    if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return DEC[d] + (u ? " y " + UNI[u] : ""); }
    if (n === 100) return "cien";
    const c = Math.floor(n / 100), r = n % 100;
    return CEN[c] + (r ? " " + menorMil(r) : "");
  }
  function cardinal(n) {
    if (n < 1000) return menorMil(n);
    if (n < 1000000) { const m = Math.floor(n / 1000), r = n % 1000; return (m === 1 ? "mil" : apocope(menorMil(m)) + " mil") + (r ? " " + menorMil(r) : ""); }
    const ml = Math.floor(n / 1000000), r = n % 1000000;
    return (ml === 1 ? "un millón" : apocope(cardinal(ml)) + " millones") + (r ? " " + cardinal(r) : "");
  }
  function decimales(c) { return c.startsWith("0") ? Array.from(c).map((d) => UNI[+d]).join(" ") : cardinal(+c); }
  function hora(h, m) {
    const b = cardinal(h);
    if (m === 0) return b + " en punto";
    if (m === 15) return b + " y cuarto";
    if (m === 30) return b + " y media";
    return b + " y " + cardinal(m);
  }
  const CODIGO = re("\\bI(clave|contraseña|código|pin|consigna)\\bF", "i");
  function verbalizar(texto) {
    let t = texto.replace(re("\\bI\\d{3,}\\bF", "g"), (m, off) => {
      const previo = texto.slice(Math.max(0, off - 40), off);
      return CODIGO.test(previo) ? Array.from(m).map((d) => UNI[+d]).join(" ") : m;
    });
    t = t.replace(re("\\bI(\\d+)-(\\d+)\\bF", "g"), (m, a, b) => cardinal(+a) + " a " + cardinal(+b));
    t = t.replace(re("\\bI(\\d{1,2}):(\\d{2})\\bF", "g"), (m, a, b) => hora(+a, +b));
    t = t.replace(/(\d+),(\d+)\s?%/gu, (m, a, b) => cardinal(+a) + " coma " + decimales(b) + " por ciento");
    t = t.replace(/(\d+)\s?%/gu, (m, a) => cardinal(+a) + " por ciento");
    t = t.replace(re("\\bI(\\d+),(\\d+)\\bF", "g"), (m, a, b) => cardinal(+a) + " coma " + decimales(b));
    t = t.replace(re("\\bI\\d{1,3}(?:\\.\\d{3})+\\bF", "g"), (m) => cardinal(+m.replace(/\./g, "")));
    t = t.replace(re("\\bI\\d+\\bF", "g"), (m) => cardinal(+m));
    t = t.replace(/\s?€/gu, " euros");
    return t.replace(/\s+/gu, " ").trim();
  }

  // ------------------------------------------------------------------ WER
  function normalizarParaWer(texto, verbalizarCifras) {
    let t = verbalizarCifras ? verbalizar(texto) : texto;
    t = t.toLowerCase().replace(new RegExp("[^\\p{L}\\p{N}_áéíóúüñ\\s]", "gu"), " ");
    return t.split(/\s+/u).filter(Boolean);
  }
  function alinear(ref, hip) {
    const n = ref.length, m = hip.length;
    const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(d[i - 1][j - 1] + (ref[i - 1] !== hip[j - 1] ? 1 : 0), d[i - 1][j] + 1, d[i][j - 1] + 1);
    let i = n, j = m; const pasos = [];
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] !== hip[j - 1] ? 1 : 0)) {
        pasos.push([ref[i - 1] === hip[j - 1] ? "=" : "S", ref[i - 1], hip[j - 1]]); i--; j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { pasos.push(["D", ref[i - 1], ""]); i--; }
      else { pasos.push(["I", "", hip[j - 1]]); j--; }
    }
    pasos.reverse();
    const c = { S: 0, D: 0, I: 0 };
    for (const p of pasos) if (p[0] in c) c[p[0]]++;
    return { S: c.S, D: c.D, I: c.I, N: n, pasos, wer: (c.S + c.D + c.I) / Math.max(1, n) };
  }

  // ------------------------------------------------------------------ Formato
  function num(x, d) { return Number(x).toFixed(d === undefined ? 1 : d).replace(".", ","); }
  function mrr(rangos) { return rangos.length ? rangos.reduce((s, r) => s + 1 / r, 0) / rangos.length : 0; }

  const LIB = { chrf, chrfCorpus, estadisticas, tokensTfidf, Tfidf, producto, frases, palabras, rouge1, cifrasAjenas,
    huecos, comprender, Agente, disponible, cardinal, verbalizar, normalizarParaWer, alinear, num, mrr };
  if (typeof module !== "undefined" && module.exports) module.exports = LIB;
  raiz.LIB09 = LIB;
})(typeof window !== "undefined" ? window : globalThis);
