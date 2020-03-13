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

const createBid = (type, level = null) => {
  if (level) {
    if (type !== BID_TYPES.BID) {
      throw new Error('do not provide level when type is bid')
    }
    if (!(level in BID_LEVELS)) {
      throw new Error('not a valid level ' + level)
    }
  }
  return {
    type, level
  }
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

  const lastBidIndex = bids.length - 4
  const lastBid = bids[lastBidIndex]
  if (lastBid.type === BID_TYPES.REDOUBLE) {

  }
}

module.exports = { BID_TYPES }
