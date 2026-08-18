import cartEn from "../Cart/locales/en";
import notificationsEn from "../Notifications/locales/en";
import ordersEn from "../Orders/locales/en";
import productsEn from "../Products/locales/en";
import reportsEn from "../Reports/locales/en";
import settingsEn from "../Settings/locales/en";
import usersEn from "../Users/locales/en";
import walletEn from "../Wallet/locales/en";

const storeEn = {
  errors: {
    connectionErrorTitle: "Connection error",
    connectionErrorDescription: "Could not reach the server. Please check your connection.",
  },
  navbar: {
    users: "Users",
    roles: "Roles",
    products: "Products",
    checkout: "Checkout",
    wallet: "Wallet",
    settings: "Settings",
    logout: "Log Out",
    menu: "Menu",
    cart: "Sale",
    orders: "Orders",
    reports: "Reports",
    notifications: "Notifications",
  },
  dashboard: {
    title: "Dashboard",
    subtitle: "Welcome to your store management dashboard",
    stats: {
      users: "Users",
      products: "Products",
      sales: "Sales",
      revenue: "Revenue",
    },
  },
  ...usersEn,
  ...productsEn,
  ...cartEn,
  ...walletEn,
  ...ordersEn,
  ...reportsEn,
  ...notificationsEn,
  ...settingsEn,
};

export default storeEn;
