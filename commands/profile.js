const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Fetches a user's profile from the website.")
        .addUserOption(option => 
            option
                .setName('target')
                .setDescription('The user whose profile you want to see.')
                .setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        // This URL tells the bot to talk to your local web server
        const apiUrl = `https://ulti-dash-backend.onrender.com/api/user/${target.id}`;

        try {
            // Make a GET request to your website's API
            const response = await axios.get(apiUrl);
            const userData = response.data;

            // Create a rich embed to display the profile data
            const profileEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${userData.username}'s Profile`)
                .setThumbnail(target.displayAvatarURL())
                .addFields(
                    { name: 'Level', value: `\`${userData.level}\``, inline: true },
                    { name: 'Joined Website', value: `\`${userData.joined}\``, inline: true },
                    { name: 'Bio', value: userData.bio }
                )
                .setTimestamp()
                .setFooter({ text: 'Profile data from our website!' });

            await interaction.reply({ embeds: [profileEmbed] });

        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Handle the case where the user is not found in the website's database
                await interaction.reply({ content: `I couldn't find a website profile for ${target.username}.`, ephemeral: true });
            } else {
                // Handle other errors (e.g., the web server is down)
                console.error(error);
                await interaction.reply({ content: 'Something went wrong while fetching the profile. Is the website server running?', ephemeral: true });
            }
        }
    },
};