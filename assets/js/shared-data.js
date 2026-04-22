window.DALECLICK_DATA = {
  businesses: [
    {
      businessID: 1,
      businessName: "Maria Store",
      description: "Moda, ropa y accesorios para quienes buscan estilo y comodidad. Ofrecemos artículos seleccionados para estudiantes y clientes que buscan opciones modernas y prácticas.",
      category: "Ropa",
      type: "local",
      universityName: "",
      universityValue: "",
      logoURL: "../assets/images/logo-seller-1.png",
      department: "Managua",
      city: "Esquipulas",
      addressLine: "Km. 12 carretera a Masaya",
      referenceNote: "Casa azul",
      contactPhone: "77777777",
      contactEmail: "store@email.com",
      status: "Activo"
    },
    {
      businessID: 2,
      businessName: "Foto Studio",
      description: "Cámaras, accesorios y artículos de fotografía pensados para creadores, estudiantes y emprendedores que buscan calidad y estilo.",
      category: "Tecnología",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (Managua)",
      universityValue: "keiser-managua",
      logoURL: "../assets/images/logo-seller-2.png",
      department: "Managua",
      city: "Managua",
      addressLine: "Centro Comercial",
      referenceNote: "Frente a la entrada principal",
      contactPhone: "88888888",
      contactEmail: "foto@email.com",
      status: "Activo"
    },
    {
      businessID: 3,
      businessName: "Beauty Box",
      description: "Productos de belleza, cuidado personal y sets pensados para estudiantes universitarios y clientes que buscan opciones prácticas.",
      category: "Belleza",
      type: "universitario",
      universityName: "Keiser University Latin American Campus (San Marcos)",
      universityValue: "keiser-san-marcos",
      logoURL: "../assets/images/logo-seller-3.png",
      department: "Carazo",
      city: "San Marcos",
      addressLine: "Zona universitaria",
      referenceNote: "Cerca del campus",
      contactPhone: "85858585",
      contactEmail: "beauty@email.com",
      status: "Activo"
    },
    {
      businessID: 5,
      businessName: "ServiClick",
      description: "Servicios prácticos dirigidos a estudiantes, emprendedores y negocios locales con enfoque universitario.",
      category: "Servicios",
      type: "universitario",
      universityName: "UNI",
      universityValue: "uni",
      logoURL: "../assets/images/logo-seller-6.png",
      department: "Managua",
      city: "Managua",
      addressLine: "Cerca de la UNI",
      referenceNote: "Módulo lateral",
      contactPhone: "86868686",
      contactEmail: "serviclick@email.com",
      status: "Activo"
    }
  ],

  businessHours: [
    { businessID: 1, dayOfWeek: "Lunes", isClosed: true, openTime: null, closeTime: null },
    { businessID: 1, dayOfWeek: "Martes", isClosed: false, openTime: "14:00", closeTime: "21:30" },
    { businessID: 1, dayOfWeek: "Miércoles", isClosed: true, openTime: null, closeTime: null },
    { businessID: 1, dayOfWeek: "Jueves", isClosed: false, openTime: "14:00", closeTime: "21:30" },
    { businessID: 1, dayOfWeek: "Viernes", isClosed: false, openTime: "14:00", closeTime: "21:30" },
    { businessID: 1, dayOfWeek: "Sábado", isClosed: false, openTime: "14:00", closeTime: "21:30" },
    { businessID: 1, dayOfWeek: "Domingo", isClosed: false, openTime: "14:00", closeTime: "21:30" },

    { businessID: 2, dayOfWeek: "Lunes", isClosed: false, openTime: "09:00", closeTime: "18:00" },
    { businessID: 2, dayOfWeek: "Martes", isClosed: false, openTime: "09:00", closeTime: "18:00" },
    { businessID: 2, dayOfWeek: "Miércoles", isClosed: false, openTime: "09:00", closeTime: "18:00" },
    { businessID: 2, dayOfWeek: "Jueves", isClosed: false, openTime: "09:00", closeTime: "18:00" },
    { businessID: 2, dayOfWeek: "Viernes", isClosed: false, openTime: "09:00", closeTime: "18:00" },
    { businessID: 2, dayOfWeek: "Sábado", isClosed: false, openTime: "10:00", closeTime: "16:00" },
    { businessID: 2, dayOfWeek: "Domingo", isClosed: true, openTime: null, closeTime: null },

    { businessID: 3, dayOfWeek: "Lunes", isClosed: false, openTime: "10:00", closeTime: "17:00" },
    { businessID: 3, dayOfWeek: "Martes", isClosed: false, openTime: "10:00", closeTime: "17:00" },
    { businessID: 3, dayOfWeek: "Miércoles", isClosed: false, openTime: "10:00", closeTime: "17:00" },
    { businessID: 3, dayOfWeek: "Jueves", isClosed: false, openTime: "10:00", closeTime: "17:00" },
    { businessID: 3, dayOfWeek: "Viernes", isClosed: false, openTime: "10:00", closeTime: "17:00" },
    { businessID: 3, dayOfWeek: "Sábado", isClosed: true, openTime: null, closeTime: null },
    { businessID: 3, dayOfWeek: "Domingo", isClosed: true, openTime: null, closeTime: null },

    { businessID: 5, dayOfWeek: "Lunes", isClosed: false, openTime: "09:00", closeTime: "17:00" },
    { businessID: 5, dayOfWeek: "Martes", isClosed: false, openTime: "09:00", closeTime: "17:00" },
    { businessID: 5, dayOfWeek: "Miércoles", isClosed: false, openTime: "09:00", closeTime: "17:00" },
    { businessID: 5, dayOfWeek: "Jueves", isClosed: false, openTime: "09:00", closeTime: "17:00" },
    { businessID: 5, dayOfWeek: "Viernes", isClosed: false, openTime: "09:00", closeTime: "17:00" },
    { businessID: 5, dayOfWeek: "Sábado", isClosed: false, openTime: "09:00", closeTime: "13:00" },
    { businessID: 5, dayOfWeek: "Domingo", isClosed: true, openTime: null, closeTime: null }
  ],

  products: [
    {
      productID: 1,
      businessID: 2,
      productName: "Cámara Canon",
      description: "Cámara ideal para fotografía y contenido visual. Excelente opción para estudiantes, creadores y emprendedores que buscan calidad y buen rendimiento.",
      price: 11000,
      stock: 8,
      availabilityStatus: "Disponible",
      categoryName: "Tecnología",
      categoryValue: "tecnologia",
      imageURLs: [
        "../assets/images/producto-1.jpg",
        "../assets/images/producto-2.jpg",
        "../assets/images/producto-6.jpg"
      ]
    },
    {
      productID: 2,
      businessID: 2,
      productName: "Cámara Sienna",
      description: "Modelo práctico y moderno, perfecto para sesiones casuales, grabación de contenido y uso diario.",
      price: 4500,
      stock: 10,
      availabilityStatus: "Disponible",
      categoryName: "Tecnología",
      categoryValue: "tecnologia",
      imageURLs: [
        "../assets/images/producto-2.jpg",
        "../assets/images/producto-1.jpg"
      ]
    },
    {
      productID: 3,
      businessID: 3,
      productName: "Set de cuidado personal",
      description: "Set completo de cuidado personal pensado para rutinas cómodas, prácticas y accesibles.",
      price: 3000,
      stock: 6,
      availabilityStatus: "Disponible",
      categoryName: "Belleza",
      categoryValue: "belleza",
      imageURLs: [
        "../assets/images/producto-3.jpg"
      ]
    },
    {
      productID: 4,
      businessID: 1,
      productName: "Zapatos casuales",
      description: "Zapatos cómodos y versátiles para uso diario, con diseño moderno y fácil de combinar.",
      price: 3500,
      stock: 5,
      availabilityStatus: "Disponible",
      categoryName: "Ropa",
      categoryValue: "ropa",
      imageURLs: [
        "../assets/images/producto-4.jpg"
      ]
    },
    {
      productID: 5,
      businessID: 1,
      productName: "Tacones elegantes",
      description: "Tacones con estilo elegante, ideales para ocasiones especiales y looks más formales.",
      price: 6500,
      stock: 4,
      availabilityStatus: "Disponible",
      categoryName: "Ropa",
      categoryValue: "ropa",
      imageURLs: [
        "../assets/images/producto-5.jpg",
        "../assets/images/producto-10.jpg"
      ]
    },
    {
      productID: 6,
      businessID: 2,
      productName: "Lentes fotográficos",
      description: "Accesorio útil para quienes buscan ampliar sus posibilidades de fotografía y contenido.",
      price: 1500,
      stock: 12,
      availabilityStatus: "Disponible",
      categoryName: "Tecnología",
      categoryValue: "tecnologia",
      imageURLs: [
        "../assets/images/producto-9.jpg"
      ]
    },
    {
      productID: 8,
      businessID: 5,
      productName: "Asesoría express",
      description: "Servicio rápido de apoyo y orientación para estudiantes y emprendedores con necesidades puntuales.",
      price: 500,
      stock: 99,
      availabilityStatus: "Disponible",
      categoryName: "Servicios",
      categoryValue: "servicios",
      imageURLs: [
        "/assets/images/producto-default.svg"
      ]
    }
  ]
};
