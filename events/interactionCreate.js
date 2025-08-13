// events/interactionCreate.js
const { Events, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // We only care about button clicks
        if (!interaction.isButton()) return;

        const [action, command, moderatorId, targetId] = interaction.customId.split('_');

        if (action !== 'approve' && action !== 'deny') return;

        try {
            // First, check if the user clicking the button is authorized
            const approverMember = await interaction.guild.members.fetch(interaction.user.id);
            const response = await axios.post(`https://api.ulti-bot.com/api/guild/${interaction.guild.id}/check-permissions`, 
            {
                userId: approverMember.id,
                userRoles: Array.from(approverMember.roles.cache.keys())
            },
            {
                headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
            });

            // Only users with 'full' permissions can approve/deny requests
            if (response.data.permission !== 'full') {
                return interaction.reply({ content: "You do not have the required permissions to approve or deny this request.", ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetId);
            const originalModerator = await interaction.client.users.fetch(moderatorId);
            const originalEmbed = interaction.message.embeds[0];

            if (action === 'approve') {
                let actionVerb = '';
                if (command === 'ban') {
                    await targetMember.ban({ reason: `Approved by ${interaction.user.tag}. Original reason: ${originalEmbed.description.split('Reason: ')[1]}` });
                    actionVerb = 'banned';
                } else if (command === 'kick') {
                    await targetMember.kick(`Approved by ${interaction.user.tag}. Original reason: ${originalEmbed.description.split('Reason: ')[1]}`);
                    actionVerb = 'kicked';
                }

                // Update the original embed to show it was approved
                const approvedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(0x22C55E) // Green
                    .setTitle(`Request Approved: ${command.charAt(0).toUpperCase() + command.slice(1)}`)
                    .addFields({ name: 'Approved By', value: interaction.user.tag, inline: true });
                
                await interaction.message.edit({ embeds: [approvedEmbed], components: [] });
                await interaction.reply({ content: `You have approved the request. ${targetMember.user.tag} has been ${actionVerb}.`, ephemeral: true });
                
                // Notify the original moderator
                await originalModerator.send(`Your request to ${command} ${targetMember.user.tag} in ${interaction.guild.name} has been approved by ${interaction.user.tag}.`);

            } else if (action === 'deny') {
                // Update the original embed to show it was denied
                const deniedEmbed = EmbedBuilder.from(originalEmbed)
                    .setColor(0xEF4444) // Red
                    .setTitle(`Request Denied: ${command.charAt(0).toUpperCase() + command.slice(1)}`)
                    .addFields({ name: 'Denied By', value: interaction.user.tag, inline: true });

                await interaction.message.edit({ embeds: [deniedEmbed], components: [] });
                await interaction.reply({ content: 'You have denied the request.', ephemeral: true });

                // Notify the original moderator
                await originalModerator.send(`Your request to ${command} ${targetMember.user.tag} in ${interaction.guild.name} has been denied by ${interaction.user.tag}.`);
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            await interaction.reply({ content: 'An error occurred while processing this action.', ephemeral: true });
        }
    },
};
