// Prueba de una demo en Chrome sin interfaz: recorre sus pestañas, ejecuta acciones opcionales,
// recoge errores de consola y captura cada pestaña a tamaño de proyector (la página entera si no tiene pestañas).
// Uso: node Demos/fuentes/capturar_demo.mjs 01_introduccion.html [carpeta_salida] [acciones.json]
// acciones.json: {"p-id": ["código JS", ...]} se ejecuta en esa pestaña y captura tras cada acción.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEMOS = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [pagina, salida = "/tmp/pln_demos_capturas", accionesRuta] = process.argv.slice(2);
const acciones = accionesRuta ? JSON.parse(readFileSync(accionesRuta, "utf8")) : {};
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const [W, H] = (process.env.VENTANA || "1600x900").split("x").map(Number); // p. ej. VENTANA=390x844 para un móvil
mkdirSync(salida, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".wav": "audio/wav", ".svg": "image/svg+xml" };
const servidor = createServer((req, res) => {
  const ruta = join(DEMOS, decodeURIComponent(req.url.split("?")[0].split("#")[0]));
  if (!ruta.startsWith(DEMOS) || !existsSync(ruta)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TIPOS[extname(ruta)] || "application/octet-stream" });
  res.end(readFileSync(ruta));
}).listen(0, "127.0.0.1");
await new Promise((r) => servidor.on("listening", r));
const BASE = `http://127.0.0.1:${servidor.address().port}/`;

const PUERTO = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PUERTO}`, `--user-data-dir=/tmp/pln_chrome_${PUERTO}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
let objetivos = [];
for (let i = 0; i < 60 && !objetivos.length; i++) { try { objetivos = (await (await fetch(`http://127.0.0.1:${PUERTO}/json`)).json()).filter((t) => t.type === "page"); } catch { /* arrancando */ } await sleep(200); }
const ws = new WebSocket(objetivos[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errores = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") errores.push("Excepción: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(d.params.type)) errores.push("Consola: " + d.params.args.map((a) => a.value ?? a.description).join(" "));
  if (d.method === "Log.entryAdded" && d.params.entry.level === "error") errores.push("Registro: " + d.params.entry.text + " " + (d.params.entry.url || ""));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
await send("Page.enable"); await send("Runtime.enable"); await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 768 });
await send("Page.navigate", { url: BASE + pagina });
await sleep(2500);

async function capturar(nombre) {
  const h = Math.min(await ev("document.documentElement.scrollHeight"), 5000);
  const img = (await send("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: h, scale: 1 } })).result.data;
  writeFileSync(join(salida, nombre + ".jpg"), Buffer.from(img, "base64"));
  return h;
}
const informe = { pagina, fecha: new Date().toISOString(), ventana: `${W}x${H}`, pestanas: [] };
const n = await ev("document.querySelectorAll('[role=tab]').length");
for (let k = 0; k < n; k++) {
  await ev(`document.querySelectorAll('[role=tab]')[${k}].click(); window.scrollTo(0,0); 1`);
  await sleep(800);
  const pid = await ev(`document.querySelectorAll('[role=tab]')[${k}].getAttribute('aria-controls')`);
  const datos = await ev(`(() => { const p = document.getElementById('${pid}'); return { titulo: document.querySelectorAll('[role=tab]')[${k}].textContent.trim(), alto: p.scrollHeight, graficos: p.querySelectorAll('svg, canvas, img').length, tablas: p.querySelectorAll('table').length, cuestionarios: p.querySelectorAll('.quiz-item').length, pasos: p.querySelectorAll('.pasos-ctrl').length, letraMin: Math.min(...[...p.querySelectorAll('*')].filter(e => e.offsetParent && e.childNodes.length && [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())).map(e => parseFloat(getComputedStyle(e).fontSize))) }; })()`);
  const base = `${String(k + 1).padStart(2, "0")}_${pid}`;
  datos.alto_captura = await capturar(base);
  const lista = acciones[pid] || [];
  for (let j = 0; j < lista.length; j++) {
    const r = await ev(lista[j]);
    await sleep(700);
    await capturar(`${base}_a${j + 1}`);
    (datos.acciones = datos.acciones || []).push({ codigo: lista[j].slice(0, 120), resultado: r === undefined ? null : r });
  }
  informe.pestanas.push(datos);
}
if (!n) { await sleep(1500); informe.pestanas.push({ titulo: "(página sin pestañas)", alto_captura: await capturar("00_pagina") }); }
informe.errores = errores;
writeFileSync(join(salida, "informe.json"), JSON.stringify(informe, null, 1));
console.log(JSON.stringify(informe, null, 1));
ws.close(); chrome.kill(); servidor.close();
