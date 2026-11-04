"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export function PrintButton({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <Button size="lg" onClick={() => window.print()} autoFocus={autoFocus}>
      <Printer />
      {uz.receipt.print}
    </Button>
  );
}
