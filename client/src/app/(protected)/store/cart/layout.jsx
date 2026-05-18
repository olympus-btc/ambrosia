import RequireOpenTurn from "@/components/turn/RequireOpenTurn";

export default function Layout({ children }) {
  return <RequireOpenTurn>{children}</RequireOpenTurn>;
}
