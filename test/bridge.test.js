const { sample } = require('lodash')
const {
  startGame,
  getPossibleBids,
  getPossibleCards,
  PHASES,
  layCard,
  handsToString,
} = require('../bridge/bridge')
const {
  createBid,
  PASS,
  DOUBLE,
  REDOUBLE,
  BID_LEVELS,
  BID_TYPES,
} = require('../bridge/bidding')
const { SUITS } = require('../bridge/suits')
const { createCard, cardToString } = require('../bridge/deck')

test('check initial state', () => {
  const { state } = startGame('one', 'two', 'three', 'four')
  expect(state.turn).toEqual('two')
  expect(state.phase).toEqual(PHASES.BID)
})

test('make bidding', () => {
  let { state, makeBid } = startGame('one', 'two', 'three', 'four')
  let bids = getPossibleBids(state)

  expect(state.turn).toEqual('two')
  expect(state.phase).toEqual(PHASES.BID)

  expect(bids).toContainEqual(PASS)
  expect(bids).not.toContainEqual(DOUBLE)
  expect(bids).not.toContainEqual(REDOUBLE)
  const oneClub = createBid(BID_TYPES.BID, BID_LEVELS['1'], SUITS.CLUBS.id)
  expect(bids).toContainEqual(oneClub)
  ;({ state, makeBid } = makeBid(oneClub))
  bids = getPossibleBids(state)

  expect(bids).toContainEqual(PASS)
  expect(bids).toContainEqual(DOUBLE)
  expect(bids).not.toContainEqual(REDOUBLE)
  ;({ state, makeBid } = makeBid(DOUBLE))
  bids = getPossibleBids(state)

  expect(bids).toContainEqual(PASS)
  expect(bids).not.toContainEqual(DOUBLE)
  expect(bids).toContainEqual(REDOUBLE)

  const twoClub = createBid(BID_TYPES.BID, BID_LEVELS['2'], SUITS.CLUBS.id)
  expect(bids).not.toContainEqual(oneClub)
  expect(bids).toContainEqual(twoClub)
  ;({ state, makeBid } = makeBid(PASS))
  ;({ state, makeBid } = makeBid(PASS))
  const game = makeBid(PASS)

  expect(game.state.phase).toEqual(PHASES.FIRST_LEAD)
  expect(game.layCard).toBeTruthy()
  expect(game.state.declarer).toBe('two')
  expect(game.state.dummy).toBe('four')
  expect(game.state.turn).toBe('three')
})

test('follow trick suit', () => {
  const state = {
    players: ['N', 'E', 'S', 'W'],
    phase: PHASES.TRICK,
    trick: [createCard(SUITS.HEARTS.id, 'K')],
    turn: 'E',
    playerHands: {
      N: [createCard(SUITS.CLUBS.id, 'K')],
      E: [createCard(SUITS.HEARTS.id, 'Q'), createCard(SUITS.CLUBS.id, 'J')],
      S: [createCard(SUITS.SPADES.id, 'K'), createCard(SUITS.DIAMONDS.id, 'K')],
      W: [createCard(SUITS.HEARTS.id, 'J'), createCard(SUITS.HEARTS.id, 'A')],
    },
  }

  // Must follow with only the heart
  expect(getPossibleCards(state)).toEqual([createCard(SUITS.HEARTS.id, 'Q')])

  state.turn = 'S'

  // Doesn't have to follow because no hearts
  expect(getPossibleCards(state)).toEqual([
    createCard(SUITS.SPADES.id, 'K'),
    createCard(SUITS.DIAMONDS.id, 'K'),
  ])

  state.turn = 'W'

  // Only has hearts and obviously must follow
  expect(getPossibleCards(state)).toEqual([
    createCard(SUITS.HEARTS.id, 'J'),
    createCard(SUITS.HEARTS.id, 'A'),
  ])
})

test('scoring of trick and game', () => {
  const state = {
    players: ['N', 'E', 'S', 'W'],
    phase: PHASES.TRICK,
    contract: {
      suitId: SUITS.SPADES.id,
      level: '1',
      type: 'NORMAL',
      declarerIndex: 0,
    },
    trick: [
      createCard(SUITS.HEARTS.id, 'K'),
      createCard(SUITS.CLUBS.id, '2'),
      createCard(SUITS.HEARTS.id, 'T'),
    ],
    declarerTricks: 6,
    opponentTricks: 6,
    turn: 'W',
    playerHands: {
      N: [],
      E: [],
      S: [],
      W: [createCard(SUITS.SPADES.id, '7')],
    },
  }

  const playableCards = getPossibleCards(state)
  expect(playableCards).toEqual([createCard(SUITS.SPADES.id, '7')])
  const game = layCard(state)(playableCards[0])
  expect(game.state.phase).toEqual(PHASES.RESULT)
  expect(game.state.contractResult).toEqual(-1)
})

test('random game', () => {
  let { state, makeBid, layCard } = startGame('N', 'E', 'S', 'W')
  while (state.phase === PHASES.BID) {
    const nextBid = sample(getPossibleBids(state).slice(0, 4))
    ;({ state, makeBid, layCard } = makeBid(nextBid))
  }
  while (state.phase !== PHASES.RESULT) {
    console.log(handsToString(state))
    const nextCard = sample(getPossibleCards(state))
    console.log('Laying ', cardToString(nextCard))
    ;({ state, makeBid, layCard } = layCard(nextCard))
  }
  expect(state.contractResult).toBeGreaterThan(-14)
  expect(state.contractResult).toBeLessThan(8)
  console.log('Declarer tricks', state.declarerTricks)
  console.log('Opponent tricks', state.opponentTricks)
  console.log(state.contractResult)
  console.log(state.contract)
})
