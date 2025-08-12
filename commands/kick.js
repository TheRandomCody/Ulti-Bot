const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Select a member and kick them from the server.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('The reason for kicking the member'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false), // This command can only be used in servers
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        // Get the member object for the user who ran the command
        const member = await interaction.guild.members.fetch(interaction.user.id);

        // Get the member object for the target user
        const targetMember = await interaction.guild.members.fetch(target.id);

        if (!targetMember) {
            return interaction.reply({ content: "That user isn't in this server.", ephemeral: true });
        }

        if (!targetMember.kickable) {
            return interaction.reply({ content: "I can't kick that user. They may have a higher role than me.", ephemeral: true });
        }
        
        if (targetMember.roles.highest.position >= member.roles.highest.position) {
             return interaction.reply({ content: "You can't kick a member with an equal or higher role than you.", ephemeral: true });
        }

        await targetMember.kick(reason);

        await interaction.reply({ content: `Kicked ${target.username} for reason: ${reason}` });
    },
};
