const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

            const { permission, authLogChannelId, authRequestStyle } = response.data;

            switch (permission) {
                case 'full':
                    await kickUser(interaction, targetMember, reason);
                    break;
                case 'auth':
                    if (!authLogChannelId) {
                        return interaction.reply({ content: 'The authorization log channel has not been set up for this server.', ephemeral: true });
                    }
                    const authChannel = await interaction.guild.channels.fetch(authLogChannelId);
                    if (!authChannel) {
                        return interaction.reply({ content: 'The configured authorization log channel could not be found.', ephemeral: true });
                    }

                    if (authRequestStyle === 'reaction') {
                        const authMessage = await authChannel.send(`**Authorization Required: Kick**\n**Moderator:** ${interaction.user.tag}\n**Target:** ${target.tag}\n**Reason:** ${reason}`);
                        await authMessage.react('✅');
                        await authMessage.react('❌');
                    } else {
                        const authEmbed = new EmbedBuilder()
                            .setColor(0xFFD700)
                            .setTitle('Authorization Required: Kick')
                            .setDescription(`**Moderator:** ${interaction.user.tag}\n**Target:** ${target.tag}\n**Reason:** ${reason}`)
                            .setTimestamp()
                            .setFooter({ text: `Moderator ID: ${interaction.user.id} | Target ID: ${target.id}` });

                        const approveButton = new ButtonBuilder()
                            .setCustomId(`approve-kick_${interaction.user.id}_${target.id}`)
                            .setLabel('Approve')
                            .setStyle(ButtonStyle.Success);

                        const denyButton = new ButtonBuilder()
                            .setCustomId(`deny-kick_${interaction.user.id}_${target.id}`)
                            .setLabel('Deny')
                            .setStyle(ButtonStyle.Danger);
                            
                        const row = new ActionRowBuilder().addComponents(approveButton, denyButton);

                        await authChannel.send({ embeds: [authEmbed], components: [row] });
                    }
                    
                    await interaction.reply({ content: 'This action requires authorization. Your request has been sent to the staff authorization channel.', ephemeral: true });
                    break;
                case 'none':
                    await interaction.reply({ content: "You do not have permission to use this command according to the server's staff hierarchy.", ephemeral: true });
                    return;
                case 'use_default':
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
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: "That user isn't in this server.", ephemeral: true });
        }
        return interaction.reply({ content: "That user isn't in this server.", ephemeral: true });
    }
    if (!targetMember.kickable) {
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: "I can't kick that user. They may have a higher role than me.", ephemeral: true });
        }
        return interaction.reply({ content: "I can't kick that user. They may have a higher role than me.", ephemeral: true });
    }

    try {
        await targetMember.kick(reason);
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: `Successfully kicked ${targetMember.user.tag} for reason: ${reason}` });
        }
        await interaction.reply({ content: `Successfully kicked ${targetMember.user.tag} for reason: ${reason}` });
    } catch (error) {
        console.error("Failed to kick member:", error);
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: 'An error occurred while trying to kick this member.', ephemeral: true });
        }
        await interaction.reply({ content: 'An error occurred while trying to kick this member.', ephemeral: true });
    }
}
