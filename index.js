const Discord = require("discord.js");
const fs = require("fs");

const config = require("./config.json");
const { EmbedBuilder } = require('discord.js');
const Tools = require("./classes/Tools.js");
const Model = require("./classes/DatabaseModel.js");

const mongoose = require('mongoose'); // <--- NUEVO: Importar Mongoose
require('dotenv').config();

// automatic files: these handle discord status and version number, manage them with the dev commands
const autoPath = "./json/auto/";
if (!fs.existsSync(autoPath)) fs.mkdirSync(autoPath);
if (!fs.existsSync(autoPath + "status.json")) fs.copyFileSync("./json/default_status.json", autoPath + "status.json");
if (!fs.existsSync(autoPath + "version.json")) fs.writeFileSync(autoPath + "version.json", JSON.stringify({ version: "1.0.0", updated: Date.now() }, null, 2));

const rawStatus = require("./json/auto/status.json");
const version = require("./json/auto/version.json");

const startTime = Date.now();

// create client
const client = new Discord.Client({
    allowedMentions: { parse: ["users"] },
    makeCache: Discord.Options.cacheWithLimits({ MessageManager: 0 }),
    intents: ['Guilds', 'GuildMessages', 'DirectMessages', 'GuildVoiceStates'].map(i => Discord.GatewayIntentBits[i]),
    partials: ['Channel'].map(p => Discord.Partials[p]),
    failIfNotExists: false
});

if (!client.shard) {
        console.error("No sharding info found!\nMake sure you start the bot from polaris.js, not index.js");
        process.exit(); // Elimina el 'return'
    }

client.shard.id = client.shard.ids[0];

client.globalTools = new Tools(client);

// connect to db
client.db = new Model("servers", require("./database_schema.js").schema);

// NUEVO: Función para conectar a MongoDB Atlas con Mongoose (ACTUALIZADA PARA MONGOOSE 8+)
async function connectMongooseDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI); // <--- SIMPLIFICADO: sin opciones useNewUrlParser/useUnifiedTopology
        console.log('✅ Conectado a MongoDB Atlas (Mongoose)!');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB Atlas (Mongoose):', error);
        // Puedes decidir si process.exit(1) aquí es apropiado para tu aplicación
        // si la base de datos es absolutamente crítica para el funcionamiento del bot.
        // Por ahora, lo dejamos comentado para que el bot intente seguir funcionando.
    }
}

// command files
const dir = "./commands/";
client.commands = new Discord.Collection();
fs.readdirSync(dir).forEach(type => {
    // Si 'type' es 'slash', necesitamos buscar en sus subdirectorios
    if (type === 'slash') {
        const slashDir = dir + type + '/';
        fs.readdirSync(slashDir).forEach(slashSubDir => {
            const fullSubDirPath = slashDir + slashSubDir;
            if (fs.statSync(fullSubDirPath).isDirectory()) { // Asegurarse de que sea un directorio
                fs.readdirSync(fullSubDirPath).filter(x => x.endsWith(".js")).forEach(file => {
                    let command = require(fullSubDirPath + "/" + file);
                    if (!command.metadata) command.metadata = { name: file.split(".js")[0] };
                    command.metadata.type = 'slash'; // Asegurarse de que el tipo sea 'slash'
                    command.metadata.category = slashSubDir; // Añadir categoría (ej: 'economy')
                    client.commands.set(command.metadata.name, command);
                    console.log(`Comando /${slashSubDir}/${command.metadata.name} cargado.`); // Debugging
                });
            } else if (slashSubDir.endsWith(".js")) { // Archivos .js directamente en slash/
                 let command = require(fullSubDirPath);
                 if (!command.metadata) command.metadata = { name: slashSubDir.split(".js")[0] };
                 command.metadata.type = 'slash';
                 client.commands.set(command.metadata.name, command);
                 console.log(`Comando /${command.metadata.name} cargado.`); // Debugging
            }
        });
    } else {
        // Tu lógica existente para otros tipos de comandos (button, misc, user_context, etc.)
        fs.readdirSync(dir + type).filter(x => x.endsWith(".js")).forEach(file => {
            let command = require(dir + type + "/" + file);
            if (!command.metadata) command.metadata = { name: file.split(".js")[0] };
            command.metadata.type = type;
            client.commands.set(command.metadata.name, command);
            console.log(`Comando ${type}:${command.metadata.name} cargado.`); // Debugging
        });
    }
});

// button files
client.buttons = new Discord.Collection();
fs.readdirSync('./commands/button').filter(file => file.endsWith('.js')).forEach(file => {
    try {
        const button = require(`./commands/button/${file}`);
        if (button.metadata?.name) { // Usando optional chaining
            client.buttons.set(button.metadata.name, button);
            console.log(`Botón cargado: ${file} con nombre ${button.metadata.name}`); // Debug
        } else {
            console.warn(`Advertencia: ${file} no tiene metadata.name.`); // Debug
        }
    } catch (error) {
        console.error(`Error al cargar el botón ${file}:`, error); // Debug
    }
});

client.statusData = rawStatus;
client.updateStatus = function() {
    let status = client.statusData;
    client.user.setPresence({ activities: status.type ? [{ name: status.name, state: status.state || undefined, type: Discord.ActivityType[status.type], url: status.url }] : [], status: status.status });
};

let autoResponses = {};

// Cargar las respuestas automáticas al iniciar el bot (SÍNCRONO)
function loadAutoResponses() {
    try {
        const data = fs.readFileSync('./auto_responses.json', 'utf8');
        autoResponses = JSON.parse(data);
        console.log('Respuestas automáticas cargadas.');
    } catch (error) {
        console.error('Error al cargar las respuestas automáticas:', error);
    }
}

// when online
client.on("ready", async () => {
    if (client.shard.id == client.shard.count - 1) console.log(`Bot online! (${+process.uptime().toFixed(2)} secs)`);
    client.startupTime = Date.now() - startTime;
    client.version = version;

    await connectMongooseDB(); // <--- NUEVO: Llamar a la función de conexión a Mongoose DB aquí

    client.application.commands.fetch() // cache slash commands
        .then(cmds => {
            if (cmds.size < 1) { // no commands!! deploy to test server
                console.info("!!! No global commands found, deploying dev commands to test server (Use /deploy global=true to deploy global commands)");
                // **COMENTADA LA LÍNEA QUE EJECUTABA DEPLOY AUTOMÁTICAMENTE:**
                // client.commands.get("deploy").run(client, null, client.globalTools)
            }
        });

    client.updateStatus();
    setInterval(client.updateStatus, 15 * 60000);

    loadAutoResponses(); // Llamar a la función para cargar las respuestas

    // run the web server
    if (client.shard.id == 0 && config.enableWebServer) require("./web_app.js")(client);
});

// on message
client.on("messageCreate", async message => {
        if (message.system || message.author.bot) return;
        else if (!message.guild || !message.member) return; // dm stuff
        else {
        // --- MANEJO DE MENCIONES ---
                if (message.mentions.has(client.user.id)) {
                console.log("¡El bot fue mencionado!"); // Agrega esta línea
                const mentionerId = message.author.id;
    
                if (autoResponses[mentionerId] && Array.isArray(autoResponses[mentionerId]) && autoResponses[mentionerId].length > 0) {
                    // Seleccionar una respuesta aleatoria del array
                    const randomIndex = Math.floor(Math.random() * autoResponses[mentionerId].length);
                    const response = autoResponses[mentionerId][randomIndex].replace(/\[Nombre del Usuario]/g, message.author.username);
                    try {
                        await message.reply({ content: response, allowedMentions: { repliedUser: false } });
                    } catch (error) {
                        console.error("Error al responder a la mención:", error);
                     }
                    } else {
                         // Respuesta predeterminada para cualquier otro usuario o si no hay respuestas configuradas
                         const defaultResponse = "My voice resonates with echoes of a power you do not yet comprehend.";
                          try {
                             await message.reply({ content: defaultResponse, allowedMentions: { repliedUser: false } });
                     } catch (error) {
                    console.error("Error al responder con la respuesta predeterminada:", error);
                    }
                }
            } else {
                // Ejecutar el comando de mensaje normal si no es una mención
                client.commands.get("message").run(client, message, client.globalTools);
            }
             // --- FIN DEL MANEJO DE MENCIONES ---
         }
    });

// on interaction
client.on("interactionCreate", async int => {
    if (!int.guild) return int.reply("You can't use commands in DMs!");

    // ÚNICO CAMBIO EN LA PARTE SUPERIOR DE ESTE BLOQUE: Define 'tools' aquí al principio.
    const tools = new Tools(client, int);

    // for setting changes
    if (int.isStringSelectMenu()) {
        if (int.customId.startsWith("configmenu_")) {
            if (int.customId.split("_")[1] != int.user.id) return int.deferUpdate();
            let configData = int.values[0].split("_").slice(1);
            let configCmd = (configData[0] == "dir" ? "button:settings_list" : "button:settings_view");
            client.commands.get(configCmd).run(client, int, new Tools(client, int), configData);
        }
        return;
    }

    // also for setting changes
    else if (int.isModalSubmit() && int.customId.startsWith("configmodal")) {
        let modalData = int.customId.split("~");
        if (modalData[2] != int.user.id) return int.deferUpdate();
        client.commands.get("button:settings_edit").run(client, int, new Tools(client, int), modalData[1]);
        return;
    }

    // --- QOTD Button and Modal Handling ---
    if (int.isButton() && int.customId === 'qotd-ask-button') {
        const button = client.buttons.get('qotd-ask-button');
        if (button) {
            try {
                await button.execute(client, int);
            } catch (error) {
                console.error('Error executing qotd-ask-button:', error);
                await int.reply({ content: 'There was an error while processing the QOTD button!', ephemeral: true });
            }
        }
        return;
    } else if (int.isModalSubmit() && int.customId === 'qotd-modal') {
        const modalHandler = client.buttons.get('qotd-modal');
        if (modalHandler) {
            try {
                await modalHandler.execute(client, int);
            } catch (error) {
                console.error('Error handling qotd-modal submit:', error);
                await int.reply({ content: 'There was an error while processing your QOTD input!', ephemeral: true });
            }
        }
        return;
    }
    // --- End QOTD Handling ---

    // --- Fatui Fact Button Handling ---
    if (int.isButton() && (Object.keys(require('./fatui_facts.json').fatui_facts).map(key => key.toLowerCase()).includes(int.customId) || int.isButton() && int.customId === 'general')) {
        const button = client.buttons.get('fatui-fact-button');
        if (button) {
            try {
                await button.run(client, int, client.globalTools);
            } catch (error) {
                console.error(`Error executing fatui-fact button ${int.customId}:`, error);
                await int.reply({ content: 'There was an error while processing this Fatui fact!', ephemeral: true });
            }
        }
        return;
    }
    // --- End Fatui Fact Button Handling ---

// --- ANNOUNCE Handling (Simplified with Button) ---
if (int.isChatInputCommand() && int.commandName === 'announce') {
    const command = client.commands.get('announce');
    if (command && command.run) {
        try {
            await command.run(client, int);
        } catch (error) {
            console.error('Error executing announce command:', error);
            await int.reply({ content: 'There was an error while processing the announce command!', ephemeral: true });
        }
    }
    return;
} else if (int.isButton() && int.customId === 'announce-ask-button') {
    const button = client.buttons.get('announce-ask-button');
    if (button && button.run) {
        try {
            await button.run(client, int);
        } catch (error) {
            console.error('Error executing announce-ask-button:', error);
            await int.reply({ content: 'There was an error while processing the announcement button!', ephemeral: true });
        }
    }
    return;
} else if (int.isModalSubmit() && int.customId === 'announce-modal') {
    await int.deferReply({ ephemeral: true });

    const announcementContent = int.fields.getTextInputValue('announcement-input');
    const announcementChannelId = '1305238701819039804';
    const announcementChannel = client.channels.cache.get(announcementChannelId);

    if (!announcementChannel) {
        return await int.editReply({ content: 'Error: Announcement channel not found.', ephemeral: true });
    }

    try {
        const announcementEmbed = new EmbedBuilder()
            .setColor('#325a97') // Puedes elegir el color que prefieras
            .setDescription(announcementContent)
            .setTimestamp(); // Opcional: añade una marca de tiempo

        await announcementChannel.send({ embeds: [announcementEmbed], allowedMentions: { parse: ['users', 'roles'] } });
        await int.editReply({ content: `Announcement sent to #${announcementChannel.name}! ✅`});
    } catch (error) {
        console.error('Error sending announcement:', error);
        console.error('Error details:', error.message, error.stack); // Añadimos más detalles del error
        await int.editReply({ content: 'Error: Could not send the announcement as an embed. See console for details.', ephemeral: true });
    }
    return;
}
// --- End ANNOUNCE Handling (Simplified with Button) ---

    // general commands and buttons
    let foundCommand = client.commands.get(int.isButton() ? `button:${int.customId.split("~")[0]}` : int.commandName);
    if (!foundCommand) return;
    else if (foundCommand.metadata.slashEquivalent) {
        foundCommand = client.commands.get(foundCommand.metadata.slashEquivalent);
        // Si slashEquivalent no existe, el comando original se habría manejado,
        // pero si quieres una advertencia, puedes agregarla aquí.if (!foundCommand) { console.error(`Slash equivalent "${foundCommand.metadata.slashEquivalent}" no encontrado.`); return; }}

    // NOTA IMPORTANTE: La línea 'let tools = new Tools(client, int);' ha sido ELIMINADA de aquí.
    // Ahora se usa la variable 'tools' que se definió al principio de la función 'interactionCreate'.
    
    // dev perm check
    if (foundCommand.metadata.dev && !tools.isDev()) return tools.warn("Only developers can use this!");
    else if (config.lockBotToDevOnly && !tools.isDev()) return tools.warn("Only developers can use this bot!");
    
    try { 
        // CAMBIADO: 'foundCommand.run' ahora usa la variable 'tools' que está en el ámbito superior.
        // Esto es crucial para que tus comandos de economía reciban 'tools' correctamente.
        await foundCommand.run(client, int, tools); 
    } catch(e) { 
        console.error(`Error ejecutando comando ${foundCommand.metadata?.name || int.commandName || 'Desconocido'}:`, e); // Mejorado el mensaje de error
        if (int.replied || int.deferred) {
            // AÑADIDO: .catch(() => {}) para manejar errores de promesa al responder
            await int.followUp({ content: "**Error!** Hubo un problema al ejecutar este comando!", ephemeral: true }).catch(() => {}); 
        } else {
            // AÑADIDO: .catch(() => {}) para manejar errores de promesa al responder
            await int.reply({ content: "**Error!** Hubo un problema al ejecutar este comando!", ephemeral: true }).catch(() => {}); 
        }
    }
}}); // <-- MUY IMPORTANTE: Asegúrate de que este cierre de función (}); ) ESTÉ PRESENTE AL FINAL DE TU BLOQUE interactionCreate.

    client.on('error', e => console.warn(e));
    client.on('warn', e => console.warn(e));
    
    process.on('uncaughtException', e => console.warn(e));
    process.on('unhandledRejection', (e, p) => console.warn(e));
    
    client.login(process.env.DISCORD_TOKEN);