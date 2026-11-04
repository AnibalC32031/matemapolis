// MAPA OFICIAL DE LAS 40 CASILLAS
const BOARD_DATA = [
  // Lado Inferior (0 a 10)
  { id: 0, name: "SALIDA", type: "CORNER", desc: "+200 Beca", cost: 0, rent: 0 },
  { id: 1, name: "Pedagogía", type: "CFG", cost: 60, rent: 15 },
  { id: 2, name: "Tarjeta de Escuela", type: "EVENTO", deck: "ESCUELA" },
  { id: 3, name: "Psicología Educacional", type: "CFG", cost: 60, rent: 15 },
  { id: 4, name: "Alfabetización Académica", type: "CFG", cost: 80, rent: 20 },
  { id: 5, name: "Práctica I: La Escuela", type: "CFPP", cost: 180, rent: 35 },
  { id: 6, name: "Álgebra I", type: "CFE", cost: 100, rent: 25 },
  { id: 7, name: "Aviso de la Junta", type: "EVENTO", deck: "JUNTA" },
  { id: 8, name: "Geometría I", type: "CFE", cost: 100, rent: 25 },
  { id: 9, name: "Intro. al Análisis", type: "CFE", cost: 120, rent: 30 },
  { id: 10, name: "COLOQUIO / EXAMEN", type: "CORNER", desc: "Mesa Evaluadora", cost: 0, rent: 0 },

  // Lado Izquierdo (11 a 20)
  { id: 11, name: "Didáctica General", type: "CFG", cost: 140, rent: 35 },
  { id: 12, name: "Plataforma TIC", type: "SERVICE", cost: 150, rent: 30 },
  { id: 13, name: "Filosofía", type: "CFG", cost: 140, rent: 35 },
  { id: 14, name: "Políticas Educativas", type: "CFG", cost: 160, rent: 40 },
  { id: 15, name: "Práctica II: El Aula", type: "CFPP", cost: 200, rent: 45 },
  { id: 16, name: "Sujeto de la Educación", type: "CFE", cost: 180, rent: 40 },
  { id: 17, name: "Tarjeta de Escuela", type: "EVENTO", deck: "ESCUELA" },
  { id: 18, name: "Álgebra II", type: "CFE", cost: 180, rent: 40 },
  { id: 19, name: "Análisis Matemático I", type: "CFE", cost: 200, rent: 50 },
  { id: 20, name: "CONGRESO DOCENTE", type: "CORNER", desc: "Pausa Pedagógica", cost: 0, rent: 0 },

  // Lado Superior (21 a 30)
  { id: 21, name: "Geometría II", type: "CFE", cost: 220, rent: 55 },
  { id: 22, name: "Aviso de la Junta", type: "EVENTO", deck: "JUNTA" },
  { id: 23, name: "Educación Sexual (ESI)", type: "CFG", cost: 220, rent: 55 },
  { id: 24, name: "Tecnología en el Aula", type: "CFG", cost: 240, rent: 60 },
  { id: 25, name: "Práctica III: Secundaria", type: "CFPP", cost: 240, rent: 60 },
  { id: 26, name: "Sociología Educativa", type: "CFG", cost: 260, rent: 65 },
  { id: 27, name: "Didáctica de la Matemática", type: "CFE", cost: 260, rent: 65 },
  { id: 28, name: "Laboratorio de Cálculo", type: "SERVICE", cost: 150, rent: 30 },
  { id: 29, name: "Historia de la Matemática", type: "CFE", cost: 280, rent: 70 },
  { id: 30, name: "¡A RECUPERATORIO!", type: "CORNER", desc: "Vas a Coloquio", cost: 0, rent: 0 },

  // Lado Derecho (31 a 39)
  { id: 31, name: "Análisis Matemático II", type: "CFE", cost: 300, rent: 75 },
  { id: 32, name: "Probabilidad y Estadística", type: "CFE", cost: 300, rent: 75 },
  { id: 33, name: "Tarjeta de Escuela", type: "EVENTO", deck: "ESCUELA" },
  { id: 34, name: "Análisis Matemático III", type: "CFE", cost: 320, rent: 80 },
  { id: 35, name: "Física Matemática", type: "CFE", cost: 320, rent: 80 },
  { id: 36, name: "Matemática Aplicada", type: "CFE", cost: 350, rent: 85 },
  { id: 37, name: "Ética Docente", type: "CFG", cost: 350, rent: 85 },
  { id: 38, name: "UDI Jujuy", type: "UDI", cost: 380, rent: 90 },
  { id: 39, name: "Residencia Final", type: "CFPP", cost: 400, rent: 110 }
];

// BANCO DE PREGUNTAS MÚLTIPLES POR CASILLA (ROTATIVAS)
const QUESTION_BANK = {
  1: [
    { q: "Pedagogía: Según Paulo Freire, ¿cuál es el sentido principal de enseñar?", options: ["Transferir datos de forma mecánica", "Crear posibilidades para la construcción comunitaria del saber", "Evaluar con exámenes punitivos"], ans: 1 },
    { q: "Pedagogía: ¿Qué significa 'transposición didáctica'?", options: ["El paso del saber sabio al saber enseñado en el aula", "Mudar de aula a los alumnos", "Copiar textualmente del libro universitario"], ans: 0 }
  ],
  3: [
    { q: "Psicología: Según Vygotsky, la 'Zona de Desarrollo Próximo' es:", options: ["La distancia entre lo que el alumno hace solo y lo que logra con mediación", "El tiempo que dura un recreo", "La fatiga mental antes de un parcial"], ans: 0 },
    { q: "Psicología: Según Piaget, cuando un alumno modifica sus esquemas ante un nuevo problema ocurre:", options: ["Acomodación", "Asimilación pasiva", "Desatención"], ans: 0 }
  ],
  4: [
    { q: "Alfabetización: La escritura académica en profesorados exige principalmente:", options: ["Argumentación fundamentada y citas de autores", "Expresión coloquial sin referencias", "Resúmenes exclusivamente visuales"], ans: 0 }
  ],
  5: [
    { q: "Práctica I: Al realizar la primera observación institucional debemos registrar:", options: ["La cultura institucional, espacios y dinámicas de interacción", "Únicamente las notas numéricas del libro matriz", "Fallas individuales de los alumnos"], ans: 0 }
  ],
  6: [
    { q: "Álgebra I: En el polinomio P(x) = 4x³ - 2x + 9, ¿cuál es su grado?", options: ["Grado 3", "Grado 1", "Grado 4"], ans: 0 },
    { q: "Álgebra I: Dos matrices pueden multiplicarse si y solo si:", options: ["Las columnas de la primera equivalen a las filas de la segunda", "Tienen idéntica diagonal", "Ambas son cuadradas obligatoriamente"], ans: 0 }
  ],
  8: [
    { q: "Geometría I: La suma de los ángulos internos de un triángulo euclidiano es:", options: ["180°", "360°", "90°"], ans: 0 },
    { q: "Geometría I: El Teorema de Pitágoras es válido exclusivamente en:", options: ["Triángulos rectángulos", "Triángulos equiláteros", "Cualquier cuadrilátero"], ans: 0 }
  ],
  9: [
    { q: "Intro. al Análisis: El dominio natural de f(x) = 5 / (x - 2) es:", options: ["Todos los reales excepto x = 2", "Todos los números positivos", "El intervalo [0, 2]"], ans: 0 }
  ],
  11: [
    { q: "Didáctica General: Una secuencia didáctica debe estructurarse en fases de:", options: ["Apertura, desarrollo y cierre/institucionalización", "Dictado, copia y examen sorpresa", "Teoría pura sin actividades"], ans: 0 }
  ],
  13: [
    { q: "Filosofía: La disciplina que interroga los fundamentos y alcances del saber científico es:", options: ["Epistemología", "Estética", "Ontología general"], ans: 0 }
  ],
  14: [
    { q: "Políticas Educativas: La Ley Nacional de Educación 26.206 establece que la Educación Secundaria es:", options: ["Obligatoria en todas sus modalidades", "Optativa según jurisdicción", "Arancelada en el ciclo superior"], ans: 0 }
  ],
  15: [
    { q: "Práctica II: Una microclase simulada con pares sirve principalmente para:", options: ["Ensayar intervenciones y reflexionar sobre la gestión del tiempo y consignas", "Obtener un puntaje salarial anticipado", "Reemplazar las prácticas en escuelas"], ans: 0 }
  ],
  16: [
    { q: "Sujeto: Al enseñar a adolescentes, el error constructivo en matemática debe usarse como:", options: ["Punto de partida para el debate y desmitificación de fórmulas", "Motivo de sanción en el boletín", "Señal de incapacidad innata"], ans: 0 }
  ],
  18: [
    { q: "Álgebra II: Un sistema de ecuaciones lineales sin soluciones se clasifica como:", options: ["Incompatible", "Compatible indeterminado", "Homogéneo trivial"], ans: 0 }
  ],
  19: [
    { q: "Análisis I: La derivada primera de f(x) = 3x² evaluada en x = 2 resulta:", options: ["12", "6", "24"], ans: 0 }
  ],
  21: [
    { q: "Geometría II: La sección cónica resultante de un plano perpendicular al eje de un cono circular recto es:", options: ["Una circunferencia", "Una hipérbola", "Una elipse alargada"], ans: 0 }
  ],
  23: [
    { q: "ESI: ¿Cómo puede articularse la ESI en el aula de matemática?", options: ["Analizando estadísticas de género, salud y trabajo adolescente", "No es posible articularlas", "Haciendo cálculos aislados sin contexto"], ans: 0 }
  ],
  24: [
    { q: "Tecnología: La ventaja pedagógica del software dinámico GeoGebra es:", options: ["Visualizar la covariación y experimentar geométricamente en tiempo real", "Evitar que los alumnos piensen", "Reemplazar al docente"], ans: 0 }
  ],
  25: [
    { q: "Práctica III: En el diseño de consignas para el nivel secundario se debe priorizar:", options: ["Problemas contextualizados que demanden modelización matemática", "Ejercicios mecánicos repetitivos de más de 30 items", "Teoría abstracta sin gráficos"], ans: 0 }
  ],
  26: [
    { q: "Sociología: Según Pierre Bourdieu, el conjunto de saberes y hábitos transmitidos culturalmente es:", options: ["El Capital Cultural", "La plusvalía escolar", "El currículum nulo"], ans: 0 }
  ],
  27: [
    { q: "Didáctica Matemática: Guy Brousseau define una 'Situación A-didáctica' como aquella donde:", options: ["El estudiante resuelve el desafío sin la intervención directa del docente", "No hay matemática involucrada", "El profesor dicta la regla de memoria"], ans: 0 }
  ],
  29: [
    { q: "Historia Matemática: El surgimiento del cálculo infinitesimal en el siglo XVII se asocia a:", options: ["Newton y Leibniz simultáneamente", "Pitágoras y Euclides", "Descartes exclusivamente"], ans: 0 }
  ],
  31: [
    { q: "Análisis II: En funciones de varias variables, el vector gradiente apunta en la dirección de:", options: ["Máximo crecimiento de la función", "Mínimo cambio", "Crecimiento nulo"], ans: 0 }
  ],
  32: [
    { q: "Probabilidad: Al lanzar dos dados comunes de 6 caras, ¿cuál es la suma más probable?", options: ["7", "6", "12"], ans: 0 }
  ],
  34: [
    { q: "Análisis III: La ecuación diferencial dy/dx = ky modela fenómenos de:", options: ["Crecimiento o decaimiento exponencial", "Movimiento parabólico sin fricción", "Distribución normal continua"], ans: 0 }
  ],
  35: [
    { q: "Física Matemática: La Segunda Ley de Newton se formaliza mediante la relación:", options: ["F = m · a", "E = m · c²", "W = F · d²"], ans: 0 }
  ],
  36: [
    { q: "Matemática Aplicada: La programación lineal utiliza métodos como el Simplex para:", options: ["Optimizar funciones lineales sujetas a restricciones", "Resolver ecuaciones cúbicas", "Graficar fractales"], ans: 0 }
  ],
  37: [
    { q: "Ética Docente: Ante una situación de presunta vulneración de derechos de un estudiante menor, la ley exige:", options: ["Activar los protocolos escolares y dar aviso a las autoridades competentes", "Guardar silencio para evitar conflictos", "Exponer el caso en foros públicos"], ans: 0 }
  ],
  38: [
    { q: "UDI Jujuy: La Unidad de Definición Institucional en Jujuy promueve:", options: ["Proyectos matemáticos vinculados al contexto sociocultural provincial", "Estandarizar exámenes internacionales", "Eliminar contenidos regionales"], ans: 0 }
  ],
  39: [
    { q: "Residencia: La Residencia Pedagógica concluye exitosamente cuando el estudiante:", options: ["Sostiene la práctica reflexiva, planifica, enseña y fundamenta su labor pedagógica", "Solo asiste como oyente a todas las clases", "Aprueba únicamente una prueba escrita teórica"], ans: 0 }
  ]
};

// TARJETAS DE EVENTOS
const EVENT_CARDS = {
  ESCUELA: [
    { title: "Feria de Ciencias Destacada", desc: "Tus estudiantes obtuvieron mención de honor. Cobras 120 CA de estímulo.", act: "cash", val: 120 },
    { title: "Beca de Perfeccionamiento", desc: "El Ministerio adjudica fondos para capacitación docente. Cobras 150 CA.", act: "cash", val: 150 },
    { title: "Planificación Fuera de Término", desc: "Demora en la entrega de diagnósticos trimestrales. Retrocedes 2 casillas.", act: "move", val: -2 },
    { title: "Proyecto GeoGebra Aprobado", desc: "Integración destacada de TIC en secundaria. Cobras 90 CA.", act: "cash", val: 90 },
    { title: "Ateneo Didáctico Interinstitucional", desc: "Excelente intercambio con colegas. Tiras el Dado de Aceleración.", act: "acceleration" }
  ],
  JUNTA: [
    { title: "Legajo Docente Actualizado", desc: "Validación de constancias y cursos en Junta Calificadora. Cobras 60 CA.", act: "cash", val: 60 },
    { title: "Insumos Didácticos del Bolsillo", desc: "Compra de compases y escuadras para el curso. Pagas 50 CA de gastos.", act: "cash", val: -50 },
    { title: "Jornada Institucional Activa", desc: "Acuerdos curriculares exitosos. Avanzas 2 casillas.", act: "move", val: 2 },
    { title: "Cobertura de Interinato", desc: "Liquidación por suplencia docente cumplida en término. Cobras 110 CA.", act: "cash", val: 110 }
  ]
};