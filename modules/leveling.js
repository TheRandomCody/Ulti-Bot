// File: modules/leveling.js
// UPDATED: Integrated the level calculation logic.

const { EmbedBuilder } = require('discord.js');
const { getLevelForXp, getXpForLevel } = require('../utils/level-calculator');

// A local cache to store server settings to avoid constant API calls
const settingsCache = new Map();

// Function to get server settings from cache or fetch from API
async function getSettings(api, serverId) {
    if (settingsCache.has(serverId)) {
        return settingsCache.get(serverId);
    }
    try {
        // NOTE: This endpoint on the backend needs to be updated to return the full server config
        const response = await api.get(`/api/servers/${serverId}`);
        const settings = response.data.modules.leveling;
        settingsCache.set(serverId, settings);
        setTimeout(() => settingsCache.delete(serverId), 5 * 60 * 1000);
        return settings;
    } catch (error) {
        console.error(`[Leveling] Could not fetch settings for server ${serverId}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to get a user's leveling profile from the backend
async function getProfile(api, serverId, userId) {
    try {
        // NOTE: This is a new bot-only endpoint we will need to create on the backend
        const response = await api.get(`/api/servers/${serverId}/users/${userId}/leveling-profile`);
        return response.data;
    } catch (error) {
        // If user has no profile yet, return a default one
        if (error.response && error.response.status === 404) {
            return { userId, serverId, xp: 0, level: 0 };
        }
        console.error(`[Leveling] Could not fetch profile for user ${userId}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// The main handler for processing messages for XP
async function handleMessageXP(message, api, cooldowns) {
    const { guild, author } = message;

    const settings = await getSettings(api, guild.id);
    if (!settings || !settings.enabled) return;

    if (settings.ignoredRoles && settings.ignoredRoles.some(roleId => message.member.roles.cache.has(roleId))) return;

    const cooldownKey = `${guild.id}-${author.id}`;
    if (cooldowns.has(cooldownKey)) return;

    // 1. Get user's current XP profile
    const profile = await getProfile(api, guild.id, author.id);
    if (!profile) return; // Could not fetch profile

    // 2. Add new XP
    const newXp = profile.xp + settings.xpPerMessage;
    const newLevel = getLevelForXp(newXp);

    // 3. Check for level up
    if (newLevel > profile.level) {
        await handleLevelUp(message, settings, newLevel, guild);
    }

    // 4. Save new profile data to the backend
    try {
        // NOTE: This is a new bot-only endpoint we will need to create on the backend
        await api.patch(`/api/servers/${guild.id}/users/${author.id}/leveling-profile`, {
            xp: newXp,
            level: newLevel
        });
    } catch (error) {
        console.error(`[Leveling] Error saving profile for ${author.tag}:`, error.response ? error.response.data : error.message);
    }

    // 5. Set cooldown
    cooldowns.set(cooldownKey, Date.now());
    setTimeout(() => cooldowns.delete(cooldownKey), settings.xpCooldownSeconds * 1000);
}

// Function to handle the level up event
async function handleLevelUp(message, settings, newLevel, guild) {
    const { author, channel } = message;

    // 1. Send Level Up Message
    if (settings.levelUpMessage && settings.levelUpMessage.content) {
        const levelUpContent = settings.levelUpMessage.content
            .replace('{user}', author.toString())
            .replace('{level}', newLevel);

        const targetChannel = settings.levelUpChannel === 'current'
            ? channel
            : await guild.channels.fetch(settings.levelUpChannel).catch(() => null);

        if (targetChannel) {
            // TODO: Add embed logic here
            targetChannel.send(levelUpContent);
        }
    }

    // 2. Handle Role Rewards
    if (settings.roleRewards && settings.roleRewards.length > 0) {
        for (const reward of settings.roleRewards) {
            if (newLevel >= reward.level) {
                try {
                    const role = await guild.roles.fetch(reward.roleId);
                    if (role && !message.member.roles.cache.has(role.id)) {
                        await message.member.roles.add(role);
                        console.log(`[Leveling] Assigned role "${role.name}" to ${author.tag} for reaching level ${reward.level}.`);
                    }
                } catch (roleError) {
                    console.error(`[Leveling] Could not assign role reward ${reward.roleId}:`, roleError);
                }
            }
        }
    }
}


module.exports = handleMessageXP;