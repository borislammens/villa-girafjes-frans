/**
 * Woordenlijst Contact 1 t/m 4 (handboek p. 47), overgenomen van foto.
 * fr: Frans, nl: Nederlands, contact: 1-4.
 * unsure: true = moeilijk leesbaar op de foto, nakijken.
 * note: korte opmerking bij twijfel.
 */
export const WORDS = [
  // A
  { fr: 'à (ce soir)', nl: 'tot (vanavond)', contact: 1 },
  { fr: "à (l'école)", nl: 'naar (school)', contact: 2 },
  { fr: 'au (magasin)', nl: 'naar (de winkel)', contact: 2 },
  { fr: "à (l'école)", nl: 'op (school)', contact: 3 },
  { fr: 'au (magasin)', nl: 'in (de winkel)', contact: 3 },
  { fr: 'aimer', nl: 'houden van', contact: 4 },
  { fr: 'aller', nl: 'gaan', contact: 2 },
  { fr: 'alors', nl: 'dan', contact: 2 },
  { fr: 'un anniversaire', nl: 'een verjaardag', contact: 4 },
  { fr: 'avec', nl: 'met', contact: 2 },
  { fr: 'avoir', nl: 'hebben', contact: 4 },
  // B
  { fr: 'beaucoup', nl: 'veel', contact: 4 },
  { fr: 'bien', nl: 'goed', contact: 1 },
  { fr: 'bien sûr', nl: 'zeker, natuurlijk', contact: 4 },
  { fr: 'bientôt', nl: 'binnenkort', contact: 1 },
  { fr: 'bon, bonne', nl: 'goed', contact: 4 },
  { fr: 'bonjour', nl: 'goedendag', contact: 1 },
  { fr: 'un bureau', nl: 'een werkkamer, bureau', contact: 3 },
  // C
  { fr: 'ça', nl: 'het, dat', contact: 1 },
  { fr: 'un cadeau', nl: 'een geschenk', contact: 4 },
  { fr: 'un CD', nl: 'een cd', contact: 4 },
  { fr: "c'est ...", nl: 'het is ...', contact: 4 },
  { fr: 'la chance', nl: 'het geluk', contact: 4 },
  { fr: 'un cinéma', nl: 'een bioscoop', contact: 4 },
  { fr: 'comment', nl: 'hoe', contact: 1 },
  { fr: 'content(e)', nl: 'tevreden, blij', contact: 4 },
  { fr: 'un copain', nl: 'een vriend', contact: 4 },
  // D
  { fr: 'dans', nl: 'in', contact: 3 },
  { fr: 'de', nl: 'van', contact: 2 },
  { fr: 'déjà', nl: '(nu) al', contact: 2 },
  { fr: 'demain', nl: 'morgen', contact: 1 },
  { fr: 'un diner', nl: 'een avondmaal', contact: 3, note: 'zo gespeld in het boek (ook: dîner)' },
  // E
  { fr: 'une école', nl: 'een school', contact: 2 },
  { fr: 'elle(s)', nl: 'zij, ze', contact: 2 },
  { fr: 'écrire', nl: 'schrijven', contact: 3 },
  { fr: 'en', nl: 'in', contact: 1 },
  { fr: 'encore', nl: 'nog', contact: 3 },
  { fr: 'et', nl: 'en', contact: 1 },
  { fr: 'être', nl: 'zijn', contact: 3 },
  // F
  { fr: 'une famille', nl: 'een familie', contact: 3 },
  { fr: 'une fille', nl: 'een meisje', contact: 1 },
  { fr: 'un film', nl: 'een film', contact: 4 },
  { fr: 'formidable', nl: 'formidabel', contact: 4 },
  // G
  { fr: 'un garage', nl: 'een garage', contact: 3 },
  { fr: 'un garçon', nl: 'een jongen', contact: 1 },
  { fr: 'une gare', nl: 'een station', contact: 2 },
  // I
  { fr: 'ici', nl: 'hier', contact: 3 },
  { fr: 'il', nl: 'hij', contact: 2 },
  { fr: 'ils', nl: 'zij, ze', contact: 2 },
  { fr: 'un instant', nl: 'een ogenblik', contact: 3 },
  // J
  { fr: "je (j')", nl: 'ik', contact: 2 },
  { fr: 'un jeu (vidéo)', nl: 'een (video)spel, game', contact: 4 },
  { fr: 'joyeux, joyeuse', nl: 'gelukkig, vrolijk', contact: 4 },
  // L
  { fr: 'là', nl: 'daar, er', contact: 2 },
  { fr: "le, la (l')", nl: 'de, het', contact: 2 },
  // M
  { fr: 'un magasin', nl: 'een winkel', contact: 2 },
  { fr: 'une maison', nl: 'een huis', contact: 2 },
  { fr: 'une maman', nl: 'een mama', contact: 3 },
  { fr: 'merci', nl: 'dank je (u)', contact: 4 },
  { fr: 'merci beaucoup', nl: 'dank je (u) wel', contact: 4 },
  { fr: 'un message', nl: 'een bericht', contact: 4 },
  { fr: 'moderne', nl: 'modern', contact: 4 },
  { fr: 'moi', nl: 'ik, (met) mij', contact: 1 },
  { fr: 'la musique', nl: 'de muziek', contact: 4 },
  // N
  { fr: 'un nombre', nl: 'een aantal', contact: 1 },
  { fr: 'non', nl: 'neen', contact: 1 },
  { fr: 'nous', nl: 'wij, we', contact: 2 },
  // O
  { fr: 'où', nl: 'waar', contact: 2 },
  { fr: 'oui', nl: 'ja', contact: 1 },
  // P
  { fr: 'un papa', nl: 'een papa', contact: 3 },
  { fr: 'pour', nl: 'voor', contact: 4 },
  { fr: 'pourquoi', nl: 'waarom', contact: 3 },
  { fr: 'un prénom', nl: 'een voornaam', contact: 1 },
  { fr: 'prêt(e)', nl: 'klaar', contact: 3 },
  // Q
  { fr: "qu'est-ce que", nl: 'wat', contact: 4 },
  { fr: "Qu'est-ce que c'est?", nl: 'Wat is dat?', contact: 4 },
  { fr: 'une question', nl: 'een vraag', contact: 4 },
  { fr: 'qui', nl: 'wie', contact: 4 },
  { fr: 'quoi', nl: 'wat', contact: 4 },
  // R
  { fr: 'regarder', nl: 'kijken', contact: 4 },
  // S
  { fr: 'salut', nl: 'hallo, dag', contact: 1 },
  { fr: 'un séjour', nl: 'een woonkamer', contact: 3 },
  { fr: 'un soir', nl: 'een avond', contact: 1 },
  { fr: 'un sujet', nl: 'een onderwerp', contact: 4 },
  { fr: 'super', nl: 'super', contact: 4 },
  { fr: 'sûr(e)', nl: 'zeker', contact: 3 },
  // T
  { fr: 'un texte', nl: 'een tekst', contact: 3 },
  { fr: 'un ticket de cinéma', nl: 'een cinematicket', contact: 4 },
  { fr: 'toi', nl: 'jij, je, (met) jou', contact: 1 },
  { fr: 'très', nl: 'heel, zeer, erg', contact: 1 },
  { fr: 'tu', nl: 'jij, je', contact: 2 },
  // U
  { fr: 'un(e)', nl: 'een', contact: 3 },
  // V
  { fr: 'voilà ...', nl: 'daar heb je ..., daar is ...', contact: 1 },
  { fr: 'vous', nl: 'jullie, u', contact: 2, note: 'laatste regel op de foto; lijst loopt misschien door op p. 48' },
];

export const CONTACT_TITLES = Object.freeze({
  1: 'Salut!',
  2: 'Ils vont où?',
  3: 'Vous êtes là?',
  4: 'Tu as de la chance',
});
