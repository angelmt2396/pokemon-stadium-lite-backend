export const calculateDamage = ({ attack, defense }) => {
  const baseDamage = attack - defense;
  return baseDamage < 1 ? 1 : baseDamage;
};

export const applyDamage = ({ currentHp, damage }) => {
  const nextHp = currentHp - damage;
  return nextHp < 0 ? 0 : nextHp;
};
