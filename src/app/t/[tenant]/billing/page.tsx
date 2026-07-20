import { redirect } from "next/navigation";

export default async function BillingRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/t/${tenant}/settings/billing`);
}
