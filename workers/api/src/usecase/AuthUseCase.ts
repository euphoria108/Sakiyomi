import type { IUserRepository } from '../domain/repositories';
import type { UserEntity } from '../domain/entities';

export class AuthUseCase {
  constructor(private userRepo: IUserRepository) {}

  async register(email: string, password: string): Promise<UserEntity> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error('EMAIL_EXISTS');

    const hash = await hashPassword(password);
    const user: UserEntity = {
      id: crypto.randomUUID(),
      email,
      passwordHash: hash,
      pushToken: null,
      createdAt: Date.now(),
    };
    await this.userRepo.create(user);
    return user;
  }

  async login(email: string, password: string): Promise<UserEntity> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new Error('INVALID_CREDENTIALS');

    return user;
  }
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(bits);
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computed = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return computed === hashHex;
}
