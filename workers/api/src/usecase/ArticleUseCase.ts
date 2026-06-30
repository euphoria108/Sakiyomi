import type { IArticleRepository, ArticleWithReadState } from '../domain/repositories';

export class ArticleUseCase {
  constructor(private articleRepo: IArticleRepository) {}

  async getArticles(userId: string, unreadOnly: boolean): Promise<ArticleWithReadState[]> {
    return this.articleRepo.findByUserId(userId, unreadOnly);
  }

  async markRead(userId: string, articleId: string): Promise<void> {
    await this.articleRepo.markRead(userId, articleId, Date.now());
  }
}
