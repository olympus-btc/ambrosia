const BUSINESS_TYPE_LABEL_KEYS = {
  store: {
    title: "step3.titleStore",
    nameLabel: "step3.fields.businessrNameLabelStore",
    logoLabel: "step3.fields.businessLogoLabelStore",
  },
  restaurant: {
    title: "step3.titleRestaurant",
    nameLabel: "step3.fields.businessrNameLabelRestaurant",
    logoLabel: "step3.fields.businessLogoLabelRestaurant",
  },
  freelance: {
    title: "step3.titleFreelance",
    nameLabel: "step3.fields.businessrNameLabelFreelance",
    logoLabel: "step3.fields.businessLogoLabelFreelance",
  },
};

export const KNOWN_BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_LABEL_KEYS);

export function getBusinessTypeLabelKeys(businessType) {
  return BUSINESS_TYPE_LABEL_KEYS[businessType] ?? BUSINESS_TYPE_LABEL_KEYS.restaurant;
}
