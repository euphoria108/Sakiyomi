export interface Article {
  id: string;
  feedId: string;
  feedTitle: string;
  title: string;
  url: string;
  publishedAt: number;
  isRead: boolean;
}

export interface ArticleListResponse {
  articles: Article[];
}
