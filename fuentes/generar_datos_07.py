"""Datos y referencias de la demo del Tema 7 (Demos/07_sentimientos.html).

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_datos_07.py
Genera:
  - Demos/07_sentimientos_datos.js            (window.DATOS07: reseñas, frases, léxico y modificadores,
                                               predicciones precalculadas de la Clase 12 y de la Clase 13,
                                               sustantivos de cada frase y frases de dos palabras de spaCy,
                                               ejemplos de spam)
  - Demos/fuentes/referencia_python_07.json  (valores de Python que Demos/fuentes/probar_lib_07.js compara con
                                               la biblioteca Demos/07_sentimientos_lib.js)
Lee los resultados ya calculados de las Clases 12 y 13 (revision/*.json) y recalcula con el código de
Temas/Tema07/recursos/t7_comun.py y spaCy lo que la biblioteca JS reproduce: puntuación con el léxico (con
y sin cada regla), negación marcada (regla española y mark_negation de NLTK), cruce de estrellas,
agregación de frases, extracción de aspectos con varios umbrales y PMI de Turney.
"""
import json
import math
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Temas" / "Tema07" / "recursos"))
import t7_comun as C  # noqa: E402

import spacy  # noqa: E402
from nltk.sentiment.util import mark_negation  # noqa: E402

CL = RAIZ / "Clases"
R12 = json.loads((CL / "Clase12_Tema7_Comparacion" / "revision" / "resultados_c12.json").read_text(encoding="utf-8"))
R13 = json.loads((CL / "Clase13_Tema7_Frases" / "revision" / "resultados_c13.json").read_text(encoding="utf-8"))
lex, mods = C.cargar_lexico()
RES = C.leer_tsv("resenas_t7.tsv")
FRA = C.leer_tsv("frases_t7.tsv")
SP = C.leer_tsv("spam_ejemplos_t7.tsv")
nlp = spacy.load("es_core_news_sm")
REF = {}

# ------------------------------------------------------------------ léxico con todas las combinaciones de reglas
OPCIONES = {
    "todas": {},
    "sin_reglas": dict(usar_negacion=False, usar_intensidad=False, usar_adversativos=False, usar_irrealidad=False),
    "desplazamiento": dict(negacion="desplazamiento"),
    "sin_negacion": dict(usar_negacion=False),
    "sin_intensidad": dict(usar_intensidad=False),
    "sin_adversativos": dict(usar_adversativos=False),
    "sin_irrealidad": dict(usar_irrealidad=False),
}
REF["lexico"] = {k: {r["id"]: C.puntuar_texto(r["texto"], lex, mods, **kw)[0] for r in RES} for k, kw in OPCIONES.items()}
REF["lexico_frases"] = {f["id_frase"]: C.puntuar_texto(f["texto"], lex, mods)[0] for f in FRA}
EXTRA = ["No es barato, pero lo vale.", "No está nada mal.", "Genial, cuarenta y cinco minutos para traer dos cafés.",
         "Si buscas un sitio limpio, este no es.", "El servicio no fue muy atento, pero la comida estaba deliciosa.",
         "La habitación era cómoda aunque algo ruidosa.", "Muy amables, oye.", "Nunca había comido un sushi tan fresco en Valdeluna.",
         "Ni tan bueno como dicen ni tan malo como lo pintan.", "¿De verdad cuesta tanto mandar un correo?",
         "No es excelente.", "Sin quejas.", "Un poco caro, sin embargo muy recomendable."]
REF["trazas"] = {t: {k: [[o, p, [[x["token"], x["valor"], x["pasos"]] for x in tr]] for o, p, tr in C.puntuar_texto(t, lex, mods, **kw)[1]]
                     for k, kw in OPCIONES.items()} for t in EXTRA}
REF["tokens"] = {t: C.tokens(t) for t in EXTRA}
REF["oraciones"] = {r["id"]: C.oraciones(r["texto"]) for r in RES}

# ------------------------------------------------------------------ negación como rasgo
def nltk_neg(t):
    return " ".join(mark_negation(C.TOKEN.findall(t)))


REF["negacion"] = {r["id"]: [C.marcar_negacion(r["texto"]), nltk_neg(r["texto"])] for r in RES}
REF["negacion_extra"] = {t: [C.marcar_negacion(t), nltk_neg(t)] for t in EXTRA}

# ------------------------------------------------------------------ estrellas
def de_estrellas(e, pos, neg):
    return "positiva" if e >= pos else ("negativa" if e <= neg else "neutra")


REF["estrellas"] = {f"{p}-{n}": sum(de_estrellas(int(r["estrellas"]), p, n) == r["polaridad"]
                                    or (de_estrellas(int(r["estrellas"]), p, n) == "neutra" and r["polaridad"] == "mixta") for r in RES)
                    for p, n in ((4, 2), (5, 1), (3, 2), (4, 3), (5, 2), (4, 1))}

# ------------------------------------------------------------------ agregación (probabilidades de la Clase 13)
PB = R13["frases_prueba_beto"]
DOC_P = [r for r in RES if r["conjunto"] == "prueba" and r["polaridad"] != "mixta"]
frases_de = {}
for f in FRA:
    frases_de.setdefault(f["id"], []).append(f)


def agrega(regla, fr):
    p = [PB[f["id_frase"]][0] for f in fr]
    if regla == "suma":
        return "positiva" if sum(x - 0.5 for x in p) > 0 else "negativa"
    if regla == "mayoria":
        v = sum(x > 0.5 for x in p)
        return "positiva" if v > len(p) / 2 else "negativa" if v < len(p) / 2 else ("positiva" if p[-1] > 0.5 else "negativa")
    if regla == "ultima_frase":
        return "positiva" if p[-1] > 0.5 else "negativa"
    s = [x for x, f in zip(p, fr) if PB[f["id_frase"]][1] == "subjetiva"]
    s = s or p
    return "positiva" if sum(x - 0.5 for x in s) > 0 else "negativa"


REF["agregacion"] = {k: sum(agrega(k, frases_de[r["id"]]) == r["polaridad"] for r in DOC_P)
                     for k in ("suma", "mayoria", "ultima_frase", "solo_subjetivas")}
for k in REF["agregacion"]:
    assert REF["agregacion"][k] == R13["agregacion"]["reglas"][k]["aciertos"], (k, REF["agregacion"][k])

# ------------------------------------------------------------------ aspectos: sustantivos de cada frase
docs = dict(zip([f["id_frase"] for f in FRA], nlp.pipe([f["texto"] for f in FRA])))
NOMBRES = {fid: sorted({t.lemma_.lower() for t in d if t.pos_ == "NOUN"}) for fid, d in docs.items()}


def aspectos_umbral(u):
    frec = {}
    for dom in ("restaurante", "alojamiento", "tecnologia", "compras"):
        df = Counter()
        for r in RES:
            if r["dominio"] == dom and r["conjunto"] == "entrenamiento":
                df.update(set().union(*[set(NOMBRES[f["id_frase"]]) for f in frases_de[r["id"]]]))
        frec[dom] = {n for n, c in df.items() if c >= u}
    tp = fp = fn = 0
    for f in FRA:
        if f["conjunto"] != "prueba":
            continue
        oro = {a[:-1] for a in f["aspectos"].split()}
        pred = set(NOMBRES[f["id_frase"]]) & frec[f["dominio"]]
        tp += len(pred & oro); fp += len(pred - oro); fn += len(oro - pred)
    return {"candidatos": {d: len(v) for d, v in frec.items()}, "aciertos": tp, "extraidos": tp + fp, "oro": tp + fn}


REF["aspectos"] = {str(u): aspectos_umbral(u) for u in (1, 2, 3, 4)}
assert REF["aspectos"]["2"]["aciertos"] == R13["aspectos"]["prueba"]["aciertos"]

# ------------------------------------------------------------------ PMI de Turney: frases de dos palabras y lemas por reseña
PATRONES = [("ADJ", "NOUN"), ("NOUN", "ADJ"), ("ADV", "ADJ"), ("ADV", "VERB")]
docs_r = dict(zip([r["id"] for r in RES], nlp.pipe([r["texto"] for r in RES])))


def frases_dos(d):
    toks = [t for t in d if not t.is_punct]
    return sorted({f"{a.text.lower()} {b.text.lower()}" for a, b in zip(toks, toks[1:]) if (a.pos_, b.pos_) in PATRONES})


FRASES2 = {rid: frases_dos(d) for rid, d in docs_r.items()}
LEMAS = {rid: sorted({t.lemma_.lower() for t in d}) for rid, d in docs_r.items()}
ENT3 = [r["id"] for r in RES if r["conjunto"] == "entrenamiento"]
PRU = [r for r in RES if r["conjunto"] == "prueba" and r["polaridad"] != "mixta"]


def turney(pos, neg):
    hp = sum(pos in LEMAS[i] for i in ENT3)
    hn = sum(neg in LEMAS[i] for i in ENT3)
    conteo, cp, cn = Counter(), Counter(), Counter()
    for i in ENT3:
        for f in FRASES2[i]:
            conteo[f] += 1
            cp[f] += pos in LEMAS[i]
            cn[f] += neg in LEMAS[i]
    so = {f: math.log2(((cp[f] + 0.01) * (hn + 0.01)) / ((cn[f] + 0.01) * (hp + 0.01))) for f in conteo}
    cub = 0
    acc = 0
    for r in PRU:
        vals = [so[f] for f in FRASES2[r["id"]] if f in so and (cp[f] or cn[f])]
        cub += bool(vals)
        acc += C.etiqueta(sum(vals) / len(vals) if vals else 0.0) == r["polaridad"]
    return {"hits": [hp, hn], "frases": len(conteo), "sin_coocurrencia": sum(1 for f in conteo if not cp[f] and not cn[f]),
            "cubiertos": cub, "aciertos": acc}


REF["turney"] = {f"{a}|{b}": turney(a, b) for a, b in (("excelente", "pésimo"), ("bueno", "malo"), ("encantar", "horrible"),
                                                       ("recomendar", "desastre"))}
assert REF["turney"]["excelente|pésimo"]["sin_coocurrencia"] == R12["pmi_turney"]["pares"][0]["frases_sin_coocurrencia"]

# ------------------------------------------------------------------ datos para el navegador
datos = {
    "resenas": [{k: r[k] for k in ("id", "dominio", "estrellas", "polaridad", "conjunto", "fenomenos", "texto", "nota")} for r in RES],
    "frases": [{k: f[k] for k in ("id_frase", "id", "orden", "dominio", "conjunto", "subjetividad", "polaridad", "fenomenos", "aspectos", "texto")}
               for f in FRA],
    "lexico": lex, "modificadores": mods,
    "metodos": {k: {"descripcion": v["descripcion"], "cv": v["cv_exactitud_media"], "cv_dt": v["cv_exactitud_dt"],
                    "parametro": v.get("parametro", "")} for k, v in R12["metodos"].items()},
    "predicciones_prueba": {x["id"]: x["predicciones"] for x in R12["detalle_prueba"]},
    "tres_clases": {k: {"aciertos": v["prueba"]["aciertos"], "f1": v["prueba"]["f1_macro"]} for k, v in R12["tres_clases"].items()},
    "frases_prueba_beto": PB,
    "agregacion_documento": R13["agregacion"]["reglas"]["clasificador_documento"]["aciertos"],
    "sentencias_metodos": {k: {"aciertos": v["prueba"]["aciertos"], "total": v["prueba"]["total"]} for k, v in R13["polaridad_frases"]["metodos"].items()},
    "nombres": NOMBRES, "frases2": FRASES2, "lemas": LEMAS,
    "spam": [{k: s[k] for k in ("id", "tipo", "estrellas", "texto")} for s in SP],
    "beto": R12["beto"],
}
(RAIZ / "Demos" / "07_sentimientos_datos.js").write_text(
    "// Generado por Demos/fuentes/generar_datos_07.py; no editar a mano.\nwindow.DATOS07 = " +
    json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
(RAIZ / "Demos" / "fuentes" / "referencia_python_07.json").write_text(json.dumps(REF, ensure_ascii=False), encoding="utf-8")
print("datos:", round((RAIZ / "Demos" / "07_sentimientos_datos.js").stat().st_size / 1024), "KB")
print("agregación:", REF["agregacion"], "· aspectos:", {u: (v["aciertos"], v["extraidos"]) for u, v in REF["aspectos"].items()})
print("turney:", {k: (v["hits"], v["sin_coocurrencia"], v["frases"], v["cubiertos"]) for k, v in REF["turney"].items()})
print("estrellas:", REF["estrellas"])
