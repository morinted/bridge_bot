const { chunk, isEqual, uniq } = require('lodash')
const { bidToString } = require('../bridge/bidding')
const {
  startGame,
  playerHandForMessage,
  getPossibleBids,
  getPossibleCards,
  PHASES,
} = require('../bridge/bridge')
const { cardToString } = require('../bridge/deck')
const { contractToString } = require('../bridge/contracts')

module.exports = function(controller) {
  let state,
    layCard,
    makeBid,
    playerMessages,
    threadMessage,
    players,
    bidMessage,
    trickMessage,
    bidTexts,
    trickTexts,
    handSummary

  const getInteractiveHandMessage = player => {
    const isDeclarer = player === state.declarer

    const leading =
      state.phase === PHASES.FIRST_LEAD || state.phase === PHASES.TRICK_WON
    const following = state.phase === PHASES.TRICK
    const isPlayerTurn =
      (isDeclarer && state.turn === state.dummy) || state.turn === player

    const trickHintText = isPlayerTurn
      ? leading
        ? '\n\n*Select a card to lead*'
        : following
        ? '\n\n_You are following a trick_'
        : ''
      : ''

    const textToSend =
      playerHandForMessage(player, state) +
      (isDeclarer && state.turn === state.dummy
        ? '\n\n*Play from dummy.*'
        : '') +
      trickHintText
    const actions = [
      ...bidActions(player, state),
      ...cardActions(player, state),
      ...(isDeclarer ? cardActions(state.dummy, state) : []),
    ]
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: textToSend,
          },
        },
        ...actions,
      ],
    }
  }

  const updatePlayerHands = async bot => {
    for (player of players) {
      // Dummy does not play.
      if (player === state.dummy) continue
      const targetPlayer = player === state.dummy ? state.declarer : player
      const handMessage = getInteractiveHandMessage(targetPlayer)

      if (!playerMessages[player] || handMessage.blocks.length > 1) {
        await bot.startPrivateConversation(player)
        const sent = await bot.say(handMessage)
        if (playerMessages[player]) {
          // We delete the old message when providing actions.
          await bot.deleteMessage(playerMessages[player])
        }
        playerMessages[player] = sent
      }
    }
  }

  const bidActions = (player, state) => {
    if (state.turn !== player) return []
    const bids = getPossibleBids(state)
    return chunk(bids.slice(0, 20).map(bidToButton), 5).map(buttons => ({
      type: 'actions',
      elements: buttons,
    }))
  }

  const bidToButton = bid => ({
    type: 'button',
    text: {
      type: 'plain_text',
      text: bidToString(bid),
    },
    value: JSON.stringify(bid),
  })

  const cardActions = (player, state) => {
    if (state.turn !== player) return []
    const cards = getPossibleCards(state)
    return chunk(cards.map(cardToButton), 5).map(buttons => ({
      type: 'actions',
      elements: buttons,
    }))
  }

  const cardToButton = card => ({
    type: 'button',
    text: {
      type: 'plain_text',
      emoji: true,
      text: cardToString(card),
    },
    value: JSON.stringify(card),
  })

  controller.hears('deal', 'message', async (bot, message) => {
    if (!message.text.startsWith('deal ')) return
    // Game ongoing
    if (state) return
    const dealer = message.user
    let mentionedPlayers
    try {
      if (message.text.split(' ').length !== 4) {
        throw new Error('wrong number of words')
      }
      mentionedPlayers = message.text
        .trim()
        .split('deal ')[1]
        .split(' ')
        .map(mention => {
          if (!mention.startsWith('<@')) {
            throw new Error('not a mention')
          } else if (!mention.endsWith('>')) {
            throw new Error('unclosed mention')
          }
          const [id, name] = mention.substring(2, mention.length - 1).split('|')
          return { id, name }
        })
        .map(({ id }) => id)
      if (uniq([dealer, ...mentionedPlayers]).length !== 4) {
        throw new Error('not enough players mentioned for a game')
      }
    } catch (e) {
      await bot.reply(
        message,
        'You have to mention the three other players to deal a hand.'
      )
      return
    }

    bidTexts = []
    trickTexts = []
    threadMessage = message
    bidMessage = null
    trickMessage = null
    playerMessages = {}

    players = [dealer, ...mentionedPlayers]
    ;({ state, makeBid } = startGame(...players))

    handSummary = players.map(player =>
      `\n<@${player}>:\n${playerHandForMessage(player, state)}`
    ).join('\n')
    await bot.replyInThread(
      message,
      `Welcome to the game. Dealer is <@${dealer}>, partner is <@${players[2]}>. Opposing is <@${players[1]}> and <@${players[3]}>. <@${state.turn}> has first bid.`
    )
    await updatePlayerHands(bot)
  })

  controller.on('block_actions', async (bot, message) => {
    const trickMessageStats = () =>
      `${
        state.declarerTricks ? `*Declarer Tricks:* ${state.declarerTricks}` : ''
      }\n${
        state.opponentTricks ? `*Opponent Tricks:* ${state.opponentTricks}` : ''
      }\n\n*Dummy:*\n${playerHandForMessage(state.dummy, state)}\n\n`

    if (state.phase === PHASES.BID) {
      // Clear out buttons once a selection has been made.
      await bot.replyInteractive(
        message,
        playerHandForMessage(state.turn, state)
      )
      const bid = JSON.parse(
        message.incoming_message.channelData.actions[0].value
      )
      const bidText = `<@${state.turn}>: ${bidToString(bid)}`
      bidTexts.push(bidText)
      ;({ state, layCard, makeBid } = makeBid(bid))

      if (state.phase === PHASES.FIRST_LEAD) {
        bidTexts.push(
          `*${contractToString(state.contract)}* declared by <@${
            state.declarer
          }>, first lead <@${state.turn}>`
        )
      }
      if (bidMessage) {
        await bot.updateMessage({
          text: bidTexts.join('\n'),
          ...bidMessage,
        })
      } else {
        await bot.startConversationInThread(
          threadMessage.channel,
          threadMessage.user,
          threadMessage.ts
        )
        bidMessage = await bot.say(bidText)
      }
      await updatePlayerHands(bot)
    } else if (
      [PHASES.FIRST_LEAD, PHASES.TRICK, PHASES.TRICK_WON].some(
        phase => phase === state.phase
      )
    ) {
      if (state.phase === PHASES.TRICK_WON) {
        trickTexts = []
      }
      const card = JSON.parse(
        message.incoming_message.channelData.actions[0].value
      )
      if (
        getPossibleCards(state).every(
          playableCard => !isEqual(playableCard, card)
        )
      ) {
        return // Impossible play, just ignore.
      }
      const getDummyNote = () => (state.turn === state.dummy ? '(Dummy) ' : '')
      const cardText = `<@${state.turn}>: ${cardToString(
        card
      )} ${getDummyNote()}`
      const player = state.turn
      ;({ state, layCard } = layCard(card))
      // Clear out buttons once card has been played
      const targetPlayer = player === state.dummy ? state.declarer : player
      const handMessage = getInteractiveHandMessage(targetPlayer)
      await bot.replyInteractive(message, handMessage)
      trickTexts.push(cardText)
      if (state.phase === PHASES.TRICK_WON) {
        trickTexts.push(`<@${state.turn}> ${getDummyNote()}wins.`)
      }

      if (state.phase === PHASES.RESULT) {
        const winners = state.contractResult >= 0 ? 'Declarers' : 'Opponents'
        const overUnder = state.contractResult >= 0 ? 'Over' : 'Under'
        trickTexts.push(
          '',
          `${winners} win.${
            state.contractResult
              ? ` ${Math.abs(state.contractResult)} ${overUnder}!`
              : ''
          }`
        )
        trickTexts.push(handSummary)
      }
      if (trickMessage) {
        await bot.updateMessage({
          text: trickMessageStats() + trickTexts.join('\n'),
          ...trickMessage,
        })
      } else {
        await bot.startConversationInThread(
          threadMessage.channel,
          threadMessage.user,
          threadMessage.ts
        )
        trickMessage = await bot.say(trickMessageStats() + cardText)
      }
      if (handMessage.blocks.length === 1) {
        // Update player hands unless the last player is going again.
        await updatePlayerHands(bot)
      }
      if (state.phase === PHASES.RESULT) {
        state = null
      }
    }
  })
}
