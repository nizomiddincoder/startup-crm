import Link from "next/link";
import { notFound } from "next/navigation";
import { AmountForm } from "@/components/features/customers/amount-form";
import { CustomerForm } from "@/components/features/customers/customer-form";
import { CustomerVerify } from "@/components/features/customers/customer-verify";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { uz } from "@/lib/i18n/uz";
import { getCustomer } from "@/lib/services/customers";
import { formatDate, formatDateTime } from "@/lib/services/format";
import { formatAmount, formatSum } from "@/lib/services/money";
import { canManageCustomers } from "@/lib/services/permissions";
import { payMasterBonusAction, receiveDebtPaymentAction, updateCustomerAction } from "../actions";

const cashMethods = (["CASH", "CARD", "TRANSFER"] as const).map((m) => ({
  value: m,
  label: uz.paymentMethods[m],
}));

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getCustomer(user.tenantId, id);
  if (!data) notFound();
  const { customer, balances, entries } = data;
  const canManage = canManageCustomers(user.role);
  const now = new Date();

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
        {customer.isMaster && <Badge variant="secondary">{uz.customers.master}</Badge>}
        {customer.telegramChatId && <Badge variant="outline">{uz.telegram.customerLinked}</Badge>}
      </div>

      <CustomerVerify
        customerId={customer.id}
        verifiedAt={customer.telegramVerifiedAt?.toISOString() ?? null}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="text-sm text-muted-foreground">{uz.customers.debt}</div>
          <div
            className={
              balances.debt > 0
                ? "text-2xl font-semibold text-destructive tabular-nums"
                : "text-2xl font-semibold tabular-nums"
            }
            data-testid="customer-debt"
          >
            {formatSum(balances.debt)}
          </div>
          {customer.creditLimit !== null && (
            <div className="text-xs text-muted-foreground">
              {uz.customers.creditLimit}: {formatSum(customer.creditLimit)}
            </div>
          )}
        </div>
        {customer.isMaster && (
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">{uz.customers.bonus}</div>
            <div className="text-2xl font-semibold tabular-nums" data-testid="customer-bonus">
              {formatSum(balances.bonus)}
            </div>
            {customer.bonusPercent && (
              <div className="text-xs text-muted-foreground">
                {uz.customers.bonusPercent}: {customer.bonusPercent.replace(".", ",")}
              </div>
            )}
          </div>
        )}
        {(balances.points !== 0 || customer.discountPercent) && (
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="text-sm text-muted-foreground">{uz.customers.points}</div>
            <div className="text-2xl font-semibold tabular-nums" data-testid="customer-points">
              {formatAmount(balances.points)}
            </div>
            {customer.discountPercent && (
              <div className="text-xs text-muted-foreground">
                {uz.customers.discountPercent}:{" "}
                {customer.discountPercent.toString().replace(".", ",")}
              </div>
            )}
          </div>
        )}
      </div>

      {balances.debt > 0 && (
        <AmountForm
          testId="debt-payment"
          title={uz.customers.receivePayment}
          submitLabel={uz.customers.receivePayment}
          action={receiveDebtPaymentAction.bind(null, customer.id)}
          methods={cashMethods}
          suggested={formatAmount(balances.debt)}
        />
      )}

      {customer.isMaster && canManage && balances.bonus > 0 && (
        <AmountForm
          testId="bonus-payout"
          title={uz.customers.payBonus}
          submitLabel={uz.customers.payBonus}
          action={payMasterBonusAction.bind(null, customer.id)}
          methods={[...cashMethods, { value: "DEBT", label: uz.customers.offsetDebt }]}
          suggested={formatAmount(balances.bonus)}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{uz.customers.history}</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground">{uz.customers.noEntries}</p>
        ) : (
          <div className="rounded-2xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{uz.receipt.date}</TableHead>
                  <TableHead>{uz.warehouse.type}</TableHead>
                  <TableHead>{uz.warehouse.source}</TableHead>
                  <TableHead className="text-right">{uz.customers.amount}</TableHead>
                  <TableHead>{uz.customers.dueDate}</TableHead>
                  <TableHead>{uz.warehouse.by}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const overdue = e.dueDate && e.dueDate < now && balances.debt > 0;
                  return (
                    <TableRow key={e.id} data-testid="ledger-row">
                      <TableCell className="tabular-nums">{formatDateTime(e.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={e.account === "DEBT" ? "outline" : "secondary"}>
                          {uz.customers.entryTypes[e.type]}
                        </Badge>
                        {e.method && e.type !== "SALE" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {e.method === "DEBT"
                              ? uz.customers.offsetDebt
                              : uz.paymentMethods[e.method]}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.sale ? (
                          <Link href={`/pos/sales/${e.sale.id}`} className="hover:underline">
                            {uz.receipt.number} {e.sale.number}
                          </Link>
                        ) : (
                          (e.note ?? "—")
                        )}
                      </TableCell>
                      <TableCell
                        className={
                          e.amount > 0
                            ? "text-right font-medium tabular-nums"
                            : "text-right font-medium text-success tabular-nums"
                        }
                      >
                        {e.amount > 0 ? "+" : ""}
                        {formatSum(e.amount)}
                      </TableCell>
                      <TableCell className={overdue ? "text-destructive" : undefined}>
                        {e.dueDate ? formatDate(e.dueDate) : "—"}
                        {overdue && ` · ${uz.customers.overdue}`}
                      </TableCell>
                      <TableCell>{e.user.name}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{uz.customers.editTitle}</h2>
        <CustomerForm
          action={updateCustomerAction.bind(null, customer.id)}
          canManage={canManage}
          defaults={{
            name: customer.name,
            phone: customer.phone ?? "",
            note: customer.note ?? "",
            creditLimit: customer.creditLimit === null ? "" : formatAmount(customer.creditLimit),
            discountPercent: customer.discountPercent?.toString().replace(".", ",") ?? "",
            isMaster: customer.isMaster,
            bonusPercent: customer.bonusPercent?.replace(".", ",") ?? "",
          }}
        />
      </section>
    </main>
  );
}
