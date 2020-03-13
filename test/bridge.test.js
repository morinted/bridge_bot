const { startGame, getPossibleBids } = require('../bridge/bridge')

test('see if game is startable with default state', () => {
  expect(startGame('one', 'two', 'three', 'four')).toEqual({})
})
