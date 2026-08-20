import { AccountsView } from "@/features/accounts/accounts-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounts",
};

export default function AccountsPage() {
  return <AccountsView />;
}
