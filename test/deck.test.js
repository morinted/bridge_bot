const {
  DECK,
  getShuffledDeck,
  getHands,
  compareCards,
  createCard,
  compareRanks,
} = require('../bridge/deck')

test('deck length', () => {
  expect(DECK).toHaveLength(52)
})

test('shuffling', () => {
  const shuffled = getShuffledDeck()
  // console.log(shuffled)
  expect(shuffled).not.toEqual(DECK)
})

test('sort rank', () => {
  expect(compareRanks('A', '2')).toBeGreaterThan(0)
})

test('sort cards', () => {
  expect(
    compareCards(createCard('HEARTS', 'A'), createCard('HEARTS', '2'))
  ).toBeGreaterThan(0)
})

test('hands', () => {
  const hands = getHands()
  console.log(hands)
  expect(hands).toHaveLength(4)
  hands.forEach(hand => expect(hand).toHaveLength(13))
})
