import type { D1Database } from '@cloudflare/workers-types';
import type { IUserRepository } from '../domain/repositories';
import type { UserEntity } from '../domain/entities';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  push_token: string | null;
  created_at: number;
}

export class D1UserRepository implements IUserRepository {
  constructor(private db: D1Database) {}

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
    return row ? this.toEntity(row) : null;
  }

  async create(user: UserEntity): Promise<void> {
    await this.db.prepare(
      'INSERT INTO users (id, email, password_hash, push_token, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, user.email, user.passwordHash, user.pushToken, user.createdAt).run();
  }

  async updatePushToken(userId: string, token: string): Promise<void> {
    await this.db.prepare('UPDATE users SET push_token = ? WHERE id = ?').bind(token, userId).run();
  }

  private toEntity(row: UserRow): UserEntity {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      pushToken: row.push_token,
      createdAt: row.created_at,
    };
  }
}
