import cartEs from "../Cart/locales/es";
import notificationsEs from "../Notifications/locales/es";
import ordersEs from "../Orders/locales/es";
import productsEs from "../Products/locales/es";
import reportsEs from "../Reports/locales/es";
import settingsEs from "../Settings/locales/es";
import usersEs from "../Users/locales/es";
import walletEs from "../Wallet/locales/es";

const storeEs = {
  errors: {
    connectionErrorTitle: "Error de conexión",
    connectionErrorDescription: "No se pudo conectar al servidor. Verifica tu conexión.",
  },
  navbar: {
    users: "Usuarios",
    roles: "Roles",
    products: "Productos",
    checkout: "Caja",
    wallet: "Billetera",
    settings: "Configuración",
    logout: "Cerrar sesión",
    menu: "Menú",
    cart: "Venta",
    orders: "Ordenes",
    reports: "Reportes",
    notifications: "Notificaciones",
  },
  dashboard: {
    title: "Panel de control",
    subtitle: "Bienvenido al panel de administración de tu tienda",
    stats: {
      users: "Usuarios",
      products: "Productos",
      sales: "Ventas",
      revenue: "Ingresos",
    },
  },
  ...usersEs,
  ...productsEs,
  ...cartEs,
  ...walletEs,
  ...ordersEs,
  ...reportsEs,
  ...notificationsEs,
  ...settingsEs,
};

export default storeEs;
