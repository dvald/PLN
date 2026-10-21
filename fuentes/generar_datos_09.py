"""Genera Demos/09_aplicaciones_datos.js (datos de la demo del Tema 9) y Demos/fuentes/referencia_python_09.json
(valores de Python con los que se comprueba Demos/09_aplicaciones_lib.js en probar_lib_09.js).

Uso (desde la raíz): HF_HUB_OFFLINE=1 Temas/Tema09/entorno/.venv_t9/bin/python Demos/fuentes/generar_datos_09.py
Lee los resultados reales de Clases/Clase16_Tema9_Traduccion/revision/resultados_c16.json y
Clases/Taller_T9_Aplicaciones/revision/resultados_taller.json, los datos de Temas/Tema09/recursos/datos/ y las noticias del
Tema 6. Además ejecuta el lector (BETO-SQAC, revisión fijada, CPU) para guardar las probabilidades de inicio y fin de cada
pregunta. Copia la figura de la onda y el espectrograma junto a los audios de la demo.
"""
import json
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Temas" / "Tema09" / "recursos"))
import agente_tutorias as AG  # noqa: E402
import t9_comun as C  # noqa: E402

import numpy as np  # noqa: E402
import torch  # noqa: E402
from sacrebleu.metrics import CHRF  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from transformers import AutoModelForQuestionAnswering, AutoTokenizer  # noqa: E402

R16 = json.loads((RAIZ / "Clases" / "Clase16_Tema9_Traduccion" / "revision" / "resultados_c16.json").read_text(encoding="utf-8"))
RT = json.loads((RAIZ / "Clases" / "Taller_T9_Aplicaciones" / "revision" / "resultados_taller.json").read_text(encoding="utf-8"))
NOT = C.noticias()
IDS = list(NOT)
DOCS = [C.doc_texto(NOT[i]) for i in IDS]
AUDIO = RAIZ / "Demos" / "09_aplicaciones_audio"
shutil.copyfile(RAIZ / "Clases" / "Taller_T9_Aplicaciones" / "imagenes" / "06_onda_y_logmel.png", AUDIO / "onda_y_logmel_V11.png")

D = {"generado": R16["generado"][:10], "fuentes": ["resultados_c16.json", "resultados_taller.json"]}

# 1-4 · Traducción, atención, sondas
D["traduccion"] = {"modelo": R16["modelos"]["marian_en_es"], "haz_elegido": R16["desarrollo"]["haz_elegido"],
                   "desarrollo": R16["desarrollo"]["sistemas"], "prueba": R16["prueba"], "por_fenomeno": R16["prueba_por_fenomeno"],
                   "es_en": R16["prueba_es_en"], "detalle": R16["detalle"], "bertscore": R16["bertscore"],
                   "opus_books": {k: R16["opus_books"][k] for k in ("particiones_publicadas", "filas", "division_propia", "muestra_prueba_100")},
                   "tiempos": R16["tiempos"], "marian": R16["marian"], "forzado": R16["forzado_del_profesor"]}
D["atencion"] = R16["atencion_cruzada"]
D["sondas"] = R16["sondas"]

# 5 · Resumen: los 92 documentos (para TF-IDF en el navegador) y las salidas reales
D["noticias"] = [{"id": i, "seccion": NOT[i]["seccion"], "titular": NOT[i]["titular"], "texto": NOT[i]["texto"]} for i in IDS]
D["resumen"] = {"agregado": RT["resumen"]["agregado"], "plantilla": RT["resumen"]["plantilla_chat_qwen"],
                "detalle": [{"documento": f["documento"], "referencia": f["referencia"],
                             "qwen": f["salidas"]["Qwen2.5-0.5B-Instruct"]} for f in RT["resumen"]["detalle"]]}

# 6 · Agente
D["dialogo"] = C.leer_tsv(C.DATOS / "dialogo_t9.tsv")
D["conversacion"] = RT["agente"]["conversacion"]

# 7 · Búsqueda: preguntas y rangos de los métodos que no se calculan en el navegador
PRE = C.leer_tsv(C.DATOS / "preguntas_t9.tsv")
D["preguntas"] = PRE
D["rangos"] = RT["recuperacion"]["rangos"]
from spacy.lang.es.stop_words import STOP_WORDS  # noqa: E402  (las mismas que nlp.Defaults.stop_words de es_core_news_md)
D["stop"] = sorted(STOP_WORDS)
D["mrr"] = RT["recuperacion"]["metodos"]

# 8 · Lector: probabilidades de inicio y fin de cada pregunta con su documento
qa_tok = AutoTokenizer.from_pretrained(C.BETO_QA[0], revision=C.BETO_QA[1])
qa_mod = AutoModelForQuestionAnswering.from_pretrained(C.BETO_QA[0], revision=C.BETO_QA[1]).eval()
det = {x["id"]: x for x in RT["lector"]["detalle"]}
lect = []
for q in PRE:
    if q["id"] not in det:
        continue
    doc = q["documento"] or "e03"
    ctx = C.doc_texto(NOT[doc])
    enc = qa_tok(q["pregunta"], ctx, return_tensors="pt", return_offsets_mapping=True, truncation="only_second", max_length=384)
    off = enc.pop("offset_mapping")[0]
    with torch.no_grad():
        o = qa_mod(**enc)
    ps, pe = torch.softmax(o.start_logits[0], 0), torch.softmax(o.end_logits[0], 0)
    seq = enc.sequence_ids(0)
    piezas = [{"i": 0, "t": "[CLS]", "a": -1, "b": -1, "ps": round(float(ps[0]), 4), "pe": round(float(pe[0]), 4)}]
    for k, s in enumerate(seq):
        if s == 1:
            piezas.append({"i": k, "t": qa_tok.convert_ids_to_tokens(int(enc["input_ids"][0][k])), "a": int(off[k][0]), "b": int(off[k][1]),
                           "ps": round(float(ps[k]), 4), "pe": round(float(pe[k]), 4)})
    x = det[q["id"]]
    lect.append({"id": q["id"], "particion": q["particion"], "tipo": q["tipo"], "pregunta": q["pregunta"], "documento": doc,
                 "contexto": ctx, "oro": q["respuesta"], "respuesta": x["respuesta"], "margen": x["margen"],
                 "contesta_con_umbral": x["contesta_con_umbral"], "f1": x["f1"], "exacta": x["exacta"], "piezas": piezas})
D["lector"] = {"preguntas": lect, "umbral": RT["lector"]["umbral_margen"], "desarrollo": RT["lector"]["desarrollo"],
               "prueba": RT["lector"]["prueba"], "ventanas": RT["lector"]["ventanas"], "metricas_publicadas": RT["lector"]["metricas_publicadas"]}

# 9 · Voz
D["voz"] = {"frases": C.leer_tsv(C.DATOS / "voz_frases_t9.tsv"), "rasgos": RT["voz"]["rasgos"], "audios": RT["voz"]["audios_demo"],
            "asr": {m: {"wer_corpus": v["wer_corpus"], "detalle": v["detalle"], "segundos": v["segundos_reconocimiento"]}
                    for m, v in RT["voz"]["asr"].items()},
            "vocabulario_tts": RT["voz"]["tts_vocabulario"]}

(RAIZ / "Demos" / "09_aplicaciones_datos.js").write_text(
    "// Datos de la demo del Tema 9 · generados por Demos/fuentes/generar_datos_09.py (no editar a mano)\n"
    "window.DATOS09 = " + json.dumps(D, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

# ---------------------------------------------------------------------------------------------------------
# Referencia de Python para probar la biblioteca JavaScript
# ---------------------------------------------------------------------------------------------------------
REF = {}
pares = [("la casa", "las casas"), ("Está lloviendo a cántaros.", "Está lloviendo gatos y perros."),
         ("Está lloviendo a cántaros.", "Llueve muchísimo."), ("Fui a la biblioteca a sacar un libro.", "Fui a la biblioteca a pedir prestado un libro."),
         ("a", "b"), ("El gato duerme.", "El gato duerme.")]
pares += [(d["es_referencia"], d[k]) for d in R16["detalle"] for k in ("palabra", "voraz", "haz")]
REF["chrf"] = [{"ref": a, "hip": b, "n": n, "beta": beta, "score": CHRF(char_order=n, beta=beta).sentence_score(b, [a]).score}
               for a, b in pares for n, beta in ((6, 2), (2, 2), (6, 1), (3, 3))]
prueba = [d for d in R16["detalle"] if d["particion"] == "prueba"]
REF["chrf_corpus"] = {k: CHRF().corpus_score([d[k] for d in prueba], [[d["es_referencia"] for d in prueba]]).score
                      for k in ("palabra", "voraz", "haz")}
# TF-IDF del resumen (patrón por defecto de scikit-learn) y de la búsqueda (patrón de una o más letras)
tf_res = TfidfVectorizer(lowercase=True).fit(DOCS)
tf_bus = TfidfVectorizer(lowercase=True, token_pattern=r"(?u)\b\w+\b")
Xb = tf_bus.fit_transform(DOCS)
REF["tokens_resumen"] = {i: tf_res.build_analyzer()(d) for i, d in zip(IDS[:5], DOCS[:5])}
REF["tokens_busqueda"] = {i: tf_bus.build_analyzer()(d) for i, d in zip(IDS[:5], DOCS[:5])}
REF["idf_busqueda"] = {w: float(tf_bus.idf_[k]) for w, k in list(tf_bus.vocabulary_.items())[:200]}


def frases(texto):
    return [f.strip() for f in re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])", texto) if f.strip()]


REF["central"] = {}
for r in RT["resumen"]["detalle"]:
    texto = NOT[r["documento"]]["texto"]
    fs = frases(texto)
    m = tf_res.transform(fs + [texto])
    sims = (m[:-1] @ m[-1].T).toarray().ravel()
    REF["central"][r["documento"]] = {"frases": fs, "similitudes": [float(x) for x in sims], "elegida": fs[int(sims.argmax())],
                                     "rouge1": {s: C.rouge1(r["referencia"], h)["f1"] for s, h in r["salidas"].items()}}
REF["rangos_tfidf"] = {}
for q in PRE:
    if q["tipo"] == "factoide":
        s = (Xb @ tf_bus.transform([q["pregunta"]]).T).toarray().ravel()
        orden = [IDS[i] for i in np.argsort(-s, kind="stable")]
        REF["rangos_tfidf"][q["id"]] = {"rango": orden.index(q["documento"]) + 1, "top5": orden[:5],
                                        "puntuaciones_top5": [float(x) for x in np.sort(s)[::-1][:5]]}
REF["agente"] = {u["enunciado"]: AG.comprender(u["enunciado"]) for u in D["dialogo"]}
extra = ["Ya no puedo ir el lunes", "Quiero reservar el viernes a las 9:30 por el foro, tema 3", "a las doce y cuarto",
         "¿Qué horario hay?", "Buenas, ¿puedo pedir cita?", "Cancela la del miércoles", "Nada, gracias"]
REF["agente"].update({t: AG.comprender(t) for t in extra})
ag = AG.Agente()
conv = ["Hola", "Quiero reservar una tutoría del tema 9", "El jueves a las 21:00", "El jueves a las cinco y media", "Por videollamada", "Sí",
        "Quiero una tutoría del tema 2 el viernes a las 10:00 por el foro", "No", "El lunes a las 18:00", "Vale"]
REF["conversacion"] = [{"usuario": t, "agente": ag.responder(t)[1], "marco": dict(ag.marco)} for t in conv]
casos_v = [v["texto"] for v in D["voz"]["frases"]] + ["Abre a las 8:30 y cierra a las 17:00.", "Cuesta 9,05 € y la clave es 4321.",
                                                       "Hay 1.500.000 habitantes y 21.000 socios.", "Ganó por 101-99 en 2026.",
                                                       "El 1 de mayo, a las 12:45, con el 100 % de los votos."]
REF["verbalizar"] = {t: C.verbalizar(t) for t in casos_v}
REF["cardinal"] = {str(n): C.cardinal(n) for n in [0, 1, 15, 16, 21, 22, 30, 31, 99, 100, 101, 115, 142, 200, 555, 999, 1000, 1001, 1910, 2026,
                                                     14000, 21000, 100000, 101000, 1000000, 1500000, 21000000, 142000000, 3400000000]}
pares_w = [(v["texto_verbalizado"], f[c]["transcripcion"]) for m in RT["voz"]["asr"].values() for f in m["detalle"]
           for v in D["voz"]["frases"] if v["id"] == f["id"] for c in ("original", "verbalizado")]
REF["wer"] = []
for ref, hip in pares_w:
    for verb in (False, True):
        s, d_, i, pasos = C.alinear(C.normalizar_para_wer(ref), C.normalizar_para_wer(hip, verbalizar_cifras=verb))
        REF["wer"].append({"ref": ref, "hip": hip, "verbalizar": verb, "S": s, "D": d_, "I": i, "N": len(C.normalizar_para_wer(ref)),
                           "pasos": pasos})
(RAIZ / "Demos" / "fuentes" / "referencia_python_09.json").write_text(json.dumps(REF, ensure_ascii=False, indent=1), encoding="utf-8")
print("datos:", round((RAIZ / "Demos" / "09_aplicaciones_datos.js").stat().st_size / 1024), "KB · referencia:",
      len(REF["chrf"]), "chrF,", len(REF["agente"]), "enunciados,", len(REF["verbalizar"]), "frases,", len(REF["wer"]), "WER")
