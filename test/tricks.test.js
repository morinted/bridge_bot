const { trickWinnerIndex } = require('../bridge/tricks')
const { createCard } = require('../bridge/deck')
const { SUITS } = require('../bridge/suits')

const club = SUITS.CLUBS.id
const heart = SUITS.HEARTS.id
const diamond = SUITS.DIAMONDS.id
const spade = SUITS.SPADES.id
const notrump = SUITS.NOTRUMP.id

test('follow-suit trick', () => {
  expect(
    trickWinnerIndex(
      [
        createCard(club, '2'),
        createCard(club, '3'),
        createCard(club, 'K'),
        createCard(club, '7'),
      ],
      notrump
    )
  ).toEqual(2)
  expect(
    trickWinnerIndex(
      [
        createCard(club, 'A'),
        createCard(club, '3'),
        createCard(club, 'K'),
        createCard(club, '7'),
      ],
      club
    )
  ).toEqual(0)
  expect(
    trickWinnerIndex(
      [
        createCard(club, '2'),
        createCard(club, '3'),
        createCard(club, '4'),
        createCard(club, 'Q'),
      ],
      heart
    )
  ).toEqual(3)
})

test('trump-in', () => {
  expect(
    trickWinnerIndex(
      [
        createCard(diamond, 'A'),
        createCard(club, 'A'),
        createCard(heart, '2'),
        createCard(spade, 'A'),
      ],
      heart
    )
  ).toEqual(2)
  expect(
    trickWinnerIndex(
      [
        createCard(diamond, 'A'),
        createCard(club, 'A'),
        createCard(heart, '2'),
        createCard(heart, '3'),
      ],
      heart
    )
  ).toEqual(3)
})

test('no trumps', () => {
  expect(
    trickWinnerIndex(
      [
        createCard(diamond, 'A'),
        createCard(club, 'A'),
        createCard(heart, '2'),
        createCard(spade, 'A'),
      ],
      notrump
    )
  ).toEqual(0)

  expect(
    trickWinnerIndex(
      [
        createCard(diamond, '7'),
        createCard(club, 'A'),
        createCard(spade, '2'),
        createCard(spade, 'A'),
      ],
      heart
    )
  ).toEqual(0)
})

test('all trumps', () => {
  expect(
    trickWinnerIndex(
      [
        createCard(diamond, '7'),
        createCard(diamond, '2'),
        createCard(diamond, '8'),
        createCard(diamond, '3'),
      ],
      diamond
    )
  ).toEqual(2)
})
