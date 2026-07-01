import type { ArticleListResponse, Article } from '@sakiyomi/shared';
import { api } from './apiClient';

export async function getArticles(unreadOnly = false): Promise<Article[]> {
  const res = await api.get<ArticleListResponse>(`/articles${unreadOnly ? '?unread=true' : ''}`);
  return res.articles;
}

export async function markArticleRead(id: string): Promise<void> {
  await api.patch(`/articles/${id}/read`);
}
