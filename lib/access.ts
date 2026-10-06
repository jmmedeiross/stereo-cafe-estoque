export type Role = 'manager' | 'operator';
export type User = { email: string; name: string; role: Role };
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function identify(
  request: Request,
  db: D1Database,
  adminEmails: string,
): Promise<User> {
  // These headers must be injected by the trusted Sites authentication gateway.
  // Never deploy the Worker directly to the internet with user-controlled identity headers.
  const email = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  const userId = request.headers.get('oai-authenticated-user-id');
  if (!email || !userId) throw new HttpError(401, 'Entre com sua conta para acessar a loja.');
  const admins = adminEmails
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(email)) return { email, name: email, role: 'manager' };
  const person = await db
    .prepare('SELECT name,role,active FROM staff WHERE email=?')
    .bind(email)
    .first<{ name: string; role: Role; active: number }>();
  if (!person?.active)
    throw new HttpError(403, 'Seu acesso à loja ainda não foi liberado pelo gerente.');
  return { email, name: person.name, role: person.role };
}
export function authorize(role: Role, type: string) {
  const operations = ['sale', 'brew', 'loss', 'check'];
  if (role !== 'manager' && !operations.includes(type))
    throw new HttpError(403, 'Esta operação exige acesso de gerente.');
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (
    origin !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new HttpError(403, 'Pedido recusado. Abra o sistema na própria página da loja.');
}
