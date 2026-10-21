"""Genera Demos/03_extraccion_informacion_cadena.js: la misma frase de prueba de CESS-ESP etiquetada
por cada etiquetador de n-gramas del apartado 3.3 (Figuras 8-11 del tema), con la etiqueta correcta.

Uso (desde la raíz): entorno/.venv_pln/bin/python Demos/fuentes/generar_cadena_03.py

Reentrena los etiquetadores exactamente como Clases/Clase04_Tema3_Stemming_Extraccion/analisis_t3.py
(90/10 en el orden del corpus) y añade el de solo bigramas y el de reglas, que allí se evalúan
pero no se devuelven. Elige frases de la partición de prueba que muestran, a la vez, el fallo del
etiquetador de bigramas sin respaldo, errores del de unigramas y la mejora de la cadena con respaldo.
"""
import json
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Clases" / "Clase04_Tema3_Stemming_Extraccion"))
import analisis_t3 as A  # noqa: E402


def main():
    nltk = A.preparar_nltk()
    from nltk.corpus import cess_esp
    frases = [[(w, t) for w, t in f if t != "-NONE-"] for f in cess_esp.tagged_sents()]
    corte = int(len(frases) * 0.9)
    train, test = frases[:corte], frases[corte:]
    frecuente = Counter(t for f in train for _, t in f).most_common(1)[0][0]
    d = nltk.DefaultTagger(frecuente)
    rx = nltk.RegexpTagger(A.REGLAS_ES)
    tags = {
        "defecto": d,
        "reglas": rx,
        "unigramas": nltk.UnigramTagger(train),
        "bigramas": nltk.BigramTagger(train),
        "bigramas_unigramas_defecto": nltk.BigramTagger(train, backoff=nltk.UnigramTagger(train, backoff=d)),
        "bigramas_unigramas_reglas": nltk.BigramTagger(train, backoff=nltk.UnigramTagger(train, backoff=rx)),
    }
    vocab = {w for f in train for w, _ in f}
    candidatas = []
    for f in test:
        if not 9 <= len(f) <= 15 or any(w.startswith("*") or "_" in w for w, _ in f):
            continue  # sin sujetos omitidos («*0*») ni multipalabras unidas con «_», que confunden en clase
        palabras = [w for w, _ in f]
        gold = [t for _, t in f]
        sal = {k: [t for _, t in tg.tag(palabras)] for k, tg in tags.items()}
        err = {k: sum(a != b for a, b in zip(v, gold)) for k, v in sal.items()}
        oov = sum(w not in vocab for w in palabras)
        nones_b = sum(t is None for t in sal["bigramas"])
        # Buscamos: bigramas pierde la pista; unigramas falla en alguna; la cadena con reglas acierta más
        if oov >= 1 and nones_b >= 3 and err["unigramas"] >= 2 and err["bigramas_unigramas_reglas"] <= 1 \
                and err["bigramas_unigramas_reglas"] < err["bigramas_unigramas_defecto"]:
            candidatas.append((err["unigramas"] - err["bigramas_unigramas_reglas"], -len(f), palabras, gold, sal, err))
    candidatas.sort(key=lambda c: (-c[0], c[1]))
    elegidas = []
    for _, _, palabras, gold, sal, err in candidatas[:3]:
        elegidas.append({"tokens": palabras, "gold": gold, "salidas": sal, "errores": err,
                         "desconocidas": [w not in vocab for w in palabras]})
    datos = {"origen": "CESS-ESP (NLTK 3.10.3), partición de prueba 90/10 en el orden del corpus",
             "etiqueta_mas_frecuente": frecuente, "frases": elegidas}
    salida = RAIZ / "Demos" / "03_extraccion_informacion_cadena.js"
    salida.write_text("// Generado por Demos/fuentes/generar_cadena_03.py; no editar a mano.\n"
                      "window.CADENA03 = " + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(salida, len(candidatas), "candidatas;", [" ".join(e["tokens"]) for e in elegidas])
    for e in elegidas:
        print(e["errores"])


if __name__ == "__main__":
    main()
