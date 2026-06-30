import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthUseCase } from './AuthUseCase';
import type { IUserRepository } from '../domain/repositories';
import type { UserEntity } from '../domain/entities';

function makeUserRepo() {
  return {
    findById: vi.fn<IUserRepository['findById']>().mockResolvedValue(null),
    findByEmail: vi.fn<IUserRepository['findByEmail']>().mockResolvedValue(null),
    create: vi.fn<IUserRepository['create']>().mockResolvedValue(undefined),
    updatePushToken: vi.fn<IUserRepository['updatePushToken']>().mockResolvedValue(undefined),
  };
}

describe('AuthUseCase', () => {
  let userRepo: ReturnType<typeof makeUserRepo>;
  let useCase: AuthUseCase;

  beforeEach(() => {
    userRepo = makeUserRepo();
    useCase = new AuthUseCase(userRepo);
  });

  describe('register', () => {
    it('新規メールの場合、ユーザーを作成して返す', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      const user = await useCase.register('test@example.com', 'password123');

      expect(userRepo.create).toHaveBeenCalledOnce();
      expect(user.email).toBe('test@example.com');
      expect(user.pushToken).toBeNull();
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(user.passwordHash).toContain(':');
    });

    it('メール重複の場合、EMAIL_EXISTS をスローする', async () => {
      const existing: UserEntity = {
        id: 'existing-id',
        email: 'test@example.com',
        passwordHash: 'hash',
        pushToken: null,
        createdAt: Date.now(),
      };
      userRepo.findByEmail.mockResolvedValue(existing);

      await expect(useCase.register('test@example.com', 'password123')).rejects.toThrow('EMAIL_EXISTS');
      expect(userRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('正しいパスワードで UserEntity を返す', async () => {
      // 本物の PBKDF2 ハッシュを生成するため実際に register を呼ぶ
      userRepo.findByEmail.mockResolvedValue(null);
      const registered = await useCase.register('test@example.com', 'correctPass');

      userRepo.findByEmail.mockResolvedValue(registered);

      const loggedIn = await useCase.login('test@example.com', 'correctPass');
      expect(loggedIn.email).toBe('test@example.com');
      expect(loggedIn.id).toBe(registered.id);
    });

    it('ユーザーが存在しない場合、INVALID_CREDENTIALS をスローする', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(useCase.login('nobody@example.com', 'pass')).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('パスワードが違う場合、INVALID_CREDENTIALS をスローする', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      const registered = await useCase.register('test@example.com', 'correctPass');

      userRepo.findByEmail.mockResolvedValue(registered);

      await expect(useCase.login('test@example.com', 'wrongPass')).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });
});
