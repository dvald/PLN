# Procesamiento del Lenguaje Natural · Demos visuales

Demos para proyectar en las clases de Procesamiento del Lenguaje Natural (Grado en Ciencia de Datos, UNIR, curso 2026/27). Hay una página por tema con una pestaña por concepto. Todas se enlazan desde `index.html`, que agrupa los temas por bloques de color, muestra la ruta del curso por semanas y lleva directamente a cada pestaña.

- Es un sitio estático, sin dependencias: basta con abrir `index.html` en el navegador o publicar la carpeta en GitHub Pages (rama principal, carpeta raíz). Usa rutas relativas, no hace peticiones de red y no envía datos.
- `comun/clase.css` y `comun/clase.js` son la capa común. Incluyen:
  - los colores de cada bloque, la cabecera y la barra de pestañas;
  - la letra ampliable;
  - los atajos de teclado: `1`…`9` y `0` para ir a una pestaña, `[` `]` para la pestaña anterior o siguiente, `←` `→` (o el mando de diapositivas) para los pasos, `+` `−` para el tamaño de letra, `i` para la procedencia de los datos y `?` para la ayuda;
  - la procedencia de los datos, plegada tras el botón «i»;
  - los pasos, que avanza el profesor;
  - el botón para ocultar las soluciones antes de preguntar a la clase.
- `comun/icono.svg` es el icono del sitio.
- Para abrir una pestaña concreta, se añade su nombre a la dirección, por ejemplo `01_introduccion.html#amb`.

## Publicación en GitHub Pages

- Web: https://dvald.github.io/PLN/
- Repositorio: https://github.com/dvald/PLN
- Origen de publicación: rama `main`, carpeta raíz `/`, con HTTPS.
- `.nojekyll` permite servir los archivos estáticos directamente.

Este repositorio corresponde a la carpeta `Demos/` del proyecto docente. Para actualizar la web, revisar los cambios, crear un commit y hacer `git push origin main` desde esta carpeta. GitHub Pages publica el contenido después de completar su despliegue.

Los generadores de datos de `fuentes/` usan recursos del proyecto docente completo; esos recursos y los modelos no se incluyen aquí. La web utiliza los resultados ya guardados y no requiere Python.

## Navegación

En cada tema, la cabecera y el menú se generan a partir de `fuentes/temas_demos.mjs` (títulos, bloques, clases, semanas e iconos):

```bash
node fuentes/generar_navegacion.mjs
```

El generador escribe en cada página:
- el título;
- el icono;
- el color del bloque;
- la cabecera con el menú (índice, temas del 1 al 10, tema anterior y siguiente);
- el número de cada pestaña.

En `index.html` escribe el bloque que va entre las marcas `inicio:temas` y `fin:temas`. Las pestañas las lee de cada página, así que el índice se actualiza solo si se añade o se renombra una pestaña. Se puede repetir sin riesgo: si no hay cambios, no reescribe nada.

## Qué se calcula y qué está precalculado

Las etiquetas de cada tarjeta lo indican: verde es *calculado en el navegador*, azul es *precalculado con Python* y amarillo es *ilustración*. Ninguna demo ejecuta un modelo neuronal en el navegador.

| Tema | Calculado en el navegador (comprobado frente a Python) | Precalculado o grabado |
|---|---|---|
| 1 | — (ilustración sin modelos) | — |
| 2 | Tokenizadores propios, raíz Snowball | Resultados de NLTK y spaCy de los ejemplos |
| 3 | Raíz Snowball, reglas de chunking, entidades clínicas, relaciones con patrones | NLTK y spaCy; cadena de etiquetadores de CESS-ESP (`03_extraccion_informacion_cadena.js`) |
| 4 | Bolsa de palabras, TF-IDF, búsqueda en el Quijote, todos los modelos de n-gramas | Perplejidades y frases generadas con el Quijote |
| 5 | Pares de entrenamiento, n-gramas de FastText, atención, simulación del enmascarado (también frente a numpy y gensim) | Vecinos, búsquedas y salidas de BETO |
| 6 | N-gramas, Naive Bayes, SVD, NMF, muestreo de Gibbs de LDA, reglas clínicas, medidas de entidades (también frente a numpy y scikit-learn) | Tópicos de las noticias y del Quijote (scikit-learn), entidades de spaCy |
| 7 | Léxico con sus reglas, negación marcada, cruce de estrellas, agregación de frases, aspectos, PMI de Turney (también frente a NLTK) | Predicciones de Naive Bayes y de BETO congelado con regresión logística |
| 8 | Máscaras, softmax con temperatura y muestreo sobre los logits guardados, intervalos de Wilson, alineación de etiquetas con la tokenización de BETO, fragmentos, matrices de confusión | Salidas de BETO, BARTO y Qwen2.5 (0,5B y 1,5B); resultados del ajuste fino |
| 9 | chrF2 (igual que sacrebleu), índice invertido y TF-IDF, resumen extractivo, ROUGE-1 y comprobación de cifras, reglas del agente, umbral del lector, normalizador de cifras, WER | MarianMT (traducciones, probabilidades, atención cruzada y búsqueda en haz, `09_aplicaciones_haz.js`), Qwen2.5-0.5B-Instruct, spaCy, BETO, BETO ajustado con SQAC, MMS-TTS y Whisper |
| 10 | Coseno y vecinos, PCA, RadViz, relevancia, frecuencias y regla de tamaños de WordCloud, comparación de las dos partes del Quijote, tendencias, coocurrencias, PMI, árbol de palabras, TTR, MATTR, firmas de n-gramas | Mapas t-SNE y MDS, mezclas de tópicos y análisis gramaticales (scikit-learn y spaCy). La nube de palabras usa un algoritmo propio con el principio de WordCloud, no la biblioteca |

`repaso.html` reúne las preguntas de repaso de los Temas 5 a 10 para el estudio autónomo; no se usa en las clases.

Las fuentes, atribuciones, licencias y notas de validación se conservan en [fuentes/PROCEDENCIA.txt](fuentes/PROCEDENCIA.txt).

## Carpeta `fuentes/`

- `generar_datos_NN.py`, `generar_cadena_03.py` y `generar_haz_09.py` generan los datos precalculados (`*_datos.js` y similares).
- `probar_lib_NN.js` comprueba las bibliotecas de cada tema contra las referencias de Python (`node fuentes/probar_lib_NN.js` devuelve `"resultado": "OK"`).
- `capturar_demo.mjs` abre una página en Chrome sin interfaz, recorre sus pestañas, recoge los errores de la consola y la captura (`VENTANA=390x844` simula un móvil).
- `generar_navegacion.mjs` y `temas_demos.mjs` generan la navegación descrita arriba.
