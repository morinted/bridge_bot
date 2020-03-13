const { SUITS } = require('../bridge/suits')
const {
  BID_TYPES,
  getContract,
  createBid,
  BID_LEVELS,
  BIDS,
} = require('../bridge/bidding')
const { createContract, CONTRACT_TYPES } = require('../bridge/contracts')

const club = SUITS.CLUBS.id
const heart = SUITS.HEARTS.id
const diamond = SUITS.DIAMONDS.id
const spade = SUITS.SPADES.id
const notrump = SUITS.NOTRUMP.id

test('possible bids', () => {
  expect(BIDS).toHaveLength(7 * 5)
})

test('simple contract detection', () => {
  expect(
    getContract([
      createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.HEARTS.id),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
    ])
  ).toEqual(createContract(heart, BID_LEVELS['1'], CONTRACT_TYPES.NORMAL, 1))
})

test('partner support', () => {
  expect(
    getContract([
      createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.HEARTS.id),
      createBid(BID_TYPES.BID, BID_LEVELS['2'], SUITS.HEARTS.id),
      createBid(BID_TYPES.BID, BID_LEVELS['3'], SUITS.HEARTS.id),
      createBid(BID_TYPES.BID, BID_LEVELS['4'], SUITS.HEARTS.id),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
    ])
  ).toEqual(createContract(heart, BID_LEVELS['4'], CONTRACT_TYPES.NORMAL, 2))
})

test('double and redouble', () => {
  expect(
    // Canceled doubling.
    getContract([
      createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.HEARTS.id),
      createBid(BID_TYPES.DOUBLE),
      createBid(BID_TYPES.REDOUBLE),
      createBid(BID_TYPES.BID, BID_LEVELS['2'], SUITS.HEARTS.id),
      createBid(BID_TYPES.BID, BID_LEVELS['3'], SUITS.HEARTS.id),
      createBid(BID_TYPES.BID, BID_LEVELS['4'], SUITS.HEARTS.id),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
    ])
  ).toEqual(createContract(heart, BID_LEVELS['4'], CONTRACT_TYPES.NORMAL, 0))

  expect(
    // Double
    getContract([
      createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.HEARTS.id),
      createBid(BID_TYPES.DOUBLE),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
    ])
  ).toEqual(createContract(heart, BID_LEVELS['1'], CONTRACT_TYPES.DOUBLED, 1))

  expect(
    // Redouble
    getContract([
      createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.HEARTS.id),
      createBid(BID_TYPES.DOUBLE),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.REDOUBLE),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
      createBid(BID_TYPES.PASS),
    ])
  ).toEqual(createContract(heart, BID_LEVELS['1'], CONTRACT_TYPES.REDOUBLED, 1))
})
