import { variantIsActive } from "./productVariantAvailability";

export function resolveActiveComponentVariants(componentDetail) {
  return (componentDetail?.variants ?? []).filter(variantIsActive);
}

function resolveComponentPriceCents(bundleComponent, product, componentDetail) {
  const selectedVariant = resolveActiveComponentVariants(componentDetail)
    .find((variant) => variant.id === bundleComponent.variantId);
  return selectedVariant?.priceCents ?? product.priceCents ?? 0;
}

export function calculateComponentsPriceCents(bundleComponents, productById, componentDetailByProductId) {
  return bundleComponents.reduce((accumulatedCents, bundleComponent) => {
    const product = productById.get(bundleComponent.productId);
    if (!product) return accumulatedCents;

    const componentPriceCents = resolveComponentPriceCents(
      bundleComponent,
      product,
      componentDetailByProductId[bundleComponent.productId],
    );
    return accumulatedCents + componentPriceCents * bundleComponent.quantity;
  }, 0);
}
