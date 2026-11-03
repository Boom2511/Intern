import { createHash, randomBytes } from 'node:crypto';

export function createClientTicketToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashClientTicketToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
