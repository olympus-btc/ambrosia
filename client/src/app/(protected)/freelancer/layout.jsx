import { StoreLayout } from "@/components/pages/Store/StoreLayout";

export const dynamic = "force-dynamic";

export default function FreelancerLayout({ children }) {
  return <StoreLayout>{children}</StoreLayout>;
}
