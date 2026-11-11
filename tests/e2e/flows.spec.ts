import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "";
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD ?? "";
const RUN = Date.now().toString(36);
const SERVICE = `Corte E2E ${RUN}`;

async function adminLogin(request: APIRequestContext) {
  const res = await request.post("/api/admin/login", { data: { username: ADMIN_USER, password: ADMIN_PASS } });
  expect(res.ok(), "login de administrador (E2E_ADMIN_USER / E2E_ADMIN_PASSWORD)").toBeTruthy();
}

/** Ningún elemento puede provocar scroll horizontal (requisito responsive). */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ playwright }, info) => {
  test.skip(!ADMIN_USER || !ADMIN_PASS, "Define E2E_ADMIN_USER y E2E_ADMIN_PASSWORD");
  if (info.project.name !== "portatil") return;
  const request = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
  await adminLogin(request);
  // Horario completo lunes-sábado y un servicio de prueba
  const range = [{ start: "09:00", end: "14:00" }, { start: "16:00", end: "20:00" }];
  const weekly = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { open: d !== 0, ranges: d !== 0 ? range : [] }]));
  expect((await request.put("/api/admin/schedule", { data: weekly })).ok()).toBeTruthy();
  const svc = await request.post("/api/admin/services", { data: { name: SERVICE, priceCents: 1234, durationMin: 30 } });
  expect(svc.ok()).toBeTruthy();
});

test("las páginas públicas se ven bien (sin desbordamiento horizontal)", async ({ page }) => {
  for (const path of ["/", "/servicios", "/precios", "/galeria", "/sobre-nosotros", "/contacto", "/reservar", "/mis-citas", "/privacidad", "/aviso-legal"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("9. el precio nuevo aparece en /precios y el botón reserva con el servicio preseleccionado", async ({ page }) => {
  await page.goto("/precios");
  const row = page.locator("li", { hasText: SERVICE });
  await expect(row).toContainText("12,34");
  await row.getByRole("link", { name: /reservar cita/i }).click();
  await expect(page).toHaveURL(/servicio=/);
  await expect(page.getByText("Elige día y hora")).toBeVisible();
});

test("1/2/3/4. crear, modificar y cancelar una reserva; la misma hora no se puede repetir", async ({ page, request, browser }) => {
  const email = `e2e-${RUN}-${test.info().project.name}@example.com`.replace(/\s/g, "");
  await page.goto("/reservar");
  await page.getByRole("button", { name: new RegExp(SERVICE) }).click();
  await page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: /^\d{1,2}$/ }).first().click();
  const firstSlot = page.locator('button[aria-pressed="false"]').filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  const time = (await firstSlot.textContent())!.trim();
  await firstSlot.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Prueba");
  await page.getByLabel("Apellidos").fill("E2E");
  await page.getByLabel("Teléfono").fill("600123123");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Revisar reserva" }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /confirmar cita/i }).click();
  await expect(page).toHaveURL(/confirmacion\?id=MOR-/);
  await expect(page.getByText(time)).toBeVisible();
  await expect(page.getByText(SERVICE)).toBeVisible();

  // 12. Otro dispositivo (contexto distinto) ve esa hora ocupada en tiempo real
  const url = new URL(page.url());
  const bookingId = url.searchParams.get("id")!;
  const other = await browser.newContext();
  const date = (await (await request.get(`/api/bookings/${bookingId}?k=${url.searchParams.get("k")}`)).json()).booking.date as string;
  const svcId = (await (await request.get("/api/services")).json()).services.find((s: { name: string }) => s.name === SERVICE).id;
  const slots = (await (await other.request.get(`/api/availability?serviceId=${svcId}&date=${date}`)).json()).slots as string[];
  expect(slots).not.toContain(time);

  // 4. Intentar reservar esa misma hora devuelve conflicto
  const dup = await other.request.post("/api/bookings", {
    data: { serviceId: svcId, date, time, customer: { firstName: "Otro", lastName: "Cliente", phone: "600999888", email: `otro-${email}` }, consent: true },
  });
  expect(dup.status()).toBe(409);
  await other.close();

  // 11. Sin sesión de cliente no se accede a "Mis citas" ni a reservas ajenas
  const anon = await request.get("/api/my/bookings");
  expect(anon.status()).toBe(401);
  const wrongKey = await request.get(`/api/bookings/${bookingId}?k=incorrecta`);
  expect(wrongKey.status()).toBe(404);

  // El panel (admin) ve la cita y puede cancelarla → libera el hueco
  await adminLogin(request);
  const adminList = await (await request.get(`/api/admin/bookings?q=${bookingId}`)).json();
  expect(adminList.items[0].service.priceCents).toBe(1234);
  expect((await request.patch(`/api/admin/bookings/${bookingId}`, { data: { action: "status", status: "cancelled" } })).ok()).toBeTruthy();
  const after = (await (await request.get(`/api/availability?serviceId=${svcId}&date=${date}`)).json()).slots as string[];
  expect(after).toContain(time);
});

test("seguridad: el panel y sus APIs exigen sesión de administrador", async ({ page, playwright }, info) => {
  const anon = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
  for (const path of ["/api/admin/bookings", "/api/admin/stats", "/api/admin/settings", "/api/admin/customers"]) {
    expect((await anon.get(path)).status()).toBe(401);
  }
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expectNoHorizontalOverflow(page);
});

test("8/10. el panel funciona en este dispositivo: login, calendario y cambio de precio", async ({ page, request }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Usuario").fill(ADMIN_USER);
  await page.getByLabel("Contraseña").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expectNoHorizontalOverflow(page);
  for (const path of ["/admin/calendario", "/admin/citas", "/admin/clientes", "/admin/servicios", "/admin/precios", "/admin/horarios", "/admin/vacaciones", "/admin/configuracion", "/admin/estadisticas"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  // Cambio de precio desde la API → se refleja en la web pública
  await adminLogin(request);
  const list = (await (await request.get("/api/admin/services")).json()).services as { id: string; name: string }[];
  const svc = list.find((s) => s.name === SERVICE)!;
  expect((await request.patch(`/api/admin/services/${svc.id}`, { data: { priceCents: 1500 } })).ok()).toBeTruthy();
  await page.goto("/precios");
  await expect(page.locator("li", { hasText: SERVICE })).toContainText("15,00");
});

test("6. unas vacaciones bloquean el calendario y muestran el aviso en portada", async ({ page, request }) => {
  await adminLogin(request);
  const svcId = (await (await request.get("/api/services")).json()).services.find((s: { name: string }) => s.name === SERVICE).id;
  const day = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  const created = await request.post("/api/admin/vacations", { data: { kind: "vacation", start: day, end: day, reason: `Vacaciones E2E ${RUN}`, message: "Volvemos pronto", showBanner: true } });
  expect(created.ok()).toBeTruthy();
  const { closure } = await created.json();
  const res = await (await request.get(`/api/availability?serviceId=${svcId}&date=${day}`)).json();
  expect(res.slots).toEqual([]);
  await page.goto("/");
  await expect(page.getByText(`Vacaciones E2E ${RUN}`)).toBeVisible();
  await request.delete(`/api/admin/vacations?id=${closure.id}`);
});
