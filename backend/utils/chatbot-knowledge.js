export const CHATBOT_NAME = "Clicky";

export const DEFAULT_SUGGESTIONS = [
  "Que emprendimientos hay en la UAM",
  "Quiero algo barato para comer",
  "Quiero ir a la playa y tengo 200 cordobas",
  "Como funciona Dale Click"
];

export const SOCIAL_PATTERNS = {
  greeting: ["hola", "holi", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hello", "hey"],
  wellbeing: ["como estas", "como te va", "que tal", "todo bien", "como amaneciste"],
  thanks: ["gracias", "muchas gracias", "te agradezco", "thanks", "mil gracias"],
  goodbye: ["adios", "hasta luego", "nos vemos", "bye", "chao", "hasta pronto"],
  deescalate: ["tonto", "idiota", "estupido", "imbecil", "callate", "te odio", "maldito"]
};

export const CATEGORY_SYNONYMS = [
  {
    key: "alimentos",
    labels: ["Alimentos", "Restaurantes"],
    terms: [
      "comida", "comer", "alimento", "alimentos", "snack", "snacks", "bebida", "bebidas",
      "cafeteria", "cafeterias", "restaurante", "restaurantes", "hamburguesa", "pizza",
      "tacos", "quesillo", "desayuno", "almuerzo", "cena", "postre", "postres", "antojito"
    ]
  },
  {
    key: "ropa",
    labels: ["Ropa y Accesorios"],
    terms: [
      "ropa", "vestido", "vestidos", "blusa", "blusas", "camisa", "camisas", "falda",
      "faldas", "short", "shorts", "pantalon", "pantalones", "jean", "jeans", "zapato",
      "zapatos", "lentes", "accesorio", "accesorios", "bolso", "bolsos"
    ]
  },
  {
    key: "belleza",
    labels: ["Belleza y Cosmeticos", "Salud y Bienestar"],
    terms: [
      "belleza", "cosmetico", "cosmeticos", "maquillaje", "perfume", "perfumes",
      "labial", "labiales", "skincare", "crema", "cremas", "serum", "protector solar",
      "bloqueador", "cabello", "piel", "bienestar"
    ]
  },
  {
    key: "hogar",
    labels: ["Hogar y muebles"],
    terms: [
      "hogar", "casa", "decoracion", "lampara", "lamparas", "organizador", "organizadores",
      "mueble", "muebles", "cojines", "cocina"
    ]
  },
  {
    key: "regalos",
    labels: ["Regalos"],
    terms: [
      "regalo", "regalos", "regalar", "detalle", "detalles", "sorpresa", "box", "caja",
      "cajas", "personalizado", "personalizados", "recuerdo", "recuerdos"
    ]
  },
  {
    key: "tecnologia",
    labels: ["Tecnologia"],
    terms: [
      "tecnologia", "tech", "celular", "celulares", "telefono", "telefonos", "audifono",
      "audifonos", "cargador", "cargadores", "gadget", "gadgets", "laptop", "mouse",
      "teclado", "tablet"
    ]
  },
  {
    key: "educacion",
    labels: ["Educacion y Tutoria", "Servicios"],
    terms: [
      "estudio", "universidad", "uni", "clase", "clases", "tutoria", "tutorias", "impresion",
      "impresiones", "cuaderno", "libreta", "calculadora", "marcadores", "academico"
    ]
  },
  {
    key: "mascotas",
    labels: ["Mascotas"],
    terms: ["mascota", "mascotas", "perro", "gato", "pet", "correa", "cama"]
  },
  {
    key: "automocion",
    labels: ["Automocion y repuestos"],
    terms: ["moto", "casco", "repuesto", "repuestos", "automocion", "luces"]
  },
  {
    key: "videojuegos",
    labels: ["Videojuegos y juguetes"],
    terms: ["videojuego", "videojuegos", "juguete", "juguetes", "control", "controles", "play"]
  }
];

export const CONTEXT_RULES = [
  {
    key: "playa",
    aliases: ["playa", "mar", "vacaciones"],
    searchTerms: [
      "protector solar", "bloqueador", "spf", "anthelios", "sandalia", "sandalias",
      "lentes de sol", "gafas", "vestido", "short", "sombrero", "hidratante"
    ],
    categoryLabels: ["Belleza y Cosmeticos", "Ropa y Accesorios"]
  },
  {
    key: "regalo",
    aliases: ["regalo", "regalar", "detalle", "sorpresa"],
    searchTerms: [
      "regalo", "detalle", "box", "caja", "perfume", "accesorio", "personalizado",
      "personalizada", "sorpresa"
    ],
    categoryLabels: ["Regalos", "Belleza y Cosmeticos", "Ropa y Accesorios"]
  },
  {
    key: "universidad",
    aliases: ["para la uni", "para la universidad", "para clases", "para estudiar", "cerca de la uni"],
    searchTerms: [
      "libreta", "cuaderno", "calculadora", "marcadores", "impresion", "impresiones",
      "cafe", "snack", "audifonos", "cargador"
    ],
    categoryLabels: ["Educacion y Tutoria", "Alimentos", "Tecnologia"]
  },
  {
    key: "comida",
    aliases: ["comida", "comer", "restaurante", "restaurantes", "lugar para comer", "lugares para comer"],
    searchTerms: [
      "comida", "snack", "bebida", "almuerzo", "desayuno", "cena", "postre", "hamburguesa",
      "pizza", "cafe", "quesillo", "tacos"
    ],
    categoryLabels: ["Alimentos", "Restaurantes"]
  }
];

export const COLOR_TERMS = [
  "rojo", "roja", "azul", "azules", "verde", "verdes", "negro", "negra", "blanco", "blanca",
  "rosado", "rosada", "rosa", "morado", "morada", "amarillo", "amarilla", "beige", "gris",
  "cafe", "dorado", "dorada", "plateado", "plateada", "naranja"
];

export const UNIVERSITY_ALIASES = {
  "la uni": "UNI",
  uni: "UNI",
  "la u": "UNI",
  "universidad nacional de ingenieria": "UNI",
  uam: "UAM",
  americana: "UAM",
  unan: "UNAN-Managua",
  "unan managua": "UNAN-Managua",
  "unan leon": "UNAN-Leon",
  unicit: "UNICIT",
  ucc: "UCC",
  ucn: "UCN",
  una: "UNA",
  udem: "UdeM",
  unm: "UNM",
  keiser: "Keiser University",
  bicu: "BICU"
};

export const FAQ_DEFINITIONS = [
  {
    key: "how_it_works",
    patterns: ["como funciona dale click", "que es dale click", "como funciona esta plataforma", "que hace dale click"],
    answer:
      "Dale Click funciona como un marketplace para descubrir productos de negocios locales y emprendimientos universitarios. Puedes explorar productos, entrar al perfil del negocio y hacer una reserva desde la plataforma."
  },
  {
    key: "register",
    patterns: ["como me registro", "como creo una cuenta", "crear cuenta", "registrarme", "necesito cuenta"],
    answer:
      "En la version actual puedes crear una cuenta de comprador desde la pantalla de registro. Te pedira nombre, apellido, usuario, correo, telefono, cedula y contrasena. Necesitas iniciar sesion para reservar productos."
  },
  {
    key: "seller",
    patterns: ["como me hago vendedor", "como vender", "registrar mi negocio", "quiero ser vendedor"],
    answer:
      "En este proyecto si encontre el flujo de registro e inicio de sesion para compradores, pero no encontre una pantalla publica ni un endpoint de alta de vendedor o negocio. Asi que no seria correcto prometer ese proceso desde el chatbot en esta version."
  },
  {
    key: "reservation",
    patterns: ["como reservo", "como aparto", "como comprar", "como compro", "reservar producto", "apartar producto"],
    answer:
      "Para reservar, abre el detalle del producto y usa el boton de reserva. Si no has iniciado sesion, la plataforma te pedira entrar o crear cuenta. La reserva se guarda en tu cuenta y luego coordinas con el negocio."
  },
  {
    key: "payment",
    patterns: ["como pago", "pago en linea", "aceptan tarjeta", "donde pago", "tengo que pagar en linea"],
    answer:
      "La reserva se registra en la plataforma, pero el pago real se hace offline con el negocio. En el backend actual las reservas se crean con metodo de pago 'Offline' y no encontre checkout en linea para compradores."
  },
  {
    key: "contact_business",
    patterns: ["como coordino con el negocio", "como contacto al negocio", "puedo contactar al vendedor", "hablar con el vendedor"],
    answer:
      "Puedes coordinar desde el perfil del negocio. La vista del emprendimiento muestra telefono y, si estan disponibles, enlaces a WhatsApp, Instagram o TikTok para concretar retiro y pago."
  },
  {
    key: "pickup",
    patterns: ["donde recojo", "donde retiro", "como retiro el producto", "donde recojo mi pedido"],
    answer:
      "El retiro se coordina con el negocio despues de reservar. El perfil del emprendimiento muestra su ubicacion general y datos de contacto para ponerse de acuerdo."
  },
  {
    key: "wallet",
    patterns: ["cartera inteligente", "que es la cartera", "como funciona la cartera"],
    answer:
      "La cartera inteligente es una ayuda de presupuesto en la cuenta del comprador. Te deja guardar un monto disponible y comparar si te alcanza para un producto tomando en cuenta lo ya comprometido en reservas. En esta version no funciona como metodo de pago."
  },
  {
    key: "need_account",
    patterns: ["necesito cuenta para reservar", "necesito cuenta para comprar", "sin cuenta puedo reservar"],
    answer:
      "Si. En la app actual necesitas iniciar sesion para enviar una reserva. Sin cuenta puedes navegar productos y negocios, pero no apartarlos."
  },
  {
    key: "orders",
    patterns: ["mis reservas", "mis pedidos", "historial", "ver mis pedidos"],
    answer:
      "Si ya iniciaste sesion, puedes revisar tus reservas desde la seccion 'Mis reservas' y tambien ver el historial desde la cuenta."
  },
  {
    key: "delivery",
    patterns: ["envio", "delivery", "envian", "hacen envios", "hacen delivery"],
    answer:
      "No encontre un flujo de delivery en esta version del proyecto. La experiencia actual esta centrada en reservar y coordinar el retiro directamente con el negocio."
  }
];

export const BUSINESS_INTENT_TERMS = [
  "negocio", "negocios", "emprendimiento", "emprendimientos", "vendedor", "vendedores",
  "tienda", "tiendas", "local", "locales", "donde venden", "lugares", "lugar", "restaurante"
];

export const PRODUCT_INTENT_TERMS = [
  "producto", "productos", "quiero", "busco", "necesito", "comprar", "recomienda", "recomendame",
  "muestrame", "mostrarme", "dame", "algo", "opciones"
];

export const NEARBY_PATTERNS = [
  "cerca", "cerca de mi", "cerca de la universidad", "cerca de la uni", "por aqui", "por mi zona"
];
