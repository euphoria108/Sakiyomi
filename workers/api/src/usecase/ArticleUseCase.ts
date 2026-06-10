import type { IArticleRepository } from '../domain/repositories';
import type { ArticleEntity } from '../domain/entities';

export class ArticleUseCase {
  constructor(private articleRepo: IArticleRepository) {}

  async getArticles(userId: string, unreadOnly: boolean): Promise<(ArticleEntity & { feedTitle: string })[]> {
    return this.articleRepo.findByUserId(userId, unreadOnly);
  }

  async markRead(articleId: string): Promise<void> {
    await this.articleRepo.markRead(articleId);
  }
}
