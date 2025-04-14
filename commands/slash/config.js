module.exports = {
    metadata: {
        permission: "ManageGuild",
        name: "config",
        description: "Toggle XP gain, or visit the dashboard to tweak server settings. (requires manage server permission)",
    },

    async run(client, int, tools, db) { // <-- Recibe 'db' como cuarto argumento
        const { settings } = await db.get(int.guild.id) || { settings: {} }; // Usa 'db' directamente aquí

        if (!tools.canManageServer(int.member, settings.manualPerms)) {
            return tools.warn("*notMod");
        }

        let xpRange;
        if (settings.gain.min === settings.gain.max) {
            xpRange = tools.commafy(settings.gain.min);
        } else {
            xpRange = `${tools.commafy(settings.gain.min)} - ${tools.commafy(settings.gain.max)}`;
        }

        let leaderboardStatus;
        if (settings.leaderboard.disabled) {
            leaderboardStatus = "Disabled";
        } else {
            leaderboardStatus = `[${settings.leaderboard.private ? "Private" : "Public"}](<${tools.WEBSITE}/leaderboard/${int.guild.id}>)`;
        }

        let polarisSettings = [
            `**✨ XP enabled: __${settings.enabled ? "Yes!" : "No!"}__**`,
            `**XP per message:** ${xpRange}`,
            `**XP cooldown:** ${tools.commafy(settings.gain.time)} ${tools.extraS("sec", settings.gain.time)}`,
            `**XP curve:** ${settings.curve[3]}x³ + ${settings.curve[2]}x² + ${settings.curve[1]}x`,
            `**Level up message:** ${settings.levelUp.enabled && settings.levelUp.message ? (settings.levelUp.embed ? "Enabled (embed)" : "Enabled") : "Disabled"}`,
            `**Rank cards:** ${settings.rankCard.disabled ? "Disabled" : settings.rankCard.ephemeral ? "Enabled (forced hidden)" : "Enabled"}`,
            `**Leaderboard:** ${leaderboardStatus}`
        ];

        let embed = tools.createEmbed({
            author: { name: "Settings for " + int.guild.name, iconURL: int.guild.iconURL() },
            footer: "Visit the online dashboard to change server settings",
            color: tools.COLOR, timestamp: true,
            description: polarisSettings.join("\n")
        });

        // Refactor toggleButton with independent variables
        let toggleButtonStyle, toggleButtonLabel, toggleButtonEmoji;
        if (settings.enabled) {
            toggleButtonStyle = "Danger";
            toggleButtonLabel = "Disable XP";
            toggleButtonEmoji = "❕";
        } else {
            toggleButtonStyle = "Success";
            toggleButtonLabel = "Enable XP";
            toggleButtonEmoji = "✨";
        }

        let toggleButton = {
            style: toggleButtonStyle,
            label: toggleButtonLabel,
            emoji: toggleButtonEmoji,
            customId: "toggle_xp"
        };

        // Refactor listButtons with independent variables
        let rewardRolesLabel = `Reward Roles (${settings.rewards.length})`;
        let roleMultipliersLabel = `Role Multipliers (${settings.multipliers.roles.length})`;
        let channelMultipliersLabel = `Channel Multipliers (${settings.multipliers.channels.length})`;

        let listButtons = tools.button([
            { style: "Primary", label: rewardRolesLabel, customId: "list_reward_roles" },
            { style: "Primary", label: roleMultipliersLabel, customId: "list_multipliers~roles" },
            { style: "Primary", label: channelMultipliersLabel, customId: "list_multipliers~channels" }
        ]);

        let buttons = tools.button([
            { style: "Success", label: "Edit Settings", emoji: "🛠", customID: "settings_list" },
            toggleButton,
            { style: "Link", label: "Edit Online", emoji: "🌎", url: `${tools.WEBSITE}/settings/${int.guild.id}` },
            { style: "Secondary", label: "Export Data", emoji: "⏏️", customId: "export_xp" }
        ]);

        return int.reply({ embeds: [embed], components: [tools.row(buttons)[0], tools.row(listButtons)[0]] });
    }
};
