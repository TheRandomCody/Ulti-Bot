// commands/status.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Displays detailed information about the bot.'),
    async execute(interaction) {
        // Send an initial reply to measure response time
        const sent = await interaction.reply({ content: 'Fetching status...', fetchReply: true, ephemeral: true });

        // Calculate Uptime
        const uptime = interaction.client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor(uptime / 3600000) % 24;
        const minutes = Math.floor(uptime / 60000) % 60;
        const seconds = Math.floor(uptime / 1000) % 60;
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Create the embed with all the status information
        const statusEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Ulti-Bot Status')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: 'API Latency', value: `\`${interaction.client.ws.ping}ms\``, inline: true },
                { name: 'Response Time', value: `\`${sent.createdTimestamp - interaction.createdTimestamp}ms\``, inline: true },
                { name: 'Uptime', value: `\`${uptimeString}\``, inline: true },
                { name: 'Last Restart', value: `<t:${Math.floor(interaction.client.readyTimestamp / 1000)}:R>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Ulti-Bot | Status' });

        // Edit the original reply to show the detailed embed
        await interaction.editReply({ content: '', embeds: [statusEmbed] });
    },
};
