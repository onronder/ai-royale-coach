export const recommendationReasons = {
  en: {
    style: (style: string) => `You play well with ${style} decks.`,
    counter: 'This deck counters opponents you struggle against.',
    mastery: 'It uses cards you have mastered.',
    skill: 'Its difficulty suits your skill level.',
    popular: (style: string) => `This is a popular ${style} deck.`,
  },
  tr: {
    style: (style: string) => `${style} desteleriyle iyi oynuyorsun.`,
    counter: 'Bu deste, zorlandığın rakiplere karşı etkili.',
    mastery: 'İyi kullandığın kartları içeriyor.',
    skill: 'Zorluk derecesi oyun seviyene uygun.',
    popular: (style: string) => `${style} türünde sık kullanılan bir deste.`,
  },
  es: {
    style: (style: string) => `Se te dan bien los mazos de tipo ${style}.`,
    counter: 'Este mazo contrarresta a los rivales que te cuestan.',
    mastery: 'Incluye cartas que dominas.',
    skill: 'La dificultad se ajusta a tu nivel.',
    popular: (style: string) => `Es un mazo popular de tipo ${style}.`,
  },
  fr: {
    style: (style: string) => `Vous maîtrisez bien les decks de type ${style}.`,
    counter: 'Ce deck est efficace contre les adversaires qui vous posent problème.',
    mastery: 'Il contient des cartes que vous maîtrisez.',
    skill: 'Sa difficulté correspond à votre niveau.',
    popular: (style: string) => `Ce deck de type ${style} est populaire.`,
  },
  pt: {
    style: (style: string) => `Você joga bem com decks do tipo ${style}.`,
    counter: 'Este deck é eficaz contra adversários que costumam dar trabalho.',
    mastery: 'Ele usa cartas que você domina.',
    skill: 'A dificuldade combina com seu nível.',
    popular: (style: string) => `É um deck popular do tipo ${style}.`,
  },
};
