/* Caso ilustrativo anotado a mano y experimento de reglas calculado localmente.
   No modifica DATOS03 ni simula la ejecución de spaCy. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = Clase.esc;
  const TOKENS = ['La','investigadora','Ana','Ruiz','trabaja','en','NovaLab',',','en','Salamanca','.','La','investigadora','presentó','un','prototipo','médico','.'];
  const POS = ['DET','NOUN','PROPN','PROPN','VERB','ADP','PROPN','PUNCT','ADP','PROPN','PUNCT','DET','NOUN','VERB','DET','NOUN','ADJ','PUNCT'];
  const ESPACIOS = TOKENS.map((_,i) => i === TOKENS.length - 1 || [7,10,17].includes(i+1) ? '' : ' ');
  const SN = [[0,4,'SN'],[6,7,'SN'],[9,10,'SN'],[11,13,'SN'],[14,17,'SN']];
  const ENT = [[2,4,'PER'],[6,7,'ORG'],[9,10,'LOC']];
  const REFERENCIA = [['Ana Ruiz','trabaja_en','NovaLab'],['Ana Ruiz','ciudad_de_trabajo','Salamanca']];
  const PASOS = [
    {nombre:'El encargo',titulo:'Una pregunta que una tabla sí puede responder',pregunta:'¿Qué columnas necesitamos para buscar quién trabaja en cada organización?',respuesta:'Persona, organización y ciudad de trabajo. La noticia también menciona un prototipo: no todo lo escrito pertenece a esta tabla.',idea:'Primero define qué quieres extraer. La estructura de salida determina qué información necesitas.'},
    {nombre:'Categorías',titulo:'POS: una etiqueta por token',pregunta:'¿«Ruiz» y «trabaja» cuentan lo mismo sobre la frase?',respuesta:'Ruiz forma parte de un nombre propio (PROPN); trabaja es un verbo (VERB). La categoría describe la función gramatical; todavía no dice qué tipo de entidad es.',idea:'PROPN es una categoría gramatical. PER es un tipo de entidad. Responden a preguntas distintas.'},
    {nombre:'Grupos',titulo:'Chunking: reunir palabras que funcionan juntas',pregunta:'¿«un prototipo médico» es un grupo nominal? ¿Es un nombre propio?',respuesta:'Es un grupo nominal con determinante, nombre y adjetivo. No es una entidad nombrada en el esquema PER/ORG/LOC de este caso.',idea:'Un grupo nominal puede contener una entidad o no contener ninguna. Chunking y NER producen tramos con criterios distintos.'},
    {nombre:'Entidades',titulo:'NER: localizar nombres y asignarles un tipo',pregunta:'¿Dónde empieza y termina la persona: «Ana», «Ana Ruiz» o «La investigadora Ana Ruiz»?',respuesta:'La entidad PER es Ana Ruiz. El grupo nominal completo incluye además La investigadora. Elegir bien el límite es parte de la tarea.',idea:'NER devuelve un tramo y un tipo. No establece por sí solo qué relación une a dos entidades.'},
    {nombre:'Relaciones',titulo:'Del nombre aislado a un hecho apoyado por el texto',pregunta:'¿Aparecer en la misma frase basta para afirmar que alguien trabaja en una organización?',respuesta:'No. Aquí lo apoya trabaja en. Visita NovaLab o no trabaja en NovaLab no justifican la misma relación afirmativa.',idea:'Una relación necesita evidencia lingüística. Conserva el fragmento que permite revisarla.'},
    {nombre:'La tabla',titulo:'Estructurar sin inventar campos',pregunta:'¿Podemos rellenar también la fecha del empleo o la sede oficial de NovaLab?',respuesta:'No aparecen. Salamanca se describe como ciudad de trabajo, no como domicilio de la empresa. Un campo ausente debe quedar sin dato.',idea:'Extraer es registrar lo que el texto permite afirmar, con una procedencia que se pueda comprobar.'},
    {nombre:'Un fallo',titulo:'Una entidad perdida deja un hecho sin extraer',pregunta:'Si desaparece NovaLab del NER, ¿puede seguir funcionando una regla que exige PER + ORG?',respuesta:'No. En esta cadena ilustrativa la regla exige ambas entidades; pierde trabaja_en, aunque las palabras siguen en el texto. Otros diseños pueden recuperar el dato de otra manera.',idea:'Evaluar solo una etapa no garantiza que la tabla final sea correcta. Comprueba también el resultado de la cadena.'}
  ];
  function tabla(cab, filas) {
    return '<div class="aula-tabla"><table><thead><tr>'+cab.map(c=>'<th scope="col">'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+filas.map(f=>'<tr>'+f.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function nodo(t,tipo) { return '<div class="aula-nodo '+(tipo==='ORG'?'org':tipo==='LOC'?'loc':'')+'"><small>'+esc(tipo)+'</small>'+esc(t)+'</div>'; }
  function noticia(k, fallo) {
    const spans = k === 2 ? SN : k >= 3 ? ENT.filter(s=>!(fallo && s[2]==='ORG')) : [];
    let html = '';
    for (let i=0;i<TOKENS.length;i++) {
      const span = spans.find(s=>s[0]===i);
      if (span) {
        html += '<mark data-tipo="'+span[2]+'">'+TOKENS.slice(span[0],span[1]).join(' ')+'<small>'+span[2]+'</small></mark>'+ESPACIOS[span[1]-1];
        i=span[1]-1;
      } else if (k===1 && ['NOUN','PROPN','VERB'].includes(POS[i])) {
        html += '<mark data-tipo="'+POS[i]+'">'+TOKENS[i]+'<small>'+POS[i]+'</small></mark>'+ESPACIOS[i];
      } else html += esc(TOKENS[i])+ESPACIOS[i];
    }
    return html;
  }
  const ruta=$('casoRuta');
  PASOS.forEach((p,k)=>{
    const b=document.createElement('button'); b.type='button'; b.innerHTML='<b>0'+(k+1)+'</b>'+p.nombre;
    b.addEventListener('click',()=>{pasos.ir(k);Clase.marcarPasoActivo(pasos);}); ruta.append(b);
  });
  function pintar(k) {
    const p=PASOS[k], fallo=k===6 && $('casoFallo').checked;
    [...ruta.children].forEach((b,i)=>{ if(i===k)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current'); });
    $('casoTit').textContent=p.titulo;
    $('casoNoticia').innerHTML=noticia(k,fallo);
    $('casoPregunta').textContent=p.pregunta;
    $('casoRespuesta').textContent=p.respuesta;
    $('casoDetalle').open=false;
    $('casoIdea').textContent=p.idea;
    $('casoFalloZona').hidden=k!==6;
    const out=$('casoDibujo');
    if(k===0) out.innerHTML='<div class="aula-nodos"><div class="aula-hueco">Texto libre</div><div class="aula-flecha"><span>→</span>extraer</div><div class="aula-hueco">Datos consultables</div></div>'+tabla(['Persona','Organización','Ciudad de trabajo'],[['¿quién?','¿dónde trabaja?','¿en qué ciudad?']]);
    if(k===1) out.innerHTML='<div class="aula-fichas">'+[0,1,2,3,4,5,6].map(i=>'<div class="aula-ficha '+(POS[i]==='VERB'?'verbo':'')+'">'+TOKENS[i]+'<small>'+POS[i]+'</small></div>').join('')+'</div><p class="aula-nota">DET: determinante · NOUN: nombre común · PROPN: nombre propio · VERB: verbo · ADP: adposición (aquí, preposición). Se muestra el inicio de la frase.</p>';
    if(k===2) out.innerHTML='<div class="aula-grupo"><small>SN · DET + NOUN + PROPN + PROPN</small>La investigadora Ana Ruiz</div><div class="aula-grupo"><small>SN · DET + NOUN + ADJ</small>un prototipo médico</div><p class="aula-nota">Agrupación superficial: encontramos grupos, sin construir aquí un análisis sintáctico completo.</p>';
    if(k===3) out.innerHTML='<div class="aula-nodos">'+nodo('Ana Ruiz','PER')+nodo('NovaLab','ORG')+nodo('Salamanca','LOC')+'</div><p class="aula-nota">La investigadora es una descripción. No se añade como un nombre de persona nuevo.</p>';
    if(k===4) out.innerHTML='<div class="aula-nodos">'+nodo('Ana Ruiz','PER')+'<div class="aula-flecha">trabaja_en<span>⟶</span></div>'+nodo('NovaLab','ORG')+'</div><div class="aula-celda"><b>Evidencia</b>«Ana Ruiz <strong>trabaja en</strong> NovaLab»</div><p class="aula-nota">La segunda oración contiene una descripción de la persona. Resolver esa referencia requeriría otro paso; no lo añadimos a estas reglas.</p>';
    if(k===5) out.innerHTML=tabla(['Persona','Organización','Ciudad de trabajo'],[['Ana Ruiz','NovaLab','Salamanca']])+tabla(['Hecho extraído','Evidencia'],[['trabaja_en → NovaLab','trabaja en NovaLab'],['ciudad_de_trabajo → Salamanca','en Salamanca']])+'<p class="aula-nota">Fecha del empleo: sin dato. Noticia ficticia · documento 01.</p>';
    if(k===6) {
      const filas=REFERENCIA.filter(r=>!fallo || r[2]!=='NovaLab');
      out.innerHTML=(fallo?'<div class="aula-roto">NovaLab sin tipo ORG → la regla PER + ORG no se activa → se pierde trabaja_en.</div>':'')+tabla(['Persona','Relación','Valor'],filas)+'<div class="aula-mini-metricas"><div><b>'+filas.length+'/2</b><span>hechos recuperados de la referencia</span></div><div><b>100 %</b><span>precisión: correctos / extraídos</span></div><div><b>'+(fallo?'50':'100')+' %</b><span>exhaustividad: correctos / esperados</span></div></div><p class="aula-nota">Cálculo sobre dos hechos anotados a mano. Ilustra las medidas; no estima el rendimiento de un modelo.</p>';
    }
  }
  const pasos=Clase.pasos($('casoPasos'),{total:PASOS.length,etiqueta:k=>PASOS[k].nombre,pintar});
  $('casoFallo').addEventListener('change',()=>pintar(pasos.k));
  $('casoReiniciar').addEventListener('click',()=>{$('casoFallo').checked=false;pasos.ir(0);Clase.marcarPasoActivo(pasos);});
  document.querySelectorAll('[data-aula-tab]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();Clase.irAPestana(a.dataset.aulaTab);}));

  // Práctica: las entidades y las referencias son manuales; las reglas sí se ejecutan.
  // Cada caso es independiente. No se aprende de las respuestas ni se usa un modelo.
  const CASOS=[
    {texto:'Ana Ruiz trabaja en NovaLab.',gold:true,motivo:'La relación aparece afirmada de forma explícita.'},
    {texto:'Ana Ruiz no trabaja en NovaLab.',gold:false,motivo:'La negación impide registrar la relación afirmativa trabaja_en.'},
    {texto:'Ana Ruiz visita NovaLab.',gold:false,motivo:'Una visita no acredita una relación laboral.'},
    {texto:'NovaLab emplea a Ana Ruiz.',gold:true,motivo:'La redacción cambia, pero el verbo emplea expresa la relación laboral en este caso.'},
    {texto:'Ana Ruiz nunca trabaja en NovaLab.',gold:false,motivo:'Nunca niega trabaja, aunque no aparezca la palabra no.'},
    {texto:'Ana Ruiz trabaja para NovaLab.',gold:true,motivo:'Trabajar para expresa aquí la relación; el patrón literal trabaja en no cubre esta variante.'}
  ];
  const REGLAS={
    juntas:{nombre:'Solo coocurrencia',texto:'Si aparecen «Ana Ruiz» y «NovaLab», añadir trabaja_en.',predecir:t=>t.includes('Ana Ruiz')&&t.includes('NovaLab')},
    literal:{nombre:'Patrón literal',texto:'Si aparecen las dos entidades y la secuencia «trabaja en», añadir trabaja_en. No revisar el resto de la frase.',predecir:t=>t.includes('Ana Ruiz')&&t.includes('NovaLab')&&/trabaja en/.test(t)},
    negacion:{nombre:'Patrón + negación',texto:'Aceptar «Ana Ruiz [no / nunca] trabaja en NovaLab» solo cuando no aparece no ni nunca. La cobertura sigue siendo limitada.',predecir:t=>{const m=t.match(/Ana Ruiz (?:(no|nunca) )?trabaja en NovaLab/);return !!m&&!m[1];}}
  };
  const fmt=x=>x===null?'—':Math.round(x*100)+' %';
  CASOS.forEach((c,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Caso '+(i+1)+' · '+['Afirmación','Negación','Visita','Otra redacción','Otro negador','Otra preposición'][i];$('practicaCaso').append(o);});
  function renderPractica() {
    const c=CASOS[+$('practicaCaso').value],reg=REGLAS[$('practicaRegla').value];
    $('practicaTexto').textContent=c.texto;
    $('practicaSalida').textContent=reg.predecir(c.texto)?'(Ana Ruiz, trabaja_en, NovaLab)':'No se extrae trabaja_en.';
    $('practicaReglaTexto').textContent=reg.texto;
    const ver=$('practicaSolucion').getAttribute('aria-pressed')==='true';
    $('practicaReferencia').hidden=!ver;
    $('practicaSolucion').textContent=ver?'Ocultar referencia y evaluación':'Mostrar referencia y evaluación';
    $('practicaGold').textContent=c.gold?'(Ana Ruiz, trabaja_en, NovaLab)':'No hay una relación laboral afirmada.';
    $('practicaMotivo').textContent=c.motivo;
    let tp=0,fp=0,fn=0;
    const filas=CASOS.map((x,i)=>{const pred=reg.predecir(x.texto);if(pred&&x.gold)tp++;if(pred&&!x.gold)fp++;if(!pred&&x.gold)fn++;return [''+(i+1),x.texto,pred?'Extrae':'No extrae',x.gold?'Relación afirmada':'Sin relación afirmada',pred===x.gold?'Correcto':pred?'Falso positivo':'Falso negativo'];});
    $('practicaMetricas').innerHTML='<div><b>'+tp+'</b><span>hechos correctos (VP)</span></div><div><b>'+fp+'</b><span>añadidos por error (FP)</span></div><div><b>'+fn+'</b><span>hechos perdidos (FN)</span></div><div><b>'+fmt(tp+fp?tp/(tp+fp):null)+'</b><span>precisión = VP / (VP + FP)</span></div><div><b>'+fmt(tp/(tp+fn))+'</b><span>exhaustividad = VP / (VP + FN)</span></div>';
    $('practicaBateria').innerHTML=tabla(['Caso','Texto','Regla','Referencia manual','Resultado'],filas);
    const bien=reg.predecir(c.texto)===c.gold;
    $('practicaEstado').className='aula-estado'+(bien?'':' fallo');$('practicaEstado').textContent=bien?'Coincide con la referencia':reg.predecir(c.texto)?'Falso positivo':'Falso negativo';
  }
  $('practicaCaso').addEventListener('change',renderPractica);
  $('practicaRegla').addEventListener('change',renderPractica);
  $('practicaSolucion').addEventListener('click',()=>{const b=$('practicaSolucion');b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));renderPractica();});
  renderPractica();
})();
