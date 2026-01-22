/**
 * Mapa de Soluciones por Nicho de Negocio
 * 
 * Define problemas comunes y soluciones web específicas para cada tipo de negocio.
 * Esto permite que la IA empatice y proponga soluciones relevantes.
 */

export interface NicheSolution {
  /** Problemas operativos comunes que sufre este tipo de negocio sin web */
  problemas: string[]
  /** Soluciones concretas que una web/sistema digital les resolvería */
  soluciones: string[]
  /** Ejemplos de hooks específicos para este nicho */
  hooks: string[]
}

export const NICHE_SOLUTIONS: Record<string, NicheSolution> = {
  // ═══════════════════════════════════════════════════════════════
  // SERVICIOS PERSONALES
  // ═══════════════════════════════════════════════════════════════
  
  "peluqueria": {
    problemas: [
      "Turnos que se cruzan o se pierden por WhatsApp",
      "Clientes que no aparecen a sus citas",
      "No pueden mostrar sus trabajos y estilos",
      "Pierden clientes nuevos que buscan en Google"
    ],
    soluciones: [
      "Sistema de reservas online 24/7 con recordatorios automáticos",
      "Galería de trabajos y estilos para atraer nuevos clientes",
      "Ficha de Google optimizada para aparecer en búsquedas locales"
    ],
    hooks: [
      "Vi que tienen buenas reseñas pero no tienen donde mostrar sus trabajos online",
      "Noté que manejan turnos por WhatsApp, ¿alguna vez se les cruzaron citas?"
    ]
  },

  "barberia": {
    problemas: [
      "Turnos desorganizados, especialmente fines de semana",
      "Clientes nuevos no pueden ver el estilo del lugar",
      "Dependen 100% de Instagram para mostrar cortes"
    ],
    soluciones: [
      "Agenda online donde el cliente elige barbero y horario",
      "Galería de cortes y estilos para atraer clientela",
      "Presencia en Google Maps optimizada"
    ],
    hooks: [
      "Vi la barbería en Google Maps, tienen buen rating pero noté que no tienen web propia",
      "Noté que publican cortes en Instagram, ¿pensaron en tener una galería propia?"
    ]
  },

  "spa": {
    problemas: [
      "Reservas de tratamientos complicadas de coordinar",
      "No transmiten la experiencia premium online",
      "Pierden clientes que buscan 'spa cerca de mí'"
    ],
    soluciones: [
      "Sistema de reservas con selección de tratamiento y profesional",
      "Web que transmita la experiencia y ambiente del spa",
      "Paquetes y promociones visibles online"
    ],
    hooks: [
      "Vi que ofrecen varios tratamientos, ¿cómo manejan las reservas actualmente?",
      "Noté que tienen buenas reseñas pero no hay fotos del lugar online"
    ]
  },

  "centro_estetica": {
    problemas: [
      "Difícil explicar todos los tratamientos por WhatsApp",
      "Clientes confundidos sobre precios y duraciones",
      "No pueden mostrar resultados/antes-después"
    ],
    soluciones: [
      "Catálogo de tratamientos con precios y duraciones",
      "Galería de resultados antes/después",
      "Reservas online con selección de servicio"
    ],
    hooks: [
      "Vi que ofrecen muchos tratamientos, ¿los clientes suelen preguntar precios por WhatsApp?",
      "Noté que no tienen donde mostrar resultados de tratamientos"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // GASTRONOMÍA
  // ═══════════════════════════════════════════════════════════════

  "restaurante": {
    problemas: [
      "Clientes llaman solo para ver el menú",
      "Reservas se pierden o cruzan en horarios pico",
      "No aparecen bien en búsquedas de Google",
      "Dependen de apps de delivery que cobran comisiones altas"
    ],
    soluciones: [
      "Menú digital actualizable al instante",
      "Sistema de reservas online con confirmación automática",
      "Pedidos online sin comisiones de terceros",
      "Presencia optimizada en Google para 'restaurante cerca'"
    ],
    hooks: [
      "Vi que tienen buenas reseñas pero noté que no tienen menú online",
      "¿Les pasa que reciben llamadas solo para preguntar qué tienen?"
    ]
  },

  "cafeteria": {
    problemas: [
      "No pueden mostrar el ambiente del lugar online",
      "Clientes no saben horarios o productos disponibles",
      "Pierden el público que busca 'café cerca'"
    ],
    soluciones: [
      "Web con fotos del ambiente y carta de productos",
      "Horarios y ubicación claros para Google",
      "Pedidos anticipados para retirar"
    ],
    hooks: [
      "Vi la cafetería en Google Maps, ¿sabías que muchos buscan 'café cerca de mí'?",
      "Noté que no tienen fotos del lugar online"
    ]
  },

  "panaderia": {
    problemas: [
      "Clientes no saben qué productos tienen cada día",
      "Pedidos especiales (tortas, etc) difíciles de coordinar",
      "No pueden mostrar catálogo de productos"
    ],
    soluciones: [
      "Catálogo visual de productos con precios",
      "Formulario de pedidos especiales y encargos",
      "Horarios y disponibilidad diaria online"
    ],
    hooks: [
      "Vi que hacen tortas personalizadas, ¿cómo reciben los pedidos actualmente?",
      "Noté que no tienen catálogo de productos online"
    ]
  },

  "heladeria": {
    problemas: [
      "Clientes no saben qué gustos hay disponibles",
      "No pueden mostrar precios de kilos/potes",
      "Pierden ventas en temporada alta por falta de visibilidad"
    ],
    soluciones: [
      "Menú de gustos actualizable",
      "Pedidos anticipados para retirar",
      "Presencia en Google para temporada alta"
    ],
    hooks: [
      "Vi que tienen muchos gustos, ¿dónde pueden ver los clientes cuáles hay?",
      "Con el verano que viene, ¿cómo manejan la demanda?"
    ]
  },

  "food_truck": {
    problemas: [
      "Clientes no saben dónde están cada día",
      "No pueden ver el menú antes de llegar",
      "Difícil construir clientela fija"
    ],
    soluciones: [
      "Web/app con ubicación en tiempo real",
      "Menú con fotos y precios",
      "Sistema de fidelización de clientes"
    ],
    hooks: [
      "Vi el food truck en Instagram, ¿los clientes saben dónde encontrarlos cada día?",
      "Noté que no tienen un menú fijo online"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTOMOTRIZ Y TALLERES
  // ═══════════════════════════════════════════════════════════════

  "taller_mecanico": {
    problemas: [
      "Turnos que se colapsan, clientes esperando horas",
      "No pueden avisar cuando el auto está listo",
      "Clientes no recuerdan el historial de service",
      "Presupuestos por WhatsApp se pierden"
    ],
    soluciones: [
      "Sistema de turnos online con estimación de tiempo",
      "Notificaciones automáticas de estado del vehículo",
      "Historial digital de cada cliente/vehículo",
      "Presupuestos digitales con seguimiento"
    ],
    hooks: [
      "Vi el taller en Google Maps, ¿les pasa que se les juntan muchos autos los lunes?",
      "Noté que tienen buenas reseñas, ¿cómo manejan los turnos actualmente?"
    ]
  },

  "lavadero": {
    problemas: [
      "Colas y tiempos de espera impredecibles",
      "Clientes no saben los precios de cada servicio",
      "No pueden reservar horario"
    ],
    soluciones: [
      "Turnos online para evitar esperas",
      "Catálogo de servicios con precios",
      "Sistema de fidelización (lavado gratis cada X)"
    ],
    hooks: [
      "Vi el lavadero, ¿les pasa que hay colas en horarios pico?",
      "Noté que no tienen los precios online"
    ]
  },

  "concesionaria": {
    problemas: [
      "Stock no visible online",
      "Muchas consultas repetitivas por WhatsApp",
      "No pueden filtrar clientes serios de curiosos"
    ],
    soluciones: [
      "Catálogo de vehículos con fotos y fichas técnicas",
      "Filtros de búsqueda por precio, marca, año",
      "Formulario de contacto que precalifica al cliente"
    ],
    hooks: [
      "Vi que tienen buen stock pero no está visible online",
      "¿Reciben muchas consultas de precio por WhatsApp?"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // COMERCIO MINORISTA
  // ═══════════════════════════════════════════════════════════════

  "tienda_ropa": {
    problemas: [
      "No pueden mostrar todo el catálogo",
      "Clientes preguntan stock y talles por WhatsApp",
      "Pierden ventas fuera del horario comercial"
    ],
    soluciones: [
      "Tienda online con catálogo y talles",
      "Carrito de compras y pagos online",
      "Sistema de consulta de stock en tiempo real"
    ],
    hooks: [
      "Vi la tienda, ¿les preguntan mucho por talles y stock?",
      "Noté que no tienen catálogo online"
    ]
  },

  "ferreteria": {
    problemas: [
      "Miles de productos imposibles de mostrar",
      "Clientes llaman para consultar si tienen X producto",
      "Presupuestos para obras llevan mucho tiempo"
    ],
    soluciones: [
      "Buscador de productos con stock",
      "Sistema de pedidos/presupuestos online",
      "Catálogo organizado por categorías"
    ],
    hooks: [
      "¿Les pasa que llaman preguntando si tienen tal producto en stock?",
      "Noté que no tienen los productos listados online"
    ]
  },

  "farmacia": {
    problemas: [
      "Consultas de stock por teléfono constantes",
      "No pueden ofrecer delivery de forma ordenada",
      "Turnos de vacunación difíciles de coordinar"
    ],
    soluciones: [
      "Consulta de stock online",
      "Sistema de pedidos y delivery",
      "Agenda de turnos para vacunas/servicios"
    ],
    hooks: [
      "¿Reciben muchas llamadas preguntando si tienen tal medicamento?",
      "Noté que no tienen sistema de pedidos online"
    ]
  },

  "optica": {
    problemas: [
      "Catálogo de marcos difícil de mostrar",
      "Turnos para exámenes de vista desorganizados",
      "Clientes no recuerdan cuándo hicieron el último control"
    ],
    soluciones: [
      "Catálogo de marcos y lentes online",
      "Sistema de turnos para exámenes",
      "Recordatorios automáticos de control anual"
    ],
    hooks: [
      "Vi que tienen buena variedad de marcos, ¿tienen catálogo online?",
      "¿Cómo manejan los turnos para exámenes de vista?"
    ]
  },

  "joyeria": {
    problemas: [
      "No pueden mostrar el catálogo de forma elegante",
      "Clientes quieren ver piezas antes de ir",
      "Reparaciones y encargos difíciles de trackear"
    ],
    soluciones: [
      "Catálogo online con fotos profesionales",
      "Sistema de seguimiento de reparaciones",
      "Formulario de encargos personalizados"
    ],
    hooks: [
      "Vi la joyería, ¿los clientes pueden ver el catálogo online?",
      "Noté que no tienen las piezas mostradas en web"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVICIOS PROFESIONALES
  // ═══════════════════════════════════════════════════════════════

  "consultorio_medico": {
    problemas: [
      "Turnos por teléfono colapsan la recepción",
      "Pacientes olvidan citas y no avisan",
      "Historiales en papel difíciles de manejar"
    ],
    soluciones: [
      "Sistema de turnos online 24/7",
      "Recordatorios automáticos de citas",
      "Ficha del profesional y especialidades visible"
    ],
    hooks: [
      "¿Les pasa que pacientes no aparecen a sus turnos?",
      "Vi que no tienen sistema de turnos online"
    ]
  },

  "consultorio_odontologico": {
    problemas: [
      "Turnos perdidos o mal agendados",
      "Pacientes no vuelven para controles",
      "No pueden mostrar trabajos (antes/después)"
    ],
    soluciones: [
      "Agenda online con recordatorios",
      "Sistema de seguimiento para controles periódicos",
      "Galería de casos y tratamientos"
    ],
    hooks: [
      "¿Les pasa que pacientes olvidan sus controles semestrales?",
      "Noté que no tienen donde mostrar sus trabajos"
    ]
  },

  "estudio_contable": {
    problemas: [
      "Clientes no saben qué servicios ofrecen exactamente",
      "Documentos van y vienen por mail/WhatsApp",
      "Difícil conseguir clientes nuevos online"
    ],
    soluciones: [
      "Web profesional con servicios y especialidades",
      "Portal de cliente para subir/bajar documentos",
      "Formulario de consulta inicial"
    ],
    hooks: [
      "Vi el estudio, ¿tienen web donde mostrar los servicios?",
      "¿Cómo intercambian documentos con los clientes?"
    ]
  },

  "estudio_juridico": {
    problemas: [
      "Clientes no entienden las áreas de práctica",
      "Consultas iniciales consumen mucho tiempo",
      "No transmiten credibilidad online"
    ],
    soluciones: [
      "Web profesional con áreas de práctica claras",
      "Formulario de consulta inicial estructurado",
      "Perfil de abogados y trayectoria"
    ],
    hooks: [
      "Vi el estudio jurídico, ¿tienen presencia online?",
      "Noté que no tienen web con las áreas de práctica"
    ]
  },

  "inmobiliaria": {
    problemas: [
      "Propiedades dispersas en varios portales",
      "Clientes piden info que ya está en la publicación",
      "No pueden mostrar todas las propiedades propias"
    ],
    soluciones: [
      "Portal propio con todas las propiedades",
      "Filtros de búsqueda por zona, precio, tipo",
      "Formulario de tasación y contacto"
    ],
    hooks: [
      "Vi que tienen propiedades en varios portales, ¿tienen uno propio?",
      "¿Los clientes encuentran fácil sus propiedades online?"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // EDUCACIÓN Y FORMACIÓN
  // ═══════════════════════════════════════════════════════════════

  "academia": {
    problemas: [
      "Inscripciones solo presenciales o por llamada",
      "No pueden mostrar cursos y horarios online",
      "Alumnos no saben el calendario de clases"
    ],
    soluciones: [
      "Catálogo de cursos con horarios y precios",
      "Sistema de inscripción online",
      "Área de alumnos con calendario y materiales"
    ],
    hooks: [
      "Vi que ofrecen varios cursos, ¿tienen el catálogo online?",
      "¿Cómo se inscriben los alumnos actualmente?"
    ]
  },

  "gimnasio": {
    problemas: [
      "Clases se llenan y no hay forma de reservar",
      "Socios no saben los horarios de clases",
      "Pagos y vencimientos difíciles de trackear"
    ],
    soluciones: [
      "Sistema de reserva de clases online",
      "Calendario de actividades visible",
      "Portal de socio con pagos y vencimientos"
    ],
    hooks: [
      "Vi el gimnasio, ¿las clases se pueden reservar online?",
      "¿Los socios saben siempre los horarios de cada clase?"
    ]
  },

  "escuela_idiomas": {
    problemas: [
      "Niveles y horarios confusos de explicar",
      "Inscripciones manuales consumen tiempo",
      "Alumnos no tienen acceso a materiales online"
    ],
    soluciones: [
      "Web con niveles, horarios y precios claros",
      "Test de nivel online",
      "Plataforma de materiales para alumnos"
    ],
    hooks: [
      "Vi la escuela, ¿los alumnos pueden hacer test de nivel online?",
      "¿Tienen los cursos y horarios visibles en web?"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ENTRETENIMIENTO Y EVENTOS
  // ═══════════════════════════════════════════════════════════════

  "salon_eventos": {
    problemas: [
      "Consultas de disponibilidad y precios constantes",
      "Clientes no pueden ver fotos del lugar",
      "Reservas y señas difíciles de coordinar"
    ],
    soluciones: [
      "Galería de fotos y videos del salón",
      "Calendario de disponibilidad online",
      "Paquetes y precios claros"
    ],
    hooks: [
      "Vi el salón, ¿los clientes pueden ver la disponibilidad online?",
      "Noté que no tienen galería de fotos del lugar"
    ]
  },

  "fotografo": {
    problemas: [
      "Portfolio disperso en redes sociales",
      "No pueden mostrar trabajos de forma profesional",
      "Presupuestos por WhatsApp se pierden"
    ],
    soluciones: [
      "Portfolio profesional organizado por categoría",
      "Paquetes y servicios con precios",
      "Formulario de presupuesto estructurado"
    ],
    hooks: [
      "Vi tus fotos en Instagram, ¿tenés portfolio propio?",
      "Noté que no tenés los paquetes y precios online"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // SERVICIOS PARA EL HOGAR
  // ═══════════════════════════════════════════════════════════════

  "plomero": {
    problemas: [
      "Clientes no pueden encontrarlo fácilmente",
      "No transmiten confianza/profesionalismo online",
      "No pueden mostrar trabajos realizados"
    ],
    soluciones: [
      "Web profesional con servicios y zona de cobertura",
      "Galería de trabajos realizados",
      "Formulario de contacto/presupuesto"
    ],
    hooks: [
      "¿Tenés donde mostrar tus trabajos a clientes potenciales?",
      "Noté que no aparecés bien en Google cuando buscan plomero"
    ]
  },

  "electricista": {
    problemas: [
      "Difícil conseguir clientes nuevos más allá del boca a boca",
      "No pueden mostrar credenciales y experiencia",
      "Presupuestos informales por WhatsApp"
    ],
    soluciones: [
      "Web con servicios, zona y credenciales",
      "Galería de trabajos y testimonios",
      "Sistema de presupuestos online"
    ],
    hooks: [
      "¿Tenés presencia online para cuando te buscan?",
      "Noté que no tenés web con tus servicios"
    ]
  },

  "cerrajeria": {
    problemas: [
      "Clientes necesitan servicio urgente y no los encuentran",
      "No pueden mostrar que son confiables/legales",
      "Zona de servicio no clara"
    ],
    soluciones: [
      "Web con servicios de emergencia 24hs",
      "Zona de cobertura clara con mapa",
      "Credenciales y testimonios visibles"
    ],
    hooks: [
      "Cuando alguien busca cerrajero urgente, ¿te encuentra?",
      "Noté que no tenés web con la zona de cobertura"
    ]
  },

  "veterinaria": {
    problemas: [
      "Turnos se cruzan, especialmente urgencias",
      "Dueños no recuerdan vacunas y controles",
      "No pueden mostrar servicios y especialidades"
    ],
    soluciones: [
      "Sistema de turnos con urgencias priorizadas",
      "Recordatorios automáticos de vacunas/controles",
      "Ficha de cada mascota con historial"
    ],
    hooks: [
      "¿Les pasa que los dueños olvidan las vacunas de sus mascotas?",
      "Noté que no tienen turnos online"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // OTROS SERVICIOS
  // ═══════════════════════════════════════════════════════════════

  "floreria": {
    problemas: [
      "Catálogo de arreglos difícil de mostrar",
      "Pedidos especiales complicados de coordinar",
      "No pueden vender online"
    ],
    soluciones: [
      "Catálogo visual de arreglos y precios",
      "Sistema de pedidos y delivery",
      "Formulario para arreglos personalizados"
    ],
    hooks: [
      "Vi la florería, ¿tienen catálogo de arreglos online?",
      "¿Los clientes pueden hacer pedidos sin ir al local?"
    ]
  },

  "imprenta": {
    problemas: [
      "Presupuestos manuales consumen mucho tiempo",
      "Clientes no saben qué servicios ofrecen",
      "Archivos llegan mal y hay que pedir de nuevo"
    ],
    soluciones: [
      "Cotizador online automático",
      "Catálogo de servicios con especificaciones",
      "Sistema de subida de archivos con validación"
    ],
    hooks: [
      "¿Les pasa que pasan mucho tiempo haciendo presupuestos?",
      "Noté que no tienen cotizador online"
    ]
  },

  "libreria": {
    problemas: [
      "Stock imposible de mostrar todo",
      "Clientes llaman preguntando si tienen X libro",
      "No pueden competir con tiendas online"
    ],
    soluciones: [
      "Buscador de libros con stock",
      "Reserva de libros online",
      "Lista de novedades y recomendaciones"
    ],
    hooks: [
      "¿Les pasa que llaman preguntando si tienen tal libro?",
      "Noté que no tienen el catálogo online"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // CATEGORÍA GENÉRICA (fallback)
  // ═══════════════════════════════════════════════════════════════

  "generico": {
    problemas: [
      "Clientes potenciales no los encuentran online",
      "No transmiten profesionalismo digitalmente",
      "Dependen del boca a boca para nuevos clientes",
      "No pueden mostrar sus servicios/productos"
    ],
    soluciones: [
      "Presencia profesional en Google y web propia",
      "Catálogo de productos/servicios visible",
      "Formulario de contacto y presupuesto",
      "Sistema de reservas/turnos si aplica"
    ],
    hooks: [
      "Vi el negocio en Google Maps y noté que no tienen web",
      "Noté que tienen buenas reseñas pero no hay forma de contactarlos online"
    ]
  }
}

/**
 * Encuentra la categoría más cercana para un negocio
 * Busca por coincidencia parcial en el nombre de categoría
 */
export function findNicheCategory(category: string | null | undefined): string {
  if (!category) return 'generico'
  
  const normalized = category.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  // Mapeo de palabras clave a categorías
  const keywordMap: Record<string, string[]> = {
    'peluqueria': ['peluqueria', 'salon de belleza', 'hair', 'cabello', 'peinado', 'corte de pelo'],
    'barberia': ['barberia', 'barber', 'barbershop'],
    'spa': ['spa', 'masajes', 'relax', 'wellness'],
    'centro_estetica': ['estetica', 'cosmetico', 'belleza', 'depilacion', 'unas', 'manicura'],
    'restaurante': ['restaurante', 'restaurant', 'comida', 'gastronomia', 'asador', 'parrilla', 'pizzeria', 'sushi'],
    'cafeteria': ['cafe', 'cafeteria', 'coffee', 'bar de cafe'],
    'panaderia': ['panaderia', 'pasteleria', 'confiteria', 'bakery', 'tortas'],
    'heladeria': ['heladeria', 'helados', 'ice cream'],
    'food_truck': ['food truck', 'comida al paso', 'ambulante'],
    'taller_mecanico': ['taller', 'mecanico', 'automotriz', 'auto', 'autos', 'mecanica', 'service', 'gomeria'],
    'lavadero': ['lavadero', 'car wash', 'lavado de autos', 'lavacoches'],
    'concesionaria': ['concesionaria', 'automotora', 'venta de autos', 'usados'],
    'tienda_ropa': ['ropa', 'indumentaria', 'moda', 'boutique', 'tienda de ropa', 'fashion', 'vestimenta'],
    'ferreteria': ['ferreteria', 'herramientas', 'construccion', 'materiales'],
    'farmacia': ['farmacia', 'drogueria', 'medicamentos'],
    'optica': ['optica', 'anteojos', 'lentes', 'vision'],
    'joyeria': ['joyeria', 'joyas', 'relojeria', 'relojes', 'bijouterie'],
    'consultorio_medico': ['medico', 'medicina', 'doctor', 'consultorio', 'clinica', 'salud'],
    'consultorio_odontologico': ['odontologia', 'dentista', 'dental', 'odontologo'],
    'estudio_contable': ['contador', 'contable', 'contabilidad', 'impuestos'],
    'estudio_juridico': ['abogado', 'juridico', 'legal', 'derecho', 'estudio juridico'],
    'inmobiliaria': ['inmobiliaria', 'inmuebles', 'propiedades', 'bienes raices', 'real estate'],
    'academia': ['academia', 'cursos', 'capacitacion', 'formacion', 'instituto'],
    'gimnasio': ['gimnasio', 'gym', 'fitness', 'crossfit', 'entrenamiento'],
    'escuela_idiomas': ['idiomas', 'ingles', 'english', 'language'],
    'salon_eventos': ['eventos', 'salon de fiestas', 'catering', 'quincho'],
    'fotografo': ['fotografia', 'fotografo', 'foto', 'video', 'audiovisual'],
    'plomero': ['plomero', 'plomeria', 'sanitario', 'canerias'],
    'electricista': ['electricista', 'electricidad', 'electrico', 'instalaciones electricas'],
    'cerrajeria': ['cerrajeria', 'cerrajero', 'llaves', 'cerraduras'],
    'veterinaria': ['veterinaria', 'veterinario', 'mascotas', 'animales', 'pet'],
    'floreria': ['floreria', 'flores', 'floristeria', 'arreglos florales'],
    'imprenta': ['imprenta', 'impresion', 'grafica', 'carteleria'],
    'libreria': ['libreria', 'libros', 'papeleria'],
  }

  // Buscar coincidencia
  for (const [nicheKey, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return nicheKey
      }
    }
  }

  return 'generico'
}

/**
 * Obtiene las soluciones para un nicho específico
 */
export function getNicheSolutions(category: string | null | undefined): NicheSolution {
  const nicheKey = findNicheCategory(category)
  return NICHE_SOLUTIONS[nicheKey] || NICHE_SOLUTIONS['generico']
}
