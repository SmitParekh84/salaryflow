import { AccountDetailView } from "@/features/accounts/account-detail-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  return <AccountDetailView kind={kind} id={id} />;
}
