import type { i18n as I18n } from 'i18next';

type Message = { type: string; title: string; message: string };
type Keys = { title: string; message: string; achievement?: string };
const signature = ({ type, title, message }: Message) => JSON.stringify([type, title, message]);

// Historical notifications store the rendered text. Only translate exact product messages.
export function notificationReader(i18n: I18n, languages: string[]) {
  const known = new Map<string, Keys>();
  for (const language of languages) {
    const source = i18n.getFixedT(language);
    function register(type: string, keys: Keys) {
      const title = keys.achievement ? source(keys.title) + ' ' + source(keys.achievement) : source(keys.title);
      known.set(signature({ type, title, message: source(keys.message) }), keys);
    }
    register('sync', { title: 'cardCollection.syncedTitle', message: 'cardCollection.syncedMessage' });
    register('sync', { title: 'deckStats.updated', message: 'deckStats.updatedMessage' });
    register('sync', { title: 'achievements.synced', message: 'achievements.syncedMessage' });
    register('calculation', { title: 'cardMastery.calculated', message: 'cardMastery.calculatedDesc' });
    for (const id of Object.keys(i18n.getResource(language, 'translation', 'achievements.catalog') ?? {})) {
      register('achievement', { title: 'toasts.achievementUnlocked', message: 'achievements.unlockedNew', achievement: 'achievements.catalog.' + id + '.title' });
    }
  }
  return (notification: Message) => {
    const keys = known.get(signature(notification));
    if (!keys) return notification;
    const title = keys.achievement ? i18n.t(keys.title) + ' ' + i18n.t(keys.achievement) : i18n.t(keys.title);
    return { title, message: i18n.t(keys.message) };
  };
}
