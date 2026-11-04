import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// npm test         — tez unit testlar (bazasiz)
// npm run test:int — *.int.test.ts, haqiqiy bazada (avval: npm run db:local)
export default defineConfig(({ mode }) => {
  const integration = mode === "integration";
  return {
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    test: {
      environment: "node",
      include: integration ? ["**/*.int.test.ts"] : ["**/*.test.ts", "**/*.test.tsx"],
      exclude: ["node_modules", "e2e", ...(integration ? [] : ["**/*.int.test.ts"])],
      // Integratsiya testlari bitta bazani ishlatadi — ketma-ket ishlasin
      fileParallelism: !integration,
    },
  };
});
