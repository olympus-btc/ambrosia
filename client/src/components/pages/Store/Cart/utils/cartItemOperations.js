export function addCartItem(cart, product, availableQuantity) {
  const existingCartItem = cart.find((item) => item.id === product.id);

  if (!existingCartItem) {
    return [
      ...cart,
      {
        id: product.id,
        imageUrl: product.imageUrl,
        name: product.name,
        price: product.priceCents,
        quantity: 1,
        subtotal: product.priceCents,
      },
    ];
  }

  const nextQuantity = existingCartItem.quantity + 1;
  if (nextQuantity > availableQuantity) {
    return cart;
  }

  return cart.map((item) => (item.id === product.id
    ? {
        ...item,
        imageUrl: item.imageUrl ?? product.imageUrl,
        quantity: nextQuantity,
        subtotal: nextQuantity * item.price,
      }
    : item),
  );
}

export function setCartItemQuantity(cart, productId, quantity, availableQuantity) {
  const cappedQuantity = Math.min(quantity, availableQuantity);
  return cart.map((item) => (item.id === productId
    ? {
        ...item,
        quantity: cappedQuantity,
        subtotal: cappedQuantity * item.price,
      }
    : item),
  );
}

export function removeCartItem(cart, productId) {
  return cart.filter((item) => item.id !== productId);
}
