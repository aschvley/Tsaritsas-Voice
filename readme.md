# 🚀 Tsaritsa's Voice - XP Bot

✨ A Fatui-themed level system bot for Discord, designed to bring personality, progression, and immersive style to your Genshin Impact-inspired server. ✨
[![Ver Documentación en Inglés](https://deepwiki.com/badge.svg)](https://deepwiki.com/aschvley/Tsaritsas-Voice/1-overview)

## 🛠️ Technologies Used

- 💻 Main Programming Language: JavaScript (Node.js)
- ⚛️ Framework/Library: Discord.js
- 💾 Database: MongoDB (hosted via Railway)
- ⚙️ Other Tools: dotenv, Railway, MongoDB Compass (recommended for GUI access)

## ⚙️ How to Use It

Follow these steps to host and run Tsaritsa's Voice locally:

### 1. 📦 Install Node.js
Make sure Node.js is installed. You can download it from [nodejs.org](https://nodejs.org).

### 2. 📂 Clone the Repository

	git clone [your_repository_url]
	cd [your-project-folder]
 
### 3. 📦 Install Dependencies

	npm install
 
### 4.  🛠️ Configure the Environment
#### 1 Copy .env.example and rename it to .env.
#### 2 Fill in the required values:

	DISCORD_CLIENT_ID
	DISCORD_CLIENT_SECRET
	DISCORD_TOKEN
	MONGO_DB_URI (from Railway or MongoDB Atlas)
 
### 5. ⚙️ Configure the Bot
Open config.json and:
```
	Add your server ID to test_server_ids
	Add your Discord user ID to developer_ids
	Set lockBotToDevOnly to true if you're testing locally
	Optionally, set siteURL, supportURL, changelogURL
```
### 6. ▶️ Run the Bot

 	node polaris.js
  
If the bot appears online, it’s working!

### 7 🌐 Deploy Commands
Use the /deploy command in Discord with the global argument set to true.

## 📂 Project Structure

```
TsaritsasVoice/
├── 📂 app/                # Core application logic (e.g., event handlers, bot functions)
├── 📂 classes/            # Custom class definitions used throughout the bot
├── 📂 commands/           # Command modules for the Discord bot
├── 📂 json/               # Static JSON files used for configuration, responses, etc.
├── 📂 node_modules/       # Node.js dependencies (auto-generated)
│
├── 📄 .env                # Environment variables (DO NOT SHARE)
├── 📄 .env.example        # Example file showing expected environment variables
├── 📄 .gitattributes      # Git configuration for attributes like text encoding
├── 📄 .gitignore          # Specifies files and directories Git should ignore
│
├── 📄 auto_responses.json # Predefined automatic bot responses
├── 📄 config.json         # General bot configuration (prefixes, tokens, etc.)
├── 📄 database_schema.js  # MongoDB schema definitions or setup
├── 📄 Dockerfile          # Docker container configuration
├── 📄 index.js            # Legacy or secondary entry point (can be deprecated)
├── 📄 LICENSE             # Open source license for the project
├── 📄 nixpacks.toml       # Nixpacks build configuration (for deployment)
├── 📄 package.json        # Project metadata and dependency list
├── 📄 package-lock.json   # Locked versions of installed dependencies
├── 📄 polaris.code-workspace # VS Code workspace config file
├── 📄 polaris.js          # ✅ Main entry point for launching the bot
├── 📄 readme.md           # You're reading this! Overview and setup instructions
├── 📄 web_app.js          # Web-related app logic

```

## ✨ Main Features
- ✅ Autoresponders to mentions (general and user-specific)
- ⭐ /qotd command to set the question of the day
- 💡 /help command with stylish embed help menu
- 🛠️ Developer-only commands (/dev_*, /sync, /config)
- 📈 XP system with multipliers and role rewards
  
  ``` 
	/addxp for manual XP addition
	/rank to see your current XP and level
	/top for the leaderboard
	/rewardrole and /sync for role-based XP rewards
	/multiplier to set XP multipliers
  ```
  
- 🔧 Developer & Config Tools

  ```
	/dev_* commands (run, deploy, setversion, setactivity, etc.)
	/config to tweak XP settings
	/clear to remove cooldowns
	/botstatus for bot state
  ```
  
- 💬 Embed announcements with custom branding
- ⛓️ MongoDB integration for persistent server and user data

## ⏭️ Next Steps
- ⚡ Implement Fatui Masquerade Week mechanics:
	Harbinger Team assignment
	Daily point tracking and missions
	Secret traitor/reward events
	Lore-based announcements and mini-RP tools
- 🎯 Add leaderboard UI to the web dashboard
- 🔮 Create command aliases for style and flavor (e.g., /obey, /hergrace)

## 👤 Author
Created by: ashcvley
Discord: ashcvley
Project Name: Tsaritsa's Voice
> “May Her Grace guide your every message.” ❄️
