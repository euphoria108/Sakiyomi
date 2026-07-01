export interface Feed {
  id: string;
  url: string;
  title: string;
  lastFetchedAt: number | null;
}

export interface AddFeedRequest {
  url: string;
}

export interface FeedListResponse {
  feeds: Feed[];
}
