export interface UiPreferences {
  accent: string;
  radius: 'rounded' | 'pill';
}

export interface InteractionEvent {
  itemId: string;
  type: 'view' | 'share' | 'copy' | 'download' | 'open_video';
  tags: string[];
  member: string | null;
  at: string;
}
