import { FreelancerLayout } from "@/components/pages/Freelancer/FreelancerLayout";

export const dynamic = "force-dynamic";

export default function Layout({ children }) {
  return <FreelancerLayout>{children}</FreelancerLayout>;
}
