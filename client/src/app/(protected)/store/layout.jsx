import { StoreLayout } from "@/components/pages/Store/StoreLayout";

export const dynamic = "force-dynamic";

export default function Layout({ children }) {
  return <StoreLayout>{children}</StoreLayout>;
}
