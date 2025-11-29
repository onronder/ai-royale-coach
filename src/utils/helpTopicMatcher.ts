/**
 * Help Topic Matcher Utility
 * 
 * Matches user questions to relevant Help documentation sections
 * to reduce AI API calls for app-related questions.
 */

export interface HelpMatch {
  sectionId: string;
  sectionTitle: string;
  confidence: number; // 0-1
  helpUrl: string;
  excerpt: string;
}

interface HelpTopic {
  id: string;
  titleKey: string;
  keywords: Record<string, string[]>; // language -> keywords
  patterns: RegExp[];
  excerptKey: string;
}

// Help topics with multi-language keywords
const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    titleKey: 'help.sections.gettingStarted',
    excerptKey: 'help.gettingStarted.playerTag.description',
    keywords: {
      en: ['account', 'sign up', 'register', 'player tag', 'login', 'create account', 'find tag', 'multiple accounts', 'get started', 'how to start', 'new user', 'first time'],
      es: ['cuenta', 'registrar', 'etiqueta de jugador', 'iniciar sesión', 'crear cuenta', 'encontrar etiqueta', 'múltiples cuentas', 'comenzar', 'nuevo usuario'],
      pt: ['conta', 'registrar', 'tag de jogador', 'entrar', 'criar conta', 'encontrar tag', 'múltiplas contas', 'começar', 'novo usuário'],
      tr: ['hesap', 'kayıt', 'oyuncu etiketi', 'giriş', 'hesap oluştur', 'etiket bul', 'birden fazla hesap', 'başla', 'yeni kullanıcı'],
      fr: ['compte', 'inscription', 'tag joueur', 'connexion', 'créer compte', 'trouver tag', 'plusieurs comptes', 'commencer', 'nouvel utilisateur'],
    },
    patterns: [
      /how.*(create|make|start).*(account|profile)/i,
      /where.*(find|get|see).*(player.*tag|tag)/i,
      /how.*(find|get).*(my|the).*tag/i,
      /how.*(add|link|connect).*account/i,
      /multiple.*accounts?/i,
      /sign.*up/i,
      /register/i,
    ],
  },
  {
    id: 'stats',
    titleKey: 'help.sections.stats',
    excerptKey: 'help.stats.overview.description',
    keywords: {
      en: ['trophies', 'win rate', 'arena', 'statistics', 'performance', 'best trophies', 'trophy count', 'stats', 'record'],
      es: ['trofeos', 'tasa de victoria', 'arena', 'estadísticas', 'rendimiento', 'mejores trofeos'],
      pt: ['troféus', 'taxa de vitória', 'arena', 'estatísticas', 'desempenho', 'melhores troféus'],
      tr: ['kupalar', 'kazanma oranı', 'arena', 'istatistikler', 'performans', 'en iyi kupalar'],
      fr: ['trophées', 'taux de victoire', 'arène', 'statistiques', 'performance', 'meilleurs trophées'],
    },
    patterns: [
      /where.*(see|find|view).*(trophies|stats|statistics)/i,
      /how.*(win.*rate|statistics).*calculated/i,
      /what.*(is|are).*(my|the).*arena/i,
      /show.*stats/i,
    ],
  },
  {
    id: 'matches',
    titleKey: 'help.sections.matches',
    excerptKey: 'help.matches.history.description',
    keywords: {
      en: ['battle', 'history', 'opponent', 'match', 'analysis', 'recent battles', 'match history', 'battle log', 'replay'],
      es: ['batalla', 'historial', 'oponente', 'partido', 'análisis', 'batallas recientes'],
      pt: ['batalha', 'histórico', 'oponente', 'partida', 'análise', 'batalhas recentes'],
      tr: ['savaş', 'geçmiş', 'rakip', 'maç', 'analiz', 'son savaşlar'],
      fr: ['bataille', 'historique', 'adversaire', 'match', 'analyse', 'batailles récentes'],
    },
    patterns: [
      /where.*(see|find|view).*(matches|battles|history)/i,
      /match.*history/i,
      /battle.*log/i,
      /recent.*(battles|matches)/i,
      /how.*(analyze|review).*match/i,
    ],
  },
  {
    id: 'deck',
    titleKey: 'help.sections.deck',
    excerptKey: 'help.deck.current.description',
    keywords: {
      en: ['current deck', 'my deck', 'recommendations', 'deck suggestions', 'active deck', 'in-game deck'],
      es: ['mazo actual', 'mi mazo', 'recomendaciones', 'sugerencias de mazo'],
      pt: ['deck atual', 'meu deck', 'recomendações', 'sugestões de deck'],
      tr: ['mevcut deste', 'benim destem', 'öneriler', 'deste önerileri'],
      fr: ['deck actuel', 'mon deck', 'recommandations', 'suggestions de deck'],
    },
    patterns: [
      /my.*(current|active).*deck/i,
      /what.*deck.*(am|using)/i,
      /deck.*recommendations?/i,
    ],
  },
  {
    id: 'builder',
    titleKey: 'help.sections.builder',
    excerptKey: 'help.builder.overview.description',
    keywords: {
      en: ['build deck', 'create deck', 'deck builder', 'templates', 'compare', 'save deck', 'deck comparison', 'make deck'],
      es: ['construir mazo', 'crear mazo', 'constructor de mazos', 'plantillas', 'comparar', 'guardar mazo'],
      pt: ['construir deck', 'criar deck', 'construtor de decks', 'modelos', 'comparar', 'salvar deck'],
      tr: ['deste yap', 'deste oluştur', 'deste oluşturucu', 'şablonlar', 'karşılaştır', 'deste kaydet'],
      fr: ['construire deck', 'créer deck', 'constructeur de decks', 'modèles', 'comparer', 'sauvegarder deck'],
    },
    patterns: [
      /how.*(build|create|make).*deck/i,
      /deck.*builder/i,
      /save.*(my|a).*deck/i,
      /compare.*decks?/i,
      /deck.*templates?/i,
    ],
  },
  {
    id: 'analytics',
    titleKey: 'help.sections.analytics',
    excerptKey: 'help.analytics.overview.description',
    keywords: {
      en: ['analytics', 'trends', 'performance', 'mastery', 'achievements', 'progress', 'card mastery', 'trophy graph'],
      es: ['análisis', 'tendencias', 'rendimiento', 'maestría', 'logros', 'progreso'],
      pt: ['análise', 'tendências', 'desempenho', 'maestria', 'conquistas', 'progresso'],
      tr: ['analitik', 'trendler', 'performans', 'ustalık', 'başarılar', 'ilerleme'],
      fr: ['analytiques', 'tendances', 'performance', 'maîtrise', 'succès', 'progrès'],
    },
    patterns: [
      /analytics/i,
      /card.*mastery/i,
      /trophy.*(graph|chart|trend)/i,
      /performance.*(over|trend)/i,
      /achievements?/i,
    ],
  },
  {
    id: 'collection',
    titleKey: 'help.sections.collection',
    excerptKey: 'help.collection.overview.description',
    keywords: {
      en: ['cards', 'collection', 'rarity', 'level', 'upgrade', 'card levels', 'inventory', 'card count'],
      es: ['cartas', 'colección', 'rareza', 'nivel', 'mejorar', 'niveles de carta'],
      pt: ['cartas', 'coleção', 'raridade', 'nível', 'melhorar', 'níveis de carta'],
      tr: ['kartlar', 'koleksiyon', 'nadirlik', 'seviye', 'yükselt', 'kart seviyeleri'],
      fr: ['cartes', 'collection', 'rareté', 'niveau', 'améliorer', 'niveaux de carte'],
    },
    patterns: [
      /my.*cards?/i,
      /card.*(collection|inventory)/i,
      /card.*levels?/i,
      /how.*upgrade/i,
      /rarity/i,
    ],
  },
  {
    id: 'leaderboard',
    titleKey: 'help.sections.leaderboard',
    excerptKey: 'help.leaderboard.overview.description',
    keywords: {
      en: ['ranking', 'top players', 'global', 'leaderboard', 'rank', 'position', 'best players'],
      es: ['clasificación', 'mejores jugadores', 'global', 'tabla de posiciones', 'rango'],
      pt: ['classificação', 'melhores jogadores', 'global', 'tabela de líderes', 'posição'],
      tr: ['sıralama', 'en iyi oyuncular', 'global', 'lider tablosu', 'derece'],
      fr: ['classement', 'meilleurs joueurs', 'global', 'tableau des scores', 'rang'],
    },
    patterns: [
      /leaderboard/i,
      /top.*players?/i,
      /global.*rank/i,
      /my.*rank/i,
      /ranking/i,
    ],
  },
  {
    id: 'tournaments',
    titleKey: 'help.sections.tournaments',
    excerptKey: 'help.tournaments.overview.description',
    keywords: {
      en: ['tournament', 'compete', 'prize', 'join tournament', 'create tournament', 'competition'],
      es: ['torneo', 'competir', 'premio', 'unirse al torneo', 'crear torneo'],
      pt: ['torneio', 'competir', 'prêmio', 'entrar no torneio', 'criar torneio'],
      tr: ['turnuva', 'yarış', 'ödül', 'turnuvaya katıl', 'turnuva oluştur'],
      fr: ['tournoi', 'compétition', 'prix', 'rejoindre tournoi', 'créer tournoi'],
    },
    patterns: [
      /tournament/i,
      /how.*(join|create).*tournament/i,
      /competition/i,
    ],
  },
  {
    id: 'clans',
    titleKey: 'help.sections.clans',
    excerptKey: 'help.clans.overview.description',
    keywords: {
      en: ['clan', 'members', 'join clan', 'search clan', 'find clan', 'clan war'],
      es: ['clan', 'miembros', 'unirse al clan', 'buscar clan', 'encontrar clan'],
      pt: ['clã', 'membros', 'entrar no clã', 'buscar clã', 'encontrar clã'],
      tr: ['klan', 'üyeler', 'klana katıl', 'klan ara', 'klan bul'],
      fr: ['clan', 'membres', 'rejoindre clan', 'chercher clan', 'trouver clan'],
    },
    patterns: [
      /clan/i,
      /how.*(find|join|search).*clan/i,
      /clan.*members?/i,
    ],
  },
  {
    id: 'coach',
    titleKey: 'help.sections.coach',
    excerptKey: 'help.coach.overview.description',
    keywords: {
      en: ['ai coach', 'chat', 'advice', 'tips', 'quota', 'ai limit', 'coaching', 'help me improve'],
      es: ['coach ia', 'chat', 'consejos', 'ayuda', 'cuota', 'límite de ia'],
      pt: ['coach ia', 'chat', 'conselhos', 'dicas', 'cota', 'limite de ia'],
      tr: ['yapay zeka koç', 'sohbet', 'tavsiye', 'ipuçları', 'kota', 'yapay zeka limiti'],
      fr: ['coach ia', 'chat', 'conseils', 'astuces', 'quota', 'limite ia'],
    },
    patterns: [
      /ai.*(coach|limit|quota)/i,
      /how.*many.*(requests?|questions?)/i,
      /coaching/i,
    ],
  },
  {
    id: 'features',
    titleKey: 'help.sections.features',
    excerptKey: 'help.features.language.description',
    keywords: {
      en: ['language', 'notifications', 'settings', 'preferences', 'change language', 'features'],
      es: ['idioma', 'notificaciones', 'configuración', 'preferencias', 'cambiar idioma'],
      pt: ['idioma', 'notificações', 'configurações', 'preferências', 'mudar idioma'],
      tr: ['dil', 'bildirimler', 'ayarlar', 'tercihler', 'dil değiştir'],
      fr: ['langue', 'notifications', 'paramètres', 'préférences', 'changer langue'],
    },
    patterns: [
      /change.*language/i,
      /notifications?/i,
      /settings?/i,
      /preferences?/i,
    ],
  },
  {
    id: 'faq',
    titleKey: 'help.sections.faq',
    excerptKey: 'help.faq.dataSync.answer',
    keywords: {
      en: ['faq', 'frequently asked', 'common questions', 'sync', 'data sync', 'refresh', 'update data', 'not showing', 'not working'],
      es: ['preguntas frecuentes', 'sincronizar', 'actualizar datos', 'no muestra', 'no funciona'],
      pt: ['perguntas frequentes', 'sincronizar', 'atualizar dados', 'não mostra', 'não funciona'],
      tr: ['sık sorulan', 'senkronize', 'veri güncelle', 'göstermiyor', 'çalışmıyor'],
      fr: ['questions fréquentes', 'synchroniser', 'mettre à jour données', 'ne montre pas', 'ne fonctionne pas'],
    },
    patterns: [
      /faq/i,
      /why.*(not|isn't).*(showing|working|updating)/i,
      /how.*(sync|refresh|update).*data/i,
      /data.*(not|isn't).*updating/i,
    ],
  },
];

// Patterns that indicate an app-related question (vs gameplay question)
const APP_QUESTION_PATTERNS: Record<string, RegExp[]> = {
  en: [
    /how (do|can|to) (i|we)/i,
    /where (is|can|do|are)/i,
    /what (is|does|are) (the|my|this)/i,
    /how to/i,
    /can (i|you|we)/i,
    /is there (a|any)/i,
  ],
  es: [
    /cómo (puedo|hago|se)/i,
    /dónde (está|puedo|hay)/i,
    /qué (es|son|hace)/i,
    /puedo/i,
    /hay (un|una|algún)/i,
  ],
  pt: [
    /como (posso|faço|eu)/i,
    /onde (está|posso|há)/i,
    /o que (é|são|faz)/i,
    /posso/i,
    /existe (um|uma|algum)/i,
  ],
  tr: [
    /nasıl (yapılır|yapabilirim|edebilirim)/i,
    /nerede (var|bulunur|görebilirim)/i,
    /ne (demek|anlama|eder)/i,
    /yapabilir miyim/i,
    /var mı/i,
  ],
  fr: [
    /comment (puis-je|faire|est-ce)/i,
    /où (est|puis-je|se trouve)/i,
    /qu'est-ce (que|qui)/i,
    /puis-je/i,
    /y a-t-il/i,
  ],
};

// Keywords that strongly indicate gameplay questions (not app questions)
const GAMEPLAY_KEYWORDS = [
  'counter', 'beat', 'win against', 'strategy', 'placement', 'elixir', 'cycle',
  'push', 'defend', 'attack', 'lane', 'single elixir', 'double elixir', 'overtime',
  'hog rider', 'golem', 'pekka', 'lava hound', 'giant', 'balloon', 'x-bow', 'mortar',
  'log bait', 'bridge spam', 'beatdown', 'control', 'siege', 'spell cycle',
  'micro', 'macro', 'timing', 'predict', 'bait', 'punish', 'pressure',
];

/**
 * Check if a message is likely an app-related question rather than a gameplay question
 */
export function isAppQuestion(message: string, language: string = 'en'): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Check if it contains gameplay keywords - if so, it's probably not an app question
  const hasGameplayKeywords = GAMEPLAY_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  if (hasGameplayKeywords) {
    return false;
  }
  
  // Check if it matches app question patterns
  const patterns = APP_QUESTION_PATTERNS[language] || APP_QUESTION_PATTERNS.en;
  return patterns.some(pattern => pattern.test(message));
}

/**
 * Calculate keyword match score for a message against a topic
 */
function calculateKeywordScore(message: string, topic: HelpTopic, language: string): number {
  const lowerMessage = message.toLowerCase();
  const keywords = topic.keywords[language] || topic.keywords.en;
  
  let matchedKeywords = 0;
  let totalWeight = 0;
  
  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      // Longer keywords are more specific, give them more weight
      const weight = keyword.split(' ').length;
      matchedKeywords += weight;
    }
    totalWeight += keyword.split(' ').length;
  }
  
  return totalWeight > 0 ? matchedKeywords / totalWeight : 0;
}

/**
 * Calculate pattern match score for a message against a topic
 */
function calculatePatternScore(message: string, topic: HelpTopic): number {
  let matchedPatterns = 0;
  
  for (const pattern of topic.patterns) {
    if (pattern.test(message)) {
      matchedPatterns++;
    }
  }
  
  return topic.patterns.length > 0 ? matchedPatterns / topic.patterns.length : 0;
}

/**
 * Match a user message to the most relevant help topic
 */
export function matchHelpTopic(message: string, language: string = 'en'): HelpMatch | null {
  // Don't match very short messages
  if (message.trim().length < 10) {
    return null;
  }
  
  // Check if this is likely an app question
  if (!isAppQuestion(message, language)) {
    return null;
  }
  
  let bestMatch: HelpMatch | null = null;
  let bestScore = 0;
  
  for (const topic of HELP_TOPICS) {
    const keywordScore = calculateKeywordScore(message, topic, language);
    const patternScore = calculatePatternScore(message, topic);
    
    // Combined score with keyword matching weighted slightly higher
    const combinedScore = (keywordScore * 0.6) + (patternScore * 0.4);
    
    if (combinedScore > bestScore && combinedScore > 0.15) {
      bestScore = combinedScore;
      bestMatch = {
        sectionId: topic.id,
        sectionTitle: topic.titleKey,
        confidence: Math.min(combinedScore * 1.5, 1), // Scale up but cap at 1
        helpUrl: `/help#${topic.id}`,
        excerpt: topic.excerptKey,
      };
    }
  }
  
  return bestMatch;
}

/**
 * Generate a help response message for the AI Coach
 */
export function generateHelpResponse(
  match: HelpMatch,
  t: (key: string, options?: any) => string
): string {
  const sectionTitle = t(match.sectionTitle);
  const excerpt = t(match.excerpt);
  
  return `📚 **${t('help.coachIntegration.foundInHelp')}**

### ${sectionTitle}

${excerpt}

👉 [${t('help.coachIntegration.readMore')}](${match.helpUrl})

---
💡 ${t('help.coachIntegration.needMoreHelp')}`;
}
