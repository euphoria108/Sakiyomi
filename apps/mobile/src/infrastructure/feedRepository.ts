import type { FeedListResponse, Feed } from '@sakiyomi/shared';
import { api } from './apiClient';

export async function getFeeds(): Promise<Feed[]> {
  const res = await api.get<FeedListResponse>('/feeds');
  return res.feeds;
}

export async function addFeed(url: string): Promise<Feed> {
  const res = await api.post<{ feed: Feed }>('/feeds', { url });
  return res.feed;
}

export async function deleteFeed(id: string): Promise<void> {
  await api.delete(`/feeds/${id}`);
}
