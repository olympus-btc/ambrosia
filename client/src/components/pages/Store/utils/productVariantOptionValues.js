import { variantIsActive } from "./productVariantAvailability";

export function deriveVariantDisplayName(optionValueIds, options) {
  if (!options?.length || !optionValueIds?.length) return null;
  const optionValueNameById = {};
  options.forEach((optionType) => optionType.values.forEach((optionValue) => {
    optionValueNameById[optionValue.id] = optionValue.value;
  }));
  const selectedOptionValueNames = optionValueIds
    .map((optionValueId) => optionValueNameById[optionValueId])
    .filter(Boolean);
  return selectedOptionValueNames.length ? selectedOptionValueNames.join(" / ") : null;
}

export function variantHasOptionValues(variant, optionValueIds) {
  const variantOptionValueIds = variant.optionValueIds ?? [];
  return optionValueIds.every((optionValueId) => variantOptionValueIds.includes(optionValueId));
}

export function findMatchingVariant(variants, selectedOptionValueIds) {
  if (!variants?.length || !selectedOptionValueIds?.length) return null;
  return variants.find((variant) => {
    const variantOptionValueIds = variant.optionValueIds ?? [];
    return (
      variantIsActive(variant) &&
      variantOptionValueIds.length === selectedOptionValueIds.length &&
      variantHasOptionValues(variant, selectedOptionValueIds)
    );
  }) ?? null;
}
