export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, msg, details) => new AppError(400, code, msg, details);
export const unauthorized = (msg = 'Sesión inválida o caducada') => new AppError(401, 'no_autorizado', msg);
export const forbidden = (code, msg) => new AppError(403, code, msg);
export const notFound = (msg = 'No encontrado') => new AppError(404, 'no_encontrado', msg);
export const conflict = (code, msg, details) => new AppError(409, code, msg, details);
