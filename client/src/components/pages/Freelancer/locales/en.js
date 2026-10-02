import freelanceClientsEn from "../Clients/locales/en";
import freelanceProjectsEn from "../Projects/locales/en";

const freelancerEn = {
  freelancerDashboard: {
    title: "Freelancer",
    subtitle: "Manage clients and projects for freelance billing.",
    clients: {
      title: "Clients",
      description: "Set client rates, billing cycles, payment methods, and payout accounts.",
      action: "Manage clients",
    },
    projects: {
      title: "Projects",
      description: "Track work by client, status, billable rules, and optional project rates.",
      action: "Manage projects",
    },
  },
  ...freelanceClientsEn,
  ...freelanceProjectsEn,
};

export default freelancerEn;
