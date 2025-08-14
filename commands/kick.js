// commands/kick.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option => option.setName('target').setDescription('The member to kick').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('The reason for the kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const targetMember = await interaction.guild.members.fetch(target.id);

        const apiUrl = `https://api.ulti-bot.com/api/bot/guild/${interaction.guild.id}/check-permissions`;

        try {
            console.log(`[DEBUG] Attempting to call API: ${apiUrl}`);
            const response = await axios.post(apiUrl, {
                userRoles: Array.from(member.roles.cache.keys()),
                commandName: 'kick'
            }, {
                headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
            });
            console.log('[DEBUG] API call successful.');

            const { permission, authLogChannelId, authRequestStyle } = response.data;

            switch (permission) {
                case 'full':
                    await kickUser(interaction, targetMember, reason);
                    break;
                case 'auth':
                    await interaction.followUp({ content: 'This action requires authorization. Request sent to senior staff.' });
                    break;
                case 'none':
                    await interaction.followUp({ content: "You do not have permission to use this command." });
                    break;
                case 'use_default':
                    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
                         return interaction.followUp({ content: 'You do not have the default Discord permission to kick members.' });
                    }
                    await kickUser(interaction, targetMember, reason);
                    break;
                default:
                    await interaction.followUp({ content: 'Could not determine your permissions.' });
            }
        } catch (error) {
            // This new, more detailed logging will tell us exactly what is failing.
            console.error("--- PERMISSION CHECK API CALL FAILED ---");
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error("Data:", error.response.data);
                console.error("Status:", error.response.status);
                console.error("Headers:", error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error("Request:", error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error Message:', error.message);
            }
            console.error("Config:", error.config);
            console.error("------------------------------------");
            await interaction.followUp({ content: 'An error occurred while checking your permissions. Please check the bot logs for details.' });
        }
    },
};

async function kickUser(interaction, targetMember, reason) {
    if (!targetMember) {
        return interaction.followUp({ content: "That user isn't in this server." });
    }
    if (!targetMember.kickable) {
        return interaction.followUp({ content: "I can't kick that user." });
    }

    try {
        await targetMember.kick(reason);
        await interaction.followUp({ content: `Successfully kicked ${targetMember.user.tag} for reason: ${reason}` });
    } catch (error) {
        console.error("Failed to kick member:", error);
        await interaction.followUp({ content: 'An error occurred while trying to kick this member.' });
    }
}