import { redirect } from "next/navigation";

export default async function EmployeesRedirect({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/t/${tenant}/settings/employees`);
}
