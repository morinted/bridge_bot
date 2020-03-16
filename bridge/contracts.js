const { SUITS } = require('./suits')
const CONTRACT_TYPES = {
  NORMAL: 'NORMAL',
  DOUBLED: 'DOUBLED',
  REDOUBLED: 'REDOUBLED',
}

const createContract = (suitId, level, type, declarerIndex) => {
  if (!(type in CONTRACT_TYPES)) {
    throw new Error('invalid contract type ' + type)
  }
  return {
    suitId,
    level,
    type,
    declarerIndex,
  }
}

const contractToString = ({ suitId, level, type }) => {
  return `${level} ${SUITS[suitId].name}${
    { NORMAL: '', DOUBLED: ', doubled', REDOUBLED: ', redoubled' }[type]
  }`
}

module.exports = { createContract, CONTRACT_TYPES, contractToString }
