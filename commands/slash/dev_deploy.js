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
            let commandData;
            let commandName = cmd.metadata?.name?.toLowerCase() || cmd.data?.name;

            if (!metadata) {
                if (cmd.data instanceof DiscordBuilders.SlashCommandBuilder) {
                    commandData = cmd.data.toJSON();
                    commandName = commandData.name;
                } else {
                    console.warn(`Comando ${cmd.name || '(sin nombre)'} no tiene 'metadata' ni un 'data' válido.`);
                    return;
                }
            } else {
                commandData = {
                    name: commandName,
                    description: metadata.description,
                    type: metadata.type === "user_context" ? 2 : metadata.type === "message_context" ? 3 : 1 // 1 para SLASH
                };
                if (metadata.dm) commandData.dm_permission = true;
                if (metadata.contexts) commandData.contexts = metadata.contexts;
                if (metadata.dev) commandData.default_member_permissions = "0";
                else if (metadata.permission) commandData.default_member_permissions = String(Discord.PermissionsBitField.resolve(Discord.PermissionFlagsBits[metadata.permission]));
            }

            // Ignorar comandos que no son slash para el despliegue global
            if (isPublic && metadata?.dev && commandData?.type === 1) return;
            else if (!isPublic && metadata?.dev === false && commandData?.type === 1) return;

            // Solo procesar comandos slash aquí
            if (commandData?.type === 1) {
                const normalizedName = commandName?.startsWith('button:') ? commandName.split(':')[1] : commandName;

                if (normalizedName) {
                    let data = new DiscordBuilders.SlashCommandBuilder()
                        .setName(normalizedName)
                        .setDescription(commandData.description || 'Sin descripción');

                    if (commandData.default_member_permissions) data.setDefaultMemberPermissions(commandData.default_member_permissions);
                    if (metadata?.args) metadata.args.forEach(arg => {
                        createSlashArg(data, arg);
                    });
                    interactionList.push(data.toJSON());
                } else {
                    console.warn(`No se pudo normalizar el nombre del comando: ${commandName}`);
                }
            }
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            if (isPublic && int) {
                const route = Routes.applicationCommands(client.application.id); // <-- CORRECCIÓN AQUÍ
                await rest.put(route, { body: interactionList });
                await int.editReply({ content: `**${!undeploy ? `${interactionList.length} global commands registered!` : "Global commands cleared!"}** (Wait a bit, or refresh with Ctrl+R to see changes)`, flags: [Discord.MessageFlags.Ephemeral] });
                client.shard.broadcastEval(cl => cl.application?.commands?.fetch());
            } else if (int) {
                const serverIDs = targetServer ? [targetServer] : (int?.guild) ? [int.guild.id] : config.test_server_ids;
                if (serverIDs) {
                    for (const id of serverIDs) {
                        const route = Routes.applicationGuildCommands(client.application.id, id); // Usar client.application.id aquí también por consistencia
                        await rest.put(route, { body: interactionList });
                        const msg = `Dev commands registered to ${id}!`;
                        await int.followUp({ content: undeploy ? "Dev commands cleared!" : id === int.guild.id ? "Dev commands registered!" : msg, flags: [Discord.MessageFlags.Ephemeral] });
                    }
                    await int.editReply({ content: `Successfully deployed/cleared dev commands to ${serverIDs.length} server(s).`, flags: [Discord.MessageFlags.Ephemeral] });
                } else {
                    console.warn("Cannot deploy dev commands! No test server IDs provided in config.");
                    if (int) await int.editReply({ content: "Cannot deploy dev commands! No test server IDs provided in config.", flags: [Discord.MessageFlags.Ephemeral] });
                }
            } else {
                console.warn("El comando 'deploy' se ejecutó sin una interacción válida.");
            }
        } catch (e) {
            console.error(`Error deploying commands: ${e.message}`);
            if (int) await int.editReply({ content: `Error deploying commands: ${e.message}`, flags: [Discord.MessageFlags.Ephemeral] });
        }
    }
};