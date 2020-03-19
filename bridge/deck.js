const { flatMap, shuffle } = require('lodash')
const { SUITS, compareSuits } = require('./suits')

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const RANK_INDEX = RANKS.reduce((acc, rank, index) => {
  acc[rank] = index
  return acc
}, {})

const createCard = (suitId, rank) => {
  if (!(suitId in SUITS)) {
    throw new Error('invalid suit id ' + suitId)
  }
  if (!(rank in RANK_INDEX)) {
    throw new Error('invalid rank ' + rank)
  }
  return { suitId, rank }
}

const cardToString = ({ suitId, rank }) => `${rank} ${SUITS[suitId].emoji}`

const DECK = flatMap(
  [SUITS.CLUBS, SUITS.DIAMONDS, SUITS.HEARTS, SUITS.SPADES].map(suit =>
    RANKS.map(rank => createCard(suit.id, rank))
  )
)

const getShuffledDeck = () => shuffle(shuffle(shuffle(DECK)))

const compareRanks = (a, b) => RANK_INDEX[a] - RANK_INDEX[b]

const compareCards = (a, b) =>
  compareSuits(a.suitId, b.suitId) || compareRanks(a.rank, b.rank)

const getHands = () => {
  const [first, second, third, fourth] = getShuffledDeck().reduce(
    (hands, card, index) => {
      hands[index % 4].push(card)
      return hands
    },
    [[], [], [], []]
  )
  first.sort(compareCards)
  second.sort(compareCards)
  third.sort(compareCards)
  fourth.sort(compareCards)
  return [first, second, third, fourth]
}

module.exports = {
  DECK,
  getShuffledDeck,
  RANK_INDEX,
  RANKS,
  createCard,
  compareCards,
  compareRanks,
  getHands,
  cardToString,
}
