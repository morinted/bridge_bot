const SUITS = {
  NOTRUMP: {
    id: 'NOTRUMP',
    short: 'NT',
    emoji: 'NT',
    name: 'Notrump',
    namePlural: 'Notrump',
    rank: 4,
  },
  SPADES: {
    id: 'SPADES',
    short: 'S',
    emoji: '♠️',
    name: 'Spade',
    namePlural: 'Spades',
    rank: 3,
  },
  HEARTS: {
    id: 'HEARTS',
    short: 'H',
    emoji: '♥️',
    name: 'Heart',
    namePlural: 'Hearts',
    rank: 2,
  },
  DIAMONDS: {
    id: 'DIAMONDS',
    short: 'D',
    emoji: '♦️',
    name: 'Diamond',
    namePlural: 'Diamonds',
    rank: 1,
  },
  CLUBS: {
    id: 'CLUBS',
    short: 'C',
    emoji: '♣️',
    name: 'Club',
    namePlural: 'Clubs',
    rank: 0,
  },
}

const compareSuits = (suitIdA, suitIdB) =>
  SUITS[suitIdA].rank - SUITS[suitIdB].rank

module.exports = { SUITS, compareSuits }
