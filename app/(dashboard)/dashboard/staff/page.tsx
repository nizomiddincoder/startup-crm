import { redirect } from "next/navigation";
import { PageHeader } from "@/components/features/layout/page-header";
import { StaffCreateForm } from "@/components/features/staff/staff-create-form";
import { StaffRowActions } from "@/components/features/staff/staff-row-actions";
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
import { canManageStaff } from "@/lib/services/permissions";
import { listStaff } from "@/lib/services/staff";

export default async function StaffPage() {
  const user = await requireUser();
  if (!canManageStaff(user.role)) redirect("/dashboard");
  const staff = await listStaff(user.tenantId);

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader title={uz.staff.title} eyebrow={user.tenantName} />
      <StaffCreateForm />
      <div className="rounded-2xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{uz.staff.name}</TableHead>
              <TableHead>{uz.staff.phone}</TableHead>
              <TableHead>{uz.staff.role}</TableHead>
              <TableHead>{uz.staff.status}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow
                key={s.id}
                data-testid="staff-row"
                className={s.isActive ? undefined : "opacity-60"}
              >
                <TableCell className="font-medium">
                  {s.name}
                  {s.id === user.id && (
                    <span className="ml-2 text-xs text-muted-foreground">({uz.staff.you})</span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{s.phone}</TableCell>
                <TableCell>{uz.roles[s.role]}</TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? uz.staff.active : uz.staff.blocked}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {s.id !== user.id && s.role !== "OWNER" && (
                    <StaffRowActions
                      id={s.id}
                      name={s.name}
                      phone={s.phone}
                      isActive={s.isActive}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
