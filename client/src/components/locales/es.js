const componentsEs = {
  loadingCard: {
    message: "Cargando...",
  },
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
  updateBanner: {
    readyToInstall: "La versión {version} está lista para instalar.",
    newVersionAvailable: "Nueva versión ({version}) disponible.",
    restartAndUpdate: "Reiniciar y Actualizar",
    downloadFromGitHub: "Descargar desde GitHub",
    dismiss: "Cerrar",
  },
  shifts: {
    requiredOpenShiftTitle: "Abrir Turno Requerido",
    requiredOpenShiftMessage: "Para continuar, abre un turno registrando el efectivo inicial en caja.",
    initialAmount: "Cantidad inicial en caja",
    initialAmountLabel: "Monto",
    openingShift: "Abriendo Turno",
    openShiftButton: "Abrir Turno",
    invalidAmount: "Debes ingresar una cantidad válida para abrir el turno",
    cancel: "Cancelar",
    openShiftError: "Error al abrir el turno",
  },
};

export default componentsEs;
