import type { AuthResponse, LoginRequest, RegisterRequest } from '@sakiyomi/shared';
import { api, setToken, clearToken } from './apiClient';

export async function register(req: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', req);
  await setToken(res.token);
  return res;
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', req);
  await setToken(res.token);
  return res;
}

export async function logout(): Promise<void> {
  await clearToken();
}
