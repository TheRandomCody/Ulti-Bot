// File: modules/leveling.js
// NEW FILE: Contains all logic for the leveling system.

const { EmbedBuilder } = require('discord.js');

// A local cache to store server settings to avoid constant API calls
const settingsCache = new Map();

// Function to get server settings from cache or fetch from API
async function getSettings(api, serverId) {
    if (settingsCache.has(serverId)) {
        return settingsCache.get(serverId);
    }
    try {
        const response = await api.get(`/api/servers/${serverId}`);
        const settings = response.data.modules.leveling;
        // Cache the settings for 5 minutes
        settingsCache.set(serverId, settings);
        setTimeout(() => settingsCache.delete(serverId), 5 * 60 * 1000);
        return settings;
    } catch (error) {
        console.error(`[Leveling] Could not fetch settings for server ${serverId}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// The main handler for processing messages for XP
async function handleMessageXP(message, api, cooldowns) {
    const { guild, author, channel } = message;

    // 1. Fetch settings for this server
    const settings = await getSettings(api, guild.id);
    if (!settings || !settings.enabled) {
        return; // Leveling is disabled in this server
    }

    // 2. Check for ignored roles
    if (settings.ignoredRoles && settings.ignoredRoles.some(roleId => message.member.roles.cache.has(roleId))) {
        return; // User has an ignored role
    }

    // 3. Check for cooldown
    const cooldownKey = `${guild.id}-${author.id}`;
    if (cooldowns.has(cooldownKey)) {
        return; // User is on cooldown
    }

    // 4. Add XP
    try {
        // This is a bot-only endpoint we will need to create on the backend
        const response = await api.post(`/api/servers/${guild.id}/users/${author.id}/add-xp`, {
            amount: settings.xpPerMessage
        });

        const { leveledUp, newLevel, newXp, oldLevel } = response.data;

        // 5. Handle Level Up
        if (leveledUp) {
            await handleLevelUp(message, settings, newLevel, guild);
        }

        // 6. Set cooldown
        cooldowns.set(cooldownKey, Date.now());
        setTimeout(() => cooldowns.delete(cooldownKey), settings.xpCooldownSeconds * 1000);

    } catch (error) {
        console.error(`[Leveling] Error adding XP for ${author.tag}:`, error.response ? error.response.data : error.message);
    }
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