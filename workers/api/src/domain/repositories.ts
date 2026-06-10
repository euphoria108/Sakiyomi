import type { UserEntity, FeedEntity, ArticleEntity } from './entities';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(user: UserEntity): Promise<void>;
  updatePushToken(userId: string, token: string): Promise<void>;
}

export interface IFeedRepository {
  findByUserId(userId: string): Promise<FeedEntity[]>;
  findById(id: string): Promise<FeedEntity | null>;
  create(feed: FeedEntity): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
  updateLastFetchedAt(id: string, ts: number): Promise<void>;
  findAll(): Promise<FeedEntity[]>;
}

export interface IArticleRepository {
  findByFeedId(feedId: string): Promise<ArticleEntity[]>;
  findByUserId(userId: string, unreadOnly?: boolean): Promise<(ArticleEntity & { feedTitle: string })[]>;
  upsert(article: ArticleEntity): Promise<void>;
  markRead(id: string): Promise<void>;
  findExistingUrls(feedId: string, urls: string[]): Promise<string[]>;
}
