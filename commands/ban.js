// commands/ban.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for the ban'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),
    async execute(interaction) {
        // Defer the reply immediately.
        await interaction.deferReply({ ephemeral: true });

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const targetMember = await interaction.guild.members.fetch(target.id);

        try {
            const response = await axios.post(`https://api.ulti-bot.com/api/guild/${interaction.guild.id}/check-permissions`, 
            {
                userId: member.id,
                userRoles: Array.from(member.roles.cache.keys())
            },
            {
                headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
            });

            const { permission } = response.data;

            switch (permission) {
                case 'full':
                    await banUser(interaction, targetMember, reason);
                    break;
                case 'auth':
                    await interaction.followUp({ content: 'This action requires authorization. Request sent to senior staff.' });
                    // (Future logic for the approval queue goes here)
                    break;
                case 'none':
                    await interaction.followUp({ content: "You do not have permission to use this command." });
                    return;
                case 'use_default':
                    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
                         return interaction.followUp({ content: 'You do not have the default Discord permission to ban members.' });
                    }
                    await banUser(interaction, targetMember, reason);
                    break;
                default:
                    await interaction.followUp({ content: 'Could not determine your permissions.' });
            }

        } catch (error) {
            console.error("Permission check API call failed:", error);
            await interaction.followUp({ content: 'An error occurred while checking your permissions.' });
        }
    },
};

// Helper function updated to use followUp
async function banUser(interaction, targetMember, reason) {
    if (!targetMember) {
        return interaction.followUp({ content: "That user isn't in this server." });
    }
    if (!targetMember.bannable) {
        return interaction.followUp({ content: "I can't ban that user." });
    }

    try {
        await targetMember.ban({ reason: reason });
        await interaction.followUp({ content: `Successfully banned ${targetMember.user.tag} for reason: ${reason}` });
    } catch (error) {
        console.error("Failed to ban member:", error);
        await interaction.followUp({ content: 'An error occurred while trying to ban this member.' });
    }
}