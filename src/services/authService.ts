import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { AppError, forbidden, unauthorized } from "@/lib/errors";
import { newSecret } from "@/lib/ids";
import * as authRepo from "@/repositories/authRepo";
import type { Role, SessionData } from "@/types";

export const SESSION_COOKIE = "moren_session";
const TTL: Record<Role, number> = { admin: 60 * 60 * 12, client: 60 * 60 * 24 * 7 };

export async function startSession(role: Role, sub: string): Promise<void> {
  const token = newSecret(32);
  await authRepo.createSession(token, { role, sub, createdAt: Date.now() }, TTL[role]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL[role],
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await authRepo.destroySession(token);
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 32) return null;
  return authRepo.readSession(token);
}

export async function requireAdmin(): Promise<SessionData> {
  const s = await getSession();
  if (!s) throw unauthorized();
  if (s.role !== "admin") throw forbidden();
  return s;
}

export async function requireClient(): Promise<SessionData> {
  const s = await getSession();
  if (!s || s.role !== "client") throw unauthorized("Accede a Mis citas con el enlace de tu correo");
  return s;
}

/** Comprobación del login de administrador con protección contra fuerza bruta. */
export async function adminLogin(username: string, password: string, ip: string): Promise<void> {
  const name = `login:${ip}:${username.toLowerCase()}`;
  const attempts = await authRepo.hit(name, 15 * 60);
  if (attempts > 5) throw new AppError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Espera 15 minutos.");

  let admin = await authRepo.getAdmin(username);
  if (!admin) {
    // Alta del primer administrador desde variables de entorno (solo si no existe ninguno)
    const initUser = process.env.INITIAL_ADMIN_USER;
    const initPass = process.env.INITIAL_ADMIN_PASSWORD;
    if (initUser && initPass && (await authRepo.countAdmins()) === 0 && username.toLowerCase() === initUser.toLowerCase() && password === initPass) {
      admin = { username: initUser.toLowerCase(), passwordHash: await bcrypt.hash(initPass, 12), createdAt: new Date().toISOString() };
      await authRepo.saveAdmin(admin);
    }
  }
  // Se compara siempre contra un hash para no revelar si el usuario existe
  const dummy = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5yD0o8M0E6lOZbQ5Z1Zw9p4o8m2w9nK";
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? dummy);
  if (!admin || !ok) throw new AppError(401, "INVALID_CREDENTIALS", "Usuario o contraseña incorrectos");

  await authRepo.clearHits(name);
  await startSession("admin", admin.username);
}

export async function changeAdminPassword(username: string, current: string, next: string): Promise<void> {
  const admin = await authRepo.getAdmin(username);
  if (!admin || !(await bcrypt.compare(current, admin.passwordHash))) throw new AppError(400, "INVALID_CREDENTIALS", "La contraseña actual no es correcta");
  if (next.length < 10) throw new AppError(400, "WEAK_PASSWORD", "La contraseña debe tener al menos 10 caracteres");
  await authRepo.saveAdmin({ ...admin, passwordHash: await bcrypt.hash(next, 12) });
}
