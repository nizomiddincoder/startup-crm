import { CustomerForm } from "@/components/features/customers/customer-form";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { canManageCustomers } from "@/lib/services/permissions";
import { createCustomerAction } from "../actions";

export default async function NewCustomerPage() {
  const user = await requireUser();
  return (
    <main className="flex flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.customers.newTitle}</h1>
      <CustomerForm action={createCustomerAction} canManage={canManageCustomers(user.role)} />
    </main>
  );
}
