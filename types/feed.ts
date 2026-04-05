export type FeedKind = 'image' | 'video';

export interface FeedImage {
  id: string;
  type: 'image';
  title: string;
  url: string;
  source: string;
  member: string | null;
  width?: number;
  height?: number;
  tags: string[];
}

export interface FeedVideo {
  id: string;
  type: 'video';
  title: string;
  url: string;
  source: string;
  member: string | null;
  videoId: string;
  height?: number;
  tags: string[];
}

export type FeedItem = FeedImage | FeedVideo;

export interface FeedResponse {
  items: FeedItem[];
  page: number;
  size: number;
  nextPage: number;
}

export interface FeedQuery {
  page?: number;
  size?: number;
  member?: string;
}
