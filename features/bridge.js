const { chunk, isEqual, uniq } = require('lodash')
const { bidToString } = require('../bridge/bidding')
const uuid = require('uuid').v4
const {
  startGame,
  playerHandForMessage,
  getPossibleBids,
  getPossibleCards,
  PHASES,
} = require('../bridge/bridge')
const { cardToString } = require('../bridge/deck')
const { contractToString } = require('../bridge/contracts')

const games = {}
const handledMessages = []
const createGame = (state, makeBid, threadMessage) => {
  const game = {
    state,
    layCard: null,
    makeBid,
    playerMessages: {},
    threadMessage,
    bidMessage: null,
    trickMessage: null,
    bidTexts: [],
    trickTexts: [],
    currentTrick: {},
    handSummary: '',
    incomingMessageId: threadMessage.id,
    uuid: uuid(),
  }
  games[game.uuid] = game
  return game
}

module.exports = function (controller) {
  const getInteractiveHandMessage = (player, game) => {
    const { state } = game
    const isDeclarer = player === state.declarer

    const leading =
      state.phase === PHASES.FIRST_LEAD || state.phase === PHASES.TRICK_WON
    const following = state.phase === PHASES.TRICK
    const isPlayerTurn =
      (isDeclarer && state.turn === state.dummy) || state.turn === player

    const actions = [
      ...bidActions(player, game),
      ...cardActions(player, game),
      ...(isDeclarer ? cardActions(state.dummy, game) : []),
    ]

    // When there are actions, give more context for mobile users.
    const hasActions = !!actions.length

    const contextText = !hasActions
      ? ''
      : state.phase === PHASES.BID
      ? `${game.bidTexts.join('\n')}\n\n` // Show bidding as it's been so far
      : state.phase === PHASES.FIRST_LEAD
      ? `${game.bidTexts.slice(-1)[0]}\n\n` // Display contract
      : state.phase === PHASES.TRICK || state.phase === PHASES.TRICK_WON
      ? `${getDummyHand(game)}\n\n*Trick*:\n${game.trickTexts.join(
          '\n'
        )}\n\n*Your hand:*\n` // Show dummy and current/last trick.
      : ''

    const trickHintText = isPlayerTurn
      ? leading
        ? '\n\n*Select a card to lead*'
        : following
        ? '\n\n_You are following a trick_'
        : ''
      : ''

    const textToSend =
      contextText +
      playerHandForMessage(player, game.state) +
      (isDeclarer && state.turn === state.dummy
        ? '\n\n*Play from dummy.*'
        : '') +
      trickHintText
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

  const updatePlayerHands = async (bot, game) => {
    const { state } = game
    for (let player of state.players) {
      if (state.phase === PHASES.RESULT) {
        await bot.deleteMessage(game.playerMessages[player])
        continue
      }

      // Dummy does not play.
      if (player === state.dummy) continue
      const targetPlayer = player === state.dummy ? state.declarer : player
      const handMessage = getInteractiveHandMessage(targetPlayer, game)

      if (!game.playerMessages[player] || handMessage.blocks.length > 1) {
        await bot.startPrivateConversation(player)
        const sent = await bot.say(handMessage)
        if (game.playerMessages[player]) {
          // We delete the old message when providing actions.
          await bot.deleteMessage(game.playerMessages[player])
        }
        game.playerMessages[player] = sent
      }
    }
  }

  const bidActions = (player, game) => {
    const { state } = game
    if (state.turn !== player) return []
    const bids = getPossibleBids(state)
    return chunk(
      bids.slice(0, 20).map((bid) => bidToButton(bid, game)),
      5
    ).map((buttons) => ({
      type: 'actions',
      elements: buttons,
    }))
  }

  const bidToButton = (bid, game) => ({
    type: 'button',
    text: {
      type: 'plain_text',
      text: bidToString(bid),
    },
    value: JSON.stringify({ ...bid, uuid: game.uuid }),
  })

  const cardActions = (player, game) => {
    const { state } = game
    if (state.turn !== player) return []
    const cards = getPossibleCards(state)
    return chunk(
      cards.map((card) => cardToButton(card, game)),
      5
    ).map((buttons) => ({
      type: 'actions',
      elements: buttons,
    }))
  }

  const cardToButton = (card, game) => ({
    type: 'button',
    text: {
      type: 'plain_text',
      emoji: true,
      text: cardToString(card),
    },
    value: JSON.stringify({ ...card, uuid: game.uuid }),
  })

  const getDummyHand = (game) =>
    `*Dummy:*\n${playerHandForMessage(game.state.dummy, game.state)}`

  controller.hears('deal', 'message', async (bot, message) => {
    if (!message.text.startsWith('deal ')) return
    // Log message for debug
    const incomingMessageId = message.incoming_message.id
    if (
      Object.values(games).some(
        (game) => game.incomingMessageId === incomingMessageId
      ) ||
      handledMessages.includes(incomingMessageId)
    ) {
      console.log('Ignoring duplicate game')
      return
    }
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
        .map((mention) => {
          if (!mention.startsWith('<@')) {
            throw new Error('not a mention')
          } else if (!mention.endsWith('>')) {
            throw new Error('unclosed mention')
          }
          const [id, name] = mention.substring(2, mention.length - 1).split('|')
          return { id, name }
        })
        .map(({ id }) => id)
      mentionedPlayers = uniq([dealer, ...mentionedPlayers])
      if (mentionedPlayers.length !== 4) {
        throw new Error('not enough players mentioned for a game')
      }
    } catch (e) {
      console.error(e)
      handledMessages.push(incomingMessageId)
      await bot.reply(
        message,
        'You have to mention the three other players to deal a hand.'
      )
      return
    }

    const { state, makeBid } = startGame(...mentionedPlayers)
    const game = createGame(state, makeBid, message)
    const { players } = state

    game.handSummary = game.state.players
      .map(
        (player) =>
          `\n<@${player}>:\n${playerHandForMessage(player, game.state)}`
      )
      .join('\n')
    await bot.replyInThread(
      message,
      `Welcome to the game. Dealer is <@${dealer}>, partner is <@${players[2]}>. Opposing is <@${players[1]}> and <@${players[3]}>. <@${state.turn}> has first bid.`
    )
    await updatePlayerHands(bot, game)
  })

  controller.on('block_actions', async (bot, message) => {
    const { uuid, ...payload } = JSON.parse(
      message.incoming_message.channelData.actions[0].value
    )
    const game = games[uuid]
    if (!game) {
      await bot.replyInteractive(message, 'Can not find that game, sorry.')
      return
    }
    const userId = message.incoming_message.from.id
    const canPlay = // Ensure it's the current player's turn (or the declarer playing the dummy)
      game.state.turn === userId ||
      (game.state.turn === game.state.dummy && game.state.declarer === userId)
    if (!canPlay) {
      console.error('Blocking action from', message.incoming_message.from)
      console.error('Current turn is,', game.state.turn)
      return // Impossible play -- maybe a late call?
    }

    const trickMessageStats = (game) =>
      `${
        game.state.declarerTricks
          ? `*Declarer Tricks:* ${game.state.declarerTricks}`
          : ''
      }\n${
        game.state.opponentTricks
          ? `*Opponent Tricks:* ${game.state.opponentTricks}`
          : ''
      }\n\n${getDummyHand(game)}\n\n`

    if (game.state.phase === PHASES.BID) {
      // Clear out buttons once a selection has been made.
      await bot.replyInteractive(
        message,
        playerHandForMessage(game.state.turn, game.state)
      )
      const bid = payload
      const bidText = `<@${game.state.turn}>: ${bidToString(bid)}`
      game.bidTexts.push(bidText)
      const bidMade = game.makeBid(bid)
      game.layCard = bidMade.layCard
      game.makeBid = bidMade.makeBid
      game.state = bidMade.state

      if (game.state.phase === PHASES.FIRST_LEAD) {
        game.bidTexts.push(
          `*${contractToString(game.state.contract)}* declared by <@${
            game.state.declarer
          }>, first lead <@${game.state.turn}>`
        )
      }
      const nextBidMessage =
        game.state.phase === PHASES.BID
          ? `\n_Waiting for <@${game.state.turn}>…_`
          : ''

      if (game.bidMessage) {
        await bot.updateMessage({
          text: game.bidTexts.join('\n') + nextBidMessage,
          ...game.bidMessage,
        })
      } else {
        await bot.startConversationInThread(
          game.threadMessage.channel,
          game.threadMessage.user,
          game.threadMessage.ts
        )
        game.bidMessage = await bot.say(bidText + nextBidMessage)
      }
      await updatePlayerHands(bot, game)
    } else if (
      [PHASES.FIRST_LEAD, PHASES.TRICK, PHASES.TRICK_WON].some(
        (phase) => phase === game.state.phase
      )
    ) {
      if (
        game.state.phase === PHASES.TRICK_WON ||
        game.state.phase === PHASES.FIRST_LEAD
      ) {
        game.trickTexts = []
        const players = [...game.state.players]
        const removedPlayers = players.splice(
          0,
          game.state.players.indexOf(game.state.turn)
        )
        game.currentTrick = {
          order: [...players, ...removedPlayers],
        }
      }
      const card = payload
      if (
        getPossibleCards(game.state).every(
          (playableCard) => !isEqual(playableCard, card)
        )
      ) {
        return // Impossible play, just ignore.
      }
      const getDummyNote = () =>
        game.state.turn === game.state.dummy ? '(Dummy) ' : ''
      const cardText = `<@${game.state.turn}>: ${cardToString(
        card
      )} ${getDummyNote()}`
      const player = game.state.turn
      const cardLaid = game.layCard(card)
      game.state = cardLaid.state
      game.layCard = cardLaid.layCard
      // Clear out buttons once card has been played
      const targetPlayer =
        player === game.state.dummy ? game.state.declarer : player
      // game.trickTexts.push(cardText)
      game.currentTrick[game.state.turn] = cardToString(card)
      const handMessage = getInteractiveHandMessage(targetPlayer, game)
      await bot.replyInteractive(message, handMessage)
      if (game.state.phase === PHASES.TRICK_WON) {
        game.trickTexts.push(
          `_<@${
            game.state.turn
          }> ${getDummyNote()}wins. Waiting for their lead…_`
        )
      }

      if (game.state.phase === PHASES.RESULT) {
        const winners =
          game.state.contractResult >= 0 ? 'Declarers' : 'Opponents'
        const overUnder = game.state.contractResult >= 0 ? 'Over' : 'Under'
        game.trickTexts.push(
          '',
          `${winners} win.${
            game.state.contractResult
              ? ` ${Math.abs(game.state.contractResult)} ${overUnder}!`
              : ''
          }`
        )
        game.trickTexts.unshift(game.handSummary)
      }
      const formatCurrentTrick = () =>
        game.currentTrick.order
          .map((player) => {
            return `<@${player}> ${
              player === game.state.dummy ? '(Dummy) ' : ''
            }: ${game.currentTrick[player] || ''}`
          })
          .join('\n')
      const nextTrickMessage =
        game.state.phase === PHASES.TRICK ||
        game.state.phase === PHASES.FIRST_LEAD
          ? game.state.turn === game.state.dummy
            ? `\n_Waiting for <@${game.state.declarer}> to play dummy…_`
            : `\n_Waiting for <@${game.state.turn}>…_`
          : ''

      if (game.trickMessage) {
        await bot.updateMessage({
          text:
            trickMessageStats(game) +
            formatCurrentTrick() +
            game.trickTexts.join('\n') +
            nextTrickMessage,
          ...game.trickMessage,
        })
      } else {
        await bot.startConversationInThread(
          game.threadMessage.channel,
          game.threadMessage.user,
          game.threadMessage.ts
        )
        game.trickMessage = await bot.say(trickMessageStats(game) + cardText)
      }
      if (handMessage.blocks.length === 1) {
        // Update player hands unless the last player is going again.
        await updatePlayerHands(bot, game)
      }
      if (game.state.phase === PHASES.RESULT) {
        game.state = null
      }
    }
  })
}
