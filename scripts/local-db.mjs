/**
 * Docker'siz lokal PostgreSQL va dasturni kompyuterda ishga tushirish.
 *
 *   npm run app        — ILOVA: baza + sayt (production rejimi, tez) + brauzer ochiladi.
 *                        Kassa.bat / ish stolidagi "Kassa" tugmasi shuni ishlatadi.
 *   npm run local      — dasturchi uchun: baza + sayt (npm run dev, kod o'zgarsa darhol yangilanadi)
 *   npm run db:local   — faqat bazani yoqadi
 *
 * Birinchi marta: PostgreSQL fayllarini .local-db/ papkasiga tayyorlaydi, bazani yaratadi,
 * migratsiyalarni qo'llaydi va demo ma'lumotlarni (seed) qo'shadi.
 * Keyingi safarlar: faqat yangi migratsiyalarni qo'llaydi, ma'lumotlar saqlanib qoladi.
 * Baza allaqachon ishlab turgan bo'lsa (masalan, oyna yopilib qolgan) — o'shani ishlatadi.
 * To'xtatish: Ctrl + C yoki oynani yopish.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".local-db");
const withDev = process.argv.includes("--dev");
const asApp = process.argv.includes("--app");
const APP_PORT = 3000;
const APP_URL = `http://localhost:${APP_PORT}`;

// .env.example'dagi DATABASE_URL bilan mos bo'lishi kerak
const PORT = 5432;
const USER = "kassa";
const PASSWORD = "kassa";
const DATABASE = "kassa";

function log(message) {
  console.log(`\n[baza] ${message}`);
}

function run(command) {
  const result = spawnSync(command, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) throw new Error(`Buyruq bajarilmadi: ${command}`);
}

function ensureEnvFile() {
  const envPath = path.join(root, ".env");
  if (existsSync(envPath)) return;
  copyFileSync(path.join(root, ".env.example"), envPath);
  const secret = randomBytes(32).toString("base64");
  const content = readFileSync(envPath, "utf8").replace(
    /^AUTH_SECRET=.*$/m,
    `AUTH_SECRET="${secret}"`,
  );
  writeFileSync(envPath, content);
  log(".env fayli yaratildi");
}

function isPortBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

/** Sayt javob beryaptimi (/api/health). */
async function isAppHealthy() {
  try {
    const res = await fetch(`${APP_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForApp(timeoutMs = 120_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await isAppHealthy()) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/**
 * Windows'da Chrome (yoki Edge) topilsa — alohida ilova oynasida va `--kiosk-printing` bilan:
 * kassa cheki "Chop etish" oynasisiz, to'g'ridan-to'g'ri sukut bo'yicha printerga chiqadi.
 * Alohida profil — oddiy brauzer oynalari bu sozlamaga ta'sir qilmaydi.
 */
function findKioskBrowser() {
  if (process.platform !== "win32") return null;
  const roots = [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA];
  const candidates = roots.filter(Boolean).flatMap((r) => [
    path.join(r, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(r, "Microsoft", "Edge", "Application", "msedge.exe"),
  ]);
  return candidates.find((p) => existsSync(p)) ?? null;
}

function openBrowser(url) {
  const kiosk = findKioskBrowser();
  if (kiosk) {
    const profile = path.join(root, ".local-db", "kassa-browser");
    spawn(kiosk, [`--app=${url}`, "--kiosk-printing", `--user-data-dir=${profile}`], {
      stdio: "ignore",
      detached: true,
    }).unref();
    return;
  }
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  spawn(command, { shell: true, stdio: "ignore", detached: true }).unref();
}

// Ilova (production) yig'indisi eskirganmi: kod fayllari oxirgi yig'ishdan keyin o'zgarganmi
const SOURCE_PATHS = [
  "app",
  "components",
  "lib",
  "bot",
  "prisma/schema.prisma",
  "package.json",
  "next.config.ts",
  "auth.ts",
  "auth.config.ts",
  "middleware.ts",
];

function newestMtime(target) {
  if (!existsSync(target)) return 0;
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(target)) {
    newest = Math.max(newest, newestMtime(path.join(target, entry)));
  }
  return newest;
}

function needsBuild() {
  const buildId = path.join(root, ".next", "BUILD_ID");
  if (!existsSync(buildId)) return true;
  const builtAt = statSync(buildId).mtimeMs;
  return SOURCE_PATHS.some((p) => newestMtime(path.join(root, p)) > builtAt);
}

async function main() {
  ensureEnvFile();

  // Ilova allaqachon ochiq bo'lsa — faqat brauzerni ochamiz
  if (asApp && (await isAppHealthy())) {
    log(`Dastur allaqachon ishlayapti: ${APP_URL}`);
    openBrowser(APP_URL);
    setTimeout(() => process.exit(0), 1500);
    return;
  }

  // Baza allaqachon ishlab turgan bo'lsa (oldingi oyna yopilib qolgan) — o'shani ishlatamiz
  const dbAlreadyRunning = await isPortBusy(PORT);
  if (dbAlreadyRunning) {
    log(`Baza allaqachon ishlayapti (port ${PORT}) — o'shani ishlatamiz.`);
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    // Windows tizim tili (masalan, rus — WIN1251) bazaga o'tib ketmasin: o'zbekcha ʻ, ×, ² kabi
    // belgilar uchun har doim UTF-8
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {}, // PostgreSQL'ning texnik loglari ko'rsatilmaydi
  });

  const firstRun = !dbAlreadyRunning && !existsSync(dataDir);
  if (!dbAlreadyRunning) {
    if (firstRun) {
      log("Birinchi ishga tushirish: baza tayyorlanmoqda (bir necha soniya)...");
      await pg.initialise();
    }
    await pg.start();
    if (firstRun) await pg.createDatabase(DATABASE);
    log(`PostgreSQL ishlayapti (port ${PORT})`);
  }

  let devProcess = null;
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    log("To'xtatilmoqda...");
    devProcess?.kill();
    // Bazani faqat o'zimiz yoqqan bo'lsak to'xtatamiz
    if (!dbAlreadyRunning) await pg.stop();
    log("Baza to'xtatildi. Ma'lumotlar saqlandi.");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    log("Migratsiyalar qo'llanmoqda...");
    run("npx prisma migrate deploy");
    if (firstRun) {
      log("Demo ma'lumotlar qo'shilmoqda...");
      run("npx prisma db seed");
    }
  } catch (error) {
    console.error(error);
    await stop();
    return;
  }

  if (asApp) {
    if (needsBuild()) {
      log("Dastur yangilangan — yig'ilmoqda (1–3 daqiqa, faqat o'zgarishdan keyin)...");
      try {
        run("npm run build");
      } catch (error) {
        console.error(error);
        await stop();
        return;
      }
    }
    log("Dastur ishga tushmoqda...");
    devProcess = spawn("node scripts/start-prod.mjs", {
      cwd: root,
      stdio: "inherit",
      shell: true,
      // DEMO_MODE — login sahifasida demo foydalanuvchilar ko'rsatiladi (faqat lokal)
      env: { ...process.env, PORT: String(APP_PORT), NODE_ENV: "production", DEMO_MODE: "1" },
    });
    devProcess.on("exit", () => stop());
    if (await waitForApp()) {
      log(`Tayyor! Brauzer ochilmoqda: ${APP_URL}`);
      log("Ishni tugatganda shu oynani yoping (yoki Ctrl + C).");
      openBrowser(APP_URL);
    } else {
      log("Sayt 2 daqiqada javob bermadi. Yuqoridagi xabarlarni tekshiring.");
    }
  } else if (withDev) {
    log("Sayt ishga tushmoqda: http://localhost:3000");
    devProcess = spawn("npm run dev", { cwd: root, stdio: "inherit", shell: true });
    devProcess.on("exit", () => stop());
  } else {
    log("Tayyor. Saytni boshqa oynada yoqing: npm run dev. To'xtatish: Ctrl + C");
  }

  // Jarayon Ctrl + C bosilguncha ishlab turadi
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
