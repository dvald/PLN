// Modo clase: utilidades comunes de las demos de PLN para proyectar en la clase en directo.
// Solo HTML y JavaScript del navegador: funciona abriendo el archivo y en GitHub Pages.
(function () {
  "use strict";
  const CLAVE_ESCALA = "pln-demos-escala";
  const root = document.documentElement;
  const Clase = (window.Clase = window.Clase || {});

  // ------------------------------------------------------------ tamaño de letra
  let escala = 1;
  try {
    const guardada = parseFloat(localStorage.getItem(CLAVE_ESCALA));
    if (Number.isFinite(guardada)) escala = guardada;
  } catch (e) { /* El almacenamiento bloqueado no impide utilizar las demos. */ }
  function aplicarEscala(v) {
    escala = Math.min(1.6, Math.max(0.7, Math.round(v * 100) / 100));
    root.style.setProperty("--escala", escala);
    try { localStorage.setItem(CLAVE_ESCALA, escala); } catch (e) { /* modo privado */ }
  }
  aplicarEscala(escala);

  // ------------------------------------------------------------ pestañas
  const pestanas = () => [...document.querySelectorAll('[role="tab"]')];
  const panelDe = (t) => document.getElementById(t.getAttribute("aria-controls"));
  const panelActivo = () => { const t = pestanas().find((x) => x.getAttribute("aria-selected") === "true"); return t ? panelDe(t) : document; };
  function irAPestana(t) {
    if (!t) return;
    t.click();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    window.scrollTo({ top: 0 });
  }
  Clase.irAPestana = (id) => irAPestana(pestanas().find((t) => t.getAttribute("aria-controls") === "p-" + id));

  // ------------------------------------------------------------ pasos
  const pasos = [];
  let ultimoPaso = null;
  const visible = (el) => !!(el && el.offsetParent !== null);
  // Crea unos controles «Anterior / Siguiente» dentro de host. opts: {total, pintar(k), etiqueta(k), inicio}
  Clase.pasos = function (host, opts) {
    const ctrl = document.createElement("div");
    ctrl.className = "pasos-ctrl";
    ctrl.innerHTML = '<button type="button" class="pasos-ant">◀ Anterior</button><span class="pasos-ind" aria-live="polite"></span><button type="button" class="pasos-sig">Siguiente ▶</button>';
    host.append(ctrl);
    const [ant, ind, sig] = ctrl.children;
    const total = () => (typeof opts.total === "function" ? opts.total() : opts.total);
    let k = opts.inicio || 0;
    const api = {
      el: ctrl,
      get k() { return k; },
      ir(n) {
        const N = total();
        if (!N) { ind.textContent = "—"; ant.disabled = sig.disabled = true; return; }
        k = Math.max(0, Math.min(N - 1, n));
        opts.pintar(k);
        ind.textContent = (opts.etiqueta ? opts.etiqueta(k) + " · " : "") + (k + 1) + " / " + N;
        ant.disabled = k === 0; sig.disabled = k === N - 1;
      },
      sig() { if (k < total() - 1) api.ir(k + 1); },
      ant() { if (k > 0) api.ir(k - 1); },
    };
    ant.addEventListener("click", () => { ultimoPaso = api; api.ant(); });
    sig.addEventListener("click", () => { ultimoPaso = api; api.sig(); });
    pasos.push(api);
    api.ir(k);
    return api;
  };
  Clase.marcarPasoActivo = (api) => { ultimoPaso = api; };
  function pasoParaTeclado() {
    const panel = panelActivo();
    if (ultimoPaso && visible(ultimoPaso.el) && panel.contains(ultimoPaso.el)) return ultimoPaso;
    return pasos.find((p) => visible(p.el) && panel.contains(p.el)) || null;
  }

  // ------------------------------------------------------------ «ocultar soluciones»
  // Botón que alterna entre caso resuelto y modo pregunta. alCambiar(oculto) redibuja lo necesario.
  Clase.botonPregunta = function (host, alCambiar, textos) {
    const t = Object.assign({ ver: "Ocultar soluciones para preguntar", ocultas: "Mostrar todas las soluciones" }, textos || {});
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn-pregunta"; b.setAttribute("aria-pressed", "false"); b.textContent = t.ver;
    b.addEventListener("click", () => {
      const oculto = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(oculto));
      b.textContent = oculto ? t.ocultas : t.ver;
      alCambiar(oculto);
    });
    host.append(b);
    return b;
  };

  // ------------------------------------------------------------ utilidades de dibujo
  Clase.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  Clase.svg = (tag, attrs = {}, html) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  // ------------------------------------------------------------ al cargar
  function iniciar() {
    // Procedencia plegada tras un botón «i»
    document.querySelectorAll(".meta").forEach((m) => {
      if (!m.querySelector(".tag:not(.illus)") || m.querySelector(".fuentes-btn")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "fuentes-btn"; b.textContent = "i";
      b.title = "Procedencia de los datos y apartado del tema"; b.setAttribute("aria-label", b.title);
      b.addEventListener("click", () => m.classList.toggle("abierta"));
      m.append(b);
    });
    // Controles del profesor en la cabecera
    const cab = document.querySelector(".header");
    if (cab && !cab.querySelector(".clase-ctrl")) {
      const c = document.createElement("div");
      c.className = "clase-ctrl";
      c.innerHTML = '<button type="button" data-a="-" title="Letra más pequeña (tecla −)">A−</button><button type="button" data-a="+" title="Letra más grande (tecla +)">A+</button><button type="button" data-a="?" title="Atajos de teclado (tecla ?)">?</button>';
      const ayuda = document.createElement("div");
      ayuda.className = "clase-ayuda"; ayuda.hidden = true;
      ayuda.innerHTML = "<b>Atajos para proyectar</b><dl>" +
        "<dt><kbd>1</kbd>…<kbd>9</kbd> <kbd>0</kbd></dt><dd>Ir a la pestaña 1-9 (0 = 10)</dd>" +
        "<dt><kbd>[</kbd> <kbd>]</kbd></dt><dd>Pestaña anterior / siguiente</dd>" +
        "<dt><kbd>→</kbd> <kbd>←</kbd></dt><dd>Paso siguiente / anterior (también Av Pág / Re Pág del mando)</dd>" +
        "<dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>Tamaño de la letra</dd>" +
        "<dt><kbd>i</kbd></dt><dd>Mostrar u ocultar la procedencia de los datos</dd></dl>";
      c.addEventListener("click", (e) => {
        const a = e.target.dataset.a;
        if (a === "+") aplicarEscala(escala + 0.1);
        else if (a === "-") aplicarEscala(escala - 0.1);
        else if (a === "?") ayuda.hidden = !ayuda.hidden;
      });
      cab.append(c, ayuda);
    }
    // Enlaces directos a una pestaña: demo.html#id (id = aria-controls sin «p-»)
    const h = location.hash.slice(1);
    if (h) { const t = pestanas().find((x) => x.getAttribute("aria-controls") === "p-" + h); if (t && t.getAttribute("aria-selected") !== "true") t.click(); }
    pestanas().forEach((t) => t.addEventListener("click", () => history.replaceState(null, "", "#" + t.getAttribute("aria-controls").replace(/^p-/, ""))));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();

  // ------------------------------------------------------------ teclado
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const ts = pestanas();
    const i = ts.findIndex((t) => t.getAttribute("aria-selected") === "true");
    if (/^[0-9]$/.test(e.key)) {
      const n = e.key === "0" ? 9 : +e.key - 1;
      if (ts[n]) { irAPestana(ts[n]); e.preventDefault(); }
    } else if (e.key === "]" && ts.length) { irAPestana(ts[(i + 1) % ts.length]); e.preventDefault(); }
    else if (e.key === "[" && ts.length) { irAPestana(ts[(i - 1 + ts.length) % ts.length]); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { aplicarEscala(escala + 0.1); e.preventDefault(); }
    else if (e.key === "-") { aplicarEscala(escala - 0.1); e.preventDefault(); }
    else if (e.key === "i") { document.querySelectorAll(".meta").forEach((m) => m.classList.toggle("abierta")); }
    else if (e.key === "?") { const a = document.querySelector(".clase-ayuda"); if (a) a.hidden = !a.hidden; }
    else if (["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(e.key)) {
      if (e.target.closest && e.target.closest('[role="tab"]')) return; // las flechas sobre una pestaña cambian de pestaña
      const p = pasoParaTeclado();
      if (!p) return;
      e.preventDefault();
      ultimoPaso = p;
      if (e.key === "ArrowRight" || e.key === "PageDown") p.sig(); else p.ant();
    }
  });
})();
