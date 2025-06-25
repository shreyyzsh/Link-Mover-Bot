const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Regex patterns for Spotify and YouTube links
const SPOTIFY_REGEX = /https?:\/\/(open\.)?spotify\.com\/[^\s]+/gi;
const YOUTUBE_REGEX = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/gi;

// Function to extract video ID from YouTube URL
function getYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Function to extract Spotify track/album/playlist ID and type
function getSpotifyInfo(url) {
    const regex = /spotify\.com\/(track|album|playlist)\/([^?&\s]+)/;
    const match = url.match(regex);
    return match ? { type: match[1], id: match[2] } : null;
}

// Function to create YouTube embed
function createYouTubeEmbed(url, messageInfo) {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🎵 YouTube Link')
        .setURL(url)
        .setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
        .addFields([
            { name: 'Original Message', value: `By ${messageInfo.author} in ${messageInfo.channel}`, inline: true },
            { name: 'Posted', value: `<t:${Math.floor(messageInfo.timestamp / 1000)}:R>`, inline: true }
        ]);

    return embed;
}

// Function to create Spotify embed
function createSpotifyEmbed(url, messageInfo) {
    const spotifyInfo = getSpotifyInfo(url);
    if (!spotifyInfo) return null;

    const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setTitle(`🎵 Spotify ${spotifyInfo.type.charAt(0).toUpperCase() + spotifyInfo.type.slice(1)}`)
        .setURL(url)
        .addFields([
            { name: 'Original Message', value: `By ${messageInfo.author} in ${messageInfo.channel}`, inline: true },
            { name: 'Posted', value: `<t:${Math.floor(messageInfo.timestamp / 1000)}:R>`, inline: true }
        ]);

    return embed;
}

// Function to find all links in a thread
async function findLinksInThread(thread, count = 100) {
    const links = [];
    let lastMessageId;
    let messagesProcessed = 0;
    const maxMessages = Math.min(count * 20, 50000); // Search more messages than requested to find enough links

    try {
        while (messagesProcessed < maxMessages) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const messages = await thread.messages.fetch(options);
            if (messages.size === 0) break;

            for (const [, message] of messages) {
                messagesProcessed++;
                
                // Skip bot messages to avoid loops
                if (message.author.bot) continue;

                const content = message.content;
                const messageInfo = {
                    author: message.author.tag,
                    channel: `<#${thread.id}>`,
                    timestamp: message.createdTimestamp,
                    messageId: message.id
                };

                // Find Spotify links
                const spotifyMatches = content.match(SPOTIFY_REGEX);
                if (spotifyMatches) {
                    for (const link of spotifyMatches) {
                        links.push({
                            type: 'spotify',
                            url: link,
                            messageInfo: messageInfo
                        });
                    }
                }

                // Find YouTube links
                const youtubeMatches = content.match(YOUTUBE_REGEX);
                if (youtubeMatches) {
                    for (const link of youtubeMatches) {
                        links.push({
                            type: 'youtube',
                            url: link,
                            messageInfo: messageInfo
                        });
                    }
                }

                if (links.length >= count) break;
            }

            if (links.length >= count) break;
            lastMessageId = messages.last()?.id;
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw new Error('Failed to fetch messages from thread');
    }

    return links.slice(0, count);
}

// Command handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!movelink')) return;

    const args = message.content.split(' ');
    if (args.length < 3) {
        return message.reply('Usage: `!movelink <source_thread_id> <target_thread_id> [count]`');
    }

    const sourceThreadId = args[1];
    const targetThreadId = args[2];
    const count = parseInt(args[3]) || 10;

    if (count > 5000) {
        return message.reply('Maximum count is 5000 links per command to prevent spam.');
    }

    try {
        // Get source and target threads
        const sourceThread = await client.channels.fetch(sourceThreadId);
        const targetThread = await client.channels.fetch(targetThreadId);

        if (!sourceThread || !targetThread) {
            return message.reply('Could not find one or both threads. Make sure the IDs are correct.');
        }

        if (!sourceThread.isThread() || !targetThread.isThread()) {
            return message.reply('Both source and target must be threads.');
        }

        // Check permissions
        if (!targetThread.permissionsFor(client.user).has(['SendMessages', 'EmbedLinks'])) {
            return message.reply('I don\'t have permission to send messages or embed links in the target thread.');
        }

        await message.reply(`🔍 Searching for links in ${sourceThread.name}...`);

        // Find links in source thread
        const links = await findLinksInThread(sourceThread, count);

        if (links.length === 0) {
            return message.channel.send('No Spotify or YouTube links found in the source thread.');
        }

        await message.channel.send(`Found ${links.length} link(s). Moving to ${targetThread.name}...`);

        // Move links to target thread
        let movedCount = 0;

        for (const linkData of links) {
            try {
                let embed;
                if (linkData.type === 'spotify') {
                    embed = createSpotifyEmbed(linkData.url, linkData.messageInfo);
                } else if (linkData.type === 'youtube') {
                    embed = createYouTubeEmbed(linkData.url, linkData.messageInfo);
                }

                if (embed) {
                    await targetThread.send({ 
                        content: linkData.url, // Include raw URL for Discord's native embed
                        embeds: [embed] 
                    });
                    movedCount++;
                    
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

        await message.channel.send(`✅ Successfully moved ${movedCount} link(s) to ${targetThread.name}!`);

    } catch (error) {
        console.error('Error in movelink command:', error);
        await message.reply('An error occurred while processing the command. Please check the thread IDs and try again.');
    }
});

client.on('ready', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}`);
});

client.on('error', console.error);

// Login with bot token
client.login(process.env.DISCORD_BOT_TOKEN);