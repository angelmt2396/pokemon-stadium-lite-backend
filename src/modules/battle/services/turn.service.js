export const resolveFirstTurn = ({ challengerSpeed, defenderSpeed, challengerPlayerId, defenderPlayerId }) => {
  if (challengerSpeed >= defenderSpeed) {
    return challengerPlayerId;
  }

  return defenderPlayerId;
};
