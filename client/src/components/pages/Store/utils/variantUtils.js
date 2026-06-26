export function deriveVariantDisplayName(optionValueIds, options) {
  if (!options?.length || !optionValueIds?.length) return null;
  const valueById = {};
  options.forEach((type) => type.values.forEach((val) => { valueById[val.id] = val.value; }));
  const labels = optionValueIds.map((id) => valueById[id]).filter(Boolean);
  return labels.length ? labels.join(" / ") : null;
}

export function findMatchingVariant(variants, selectedOptionValueIds) {
  if (!variants?.length || !selectedOptionValueIds?.length) return null;
  return variants.find((variant) => {
    const ids = variant.optionValueIds ?? [];
    return (
      ids.length === selectedOptionValueIds.length &&
      selectedOptionValueIds.every((id) => ids.includes(id))
    );
  }) ?? null;
}
