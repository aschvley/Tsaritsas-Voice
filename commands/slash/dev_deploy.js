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
    const safeChoices = (choices, expectedType) => {
        return choices
            .map(c => {
                let value = c.value;
                if (expectedType === "string") {
                    if (typeof value !== "string") value = String(value);
                } else if (expectedType === "number") {
                    if (typeof value !== "number") {
                        const num = Number(value);
                        if (isNaN(num)) {
                            console.warn(`Invalid choice value for "${c.name}":`, value);
                            return null;
                        }
                        value = num;
                    }
                }
                return { name: String(c.name), value };
            })
            .filter(Boolean);
    };

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
                if (arg.choices) option.setChoices(...safeChoices(arg.choices, "string"));
                return option;
            });
        case "integer":
            return data.addIntegerOption(option => {
                prepareOption(option, arg);
                if (arg.choices) option.setChoices(...safeChoices(arg.choices, "number"));
                if (!isNaN(arg.min)) option.setMinValue(arg.min);
                if (!isNaN(arg.max)) option.setMaxValue(arg.max);
                return option;
            });
        case "number":
        case "float":
            return data.addNumberOption(option => {
                prepareOption(option, arg);
                if (arg.choices) option.setChoices(...safeChoices(arg.choices, "number"));
                if (!isNaN(arg.min)) option.setMinValue(arg.min);
                if (!isNaN(arg.max)) option.setMaxValue(arg.max);
                return option;
            });
        case "channel":
            return data.addChannelOption(option => {
                prepareOption(option, arg);
                if (arg.types) option.addChannelTypes(arg.types);
                else if (arg.acceptAll) option.addChannelTypes([0, 2, 4, 5, 10, 11, 12, 13, 15, 16]);
                else option.addChannelTypes([Discord.ChannelType.GuildText, Discord.ChannelType.GuildAnnouncement]);
                return option;
            });
        case "bool":
            return data.addBooleanOption(option => prepareOption(option, arg));
        case "file":
            return data.addAttachmentOption(option => prepareOption(option, arg));
        case "user":
            return data.addUserOption(option => prepareOption(option, arg));
        case "role":
            return data.addRoleOption(option => prepareOption(option, arg));
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
        console.log("Comando dev_deploy ejecutado");

        let isPublic = int && !!int.options.get("global")?.value;
        let undeploy = int && !!int.options.get("undeploy")?.value;
        let targetServer = (!int || isPublic) ? null : int.options.get("server_id")?.value;

        let interactionList = [];

        // Procesar comandos
        if (!undeploy) {
            client.commands.forEach(cmd => {
                const metadata = cmd.metadata;
                console.log("Procesando comando:", metadata.name); // Añadir log aquí
                if (isPublic && metadata.dev) return;
                else if (!isPublic && !metadata.dev) return;

                try {
                    switch (metadata.type) {
                        case "user_context":
                        case "message_context": {
                            const ctx = {
                                name: String(metadata.name),
                                type: metadata.type === "user_context" ? 2 : 3,
                                dm_permission: !!metadata.dm,
                                contexts: [0]
                            };
                            interactionList.push(ctx);
                            break;
                        }
                        case "slash": {
                            const data = new DiscordBuilders.SlashCommandBuilder()
                                .setName(String(metadata.name).toLowerCase())
                                .setDescription(String(metadata.description || "No description provided"))
                                .setContexts([0]);

                            if (metadata.dev) {
                                data.setDefaultMemberPermissions(0);
                            } else if (metadata.permission) {
                                data.setDefaultMemberPermissions(Discord.PermissionFlagsBits[metadata.permission]);
                            }

                            if (metadata.args) {
                                metadata.args.forEach(arg => {
                                    createSlashArg(data, arg);
                                });
                            }

                            interactionList.push(data.toJSON());
                            break;
                        }
                    }
                } catch (err) {
                    console.error(`❌ Error al procesar el comando "${metadata.name}"`);
                    console.error(err);
                }
            });
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        if (isPublic) {
            await int.deferReply({ flags: [Discord.MessageFlags.Ephemeral] }); // Usar flags para ephemeral
            const route = Routes.applicationCommands(process.env.DISCORD_ID);
            try {
                await rest.put(route, { body: interactionList });
                await int.editReply({ content: `**${!undeploy ? `${interactionList.length} global commands registered!` : "Global commands cleared!"}** (Wait a bit, or refresh with Ctrl+R to see changes)`, flags: [Discord.MessageFlags.Ephemeral] });
                client.shard.broadcastEval(cl => cl.application?.commands?.fetch());
            } catch (e) {
                console.error(`Error deploying global commands: ${e.message}`);
                await int.editReply({ content: `Error deploying global commands: ${e.message}`, flags: [Discord.MessageFlags.Ephemeral] });
            }
        } else {
            const serverIDs = targetServer ? [targetServer] : (int?.guild) ? [int.guild.id] : config.test_server_ids;
            if (!serverIDs) {
                return console.warn("Cannot deploy dev commands! No test server IDs provided in config.");
            }

            // Batching guild command updates to potentially reduce API calls and time
            const promises = serverIDs.map(async id => {
                const route = Routes.applicationGuildCommands(process.env.DISCORD_ID, id);
                try {
                    await rest.put(route, { body: interactionList });
                    const msg = `Dev commands registered to ${id}!`;
                    if (int) {
                        await int.followUp({ content: undeploy ? "Dev commands cleared!" : id === int.guild.id ? "Dev commands registered!" : msg, flags: [Discord.MessageFlags.Ephemeral] });
                    } else {
                        console.info(msg);
                    }
                    client.shard.broadcastEval(cl => cl.application?.commands?.fetch());
                } catch (e) {
                    console.error(`Error deploying dev commands to ${id}: ${e.message}`);
                    if (int) {
                        await int.followUp({ content: `Error deploying dev commands to ${id}: ${e.message}`, flags: [Discord.MessageFlags.Ephemeral] });
                    } else {
                        console.error(`No interaction to reply to for dev deploy on ${id}: ${e.message}`);
                    }
                }
            });

            if (int) {
                await Promise.all(promises);
                if (!isPublic) {
                    await int.editReply({ content: `Successfully deployed/cleared dev commands to ${serverIDs.length} server(s).`, flags: [Discord.MessageFlags.Ephemeral] });
                }
            }
        }
    }
};