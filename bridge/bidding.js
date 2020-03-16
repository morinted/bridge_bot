const { findLastIndex, flatMap } = require('lodash')
const { SUITS, ORDERED_SUITS } = require('./suits')
const { CONTRACT_TYPES, createContract } = require('./contracts')

const BID_TYPES = {
  BID: 'BID',
  DOUBLE: 'DOUBLE',
  REDOUBLE: 'REDOUBLE',
  PASS: 'PASS',
}

const BID_LEVELS = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
}

const createBid = (type, level = null, suit = null) => {
  if (type !== BID_TYPES.BID && (level || suit)) {
    throw new Error('do not provide level or suit when type is not bid')
  }
  if (level) {
    if (!(level in BID_LEVELS)) {
      throw new Error('not a valid level ' + level)
    }
  }
  if (suit) {
    if (!(suit in SUITS)) {
      throw new Error('not a valid suit ' + suit)
    }
  }
  return {
    type,
    level,
    suit,
  }
}

const BIDS = flatMap(Object.values(BID_LEVELS).sort(), level =>
  ORDERED_SUITS.map(suit => createBid(BID_TYPES.BID, level, suit.id))
)

/**
 * Given an array of bids, return the winning contract along with the declarer's index, assuming dealer is 0.
 */
const getContract = bids => {
  if (bids.length < 4) {
    throw new Error('Not enough bids for a contract')
  }
  if (bids.slice(-3).some(bid => bid.type !== BID_TYPES.PASS)) {
    throw new Error('Bidding did not end with three passes')
  }
  if (bids.length === 4 && bids.every(bid => bid.type === BID_TYPES.PASS)) {
    return null
  }

  const lastSay = bids[bids.length - 4]

  const redoubled = lastSay.type === BID_TYPES.REDOUBLE
  const doubled = lastSay.type === BID_TYPES.DOUBLE

  const lastBidIndex = findLastIndex(bids, bid => bid.type === BID_TYPES.BID)
  const lastBid = bids[lastBidIndex]

  // 0, 1, 2, 3
  // 0, 1, 0, 1 ← Team mod will be the same for partners based on index.
  const teamMod = lastBidIndex % 2

  const suit = lastBid.suit
  const firstSuitBidIndex = bids.findIndex((bid, index) => {
    if (index % 2 !== teamMod) return false
    if (bid.suit === suit) return true
  })
  // If opener (0) wins, then that's 1 from the dealer.
  // If dealer (3) wins, then that's 0 from the dealer.
  // So add 1 to get declarer.
  const declarerIndex = (firstSuitBidIndex + 1) % 4

  return createContract(
    lastBid.suit,
    lastBid.level,
    redoubled
      ? CONTRACT_TYPES.REDOUBLED
      : doubled
      ? CONTRACT_TYPES.DOUBLED
      : CONTRACT_TYPES.NORMAL,
    declarerIndex
  )
}
const PASS = createBid(BID_TYPES.PASS)
const DOUBLE = createBid(BID_TYPES.DOUBLE)
const REDOUBLE = createBid(BID_TYPES.REDOUBLE)

const bidToString = bid => {
  if (bid.type === BID_TYPES.PASS) return 'Pass'
  if (bid.type === BID_TYPES.DOUBLE) return 'X'
  if (bid.type === BID_TYPES.REDOUBLE) return 'XX'
  return `${bid.level} ${SUITS[bid.suit].name}`
}

module.exports = {
  BID_TYPES,
  getContract,
  createBid,
  BID_LEVELS,
  BIDS,
  PASS,
  DOUBLE,
  REDOUBLE,
  bidToString,
}
