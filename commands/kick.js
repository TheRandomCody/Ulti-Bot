const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// This should be stored securely as an environment variable in Render
const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for the kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const targetMember = await interaction.guild.members.fetch(target.id);

        // --- PERMISSION CHECK ---
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
                    // User has full permission, proceed with the kick
                    await kickUser(interaction, targetMember, reason);
                    break;
                case 'auth':
                    // User requires authorization
                    await interaction.reply({ content: 'This action requires authorization. Request sent to senior staff.', ephemeral: true });
                    // (Future logic for the approval queue goes here)
                    break;
                case 'none':
                    // User has no permission
                    await interaction.reply({ content: "You do not have permission to use this command according to the server's staff hierarchy.", ephemeral: true });
                    return;
                case 'use_default':
                    // Hierarchy is disabled, use default Discord permissions
                    if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
                         return interaction.reply({ content: 'You do not have the default Discord permission to kick members.', ephemeral: true });
                    }
                    await kickUser(interaction, targetMember, reason);
                    break;
                default:
                    await interaction.reply({ content: 'Could not determine your permissions. Please contact the server owner.', ephemeral: true });
            }

        } catch (error) {
            console.error("Permission check API call failed:", error);
            await interaction.reply({ content: 'An error occurred while checking your permissions.', ephemeral: true });
        }
    },
};

// Helper function to handle the actual kick logic
async function kickUser(interaction, targetMember, reason) {
    if (!targetMember) {
        return interaction.reply({ content: "That user isn't in this server.", ephemeral: true });
    }
    if (!targetMember.kickable) {
        return interaction.reply({ content: "I can't kick that user. They may have a higher role than me.", ephemeral: true });
    }

    try {
        await targetMember.kick(reason);
        await interaction.reply({ content: `Successfully kicked ${targetMember.user.tag} for reason: ${reason}` });
    } catch (error) {
        console.error("Failed to kick member:", error);
        await interaction.reply({ content: 'An error occurred while trying to kick this member.', ephemeral: true });
    }
}
