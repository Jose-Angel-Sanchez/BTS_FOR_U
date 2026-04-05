// Lightweight pub/sub bus for coordinating mute state across all video players.
// When any player notifies it started playing, all OTHER subscribers mute themselves.

type Subscriber = (activePlayerId: string) => void;

const subscribers = new Set<Subscriber>();

export const videoSyncBus = {
  subscribe(cb: Subscriber): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },

  notifyPlaying(id: string): void {
    subscribers.forEach((cb) => cb(id));
  },
};