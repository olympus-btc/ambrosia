import freelanceClientsEs from "../Clients/locales/es";
import freelanceProjectsEs from "../Projects/locales/es";

const freelancerEs = {
  freelancerDashboard: {
    title: "Freelancer",
    subtitle: "Administra clientes y proyectos para facturación freelance.",
    clients: {
      title: "Clientes",
      description: "Configura tarifas, ciclos de cobro, métodos de pago y cuentas de cobro.",
      action: "Administrar clientes",
    },
    projects: {
      title: "Proyectos",
      description: "Organiza el trabajo por cliente, estado, reglas de facturación y tarifas opcionales.",
      action: "Administrar proyectos",
    },
  },
  ...freelanceClientsEs,
  ...freelanceProjectsEs,
};

export default freelancerEs;
