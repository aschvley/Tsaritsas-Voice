const config = require("../../config.json");
const DiscordBuilders = require("@discordjs/builders");
const Discord = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

function prepareOption(option, arg) {
    option.setName(arg.name.toLowerCase());
    if (arg.description) option.setDescription(arg.description);
    if (arg.required) option.setRequired(true);
    return option;
}

function createSlashArg(data, arg) {
    switch (arg.type) {
        case "subcommand":
            return data.addSubcommand(cmd => {
                cmd.setName(arg.name);
                cmd.setDescription(arg.description);
                if (arg.args?.length) arg.args.forEach(a => { createSlashArg(cmd, a) });
                return cmd;
            });
        case "string":
            return data.addStringOption(option => {
                prepareOption(option, arg);
                if (arg.choices) option.setChoices(...arg.choices);
                return option;
            });
        case "integer": case "number":
            return data.addIntegerOption(option => {
                prepareOption(option, arg);
                if (arg.choices) option.setChoices(...arg.choices);
                if (!isNaN(arg.min)) option.setMinValue(arg.min);
                if (!isNaN(arg.max)) option.setMaxValue(arg.max);
                return option;
            });
        case "float":
            return data.addNumberOption(option => {
                prepareOption(option, arg);
                if (arg.choices) option.setChoices(...arg.choices);
                if (!isNaN(arg.min)) option.setMinValue(arg.min);
                if (!isNaN(arg.max)) option.setMaxValue(arg.max);
                return option;
            });
        case "channel":
            return data.addChannelOption(option => {
                prepareOption(option, arg);
                if (arg.types) option.addChannelTypes(arg.types);
                else if (arg.acceptAll) option.addChannelTypes([0, 2, 4, 5, 10, 11, 12, 13, 15, 16]); // lol
                else option.addChannelTypes([Discord.ChannelType.GuildText, Discord.ChannelType.GuildAnnouncement]);
                return option;
            });
        case "bool": return data.addBooleanOption(option => prepareOption(option, arg));
        case "file": return data.addAttachmentOption(option => prepareOption(option, arg));
        case "user": return data.addUserOption(option => prepareOption(option, arg));
        case "role": return data.addRoleOption(option => prepareOption(option, arg));
    }
}

module.exports = {
    metadata: {
        dev: true,
        name: "deploy",
        description: "(dev) Deploy/sync the bot's commands.",
        args: [
            { type: "bool", name: "global", description: "Publish the public global commands instead of dev ones", required: false },
            { type: "string", name: "server_id", description: "Deploy dev commands to a specific server", required: false },
            { type: "bool", name: "undeploy", description: "Clears all dev commands from the server (or global if it's set to true)", required: false }
        ]
    },

    async run(client, int, tools) {
        let isPublic = int && !!int.options.get("global")?.value;
        let undeploy = int && !!int.options.get("undeploy")?.value;
        let targetServer = (!int || isPublic) ? null : int.options.get("server_id")?.value;

        if (int) {
            await int.deferReply({ flags: [Discord.MessageFlags.Ephemeral] });
        }

        let interactionList = [];
        if (!undeploy) client.commands.forEach(cmd => {
            let metadata = cmd.metadata;
            if (isPublic && metadata.dev) return;
            else if (!isPublic && !metadata.dev) return;

            switch (metadata.type) {
                case "user_context": case "message_context":
                    let ctx = { name: metadata.name, type: metadata.type == "user_context" ? 2 : 3, dm_permission: !!metadata.dm, contexts: [0] };
                    interactionList.push(ctx);
                    break;

                case "slash":
                    let data = new DiscordBuilders.SlashCommandBuilder()
                        .setName(metadata.name.toLowerCase())
                        .setContexts([0]);
                    if (metadata.dev) data.setDefaultMemberPermissions(0);
                    else if (metadata.permission) data.setDefaultMemberPermissions(Discord.PermissionFlagsBits[metadata.permission]);
                    if (metadata.description) data.setDescription(metadata.description);
                    if (metadata.args) metadata.args.forEach(arg => {
                        return createSlashArg(data, arg);
                    });
                    interactionList.push(data.toJSON());
                    break;
            }
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            if (isPublic && int) {
                const route = Routes.applicationCommands(process.env.DISCORD_ID);
                await rest.put(route, { body: interactionList });
                await int.editReply(`**${!undeploy ? `${interactionList.length} global commands registered!` : "Global commands cleared!"}** (Wait a bit, or refresh with Ctrl+R to see changes)`);
                client.shard.broadcastEval(cl => cl.application?.commands?.fetch());
            } else if (int) {
                const serverIDs = targetServer ? [targetServer] : (int?.guild) ? [int.guild.id] : config.test_server_ids;
                if (serverIDs) {
                    for (const id of serverIDs) {
                        const route = Routes.applicationGuildCommands(process.env.DISCORD_ID, id);
                        await rest.put(route, { body: interactionList });
                        const msg = `Dev commands registered to ${id}!`;
                        await int.followUp({ content: undeploy ? "Dev commands cleared!" : id === int.guild.id ? "Dev commands registered!" : msg, flags: [Discord.MessageFlags.Ephemeral] });
                    }
                    await int.editReply(`Successfully deployed/cleared dev commands to ${serverIDs.length} server(s).`);
                } else {
                    console.warn("Cannot deploy dev commands! No test server IDs provided in config.");
                    if (int) await int.editReply("Cannot deploy dev commands! No test server IDs provided in config.");
                }
            } else {
                console.warn("El comando 'deploy' se ejecutó sin una interacción válida.");
            }
        } catch (e) {
            console.error(`Error deploying commands: ${e.message}`);
            if (int) await int.editReply(`Error deploying commands: ${e.message}`);
        }
    }
};