const onboardingEn = {
  submitOnboardingToast: {
    title: "Success",
    description: "The data is saved succesfully",
  },
  buttons: {
    next: "Next",
    back: "Back",
    finish: "Finish",
  },
  step1: {
    title: "What type of business do you have?",
    subtitle: "Select your business type to personalize your experience.",
    businessType: {
      store: "Store",
      restaurant: "Restaurant (Coming soon)",
    },
    descriptions: {
      store: "A retail business selling products directly to consumers.",
      restaurant:
        "A food service business preparing and serving meals to customers.",
    },
  },
  step2: {
    title: "Admin account",
    subtitle: "These details will be used to access your PoS system",
    fields: {
      userNameLabel: "User Name",
      userNamePlaceholder: "Enter your user name",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter a secure password",
      userPinLabel: "PIN",
      userPinPlaceholder: "Enter a 4-digit PIN",
    },
    tooltips: {
      userPin: "To access the application.",
      userPassword: "To access the wallet.",
    },
    strength: {
      title: "Password Strength",
      weak: "Weak",
      regular: "Regular",
      good: "Good",
      strong: "Strong",
    },
    passwordSecure:
      "The password must be at least 8 characters long, include uppercase, lowercase, numbers, and special characters.",
  },
  step3: {
    titleStore: "Store Details",
    titleRestaurant: "Restaurant Details",
    subtitle: "Complete your business information",
    fields: {
      businessrNameLabelStore: "Store name",
      businessrNameLabelRestaurant: "Restaurant name",
      businessNamePlaceholder: "Awesome Business",
      businessAddress: "Address (optional)",
      businessAddressPlaceholder: "Eg: 123 Main St, Apt 4, City",
      businessPhone: "Phone (optional)",
      businessPhonePlaceholder: "Ej: 3312345678",
      businessEmail: "Email (optional)",
      businessEmailPlaceholder: "contact@awesomebusiness.com",
      businessRFC: "Tax ID (optional)",
      businessRFCPlaceholder: "Ej: ABC123456XYZ",
      businessRFCMessage: "13 character format (letters and numbers)",
      businessRFCInvalid: "Invalid RFC format",
      businessCurrency: "Currency",
      businessLogoLabelStore: "Store logo (optional)",
      businessLogoLabelRestaurant: "Restaurant logo",
      businessLogoUpload: "Upload your logo",
      businessLogoUploadMessage: "PNG, JPG or GIF (máx. 5MB)",
    },
  },
  step4: {
    title: "Summary of your setup",
    subtitle: "Verify all details are correct before finishing",
    sections: {
      businessType: {
        title: "Business type",
        store: "Store",
        restaurant: "Restaurant",
      },
      adminAccount: {
        title: "Admin account",
        userName: "User Name",
        password: "Password",
      },
      businessDetails: {
        title: "Business details",
        businessName: "Business name",
        businessAddress: "Address",
        businessPhone: "Phone",
        businessEmail: "Email",
        businessRFC: "RFC",
        businessCurrency: "Currency",
      },
    },
  },
};
export default onboardingEn;
