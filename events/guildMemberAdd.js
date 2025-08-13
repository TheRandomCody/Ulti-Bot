// events/guildMemberAdd.js
const { Events } = require('discord.js');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Ask the backend what to do with this new member
            const response = await axios.post('https://api.ulti-bot.com/api/bot/member-join', 
            {
                guildId: member.guild.id,
                userId: member.id
            },
            {
                headers: { 'Authorization': `Bot ${BOT_TOKEN}` }
            });

            const { action, reason, rolesToAdd } = response.data;

            switch (action) {
                case 'kick':
                    await member.kick(reason);
                    console.log(`Kicked ${member.user.tag} from ${member.guild.name}. Reason: ${reason}`);
                    break;
                
                case 'ban':
                    await member.ban({ reason: reason });
                    console.log(`Banned ${member.user.tag} from ${member.guild.name}. Reason: ${reason}`);
                    break;

                case 'give_role':
                    if (rolesToAdd && rolesToAdd.length > 0) {
                        for (const roleId of rolesToAdd) {
                            const role = member.guild.roles.cache.get(roleId);
                            if (role) {
                                await member.roles.add(role);
                            }
                        }
                        console.log(`Gave role(s) to ${member.user.tag} in ${member.guild.name}.`);
                    }
                    break;

                case 'none':
                default:
                    console.log(`Took no action for ${member.user.tag} joining ${member.guild.name}.`);
                    break;
            }

        } catch (error) {
            console.error(`Failed to process new member ${member.user.tag} in guild ${member.guild.id}:`, error.response ? error.response.data : error.message);
        }
    },
};
