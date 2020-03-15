const { SUITS, compareSuits } = require('./suits')
const { compareRanks, compareCards } = require('./deck')

const trickWinnerIndex = ([lead, second, third, fourth], trumpId) => {
  const leadSuitId = lead.suitId
  const useTrump = leadSuitId !== trumpId && trumpId !== SUITS.NOTRUMP.id // Possible for players to trump.

  const isTrump = card => card.suitId === trumpId

  const winner = [lead, second, third, fourth].reduce((winner, challenge) => {
    // Check trump, if applicable.
    if (useTrump) {
      if (isTrump(challenge) && isTrump(winner)) {
        return [challenge, winner].sort(compareCards)[1]
      } else if (isTrump(challenge)) {
        return challenge
      } else if (isTrump(winner)) {
        return winner
      }
    }

    // Check for lay-off of other suit.
    const challengeSuitId = challenge.suitId
    if (leadSuitId !== challengeSuitId) {
      return winner
    }

    // Compare rank.
    return [winner, challenge].sort((a, b) => compareRanks(a.rank, b.rank))[1]
  })

  return [lead, second, third, fourth].indexOf(winner)
}

module.exports = { trickWinnerIndex }
