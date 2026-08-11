import { AccountDetailView } from "@/features/accounts/account-detail-view";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  return <AccountDetailView kind={kind} id={id} />;
}
