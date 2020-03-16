const { isEqual, findLast, findLastIndex } = require('lodash')
const { getHands, cardToString } = require('./deck')
const {
  BID_TYPES,
  getContract,
  createBid,
  PASS,
  DOUBLE,
  REDOUBLE,
  BIDS,
} = require('./bidding')
const { ORDERED_SUITS } = require('./suits')
const { trickWinnerIndex } = require('./tricks')

const PHASES = {
  DEAL: 'DEAL',
  BID: 'BID',
  FIRST_LEAD: 'FIRST_LEAD',
  TRICK: 'TRICK',
  TRICK_WON: 'TRICK_WON',
  RESULT: 'RESULT',
}

const defaultState = () => ({
  players: null,
  declarer: null,
  dummy: null,
  dummyVisible: false,
  bids: [],
  contract: null,
  trick: [],
  turn: null,
  declarerTricks: 0,
  opponentTricks: 0,
  playerHands: {},
  phase: PHASES.DEAL,
  contractResult: null,
})

/**
 * Get player to left of provided player, or current turn's player if omitted.
 */
const nextPlayer = (state, player) => {
  player = player || state.turn
  const newPlayer = state.players[(state.players.indexOf(player) + 1) % 4]
  return newPlayer
}

const startGame = (dealer, second, third, fourth) => {
  const state = defaultState()
  state.players = [dealer, second, third, fourth]
  state.turn = second
  state.phase = PHASES.BID
  const hands = getHands()
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
  return bid => {
    state.bids = [...state.bids, bid]

    if (
      state.bids.length > 3 &&
      state.bids.slice(-3).every(bid => bid.type === BID_TYPES.PASS)
    ) {
      const contract = getContract(state.bids)
      state.declarer = state.players[contract.declarerIndex]
      const firstPlayer = nextPlayer(state, state.declarer)
      state.dummy = nextPlayer(state, firstPlayer)
      state.contract = contract
      state.phase = PHASES.FIRST_LEAD
      state.turn = firstPlayer

      return { state, layCard: layCard(state) }
    }

    state.turn = nextPlayer(state)
    return { state, makeBid: makeBid(state) }
  }
}

const layCard = state => {
  const { turn } = state
  return card => {
    state.trick = [...state.trick, card]
    // Consume card.
    const handWithoutCard = state.playerHands[state.turn].filter(
      cardInHand => !isEqual(card, cardInHand)
    )
    if (handWithoutCard.length === state.playerHands[state.turn].length) {
      throw new Error('played a card that was not in player hand')
    }
    state.playerHands[state.turn] = handWithoutCard

    switch (state.phase) {
      case PHASES.TRICK:
        if (state.trick.length !== 4) {
          // Play next trick.
          state.turn = nextPlayer(state)
          return { state, layCard: layCard(state) }
        }
        // Evaluate winner of trick.
        const winnerIndex = trickWinnerIndex(state.trick, state.contract.suitId)
        // To convert to player, use current player
        const currentIndex = state.players.indexOf(state.turn)
        // Winner of trick is current player plus one plus trick offset.
        // Meaning if N leads, E wins, then it's the index of W (3) plus 1
        // plus winner of trick (1) = 5, mod 4, 1 → index of E.
        const winningPlayerIndex = (currentIndex + 1 + winnerIndex) % 4
        const winner = state.players[winningPlayerIndex]
        if (winner === state.declarer || winner === state.dummy) {
          state.declarerTricks += 1
        } else {
          state.opponentTricks += 1
        }

        if (handWithoutCard.length === 0) {
          // End of game
          state.phase = PHASES.RESULT
          state.turn = null
          state.contractResult =
            state.declarerTricks - 6 - parseInt(state.contract.level, 10)
          return { state }
        }
        state.turn = winner
        state.phase = PHASES.TRICK_WON
        state.trick = []
        return { state, layCard: layCard(state) }
      case PHASES.FIRST_LEAD:
        state.dummyVisible = true
      case PHASES.TRICK_WON:
        state.phase = PHASES.TRICK
      default:
        state.turn = nextPlayer(state)
        return { state, layCard: layCard(state) }
    }
  }
}

const getPossibleBids = state => {
  if (state.phase !== PHASES.BID) return []

  const latestBidIndex = findLastIndex(
    state.bids,
    bid => bid.type === BID_TYPES.BID
  )

  if (latestBidIndex === -1) {
    return [PASS, ...BIDS]
  }

  const latestBid = state.bids[latestBidIndex]

  const latestSayIndex = findLastIndex(
    state.bids,
    bid => bid.type !== BID_TYPES.PASS
  )
  const latestSay = state.bids[latestSayIndex]

  const doubled = latestSay.type === BID_TYPES.DOUBLE
  const redoubled = latestSay.type === BID_TYPES.REDOUBLE

  // [pass, bid, pass], index 1, length is 3, current bidder is same team.
  const isBidSameTeam = latestBidIndex % 2 === state.bids.length % 2

  const canDouble = !doubled && !redoubled && !isBidSameTeam
  const canRedouble = doubled && !redoubled && isBidSameTeam

  const bidIndex = BIDS.findIndex(bid => isEqual(bid, latestBid))
  const remainingBids = BIDS.slice(bidIndex + 1)

  return [
    PASS,
    ...(canDouble ? [DOUBLE] : []),
    ...(canRedouble ? [REDOUBLE] : []),
    ...remainingBids,
  ]
}

/**
 * Get the current player's possible playable cards.
 */
const getPossibleCards = state => {
  if (
    [PHASES.FIRST_LEAD, PHASES.TRICK, PHASES.TRICK_WON].every(
      phase => state.phase !== phase
    )
  ) {
    return []
  }

  const leadCard = state.trick[0] || null
  const trickSuit = leadCard ? leadCard.suitId : null
  const currentPlayerHand = state.playerHands[state.turn]

  if (!trickSuit) return currentPlayerHand
  const [sameSuit, otherSuit] = currentPlayerHand.reduce(
    ([sameSuit, otherSuit], card) => {
      if (card.suitId === trickSuit) {
        sameSuit.push(card)
      } else {
        otherSuit.push(card)
      }
      return [sameSuit, otherSuit]
    },
    [[], []]
  )

  // Can't follow
  if (!sameSuit.length) return otherSuit

  // Must follow
  return sameSuit
}

const playerHandForMessage = (player, state) => {
  const contractSuit = state.contract.suitId
  const hand = state.playerHands[player]
  return (
    ORDERED_SUITS.map(suit => {
      const isTrump = contractSuit === suit.id
      const surround = isTrump ? '*' : ''
      const cardsOfSuit = hand.filter(card => card.suitId === suit.id)
      if (!cardsOfSuit.length) return null
      return `${suit.emoji} ${surround}${cardsOfSuit
        .map(card => card.rank)
        .join(' ')}${surround}`
    })
      .filter(x => x)
      .join('\n') || "You're empty handed 🙌"
  )
}

const handsToString = state => {
  const playerHandToString = player =>
    `${player === state.turn ? '*' : '-'} ${player}: ${state.playerHands[player]
      .map(cardToString)
      .join('   ')} ${player === state.dummy ? ' (Dummy)' : ''}`
  return state.players.map(playerHandToString).join('\n')
}

module.exports = {
  getPossibleBids,
  getPossibleCards,
  startGame,
  PHASES,
  layCard,
  handsToString,
  playerHandForMessage,
}
