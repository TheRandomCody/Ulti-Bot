// The base XP required for level 1
const BASE_XP = 100;
// The percentage increase for each subsequent level
const XP_INCREASE_PERCENTAGE = 0.15; // 15%

/**
 * Calculates the total XP required to reach a specific level.
 * @param {number} level The target level.
 * @returns {number} The total XP needed to reach that level.
 */
function getXpForLevel(level) {
    if (level <= 0) return 0;

    let xpNeeded = BASE_XP;
    for (let i = 1; i < level; i++) {
        xpNeeded += xpNeeded * XP_INCREASE_PERCENTAGE;
    }
    return Math.floor(xpNeeded);
}

/**
 * Determines a user's current level based on their total XP.
 * @param {number} xp The user's total XP.
 * @returns {number} The user's current level.
 */
function getLevelForXp(xp) {
    if (xp < BASE_XP) return 0;

    let level = 0;
    let xpForNextLevel = BASE_XP;

    while (xp >= xpForNextLevel) {
        xp -= xpForNextLevel;
        level++;
        xpForNextLevel += xpForNextLevel * XP_INCREASE_PERCENTAGE;
    }
    return level;
}

module.exports = { getXpForLevel, getLevelForXp };