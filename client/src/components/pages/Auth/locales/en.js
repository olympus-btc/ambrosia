const authEn = {
  pinLogin: {
    title: "Enter PIN to access",
    selectLabel: "Employee Selection",
    selectPlaceholder: "Choose your name",
    pinLabel: "Access PIN",
    eraseButton: "Erase",
    clearButton: "Clear",
    loginButton: "Log In",
    loading: "Verifying...",
    roleName: "Employee",
    noEmployees: "No employees available",
    lockout: {
      message: "Too many failed attempts. Try again in",
    },
    pinDeprecation: {
      title: "Update your PIN",
      body: "Your PIN has 4 digits. For security reasons, 4-digit PINs will be deprecated. Please update it to a 6-digit PIN.",
      adminNote: "If you are not an administrator, ask an admin to update your PIN.",
      goToUsersButton: "Go to Users",
      laterButton: "Later",
    },
    errorMessages: {
      selectEmployee: "Please select an employee.",
      enterPin: "The PIN must be at least 4 digits long.",
      incorrectPin: "Incorrect PIN for the selected employee.",
      loadEmployeesTitle: "Could not load employees",
      loadEmployeesDescription: "Refresh the page or contact an administrator.",
    },
    successMessages: {
      toastTitle: "Successful login",
      firstMessage: "Welcome",
      secondMessage: "Access granted as",
    },
  },
};

export default authEn;
