export const resolveImageUrl = async (product, upload) => {
  if (product.productImage instanceof File) {
    const uploadResults = await upload([product.productImage]);
    return uploadResults?.[0]?.url || uploadResults?.[0]?.path || null;
  }
  if (product.productImageRemoved) return null;
  return product.productImageUrl || null;
};
