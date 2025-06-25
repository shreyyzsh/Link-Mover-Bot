# Discord Link Mover Bot

A Discord bot that finds Spotify and YouTube links in threads and moves them to another thread with proper embeds.

## Features

- Finds Spotify and YouTube links in any thread
- Moves links to a target thread with rich embeds
- Shows original message information (author, timestamp, source channel)
- Supports both YouTube and Spotify link detection
- Rate limiting protection
- Permission checking

## Setup

1. **Create a Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application" and give it a name
   - Go to the "Bot" section and click "Add Bot"
   - Copy the bot token

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Replace `your_discord_bot_token_here` with your actual bot token

4. **Bot Permissions**
   - In the Discord Developer Portal, go to OAuth2 > URL Generator
   - Select "bot" scope
   - Select these permissions:
     - Read Messages/View Channels
     - Send Messages
     - Embed Links
     - Read Message History
     - Manage Messages (needed to delete original messages)
   - Use the generated URL to invite the bot to your server

## Usage

The bot responds to the `!movelink` command:

```
!movelink <source_thread_id> <target_thread_id> [count]
```

- `source_thread_id`: The ID of the thread to search for links
- `target_thread_id`: The ID of the thread to move links to
- `count`: Optional number of links to move (default: 25, max: 5000)

### Examples

```bash
# Move 25 links (default) from one thread to another
!movelink 1234567890123456789 9876543210987654321

# Move 100 links
!movelink 1234567890123456789 9876543210987654321 100

# Move maximum 5000 links
!movelink 1234567890123456789 9876543210987654321 5000
```

### Getting Thread IDs

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on a thread and select "Copy ID"

## How It Works

1. The bot searches through the message history of the source thread
2. It finds all Spotify and YouTube links using regex patterns
3. For each link found, it creates a rich embed with:
   - Link preview (YouTube thumbnail or Spotify card)
   - Original author and timestamp
   - Source channel information
4. Links are posted to the target thread with both the raw URL (for Discord's native embed) and custom embed

## Running the Bot

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Supported Link Formats

### YouTube
- `https://youtube.com/watch?v=...`
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`

### Spotify
- `https://open.spotify.com/track/...`
- `https://open.spotify.com/album/...`
- `https://open.spotify.com/playlist/...`
- `https://spotify.com/track/...` (without 'open')

## Rate Limiting

The bot includes balanced rate limiting for optimal performance:
- 1.5 second delay between posting links (fast but safe)
- 1.5 second delay between message deletions  
- Maximum 5000 links per command
- Searches up to 50,000 messages to find the requested number of links

## Time Estimates

- **25 links**: ~1 minute total
- **100 links**: ~4 minutes total  
- **500 links**: ~20 minutes total
- **1000 links**: ~40 minutes total
- **5000 links**: ~3.5 hours total

The bot handles various error conditions:
- Invalid thread IDs
- Missing permissions
- Network errors
- Rate limiting from Discord API

## License

MIT License