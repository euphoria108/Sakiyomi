export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  pushToken: string | null;
  createdAt: number;
}

export interface FeedEntity {
  id: string;
  url: string;
  title: string;
  lastFetchedAt: number | null;
}

export interface SubscriptionEntity {
  userId: string;
  feedId: string;
  createdAt: number;
}

export interface ArticleEntity {
  id: string;
  feedId: string;
  title: string;
  url: string;
  publishedAt: number;
}
