const { isEqual } = require('lodash')
const { getShuffledDeck } = require('./deck')
const { BID_TYPES } = require('./bidding')

const PHASES = {
  DEAL: 'DEAL',
  BID: 'BID',
  BID_WINNER: 'BID_WINNER',
  FIRST_LEAD: 'FIRST_LEAD',
  DUMMY_REVEAL: 'DUMMY_REVEAL',
  TRICK: 'TRICK',
  TRICK_WON: 'TRICK_WON',
  RESULT: 'RESULT',
}

const defaultState = () => {
  players: null
  declarer: null,
  dummy: null,
  bids: [],
  contract: null
  trick: [],
  leader: null,
  turn: null,
  declarerTricks: 0,
  opponentTricks: 0,
  playerHands: {},
  phase: PHASES.DEAL
}

/**
 * Get player to left of provided player, or current turn's player if omitted.
 */
const nextPlayer = (state, player) => {
  player = player || state.turn
  const newPlayer = state.players[
    (players.indexOf(player) + 1) % 4
  ]
  return newPlayer
}

const startGame = (dealer, second, third, fourth) => {
  const state = defaultState()
  state.players = [dealer, second, third, fourth]
  state.turn = second
  state.phase = phases.BID
  const hands = getShuffledDeck()
  state.playerHands = {
    [second]: hands[0],
    [third]: hands[1],
    [fourth]: hands[2],
    [dealer]: hands[3],
  }
  return { state, makeBid: makeBid(state) }
}

const makeBid = state => {
  const { turn, bids } = state
  return (bid) => {
    state.bids = [...state.bids, bid]

    if (state.bids.length > 3 && state.bids.slice(-3).every(bid => bid.type === BID_TYPES.PASS)) {
      const winningBid = '2s'
      const bidWinner = 'someone'
      state.declarer = bidWinner
      state.dummy = nextPlayer(
        state,
        nextPlayer(state, declarer)
      )
      state.contract = 'something'
      state.phase = PHASES.FIRST_LEAD
      state.turn = nextPlayer(state, bidWinner)

      return { state, layCard: layCard(state) }
    }

    state.player = nextPlayer(state)
    return { state, makeBid: makeBid(state) }
  }
}

const layCard = state => {
  const { turn, trick } = state
  return (card) => {

  }
}