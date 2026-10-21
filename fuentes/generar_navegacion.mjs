// Escribe la navegación de las demos a partir de fuentes/temas_demos.mjs:
//   · en cada tema y en repaso.html: título de la pestaña del navegador, icono, color del bloque (<body>),
//     cabecera con menú (índice, temas 1-10, anterior y siguiente) y números de las pestañas;
//   · en index.html: la ruta por semanas y las tarjetas agrupadas por bloque, con enlace directo a cada pestaña.
// Uso (desde Demos/ o desde la raíz): node Demos/fuentes/generar_navegacion.mjs
// Es idempotente: si no cambia nada, no reescribe ningún archivo.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOQUES, ORDEN_BLOQUES, TEMAS, REPASO, glifo } from "./temas_demos.mjs";

const DEMOS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const leer = (f) => readFileSync(join(DEMOS, f), "utf8");
const cambiados = [];
function escribir(f, txt) {
  if (leer(f) !== txt) { writeFileSync(join(DEMOS, f), txt); cambiados.push(f); }
}
function sustituir(txt, re, por, f, que) {
  if (!re.test(txt)) throw new Error(`${f}: no encuentro ${que}`);
  return txt.replace(re, () => por);
}
const lista = (xs) => (xs.length < 2 ? String(xs[0]) : xs.slice(0, -1).join(", ") + " y " + xs.at(-1));
const semanas = (t) => t.extra || (t.semanas.length === 1 ? `semana ${t.semanas[0]}`
  : t.semanas.length === 2 ? `semanas ${t.semanas[0]} y ${t.semanas[1]}` : `semanas ${t.semanas[0]} a ${t.semanas.at(-1)}`);
const cuando = (t) => `${t.clases} · ${semanas(t)}`;
const colores = (b) => `--c:${BLOQUES[b].color};--cf:${BLOQUES[b].fuerte};--cl:${BLOQUES[b].claro}`;

// Pestañas de una página: «N · Nombre» o, ya convertidas, «<span class="tab-n">N</span> Nombre»
const RE_TAB = /<button class="tab"([^>]*)>(?:<span class="tab-n">(\d+)<\/span> ?|(\d+) · )([^<]*)<\/button>/g;
const pestanas = (html) => [...html.matchAll(RE_TAB)].map((m) => ({
  id: (m[1].match(/aria-controls="p-([^"]+)"/) || [])[1], n: +(m[2] || m[3]), t: m[4].trim(),
}));

// ------------------------------------------------------------------ cabecera de cada página
function migas(k) {
  const chips = TEMAS.map((t, i) => `<a href="${t.f}" style="--c:${BLOQUES[t.bloque].fuerte}" title="Tema ${t.n} · ${esc(t.corto)}"`
    + `${i === k ? ' aria-current="page"' : ""}>${t.n}</a>`).join("");
  let h = `<a class="inicio" href="index.html">⌂ Índice</a><span class="chips">${chips}</span>`;
  if (k > 0) h += `<a class="ant" href="${TEMAS[k - 1].f}">‹ Tema ${TEMAS[k - 1].n} · ${esc(TEMAS[k - 1].corto)}</a>`;
  if (k >= 0 && k < TEMAS.length - 1) h += `<a class="sig" href="${TEMAS[k + 1].f}">Tema ${TEMAS[k + 1].n} · ${esc(TEMAS[k + 1].corto)} ›</a>`;
  return `<nav class="migas" aria-label="Navegación entre temas">${h}</nav>`;
}
function cabecera(c) {
  return `<header class="header">\n  ${migas(c.k)}\n  <h1><span class="num-tema">${c.etiqueta}</span>${esc(c.titulo)}</h1>\n`
    + `  <p>${esc(c.desc)}</p>\n`
    + `  <div class="header-glifo">${glifo(c.glifo)}</div>\n</header>`;
}
function retocar(f, c) {
  let h = leer(f);
  h = sustituir(h, /<title>[^<]*<\/title>/, `<title>${esc(c.pestana)} — Procesamiento del Lenguaje Natural</title>`, f, "el título");
  h = sustituir(h, /<link rel="icon"[^>]*>/, '<link rel="icon" href="comun/icono.svg" type="image/svg+xml">', f, "el icono");
  h = sustituir(h, /<body[^>]*>/, `<body class="bloque-${c.bloque}">`, f, "<body>");
  h = sustituir(h, /<div class="header">[\s\S]*?<\/div>|<header class="header">[\s\S]*?<\/header>/, cabecera(c), f, "la cabecera");
  h = h.replace(RE_TAB, (m, attrs, n1, n2, txt) => `<button class="tab"${attrs}><span class="tab-n">${n1 || n2}</span> ${txt.trim()}</button>`);
  escribir(f, h);
  return h;
}

const tabsDe = {};
TEMAS.forEach((t, k) => {
  const h = retocar(t.f, { k, etiqueta: `TEMA ${t.n}`, titulo: t.titulo, desc: t.desc, cuando: cuando(t), glifo: t.n,
    bloque: t.bloque, pestana: `Tema ${t.n} · ${t.titulo}` });
  tabsDe[t.f] = pestanas(h);
  if (!tabsDe[t.f].length || tabsDe[t.f].some((p) => !p.id)) throw new Error(`${t.f}: pestañas sin identificar`);
});
retocar(REPASO.f, { k: -1, etiqueta: REPASO.etiqueta, titulo: REPASO.titulo, glifo: "repaso", bloque: REPASO.bloque,
  desc: "Para estudiar por cuenta propia: las preguntas de los Temas 5 a 10, con su explicación al responder.", pestana: REPASO.titulo });

// ------------------------------------------------------------------ índice
function tarjeta(t) {
  const ps = tabsDe[t.f];
  return `      <article class="tema" style="${colores(t.bloque)}">
        <a class="tema-enl" href="${t.f}">
          <span class="tema-glifo">${glifo(t.n)}</span>
          <span class="n">TEMA ${t.n}</span>
          <h3>${esc(t.titulo)}</h3>
          <p>${esc(t.desc)}</p>
        </a>
        <ol class="pest" aria-label="Pestañas del Tema ${t.n}">
${ps.map((p) => `          <li><a href="${t.f}#${p.id}"><b>${p.n}</b>${esc(p.t)}</a></li>`).join("\n")}
        </ol>
        <div class="tema-pie"><span>${ps.length} pestañas</span></div>
      </article>`;
}
const ruta = TEMAS.map((t) => `<a href="${t.f}"${t.semanas.length < 2 ? ' class="corto"' : ""} style="${colores(t.bloque)};grid-column:span ${t.semanas.length}" `
  + `title="Tema ${t.n} · ${esc(t.titulo)} (${esc(semanas(t))})"><b>${t.n}</b><span>${esc(t.corto)}</span></a>`).join("\n      ")
  + '\n      <span class="examen corto" title="Semana 16: exámenes"><span>Examen</span></span>';
const semanasEtq = Array.from({ length: 16 }, (_, i) => `<span>S${i + 1}</span>`).join("");
const bloques = ORDEN_BLOQUES.map((b) => {
  const ts = TEMAS.filter((t) => t.bloque === b);
  return `  <section class="bloque" style="${colores(b)}">
    <h2 class="bloque-titulo">${esc(BLOQUES[b].nombre)} <small>Temas ${lista(ts.map((t) => t.n))}</small></h2>
    <div class="temas">
${ts.map(tarjeta).join("\n")}
    </div>
  </section>`;
}).join("\n\n");
const repaso = `  <section class="bloque" style="${colores("repaso")}">
    <h2 class="bloque-titulo">${esc(BLOQUES.repaso.nombre)}</h2>
    <div class="temas uno">
      <article class="tema" style="${colores("repaso")}">
        <a class="tema-enl" href="${REPASO.f}">
          <span class="tema-glifo">${glifo("repaso")}</span>
          <span class="n">REPASO</span>
          <h3>${esc(REPASO.titulo)}</h3>
          <p>${esc(REPASO.desc)}</p>
        </a>
        <div class="tema-pie"><span>${esc(REPASO.pie)}</span></div>
      </article>
    </div>
  </section>`;
const bloqueIndice = `<!-- inicio:temas · generado por fuentes/generar_navegacion.mjs a partir de fuentes/temas_demos.mjs; no editar a mano -->
  <section class="ruta" aria-label="Ruta del curso por semanas">
    <h2>Ruta del curso <small>16 semanas · pulsa un tema para abrir su demo</small></h2>
    <div class="ruta-barra">
      ${ruta}
    </div>
    <div class="ruta-sem" aria-hidden="true">${semanasEtq}</div>
  </section>

${bloques}

${repaso}
  <!-- fin:temas -->`;
let ind = leer("index.html");
ind = sustituir(ind, /<!-- inicio:temas[\s\S]*?<!-- fin:temas -->/, bloqueIndice, "index.html", "las marcas inicio:temas / fin:temas");
escribir("index.html", ind);

console.log(cambiados.length ? "Actualizados: " + cambiados.join(", ") : "Sin cambios");
console.log(TEMAS.map((t) => `Tema ${t.n}: ${tabsDe[t.f].length} pestañas`).join(" · "));
