// Repaso de los tests para el estudio autónomo (no se usa en clase). Generado por Demos/fuentes/extraer_repasos.mjs
// a partir de las pestañas de repaso de las demos de los Temas 5 a 10 (versión del 12/10/2026 anterior a la reconversión visual).
window.REPASO = {
 "5": {
  "titulo": "Tema 5 · Modelado del lenguaje neuronal (I)",
  "origen": "Preguntas de comprobación preparadas con la demo del tema (no son el test oficial).",
  "preguntas": [
   {
    "p": "Skip-gram…",
    "o": [
     "predice las palabras de la ventana a partir de la central",
     "predice la palabra central a partir de la media de la ventana"
    ],
    "c": 0,
    "e": "Skip-gram va de la palabra al contexto; CBOW, del contexto a la palabra."
   },
   {
    "p": "El muestreo negativo convierte el entrenamiento en…",
    "o": [
     "una softmax sobre todo el vocabulario",
     "una clasificación binaria con sigmoide (¿vecina real o al azar?)"
    ],
    "c": 1,
    "e": "Evita recorrer todo el vocabulario en cada par; el tema (p. 11) mezcla ambas formulaciones."
   },
   {
    "p": "FastText representa una palabra con…",
    "o": [
     "n-gramas de caracteres de 3 a 6 y la palabra completa",
     "n-gramas de palabras"
    ],
    "c": 0,
    "e": "Son de caracteres: así da vector a «dulsinea» aunque no esté en el corpus."
   },
   {
    "p": "Para buscar capítulos del Quijote con descripciones, ganó…",
    "o": [
     "la media de vectores skip-gram",
     "TF-IDF"
    ],
    "c": 1,
    "e": "MRR 0,58 frente a 0,05: la media difumina y TF-IDF conserva lo raro. La representación se elige por la tarea."
   },
   {
    "p": "Los pesos de atención de una palabra…",
    "o": [
     "son positivos y suman 1",
     "pueden ser negativos, como la query"
    ],
    "c": 0,
    "e": "Salen de una softmax. La query es un vector de d números, no una lista de pesos."
   },
   {
    "p": "La máscara causal…",
    "o": [
     "elimina las palabras vacías antes de la atención",
     "pone −∞ en las puntuaciones de las palabras posteriores"
    ],
    "c": 1,
    "e": "Tras la softmax esas casillas valen 0: cada palabra solo usa las anteriores (ejercicio 9)."
   },
   {
    "p": "BERT se preentrena…",
    "o": [
     "rellenando el 15 % de los tokens (80 % [MASK], 10 % al azar, 10 % igual)",
     "prediciendo siempre la palabra siguiente"
    ],
    "c": 0,
    "e": "Es un modelo de lenguaje enmascarado y bidireccional; no genera texto de izquierda a derecha."
   },
   {
    "p": "¿Cuántas cabezas de atención tiene BETO en total?",
    "o": [
     "12",
     "144"
    ],
    "c": 1,
    "e": "12 capas con 12 cabezas cada una. El tema (p. 50) habla de «doce capas multihead»: son 12 cabezas por capa."
   }
  ]
 },
 "6": {
  "titulo": "Tema 6 · Análisis y modelado de tópicos",
  "origen": "Las diez preguntas del test del tema (pp. 57-60), con la respuesta razonada. Donde el tema es ambiguo se aceptan dos respuestas.",
  "preguntas": [
   {
    "p": "1. ¿Qué se entiende por análisis de tópicos en el PLN?",
    "o": [
     "A. Técnicas para procesar documentos y extraer información",
     "B. Identificar y extraer los temas principales y organizarlos en categorías",
     "C. Construir un modelo estadístico del lenguaje",
     "D. Descubrir la estructura gramatical"
    ],
    "c": 1,
    "e": "La definición del apartado 6.2: identificar y representar los temas principales de un conjunto de textos."
   },
   {
    "p": "2. Diferencia principal entre clasificación supervisada y modelado de tópicos:",
    "o": [
     "A. La clasificación necesita etiquetas; el modelado las infiere sin ellas",
     "B. La clasificación usa clustering; el modelado, árboles de decisión",
     "C. La clasificación usa LSA; el modelado agrupa en clústeres",
     "D. Ninguna"
    ],
    "c": 0,
    "e": "B y C intercambian los métodos."
   },
   {
    "p": "3. «Presentan un nuevo restaurante especializado en mariscos del Cantábrico y vinos blancos verdejos»:",
    "o": [
     "A. Frase: vinos; subfrase: gastronómicas",
     "B. Frase: vinos; subfrase: mariscos",
     "C. Frase: noticias gastronómicas; subfrase: mariscos y vinos",
     "D. Frase: gastronómicas; subfrase: alimentos y bebidas"
    ],
    "c": 2,
    "e": "La D generaliza («alimentos», «bebidas»), pero los tópicos de subfrase son lo que aparece: mariscos y vinos."
   },
   {
    "p": "4. Enfoque multietiqueta que trata cada combinación de etiquetas como una clase:",
    "o": [
     "A. Binary relevance",
     "B. Classifier chains",
     "C. Label powerset",
     "D. LDA"
    ],
    "c": 2,
    "e": "Un único clasificador multiclase cuyas clases son las combinaciones vistas en el entrenamiento."
   },
   {
    "p": "5. Técnicas que generan features para clasificar tópicos (según la p. 17 del tema):",
    "o": [
     "A. Eliminación de stopwords",
     "B. NER",
     "C. Tokenización",
     "D. Vectorización"
    ],
    "c": [
     1,
     3
    ],
    "e": "Pregunta ambigua: el tema clasifica tokenización y palabras vacías como preprocesado, y NER y vectorización como generación de features. Respuesta más defendible: B y D."
   },
   {
    "p": "6. Verdadero sobre entrenar y evaluar clasificadores de tópicos:",
    "o": [
     "A. Se entrena una vez y no hace falta reentrenar",
     "B. F1 es una métrica de evaluación",
     "C. Los hiperparámetros se ajustan después del entrenamiento final",
     "D. Todas falsas"
    ],
    "c": 1,
    "e": "F1 combina precisión y exhaustividad (Clase 10). Con data drift hay que reentrenar."
   },
   {
    "p": "7. Verdaderas sobre evaluar clustering:",
    "o": [
     "A. Es habitual dividir en train/val/test",
     "B. F1 es una métrica de clustering",
     "C. La cohesión intraclúster es una métrica",
     "D. La separación interclúster es una métrica"
    ],
    "c": [
     2,
     3
    ],
    "e": "F1 necesita etiquetas; cohesión y separación (que combina la silueta) no."
   },
   {
    "p": "8. Centroide del clúster y título del texto más cercano como etiqueta:",
    "o": [
     "A. Cluster labels",
     "B. Cluster labels contextualizados",
     "C. Hard clustering",
     "D. Etiquetado basado en títulos"
    ],
    "c": 3,
    "e": "Fácil de leer, pero un texto no representa a todo el grupo (Figura 6)."
   },
   {
    "p": "9. Correcto sobre LSA:",
    "o": [
     "A. Clasificación supervisada",
     "B. Usa SVD para extraer los temas",
     "C. Hard clustering",
     "D. Necesita etiquetas"
    ],
    "c": 1,
    "e": "Ojo: los tópicos de LSA tienen signo arbitrario y están anidados (correcciones a las pp. 33 y 35)."
   },
   {
    "p": "10. Correcto sobre LDA:",
    "o": [
     "A. Clasificación supervisada",
     "B. Usa SVD",
     "C. Hard clustering",
     "D. Busca las distribuciones de tópicos y palabras que mejor explican los documentos"
    ],
    "c": 3,
    "e": "Es un modelo probabilístico generativo con priores de Dirichlet; scikit-learn lo ajusta con inferencia variacional y recuentos."
   }
  ]
 },
 "7": {
  "titulo": "Tema 7 · Análisis de sentimientos y minería de opiniones",
  "origen": "Las diez preguntas del test del tema (pp. 67-71), con la respuesta razonada.",
  "preguntas": [
   {
    "p": "1. ¿Qué es el análisis de sentimientos y la minería de opiniones?",
    "o": [
     "A. Analizar gustos en un recomendador por similitud entre usuarios",
     "B. Analizar la polaridad de las personas ante objetos de opinión, reflejada en un texto",
     "C. Detectar spam en foros y blogs",
     "D. Evaluar el crecimiento de la información en Internet"
    ],
    "c": 1,
    "e": "Definición del tema (pp. 5-6): la polaridad del sujeto de opinión hacia el objeto, a partir del texto."
   },
   {
    "p": "2. Nivel que determina la opinión sobre un objeto específico del texto:",
    "o": [
     "A. Documento",
     "B. Frase",
     "C. Entidad",
     "D. Ninguno"
    ],
    "c": 2,
    "e": "Nivel de entidad u objeto de opinión, el más fino (p. 9); lleva al análisis por aspectos."
   },
   {
    "p": "3. Limitación de ampliar el léxico con diccionarios (WordNet):",
    "o": [
     "A. No detecta sinónimos ni antónimos",
     "B. Requiere un corpus muy extenso",
     "C. Es más lento",
     "D. No tiene en cuenta el contexto"
    ],
    "c": 3,
    "e": "«rápido» es positivo en un coche y negativo en una exposición (p. 11); por eso aparecen los métodos basados en corpus."
   },
   {
    "p": "4. ¿Cuál es una opinión indirecta?",
    "o": [
     "A. «El sabor de la comida es maravilloso»",
     "B. «Me gusta ver los atardeceres»",
     "C. «Después de tomar la aspirina, desapareció mi dolor de cabeza»",
     "D. «He ido de viaje a Roma»"
    ],
    "c": 2,
    "e": "Opina sobre la aspirina a través de su efecto en otra cosa (pp. 12-13); aquí, positivamente."
   },
   {
    "p": "5. «Sí, genial. El trato fue una maravilla. Solo tardaron ocho horas en atender mi petición»:",
    "o": [
     "A. Negación",
     "B. Modificadores de valencia",
     "C. Sarcasmo",
     "D. Ninguna"
    ],
    "c": 2,
    "e": "Las palabras positivas dicen lo contrario de lo que se quiere decir; un léxico la clasificaría como positiva."
   },
   {
    "p": "6. Verdadero sobre la PMI en sentimientos:",
    "o": [
     "A. Ayuda a los anotadores a etiquetar",
     "B. Mide la dependencia estadística entre dos términos y estima la orientación de frases extraídas",
     "C. Es un enfoque supervisado",
     "D. Se basa en el análisis sintáctico"
    ],
    "c": 1,
    "e": "Es el método no supervisado de Turney (2002; el tema lo atribuye a Turney y Littman, 2003): SO = PMI(frase, excellent) - PMI(frase, poor)."
   },
   {
    "p": "7. En la quíntupla del ejemplo del televisor:",
    "o": [
     "A. a es la entidad y h el aspecto",
     "B. e es la entidad, a su aspecto, s el sentimiento del emisor h y t el momento",
     "C. a es la entidad y e el aspecto",
     "D. s es la entidad y h el aspecto"
    ],
    "c": 1,
    "e": "e = entidad (el televisor), a = aspecto (claridad, resolución), s = sentimiento (asombroso), h = emisor (los consumidores expertos), t = momento (tras la campaña) (pp. 38-39)."
   },
   {
    "p": "8. Característica del spam de tipo I (reseña falsa):",
    "o": [
     "A. Opiniones centradas en la marca",
     "B. Publicidad y contenido no informativo",
     "C. Incluye reseñas falsas positivas y negativas",
     "D. Más fácil de identificar a mano"
    ],
    "c": 2,
    "e": "Promocionar un producto o dañar a otro (Jindal y Liu, 2008); es el más difícil de identificar. A es el tipo II y B el tipo III."
   },
   {
    "p": "9. Rasgo a priori relevante para detectar spam de tipo I:",
    "o": [
     "A. Número de personas que dieron feedback",
     "B. Longitud del título y del cuerpo",
     "C. Calificación asociada a la reseña",
     "D. Todas"
    ],
    "c": 3,
    "e": "Las tres aparecen entre los rasgos de Jindal y Liu que recoge el tema (pp. 47-49): feedback, longitud y calificaciones."
   },
   {
    "p": "10. Modelo que usa OpinionMiner para aspecto y orientación:",
    "o": [
     "A. Redes recurrentes",
     "B. Modelos ocultos de Markov",
     "C. Transformers",
     "D. LightGBM"
    ],
    "c": 1,
    "e": "Jin et al. (2009) etiquetan secuencialmente entidades y opiniones con modelos ocultos de Markov (p. 45)."
   }
  ]
 },
 "8": {
  "titulo": "Tema 8 · Modelado del lenguaje neuronal (II)",
  "origen": "Preguntas de comprobación preparadas con la demo del tema (no son el test oficial).",
  "preguntas": [
   {
    "p": "¿Qué distingue a un codificador de un decodificador Transformer?",
    "o": [
     "El número de capas",
     "La máscara de atención",
     "El tamaño del vocabulario"
    ],
    "c": 1,
    "e": "La máscara: bidireccional en el codificador, causal en el decodificador. El bloque es el mismo."
   },
   {
    "p": "En la arquitectura original, ¿qué entrega el codificador al decodificador?",
    "o": [
     "Un vector por cada token de entrada",
     "Un vector de longitud fija con el resumen de la frase",
     "Solo el vector de [CLS]"
    ],
    "c": 0,
    "e": "Un vector por token, que el decodificador consulta con atención cruzada (corrige la p. 8 del tema)."
   },
   {
    "p": "En SpanBERT, el 15 % se refiere a…",
    "o": [
     "las secuencias del corpus",
     "las capas que se ajustan",
     "los tokens de cada secuencia"
    ],
    "c": 2,
    "e": "Al presupuesto de tokens enmascarados de cada secuencia (Joshi et al., 2020)."
   },
   {
    "p": "¿Qué se entrena en el prompt tuning?",
    "o": [
     "Nada",
     "Unos vectores de entrada, con el modelo congelado",
     "Todos los pesos del modelo"
    ],
    "c": 1,
    "e": "Vectores de entrada («prompt blando») por retropropagación; la ingeniería de prompts no entrena nada."
   },
   {
    "p": "Al etiquetar entidades con BETO, ¿qué etiqueta lleva «##una» en «Val ##del ##una» con la regla de la primera subpalabra?",
    "o": [
     "B-LOC",
     "I-LOC",
     "-100"
    ],
    "c": 2,
    "e": "-100: se ignora en la pérdida; la palabra toma la etiqueta de «Val»."
   },
   {
    "p": "¿Cuántos fragmentos tiene una frase de 9 palabras?",
    "o": [
     "45",
     "81",
     "36"
    ],
    "c": 0,
    "e": "T(T+1)/2 = 9 · 10 / 2 = 45."
   },
   {
    "p": "Con 60 noticias etiquetadas, ¿qué acertó más en la prueba?",
    "o": [
     "Qwen 0,5B con un prompt",
     "Naive Bayes",
     "BETO congelado o ajustado"
    ],
    "c": 2,
    "e": "BETO congelado y ajustado: 18-19 de 20; Qwen 0,5B: 7-11; Naive Bayes: 15."
   },
   {
    "p": "¿Qué paso de InstructGPT usa comparaciones entre respuestas hechas por personas?",
    "o": [
     "El entrenamiento del modelo de recompensa",
     "El ajuste supervisado",
     "El preentrenamiento"
    ],
    "c": 0,
    "e": "Las personas ordenan respuestas; con esas comparaciones se entrena el modelo de recompensa, que después guía PPO."
   }
  ]
 },
 "9": {
  "titulo": "Tema 9 · Aplicaciones de PLN",
  "origen": "Las diez preguntas del test del tema (pp. 58-63, 0 puntos). La explicación cita la página del tema y, cuando hay matiz, lo medido en clase. La clave es la deducida del texto: si la del aula difiere, prevalece la del aula.",
  "preguntas": [
   {
    "p": "Indica las afirmaciones verdaderas en el contexto de las tareas de MT:",
    "o": [
     "A. Un buen sistema de MT puede centrarse solo en la traducción individual de las palabras.",
     "B. Las traducciones entre dos lenguas son directas: sus diferencias no son relevantes.",
     "C. Las divergencias léxicas son diferencias en el significado que puede tener una misma palabra entre lenguas.",
     "D. Ninguna de las anteriores."
    ],
    "c": 2,
    "e": "Las divergencias léxicas afectan a palabras concretas (p. 6). Palabra a palabra, nuestro traductor baja de 75,7 a 47,7 de chrF2."
   },
   {
    "p": "¿Cuál es el objetivo del teacher forcing en un codificador-decodificador?",
    "o": [
     "A. Que la codificación sea más rápida.",
     "B. Entrenar cada paso con la palabra real anterior, no la predicha, para no degradar las predicciones.",
     "C. Reducir el conjunto de entrenamiento.",
     "D. Usar LM causales en el codificador y en el decodificador."
    ],
    "c": 1,
    "e": "Al entrenar, cada paso recibe la palabra correcta de la referencia (pp. 10-11). Solo existe en el entrenamiento: en inferencia el modelo usa sus propias predicciones."
   },
   {
    "p": "¿Qué diferencia hay entre la capa cross-attention y la causal self-attention del decodificador?",
    "o": [
     "A. La causal recibe el contexto del codificador; la cruzada mira la secuencia generada.",
     "B. La cruzada recibe el contexto del codificador; la causal mira la secuencia generada hasta ese momento.",
     "C. La cruzada es siempre la primera capa y la causal la última.",
     "D. Ninguna de las anteriores."
    ],
    "c": 1,
    "e": "Atención cruzada: Q del decodificador y K, V del codificador (p. 15). En la figura 7, la causal va antes que la cruzada."
   },
   {
    "p": "Autocompletado frente a resumen con transformers:",
    "o": [
     "A. En el autocompletado no se dispone de la secuencia completa (LM causal); en el resumen sí se dispone del texto, y puede codificarse de forma bidireccional.",
     "B. Al revés que A.",
     "C. Solo el autocompletado admite teacher forcing.",
     "D. Ninguna de las anteriores."
    ],
    "c": 0,
    "e": "Matiz: el texto (pp. 20-22) resume con un LM causal y un delimitador δ, y el esquema de la p. 3 dice lo contrario; C es falsa porque ambos se entrenan con teacher forcing."
   },
   {
    "p": "¿Qué son los agentes conversacionales?",
    "o": [
     "A. Programas que conversan en lenguaje natural y pueden integrar el habla con otras modalidades.",
     "B. Programas que solo contestan preguntas o ejecutan órdenes de voz.",
     "C. Programas que solo usan la voz.",
     "D. Programas que solo usan texto."
    ],
    "c": 0,
    "e": "Voz, texto o multimodal (p. 23). B describe solo el caso más sencillo."
   },
   {
    "p": "¿Cuál es un ejemplo de factoid question?",
    "o": [
     "A. ¿Cuál es la composición de la atmósfera de Marte?",
     "B. ¿Cuál es la mejor forma de viajar a Roma?",
     "C. ¿Qué me recomiendas para aprender PLN?",
     "D. Todas las anteriores."
    ],
    "c": 0,
    "e": "Pregunta sobre un hecho concreto (p. 27). B y C son abiertas."
   },
   {
    "p": "¿Para qué sirve el índice invertido en recuperación ad hoc?",
    "o": [
     "A. Mejorar la puntuación de similitud.",
     "B. Buscar con eficiencia: solo se puntúan los documentos que contienen palabras de la consulta.",
     "C. Usar embeddings.",
     "D. Ninguna de las anteriores."
    ],
    "c": 1,
    "e": "Diccionario término → documentos (pp. 28-29). En nuestras 92 noticias, una consulta tiene de media 7 candidatos."
   },
   {
    "p": "Sobre un sistema de IR para factoid QA:",
    "o": [
     "A. Recupera documentos y después busca el fragmento que responde.",
     "B. Usa [CLS] como respuesta por defecto cuando no hay respuesta.",
     "C. Recorre los documentos largos con ventanas acotadas.",
     "D. Todas son correctas."
    ],
    "c": 3,
    "e": "Las tres (pp. 30-33). Matiz medido: [CLS] solo funciona si el modelo se entrenó con preguntas sin respuesta; nuestro lector (SQAC) detecta 1 de 3."
   },
   {
    "p": "Indica la afirmación INCORRECTA sobre ASR:",
    "o": [
     "A. Los rasgos de la señal entran directamente en el codificador.",
     "B. La entrada tiene mucha más longitud que la salida, por lo que se comprime antes del modelo.",
     "C. Es un problema causal y mejora combinándolo con un LM.",
     "D. Todas son incorrectas."
    ],
    "c": 0,
    "e": "Los rasgos se comprimen antes del codificador (p. 39): en Whisper, 3000 tramas pasan a 1500 posiciones."
   },
   {
    "p": "Indica la afirmación INCORRECTA sobre TTS:",
    "o": [
     "A. En general es dependiente del hablante.",
     "B. Necesita un vocoder para obtener la señal a partir del espectrograma.",
     "C. La última capa del decodificador predice directamente la señal acústica.",
     "D. Todas son incorrectas."
    ],
    "c": 2,
    "e": "El decodificador predice el espectrograma Mel; el vocoder genera la onda (p. 41). Sobre A: es lo habitual, pero hay sistemas multihablante."
   }
  ]
 },
 "10": {
  "titulo": "Tema 10 · Visualización de textos",
  "origen": "Preguntas propias de la preparación; el test oficial está en el aula.",
  "preguntas": [
   {
    "p": "Dos noticias aparecen juntas en un mapa t-SNE. ¿Qué puedes concluir?",
    "o": [
     "Que se parecen",
     "Que son de la misma sección",
     "Nada sin comprobarlo en el espacio original"
    ],
    "c": 2,
    "e": "En la Clase 17, d15 y e13 eran vecinas en el mapa con coseno 0. La distancia del mapa es una pista."
   },
   {
    "p": "¿Qué ventaja tiene una proyección lineal como PCA, según el tema?",
    "o": [
     "Es incremental e interpretable",
     "Captura relaciones no lineales",
     "Conserva todas las distancias"
    ],
    "c": 0,
    "e": "Los documentos nuevos se proyectan con la transformación ya calculada y los ejes se leen por sus cargas (10.4)."
   },
   {
    "p": "Con más términos que documentos, el análisis discriminante lineal separa perfectamente unas etiquetas inventadas en entrenamiento. ¿Qué lo delata?",
    "o": [
     "La silueta",
     "El acierto en un conjunto de prueba",
     "El número de componentes"
    ],
    "c": 1,
    "e": "Silueta 1,00 con etiquetas al azar; en prueba acierta de media el 23 %."
   },
   {
    "p": "¿Qué parámetro de t-SNE equivale aproximadamente al número efectivo de vecinos?",
    "o": [
     "max_iter",
     "learning_rate",
     "perplexity"
    ],
    "c": 2,
    "e": "La perplejidad fija la anchura de cada campana; debe ser menor que el número de documentos."
   },
   {
    "p": "Con scikit-learn 1.9.1, TSNE(n_iter=500) da…",
    "o": [
     "Un aviso",
     "Un TypeError: el parámetro se llama max_iter",
     "El mismo resultado que max_iter=500"
    ],
    "c": 1,
    "e": "n_iter se renombró en la versión 1.5 y ya no existe en la firma actual."
   },
   {
    "p": "En una nube de WordCloud, la palabra «quijote» tiene el 82 % de la frecuencia de «don». Su tamaño será…",
    "o": [
     "El 82 % del de «don»",
     "No necesariamente proporcional: depende de la escala y del espacio",
     "Siempre el mayor"
    ],
    "c": 1,
    "e": "Con relative_scaling = 0,5 y sin sitio para colocarla, salió con el 42 % del tamaño."
   },
   {
    "p": "«no» es la palabra más frecuente en las reseñas positivas y en las negativas. ¿Por qué?",
    "o": [
     "Las positivas están mal etiquetadas",
     "La nube no ve lo que niega «no» («no tuvimos ningún problema»)",
     "Es un error de tokenización"
    ],
    "c": 1,
    "e": "La pérdida de contexto es la principal desventaja de las nubes (Tabla 1)."
   },
   {
    "p": "¿Qué mide mejor la asociación de una palabra con «dulcinea»?",
    "o": [
     "La PMI con un mínimo de casos",
     "El número de oraciones compartidas",
     "El tamaño en la nube"
    ],
    "c": 0,
    "e": "Por recuento ganan don, quijote y sancho; por PMI, desencanto, Aldonza, labradora, Merlín."
   },
   {
    "p": "La Parte II del Quijote tiene mayor TTR media por capítulo que la Parte I. ¿Significa que su vocabulario es más rico?",
    "o": [
     "Sí",
     "Solo si se quitan las vacías",
     "No: sus capítulos son más cortos; con MATTR quedan iguales"
    ],
    "c": 2,
    "e": "TTR 0,32 frente a 0,36; MATTR 0,510 frente a 0,509."
   },
   {
    "p": "La firma de «El curioso impertinente» es la más distinta del Quijote. ¿Lo escribió otro autor?",
    "o": [
     "Sí",
     "No necesariamente: la firma indica otro estilo (género, narración), no la autoría",
     "Sí, si n = 4"
    ],
    "c": 1,
    "e": "Es de Cervantes: una novela intercalada con menos diálogo y oraciones más largas."
   }
  ]
 }
};
