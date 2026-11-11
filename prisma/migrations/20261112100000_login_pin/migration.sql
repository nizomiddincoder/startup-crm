-- Kirish: admin login (User.login) va kassir PIN (User.pinKey). Ikkalasi ixtiyoriy va yagona.
ALTER TABLE "User" ADD COLUMN "login" TEXT;
ALTER TABLE "User" ADD COLUMN "pinKey" TEXT;
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE UNIQUE INDEX "User_pinKey_key" ON "User"("pinKey");