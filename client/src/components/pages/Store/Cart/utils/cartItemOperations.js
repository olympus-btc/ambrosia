export function addCartItem(cart, product, variant, availableQuantity, variantName) {
  const cartItemId = variant?.id ?? product.id;
  const existingCartItem = cart.find((cartItem) => cartItem.id === cartItemId);

  if (!existingCartItem) {
    return [
      ...cart,
      {
        id: cartItemId,
        productId: product.id,
        variantId: variant?.id ?? null,
        variantName: variantName ?? null,
        imageUrl: variant?.imageUrl ?? product.imageUrl,
        name: product.name,
        price: variant?.priceCents ?? product.priceCents,
        quantity: 1,
        subtotal: variant?.priceCents ?? product.priceCents,
        maxQuantity: availableQuantity,
      },
    ];
  }

  const nextQuantity = existingCartItem.quantity + 1;
  if (nextQuantity > availableQuantity) {
    return cart;
  }

  return cart.map((cartItem) => (cartItem.id === cartItemId
    ? {
        ...cartItem,
        imageUrl: cartItem.imageUrl ?? (variant?.imageUrl ?? product.imageUrl),
        quantity: nextQuantity,
        subtotal: nextQuantity * cartItem.price,
      }
    : cartItem),
  );
}

export function setCartItemQuantity(cart, cartItemId, quantity, availableQuantity) {
  const cappedQuantity = Math.min(quantity, availableQuantity);
  return cart.map((cartItem) => (cartItem.id === cartItemId
    ? {
        ...cartItem,
        quantity: cappedQuantity,
        subtotal: cappedQuantity * cartItem.price,
      }
    : cartItem),
  );
}

export function removeCartItem(cart, cartItemId) {
  return cart.filter((cartItem) => cartItem.id !== cartItemId);
}
