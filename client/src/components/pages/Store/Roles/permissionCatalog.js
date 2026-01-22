export const permissionCatalog = [
  {
    key: "users_read",
    group: "people",
    business: "both",
    related: ["/store/users", "/restaurant/users"],
  },
  { key: "users_create", group: "people", business: "both" },
  { key: "users_update", group: "people", business: "both" },
  { key: "users_delete", group: "people", business: "both" },
  { key: "roles_read", group: "people", business: "both" },
  { key: "roles_create", group: "people", business: "both" },
  { key: "roles_update", group: "people", business: "both" },
  { key: "roles_delete", group: "people", business: "both" },
  { key: "permissions_read", group: "people", business: "both" },

  { key: "products_read", group: "catalog", business: "store", related: ["/store/products"] },
  { key: "products_create", group: "catalog", business: "store" },
  { key: "products_update", group: "catalog", business: "store" },
  { key: "products_delete", group: "catalog", business: "store" },
  { key: "categories_read", group: "catalog", business: "store" },
  { key: "categories_create", group: "catalog", business: "store" },
  { key: "categories_update", group: "catalog", business: "store" },
  { key: "categories_delete", group: "catalog", business: "store" },

  { key: "orders_read", group: "sales", business: "store", related: ["/store/orders", "/store/cart"] },
  { key: "orders_create", group: "sales", business: "store" },
  { key: "orders_update", group: "sales", business: "store" },
  { key: "orders_delete", group: "sales", business: "store" },

  { key: "payments_read", group: "payments", business: "both", related: ["/store/wallet"] },
  { key: "payments_create", group: "payments", business: "both" },
  { key: "payments_update", group: "payments", business: "both" },
  { key: "payments_delete", group: "payments", business: "both" },
  { key: "wallet_read", group: "payments", business: "store" },

  { key: "settings_read", group: "settings", business: "both", related: ["/store/settings"] },
  { key: "settings_update", group: "settings", business: "both" },
  { key: "printer_update", group: "settings", business: "restaurant" },

  { key: "dish_read", group: "menu", business: "restaurant", related: ["/restaurant/dishes"] },
  { key: "dish_create", group: "menu", business: "restaurant" },
  { key: "dish_update", group: "menu", business: "restaurant" },
  { key: "dish_delete", group: "menu", business: "restaurant" },

  { key: "ingredients_read", group: "inventory", business: "restaurant" },
  { key: "ingredients_create", group: "inventory", business: "restaurant" },
  { key: "ingredients_update", group: "inventory", business: "restaurant" },
  { key: "ingredients_delete", group: "inventory", business: "restaurant" },

  { key: "suppliers_read", group: "inventory", business: "restaurant" },
  { key: "suppliers_create", group: "inventory", business: "restaurant" },
  { key: "suppliers_update", group: "inventory", business: "restaurant" },
  { key: "suppliers_delete", group: "inventory", business: "restaurant" },

  { key: "tables_read", group: "floor", business: "restaurant", related: ["/restaurant/tables/:roomId"] },
  { key: "tables_create", group: "floor", business: "restaurant" },
  { key: "tables_update", group: "floor", business: "restaurant" },
  { key: "tables_delete", group: "floor", business: "restaurant" },

  { key: "spaces_read", group: "floor", business: "restaurant", related: ["/restaurant/spaces"] },
  { key: "spaces_create", group: "floor", business: "restaurant" },
  { key: "spaces_update", group: "floor", business: "restaurant" },
  { key: "spaces_delete", group: "floor", business: "restaurant" },

  { key: "shifts_read", group: "shifts", business: "restaurant" },
  { key: "shifts_create", group: "shifts", business: "restaurant" },
  { key: "shifts_update", group: "shifts", business: "restaurant" },
  { key: "shifts_delete", group: "shifts", business: "restaurant" },

  { key: "tickets_read", group: "tickets", business: "restaurant" },
  { key: "tickets_create", group: "tickets", business: "restaurant" },
  { key: "tickets_update", group: "tickets", business: "restaurant" },
  { key: "tickets_delete", group: "tickets", business: "restaurant" },

  { key: "reports_read", group: "reports", business: "restaurant" },
  { key: "reports_export", group: "reports", business: "restaurant" },
];
