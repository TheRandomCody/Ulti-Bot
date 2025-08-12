const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guildId = member.guild.id;
        const settingsApiUrl = `https://api.ulti-bot.com/api/settings/${guildId}`;

        try {
            // Fetch the verification settings for this server from your API
            const response = await axios.get(settingsApiUrl);
            const settings = response.data;

            // If verification isn't enabled for this server, do nothing.
            if (!settings || !settings.verificationChannelId || !settings.unverifiedRoleId) {
                return;
            }

            const channel = member.guild.channels.cache.get(settings.verificationChannelId);
            if (!channel) return;

            // Give the user the unverified role
            await member.roles.add(settings.unverifiedRoleId);

            // Create the verification button
            const verifyButton = new ButtonBuilder()
                .setLabel('Verify Here')
                .setURL(`https://www.ulti-bot.com/verify?id=${member.id}&guild=${guildId}`) // Pass both user and guild ID
                .setStyle(ButtonStyle.Link);

            const row = new ActionRowBuilder().addComponents(verifyButton);

            // Create the embed
            const embed = new EmbedBuilder()
                .setColor(0xE50000)
                .setTitle('Welcome to the Server!')
                .setDescription(`Hello ${member.user}, to gain access to the rest of the server, you must verify your account. Please click the button below to proceed.`)
                .setThumbnail(member.user.displayAvatarURL());

            // Send the message
            await channel.send({
                content: `Welcome, ${member}!`,
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            // If the API returns a 404, it means settings aren't configured. We can safely ignore this.
            if (error.response && error.response.status === 404) {
                console.log(`No verification settings found for guild ${guildId}.`);
            } else {
                console.error(`Failed to handle new member in guild ${guildId}:`, error);
            }
        }
    },
};
