const { compareSuits } = require('../bridge/suits')

test('sort suits', () => {
  expect(compareSuits('HEARTS', 'SPADES')).toBeLessThan(0)
})
