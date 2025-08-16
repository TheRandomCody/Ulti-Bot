// File: bot.js
// The main file for the Discord bot application.

// --- 1. SETUP & IMPORTS ---
require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const axios = require('axios');

const { BOT_TOKEN, BACKEND_API_URL, CLIENT_SECRET } = process.env;

// *** DEBUGGING STEP: Print the environment variable to the logs ***
console.log('--- Bot Starting ---');
console.log('API URL being used:', BACKEND_API_URL);
console.log('--------------------');


// --- 2. CONFIGURE AXIOS FOR API CALLS ---
// Create a reusable axios instance to communicate with our backend.
const api = axios.create({
    baseURL: BACKEND_API_URL,
    headers: {
        'Authorization': `Bot ${CLIENT_SECRET}`, // Using CLIENT_SECRET as requested
        'Content-Type': 'application/json'
    }
});

// --- 3. DISCORD CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // Required to receive server-related events
    ]
});

// --- 4. EVENT LISTENERS (The Failsafe System) ---

// Event: 'ready' - Fires once when the bot successfully logs in.
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ Logged in as ${readyClient.user.tag}`);
    console.log('🔄 Performing initial server sync...');

    try {
        // Get a list of all servers the bot is currently in.
        const guilds = await readyClient.guilds.fetch();

        // Use a loop to sync each server one by one.
        for (const [id, oauth2Guild] of guilds) {
            try {
                const guild = await oauth2Guild.fetch(); // Fetch full guild object to get ownerId
                await api.post('/api/servers/sync', {
                    serverId: guild.id,
                    ownerId: guild.ownerId
                });
                console.log(`   - Synced server: ${guild.name} (${guild.id})`);
            } catch (syncError) {
                console.error(`   - Failed to sync server ${id}:`, syncError.response ? syncError.response.data : syncError.message);
            }
        }
        console.log('✅ Initial server sync complete.');

    } catch (error) {
        console.error('❌ Could not perform initial server sync:', error);
    }
});

// Event: 'guildCreate' - Fires when the bot joins a new server.
client.on(Events.GuildCreate, async (guild) => {
    console.log(`👋 Joined a new server: ${guild.name} (${guild.id})`);
    try {
        await api.post('/api/servers/sync', {
            serverId: guild.id,
            ownerId: guild.ownerId
        });
        console.log(`   - Successfully registered ${guild.name} in the database.`);
    } catch (error) {
        console.error(`   - Failed to register ${guild.name}:`, error.response ? error.response.data : error.message);
    }
});

// Event: 'guildDelete' - Fires when the bot is removed from a server.
client.on(Events.GuildDelete, async (guild) => {
    console.log(`😢 Left a server: ${guild.name} (${guild.id})`);
    try {
        await api.delete(`/api/servers/${guild.id}/sync`);
        console.log(`   - Successfully removed ${guild.name} from the database.`);
    } catch (error) {
        console.error(`   - Failed to remove ${guild.name}:`, error.response ? error.response.data : error.message);
    }
});

// Event: 'messageCreate' - Fires every time a message is sent.
// This is the entry point for the leveling system.
client.on(Events.MessageCreate, async (message) => {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Pass the message to the leveling handler
    await handleMessageXP(message, api, client.cooldowns);
});

// --- 5. LOGIN ---
client.login(BOT_TOKEN);