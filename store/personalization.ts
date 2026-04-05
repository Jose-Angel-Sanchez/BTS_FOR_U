import { InteractionEvent, UiPreferences } from '@/types/preferences';

const INTERACTIONS_KEY = 'bts.interactions.v1';
const PREFERENCES_KEY = 'bts.preferences.v1';
const BLACKLIST_KEY = 'bts.blacklist.v1';

interface BlacklistStore {
  ids: string[];
  urls: string[];
}

const DEFAULT_PREFERENCES: UiPreferences = {
  accent: '#8f3ac4',
  radius: 'pill',
};

export function getPreferences(): UiPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  const raw = localStorage.getItem(PREFERENCES_KEY);
  if (!raw) return DEFAULT_PREFERENCES;

  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UiPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setPreferences(next: Partial<UiPreferences>): UiPreferences {
  const merged = { ...getPreferences(), ...next };
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
  return merged;
}

export function getInteractions(): InteractionEvent[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(INTERACTIONS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as InteractionEvent[];
  } catch {
    return [];
  }
}

export function pushInteraction(event: InteractionEvent): InteractionEvent[] {
  const events = getInteractions().slice(-999);
  events.push(event);
  localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(events));
  return events;
}

export function clearInteractions() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INTERACTIONS_KEY);
}

export function clearPreferences() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PREFERENCES_KEY);
}

export function getBlacklist(): BlacklistStore {
  if (typeof window === 'undefined') return { ids: [], urls: [] };
  const raw = localStorage.getItem(BLACKLIST_KEY);
  if (!raw) return { ids: [], urls: [] };

  try {
    const parsed = JSON.parse(raw) as Partial<BlacklistStore>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids : [],
      urls: Array.isArray(parsed.urls) ? parsed.urls : [],
    };
  } catch {
    return { ids: [], urls: [] };
  }
}

export function addToBlacklist(id: string, url: string): BlacklistStore {
  const current = getBlacklist();
  const next: BlacklistStore = {
    ids: Array.from(new Set([...current.ids, id])).slice(-3000),
    urls: Array.from(new Set([...current.urls, url])).slice(-3000),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearBlacklist() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BLACKLIST_KEY);
}

export function preferenceWeight(tags: string[]): number {
  const events = getInteractions();
  if (events.length === 0) return 0;

  const score = events.reduce((acc, event) => {
    const overlap = event.tags.filter((tag) => tags.includes(tag)).length;
    const eventBoost = event.type === 'download' ? 4 : event.type === 'share' ? 3 : event.type === 'copy' ? 2 : 1;
    return acc + overlap * eventBoost;
  }, 0);

  return score / Math.max(events.length, 1);
}
