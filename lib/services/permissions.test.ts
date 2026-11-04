import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canManageProducts,
  canManageStock,
  homePathForRole,
  isProtectedPath,
} from "./permissions";

describe("permissions", () => {
  it("himoyalangan yo'llarni aniqlaydi", () => {
    expect(isProtectedPath("/pos")).toBe(true);
    expect(isProtectedPath("/pos/smeta")).toBe(true);
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/position")).toBe(false);
  });

  it("kassir faqat kassaga kiradi", () => {
    expect(canAccessPath("CASHIER", "/pos")).toBe(true);
    expect(canAccessPath("CASHIER", "/dashboard")).toBe(false);
    expect(canAccessPath("CASHIER", "/admin")).toBe(false);
  });

  it("omborchi kassaga kira olmaydi", () => {
    expect(canAccessPath("WAREHOUSE", "/pos")).toBe(false);
    expect(canAccessPath("WAREHOUSE", "/dashboard")).toBe(true);
  });

  it("admin panel faqat SUPER_ADMIN uchun", () => {
    expect(canAccessPath("SUPER_ADMIN", "/admin")).toBe(true);
    expect(canAccessPath("OWNER", "/admin")).toBe(false);
  });

  it("do'kon egasi kassa va panelga kiradi", () => {
    expect(canAccessPath("OWNER", "/pos")).toBe(true);
    expect(canAccessPath("OWNER", "/dashboard")).toBe(true);
  });

  it("mahsulotlarni faqat egasi va menejer o'zgartiradi", () => {
    expect(canManageProducts("OWNER")).toBe(true);
    expect(canManageProducts("MANAGER")).toBe(true);
    expect(canManageProducts("WAREHOUSE")).toBe(false);
    expect(canManageProducts("CASHIER")).toBe(false);
  });

  it("ombor hujjatlarini egasi, menejer va omborchi yaratadi", () => {
    expect(canManageStock("WAREHOUSE")).toBe(true);
    expect(canManageStock("OWNER")).toBe(true);
    expect(canManageStock("CASHIER")).toBe(false);
    expect(canAccessPath("CASHIER", "/dashboard/warehouse")).toBe(false);
  });

  it("panel ichidagi sahifalar ham himoyalangan", () => {
    expect(canAccessPath("CASHIER", "/dashboard/products")).toBe(false);
    expect(canAccessPath("WAREHOUSE", "/dashboard/products")).toBe(true);
  });

  it("rolga qarab bosh sahifani tanlaydi", () => {
    expect(homePathForRole("SUPER_ADMIN")).toBe("/admin");
    expect(homePathForRole("CASHIER")).toBe("/pos");
    expect(homePathForRole("OWNER")).toBe("/dashboard");
    expect(homePathForRole("WAREHOUSE")).toBe("/dashboard");
  });
});
