import type { UserEntity, FeedEntity, SubscriptionEntity, ArticleEntity } from './entities';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<void>;
  updatePushToken(userId: string, token: string): Promise<void>;
}

export interface IFeedRepository {
  findByUserId(userId: string): Promise<FeedEntity[]>;
  findById(id: string): Promise<FeedEntity | null>;
  findByUrl(url: string): Promise<FeedEntity | null>;
  create(feed: FeedEntity): Promise<void>;
  updateLastFetchedAt(id: string, ts: number): Promise<void>;
  findAll(): Promise<FeedEntity[]>;
}

export interface ISubscriptionRepository {
  subscribe(subscription: SubscriptionEntity): Promise<void>;
  unsubscribe(userId: string, feedId: string): Promise<void>;
  findUserIdsByFeedId(feedId: string): Promise<string[]>;
}

export type ArticleWithReadState = ArticleEntity & { feedTitle: string; isRead: boolean };

export interface IArticleRepository {
  findByFeedId(feedId: string): Promise<ArticleEntity[]>;
  findByUserId(userId: string, unreadOnly?: boolean): Promise<ArticleWithReadState[]>;
  upsert(article: ArticleEntity): Promise<void>;
  markRead(userId: string, articleId: string, readAt: number): Promise<void>;
  findExistingUrls(feedId: string, urls: string[]): Promise<string[]>;
}
