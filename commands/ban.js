const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// This should be stored securely as an environment variable in Render
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
                    // User has full permission, proceed with the ban
                    await banUser(interaction, targetMember, reason);
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
                    if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
                         return interaction.reply({ content: 'You do not have the default Discord permission to ban members.', ephemeral: true });
                    }
                    await banUser(interaction, targetMember, reason);
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

// Helper function to handle the actual ban logic
async function banUser(interaction, targetMember, reason) {
    if (!targetMember) {
        return interaction.reply({ content: "That user isn't in this server.", ephemeral: true });
    }
    if (!targetMember.bannable) {
        return interaction.reply({ content: "I can't ban that user. They may have a higher role than me.", ephemeral: true });
    }

    try {
        await targetMember.ban({ reason: reason });
        await interaction.reply({ content: `Successfully banned ${targetMember.user.tag} for reason: ${reason}` });
    } catch (error) {
        console.error("Failed to ban member:", error);
        await interaction.reply({ content: 'An error occurred while trying to ban this member.', ephemeral: true });
    }
}
