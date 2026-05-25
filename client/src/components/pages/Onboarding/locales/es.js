const onboardingEs = {
  submitOnboardingToast: {
    title: "Guardado Exitoso",
    description: "La información se almaceno correctamente",
    nwcSavedTitle: "URI NWC guardado",
    nwcSavedDescription: "Reinicia el servidor para activar el backend NWC.",
  },
  buttons: {
    next: "Siguiente",
    back: "Atrás",
    finish: "Completar",
    edit: "Editar",
  },
  step1: {
    title: "¿Qué tipo de negocio tienes?",
    subtitle: "Selecciona el tipo de negocio para personalizar tu experiencia.",
    businessType: {
      store: "Tienda",
      restaurant: "Restaurante (Próximamente)",
    },
    descriptions: {
      store:
        "Venta de productos al por menor. Ideal para tiendas de ropa, electrónica, etc.",
      restaurant:
        "Servicio de alimentos y bebidas. Incluye gestión de mesas y pedidos.",
    },
  },
  step2: {
    title: "Cuenta de administrador",
    subtitle: "Estos datos serán utilizados para acceder a tu sistema PoS",
    fields: {
      userNameLabel: "Nombre de Usuario",
      userNamePlaceholder: "Ingresa tu nombre de usuario",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Ingresa una contraseña segura",
      confirmPasswordLabel: "Confirmar Contraseña",
      confirmPasswordPlaceholder: "Confirma tu contraseña segura",
      userPinLabel: "PIN",
      userPinPlaceholder: "Ingresa un PIN de 4 dígitos",
    },
    passwordsDoNotMatch: "Las contraseñas no coinciden",
    tooltips: {
      userPin: "Sirve para accesar a la aplicación.",
      userPassword: "Requerida para acceder a la wallet.",
    },
    strength: {
      title: "Fortaleza",
      weak: "Debil",
      regular: "Regular",
      good: "Buena",
      strong: "Fuerte",
    },
    passwordSecure:
      "La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales.",
  },
  step3: {
    titleStore: "Datos de la tienda",
    titleRestaurant: "Datos del restaurante",
    subtitle: "Completa la información de tu negocio",
    fields: {
      businessrNameLabelStore: "Nombre de la tienda",
      businessrNameLabelRestaurant: "Nombre del restaurante",
      businessNamePlaceholder: "El Delicioso Negocio",
      businessAddress: "Dirección (opcional)",
      businessAddressPlaceholder: "Ej: Calle Principal 123, Apartado 4, Ciudad",
      businessPhone: "Teléfono (opcional)",
      businessPhonePlaceholder: "Ej: 3312345678",
      businessEmail: "Correo electrónico (opcional)",
      businessEmailPlaceholder: "contacto@deliciosonegocio.com",
      businessRFC: "Tax ID (opcional)",
      businessRFCPlaceholder: "Ej: ABC123456XYZ",
      businessRFCMessage: "Formato: 13 caracteres (letras y números)",
      businessRFCInvalid: "RFC inválido",
      businessCurrency: "Moneda",
      businessCurrencyError: "Por favor selecciona una moneda",
      businessLogoLabelStore: "Logo de la tienda (opcional)",
      businessLogoLabelRestaurant: "Logo del restaurante",
      businessLogoUpload: "Sube tu logo",
      businessLogoUploadMessage: "PNG, JPG o GIF (máx. 5MB)",
    },
  },
  stepWallet: {
    title: "Backend Lightning",
    subtitle: "Elige cómo recibirás pagos Lightning",
    phoenixdDescription: "Nodo self-hosted. Requiere phoenixd corriendo en este servidor.",
    nwcName: "Nostr Wallet Connect",
    nwcDescription: "Conecta cualquier wallet NWC compatible (Alby Hub, Mutiny, Zeus, etc.)",
    uriLabel: "URI de NWC",
    uriDescription: "Pega el string de conexión de tu wallet NWC.",
    uriHint: "El URI se guardará en ambrosia.conf. Se requiere reiniciar el servidor para activarlo.",
    uriInvalid: "Formato de URI NWC inválido",
  },
  step4: {
    title: "Resumen de tu configuración",
    subtitle: "Verifica que todos los datos sean correctos antes de completar",
    sections: {
      businessType: {
        title: "Tipo de negocio",
        store: "Tienda",
        restaurant: "Restaurante",
      },
      walletBackend: {
        title: "Backend Lightning",
        phoenixd: "phoenixd (self-hosted)",
        nwc: "Nostr Wallet Connect",
      },
      adminAccount: {
        title: "Cuenta de administrador",
        userName: "Nombre de usuario",
        password: "Contraseña",
      },
      businessDetails: {
        title: "Detalles del negocio",
        businessName: "Nombre del negocio",
        businessAddress: "Dirección",
        businessPhone: "Teléfono",
        businessEmail: "Correo electrónico",
        businessRFC: "RFC",
        businessCurrency: "Moneda",
      },
    },
  },
};

export default onboardingEs;
