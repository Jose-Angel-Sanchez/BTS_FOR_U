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

export interface FeedStore {
  savedAt: string;
  items: FeedImage[];
}
