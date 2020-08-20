# Bridge Bot for Slack

Play the card game Bridge on Slack.

## How it works

- Type "deal @three @other @players"
- Everyone is DM'd a hand
- Bridge bot will reply to your deal message with common information
- Bidding happens through buttons in your DMs
- Bid is shown in common thread
- Once play has started, users will have DM buttons for playable cards
- Current trick and dummy's hand will be shown in thread
- Upon game end, bot tallies how much over/under the declarers are
- Full hands are revealed

## Setup

1. Clone repo
2. `npm install`
3. Populate `.env` with credentials
4. `npm start`
