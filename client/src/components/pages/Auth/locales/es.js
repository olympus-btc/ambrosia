const authEs = {
  pinLogin: {
    title: "Ingresa tu PIN para acceder al sistema",
    selectLabel: "Seleccionar Empleado",
    selectPlaceholder: "Elige tu nombre",
    pinLabel: "Pin de Acceso",
    eraseButton: "Borrar",
    clearButton: "Limpiar",
    loginButton: "Iniciar Sesión",
    loading: "Verificando...",
    roleName: "Empleado",
    noEmployees: "No hay empleados disponibles",
    lockout: {
      message: "Demasiados intentos fallidos. Intenta en",
    },
    errorMessages: {
      selectEmployee: "Por favor selecciona un empleado",
      enterPin: "El PIN debe tener al menos 4 dígitos",
      incorrectPin: "PIN incorrecto para el empleado seleccionado.",
    },
    successMessages: {
      toastTitle: "Inicio de sesión exitoso",
      firstMessage: "Bienvenido",
      secondMessage: "Acceso concedido como",
    },
  },
};

export default authEs;
