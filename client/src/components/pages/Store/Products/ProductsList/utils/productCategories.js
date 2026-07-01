export function buildCategoryNameById(categories = []) {
  return categories.reduce((categoryNamesById, category) => ({
    ...categoryNamesById,
    [String(category.id)]: category.name,
  }), {});
}

export function getProductCategories(product, categoryNameById) {
  return (product.categoryIds ?? [])
    .map((categoryId) => ({
      id: String(categoryId),
      name: categoryNameById[String(categoryId)],
    }))
    .filter((category) => Boolean(category.name));
}
