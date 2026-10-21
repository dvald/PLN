"""Genera la referencia Python (NLTK 3.10.3) para probar Demos/02_texto_como_dato_lib.js.

Uso: entorno/.venv_pln/bin/python Demos/fuentes/referencia_python_02.py
Salida: Demos/fuentes/referencia_python_02.json (tokens por documento y raíz Snowball de
cada tipo del corpus de la Clase 3, incluido el Quijote completo).
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "Clases" / "Clase03_Tema2_Tokenizacion"))
import analisis_corpus as A  # noqa: E402

docs = list(A.DOCUMENTOS) + ["quijote_completo"]
ref = {"tokens": {}, "espacios": {}, "regex_simple": {}, "stems": {}}
vocab = set()
for n in docs:
    tx = A.leer(n)
    ref["tokens"][n] = A.tok_reglas(tx)
    ref["espacios"][n] = A.tok_espacios(tx)
    ref["regex_simple"][n] = A.tok_regex_simple(tx)
    vocab.update(t.lower() for t in ref["tokens"][n])
st = A.stemmer()
ref["stems"] = {w: st.stem(w) for w in sorted(vocab)}
salida = Path(__file__).with_name("referencia_python_02.json")
salida.write_text(json.dumps(ref, ensure_ascii=False), encoding="utf-8")
print(salida, len(ref["stems"]), "tipos")
