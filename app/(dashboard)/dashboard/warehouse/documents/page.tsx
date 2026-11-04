import Link from "next/link";
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
import { formatDateTime } from "@/lib/services/format";
import { listDocuments } from "@/lib/services/stock";

export default async function StockDocumentsPage() {
  const user = await requireUser();
  const documents = await listDocuments(user.tenantId);

  return (
    <main className="flex flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">{uz.nav.stockDocuments}</h1>
      {documents.length === 0 ? (
        <p className="text-muted-foreground">{uz.warehouse.empty}</p>
      ) : (
        <div className="rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uz.warehouse.documentNumber}</TableHead>
                <TableHead>{uz.warehouse.type}</TableHead>
                <TableHead>{uz.receipt.date}</TableHead>
                <TableHead>
                  {uz.warehouse.supplier} / {uz.warehouse.note}
                </TableHead>
                <TableHead>{uz.warehouse.by}</TableHead>
                <TableHead className="text-right">{uz.warehouse.lines}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/warehouse/documents/${d.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{uz.warehouse.types[d.type]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(d.createdAt)}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {[d.supplierName, d.note].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell>{d.createdBy.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{d._count.items}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
