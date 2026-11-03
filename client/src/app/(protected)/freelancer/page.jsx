import { redirect } from "next/navigation";

import { FREELANCER_HOME_ROUTE } from "@/components/pages/Freelancer/routes";

export default function FreelancerPage() {
  redirect(FREELANCER_HOME_ROUTE);
}
