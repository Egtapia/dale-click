export const CHATBOT_NAME = "Clicky";

export const CATEGORY_ALIASES = [
  {
    value: "comida",
    terms: [
      "comida", "comer", "snack", "snacks", "postre", "postres", "alimento", "alimentos",
      "bebida", "bebidas", "restaurante", "restaurantes", "cafeteria", "cafeterias",
      "hamburguesa", "hamburguesas", "pizza", "pizzas", "pollo", "tacos", "antojito", "antojitos"
    ]
  },
  {
    value: "tecnologia",
    terms: [
      "tecnologia", "tech", "celular", "celulares", "telefono", "telefonos", "audifono",
      "audifonos", "laptop", "laptops", "computadora", "computadoras", "gadget", "gadgets",
      "cargador", "cargadores", "teclado", "teclados", "mouse", "mouses"
    ]
  },
  {
    value: "ropa",
    terms: [
      "ropa", "camisa", "camisas", "camiseta", "camisetas", "playera", "playeras",
      "blusa", "blusas", "pantalon", "pantalones", "jean", "jeans", "vestido", "vestidos",
      "falda", "faldas", "short", "shorts", "zapato", "zapatos"
    ]
  },
  {
    value: "belleza",
    terms: [
      "belleza", "maquillaje", "cosmetico", "cosmeticos", "cuidado personal", "perfume",
      "perfumes", "skincare", "base", "labial", "labiales", "rimel", "crema", "cremas"
    ]
  },
  {
    value: "hogar",
    terms: [
      "hogar", "casa", "decoracion", "mueble", "muebles", "cocina", "vajilla", "lampara",
      "lamparas", "almohada", "almohadas", "organizador", "organizadores"
    ]
  },
  {
    value: "servicios",
    terms: [
      "servicio", "servicios", "impresion", "impresiones", "diseno", "asesoria",
      "reparacion", "reparaciones", "tutoria", "tutorias", "clases", "delivery academico"
    ]
  }
];

export const FAQ_ENTRIES = [
  {
    intent: "what_is_daleclick",
    patterns: ["que es dale click", "que es daleclick", "que es esta plataforma", "como funciona dale click", "como funciona esta plataforma"],
    answer:
      "Dale Click es una plataforma donde puedes descubrir productos de emprendedores, reservarlos y luego pagar directamente al negocio cuando los recojas."
  },
  {
    intent: "payments",
    patterns: ["pago en linea", "pagos en linea", "comprar en linea", "aceptan tarjeta", "como pago", "tengo que pagar en linea", "donde pago"],
    answer:
      "En Dale Click no hay pagos en linea. El pago se realiza directamente con el negocio cuando recoges el producto."
  },
  {
    intent: "delivery",
    patterns: ["envio a domicilio", "delivery", "envian", "hacen envios", "hacen delivery", "punto de entrega"],
    answer:
      "Actualmente no hay envios a domicilio. Debes recoger el producto directamente con el negocio y coordinar cualquier detalle con el vendedor."
  },
  {
    intent: "reservation",
    patterns: ["como reservo", "como funciona la reserva", "como comprar un producto", "como compro", "apartar producto"],
    answer:
      "Puedes seleccionar el producto que te interesa y hacer la reserva dentro de la plataforma. Despues coordinas con el negocio para recogerlo y pagar en persona."
  },
  {
    intent: "pickup",
    patterns: ["donde recojo", "donde esta el negocio", "como se donde esta el negocio", "donde recojo mi pedido"],
    answer:
      "Recoges el producto directamente con el negocio. En el perfil del emprendimiento puedes ver su ubicacion y datos de contacto."
  },
  {
    intent: "contact_business",
    patterns: ["puedo contactar al vendedor", "como coordino con el negocio", "como contacto al negocio", "hablar con el vendedor"],
    answer:
      "Si. Puedes comunicarte directamente con el negocio desde su perfil para coordinar el pago, el retiro del producto y cualquier detalle de tu compra."
  },
  {
    intent: "orders",
    patterns: ["puedo ver mis pedidos", "ver mis pedidos", "historial de pedidos", "mis reservas"],
    answer:
      "Si tienes una cuenta iniciada, puedes revisar tus reservas dentro de tu perfil en la seccion de mis reservas."
  },
  {
    intent: "cancel_order",
    patterns: ["puedo cancelar un pedido", "cancelar pedido", "cancelar reserva"],
    answer:
      "Si necesitas cancelar una reserva, lo mejor es comunicarte cuanto antes con el negocio. En la plataforma tambien puedes revisar el estado de tus reservas."
  },
  {
    intent: "account",
    patterns: ["como creo una cuenta", "como me registro", "como inicio sesion", "necesito cuenta para comprar"],
    answer:
      "Puedes crear tu cuenta desde la plataforma con tus datos basicos. Para reservar productos necesitas iniciar sesion."
  },
  {
    intent: "seller",
    patterns: ["como me hago vendedor", "como vender", "registrar mi negocio", "quiero ser vendedor"],
    answer:
      "Para vender en Dale Click debes crear una cuenta y registrar tu negocio en la plataforma. Luego podras publicar productos y recibir reservas."
  },
  {
    intent: "trust",
    patterns: ["es seguro", "puedo confiar", "negocios reales", "es confiable"],
    answer:
      "Dale Click conecta usuarios con negocios reales y te permite revisar perfiles y productos antes de reservar."
  }
];

export const DEFAULT_SUGGESTIONS = [
  "Quiero algo barato",
  "Muéstrame comida",
  "Busco ropa",
  "Quiero ver negocios locales"
];
