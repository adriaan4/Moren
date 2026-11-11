export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (msg = "No encontrado") => new AppError(404, "NOT_FOUND", msg);
export const forbidden = (msg = "No tienes permiso para esta acción") => new AppError(403, "FORBIDDEN", msg);
export const unauthorized = (msg = "Debes iniciar sesión") => new AppError(401, "UNAUTHORIZED", msg);
export const conflict = (code: string, msg: string) => new AppError(409, code, msg);
export const badRequest = (msg: string, code = "BAD_REQUEST") => new AppError(400, code, msg);
