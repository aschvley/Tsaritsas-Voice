const Discord = require("discord.js");
const fs = require("fs");

const config = require("./config.json");

// <--- MODIFICACIÓN: Ajuste de importaciones para evitar duplicidad y usar Discord.X directamente
const { EmbedBuilder, REST, Routes, SlashCommandBuilder, ActivityType, Collection, GatewayIntentBits, Partials, Options } = Discord;
const Tools = require("./classes/Tools.js");
const Model = require("./classes/DatabaseModel.js");

const mongoose = require('mongoose');
require('dotenv').config();

// automatic files: these handle discord status and version number, manage them with the dev commands
const autoPath = "./json/auto/";
if (!fs.existsSync(autoPath)) fs.mkdirSync(autoPath);
if (!fs.existsSync(autoPath + "status.json")) fs.copyFileSync("./json/default_status.json", autoPath + "status.json");
if (!fs.existsSync(autoPath + "version.json")) fs.writeFileSync(autoPath + "version.json", JSON.stringify({ version: "1.0.0", updated: Date.now() }, null, 2));

const rawStatus = require("./json/auto/status.json");
const version = require("./json/auto/version.json");

const startTime = Date.now();

// COMENTARIO: NUEVO ARRAY para recolectar los datos de los comandos slash a registrar en Discord
const slashCommandsToRegister = []; // <-- ¡AÑADIDO AQUÍ!

// create client
const client = new Discord.Client({
    allowedMentions: { parse: ["users"] },
    makeCache: Discord.Options.cacheWithLimits({ MessageManager: 0 }),
    // <-- MODIFICACIÓN: Sintaxis de Intents y Partials ajustada y unificada con Discord.GatewayIntentBits
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent, // Importante para leer mensajes (ej. menciones)
        Discord.GatewayIntentBits.GuildMembers, // Importante para getOrCreateProfile, etc.
        // Si necesitas reacciones, descomenta la siguiente línea:
        Discord.GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Discord.Partials.Channel, // Necesario para DM si los usas
        // Si necesitas mensajes, descomenta la siguiente línea:
        Discord.Partials.Message,
        // Si necesitas reacciones, descomenta la siguiente línea:
        Discord.Partials.Reaction,
    ],
    failIfNotExists: false
});

if (!client.shard) {
    console.error("No sharding info found!\nMake sure you start the bot from polaris.js, not index.js");
    process.exit();
}

client.shard.id = client.shard.ids[0];

client.globalTools = new Tools(client);

// connect to db
client.db = new Model("servers", require("./database_schema.js").schema);

// Función para conectar a MongoDB Atlas con Mongoose
async function connectMongooseDB() {
    try {
        await mongoose.connect(process.env.MONGO_DB_URI);
        console.log('✅ Conectado a MongoDB Atlas (Mongoose)!');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB Atlas (Mongoose):', error);
    }
}

// command files
const dir = "./commands/";
client.commands = new Discord.Collection();
fs.readdirSync(dir).forEach(type => {
    if (type === 'slash') {
        const slashDir = dir + type + '/';
        fs.readdirSync(slashDir).forEach(slashSubDir => {
            const fullSubDirPath = slashDir + slashSubDir;
            if (fs.statSync(fullSubDirPath).isDirectory()) {
                fs.readdirSync(fullSubDirPath).filter(x => x.endsWith(".js")).forEach(file => {
                    let command = require(fullSubDirPath + "/" + file);
                    // COMENTARIO: REVISIÓN CRÍTICA AQUÍ PARA MANEJAR SLASHCOMMANDBUILDER
                    if (command.metadata instanceof SlashCommandBuilder) { // <-- ¡CAMBIO CLAVE! Si ya es un SlashCommandBuilder
                        client.commands.set(command.metadata.name, command); // Usa el nombre del SlashCommandBuilder
                        slashCommandsToRegister.push(command.metadata.toJSON()); // <-- ¡AÑADIDO Y CLAVE!
                        console.log(`Comando /${slashSubDir}/${command.metadata.name} cargado y listo para registro.`);
                    } else if (command.metadata) { // Si tiene metadata pero no es un SlashCommandBuilder (es un objeto simple)
                        command.metadata.type = 'slash';
                        command.metadata.category = slashSubDir;
                        client.commands.set(command.metadata.name, command);
                        // No lo añadimos a slashCommandsToRegister aquí si es un objeto simple,
                        // porque los comandos slash de Discord API necesitan un formato específico de SlashCommandBuilder.
                        // Solo los que son instanceof SlashCommandBuilder irán al registro API.
                        console.log(`Comando /${slashSubDir}/${command.metadata.name} (legacy metadata) cargado.`);
                    }
                });
            } else if (slashSubDir.endsWith(".js")) {
                let command = require(fullSubDirPath);
                // COMENTARIO: REVISIÓN CRÍTICA AQUÍ PARA MANEJAR SLASHCOMMANDBUILDER
                if (command.metadata instanceof SlashCommandBuilder) { // <-- ¡CAMBIO CLAVE!
                    client.commands.set(command.metadata.name, command);
                    slashCommandsToRegister.push(command.metadata.toJSON()); // <-- ¡AÑADIDO Y CLAVE!
                    console.log(`Comando /${command.metadata.name} cargado y listo para registro.`);
                } else if (command.metadata) { // Si tiene metadata pero no es un SlashCommandBuilder
                    command.metadata.type = 'slash';
                    client.commands.set(command.metadata.name, command);
                    console.log(`Comando /${command.metadata.name} (legacy metadata) cargado.`);
                }
            }
        });
    } else {
        // Esta parte es para comandos de tipo 'message' o 'text' que no son slash commands.
        // Asumo que no necesitan ser registrados en la API de Discord como slash commands.
        fs.readdirSync(dir + type).filter(x => x.endsWith(".js")).forEach(file => {
            let command = require(dir + type + "/" + file);
            // Si no tienen metadata, crea una básica (para comandos de texto, etc.)
            if (!command.metadata) command.metadata = { name: file.split(".js")[0] };
            command.metadata.type = type;
            client.commands.set(command.metadata.name, command);
            console.log(`Comando ${type}:${command.metadata.name} cargado.`);
        });
    }
});

// <--- MODIFICACIÓN: Aseguramos que client.buttons es una Discord.Collection antes de usarla
client.buttons = new Discord.Collection();
fs.readdirSync('./commands/button').filter(file => file.endsWith('.js')).forEach(file => {
    try {
        const button = require(`./commands/button/${file}`);
        if (button.metadata?.name) {
            client.buttons.set(button.metadata.name, button);
            console.log(`Botón cargado: ${file} con nombre ${button.metadata.name}`);
        } else {
            console.warn(`Advertencia: ${file} no tiene metadata.name.`);
        }
    } catch (error) {
        console.error(`Error al cargar el botón ${file}:`, error);
    }
});

client.statusData = rawStatus;
client.updateStatus = function() {
    let status = client.statusData;
    // <--- MODIFICACIÓN: Usar Discord.ActivityType directamente
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

// when online (UNIFICADO: Solo una vez)
client.on("ready", async () => {
    if (client.shard.id == client.shard.count - 1) console.log(`Bot online! (${+process.uptime().toFixed(2)} secs)`);
    client.startupTime = Date.now() - startTime;
    client.version = version;

    await connectMongooseDB(); // Llamada a la función de conexión a Mongoose DB aquí

    // COMENTARIO: INICIO DEL NUEVO BLOQUE DE REGISTRO DE COMANDOS SLASH
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`Comenzando a registrar ${slashCommandsToRegister.length} comandos slash (/).`);

        // **** AÑADE ESTAS LÍNEAS TEMPORALMENTE PARA DEPURAR ****
        console.log("Contenido de slashCommandsToRegister:", JSON.stringify(slashCommandsToRegister, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString() + 'n'; // Convierte BigInt a string y añade 'n' para identificarlo
            }
            // También podemos buscar si algún valor numérico es extremadamente grande sin ser BigInt
            if (typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
                return 'LARGE_NUMBER_POSSIBLE_BIGINT_ISSUE:' + value.toString();
            }
            return value;
        }, 2));
        // ******************************************************

        const data = await rest.put(
            Routes.applicationCommands(client.user.id), // Registra comandos globalmente para tu aplicación
            { body: slashCommandsToRegister },
        );
        console.log(`Se recargaron ${data.length} comandos slash (/) exitosamente.`);
    } catch (error) {
        console.error('Error al registrar comandos slash:', error);
    }
    // COMENTARIO: FIN DEL NUEVO BLOQUE DE REGISTRO DE COMANDOS SLASH

    // client.application.commands.fetch() // cache slash commands - Ya no es necesario si siempre registras
    //      .then(cmds => {
    //          if (cmds.size < 1) { // no commands!! deploy to test server
    //              console.info("!!! No global commands found, deploying dev commands to test server (Use /deploy global=true to deploy global commands)");
    //              // **COMENTADA LA LÍNEA QUE EJECUTABA DEPLOY AUTOMÁTICAMENTE:**
    //              // client.commands.get("deploy").run(client, null, client.globalTools)
    //          }
    //      });
    // COMENTARIO: Bloque comentado, ya que el registro se hace arriba.
    // Si aún quieres un deploy condicional, la lógica deberá ser adaptada
    // para usar el 'rest.put' directamente en ese bloque, no el comando 'deploy'.


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
            console.log("¡El bot fue mencionado!");
            const mentionerId = message.author.id;

            if (autoResponses[mentionerId] && Array.isArray(autoResponses[mentionerId]) && autoResponses[mentionerId].length > 0) {
                const randomIndex = Math.floor(Math.random() * autoResponses[mentionerId].length);
                const response = autoResponses[mentionerId][randomIndex].replace(/\[Nombre del Usuario]/g, message.author.username);
                try {
                    await message.reply({ content: response, allowedMentions: { repliedUser: false } });
                } catch (error) {
                    console.error("Error al responder a la mención:", error);
                }
            } else {
                const defaultResponse = "My voice resonates with echoes of a power you do not yet comprehend.";
                try {
                    await message.reply({ content: defaultResponse, allowedMentions: { repliedUser: false } });
                } catch (error) {
                    console.error("Error al responder con la respuesta predeterminada:", error);
                }
            }
        } else {
            // Ejecutar el comando de mensaje normal si no es una mención
            // Verifica si client.commands.get("message") existe antes de intentar ejecutarlo
            const messageCommand = client.commands.get("message");
            if (messageCommand && messageCommand.run) {
                messageCommand.run(client, message, client.globalTools);
            } else {
                // console.warn("Comando 'message' no encontrado o no tiene una función 'run'.");
            }
        }
        // --- FIN DEL MANEJO DE MENCIONES ---
    }
});

// on interaction
client.on("interactionCreate", async int => {
    if (!int.guild) return int.reply("You can't use commands in DMs!");

    const tools = new Tools(client, int);

    if (int.isStringSelectMenu()) {
        if (int.customId.startsWith("configmenu_")) {
            if (int.customId.split("_")[1] != int.user.id) return int.deferUpdate();
            let configData = int.values[0].split("_").slice(1);
            let configCmd = (configData[0] == "dir" ? "button:settings_list" : "button:settings_view");
            // <--- MODIFICACIÓN: Usa client.buttons.get() para botones de configuración
            const buttonHandler = client.buttons.get(configCmd);
            if (buttonHandler && buttonHandler.run) {
                try {
                    await buttonHandler.run(client, int, tools, configData); // Usa la instancia 'tools' ya creada
                } catch (error) {
                    console.error('Error handling configmenu_ select:', error);
                    await int.followUp({ content: 'Error processing config menu interaction!', ephemeral: true });
                }
            } else {
                console.warn(`WARN: Config menu handler "${configCmd}" not found or missing 'run' method.`);
                await int.followUp({ content: `Error: Could not find handler for ${configCmd}.`, ephemeral: true });
            }
        } else if (int.customId.startsWith('commission_select_')) {
            // <--- MODIFICACIÓN: Manejo de select menus de comisión redirigido al comando /commission
            const commissionCommand = client.commands.get('commission');
            if (commissionCommand && commissionCommand.handleComponentInteraction) {
                try {
                    await commissionCommand.handleComponentInteraction(int);
                } catch (error) {
                    console.error('Error handling commission select menu:', error);
                    await int.reply({ content: '❌ Error processing your commission selection.', ephemeral: true });
                }
            } else {
                console.warn("WARN: Commission command or its component handler not found.");
                await int.reply({ content: '❌ Could not find the commission command handler.', ephemeral: true });
            }
        }
        return;
    } else if (int.isModalSubmit()) {
        if (int.customId.startsWith("configmodal")) {
            let modalData = int.customId.split("~");
            if (modalData[2] != int.user.id) return int.deferUpdate();
            // <--- MODIFICACIÓN: Usa client.buttons.get() para botones de configuración
            const buttonHandler = client.buttons.get("button:settings_edit");
            if (buttonHandler && buttonHandler.run) {
                try {
                    await buttonHandler.run(client, int, tools, modalData[1]); // Usa la instancia 'tools' ya creada
                } catch (error) {
                    console.error('Error handling configmodal submit:', error);
                    await int.followUp({ content: 'Error processing config modal!', ephemeral: true });
                }
            } else {
                console.warn(`WARN: Config modal handler "button:settings_edit" not found or missing 'run' method.`);
                await int.followUp({ content: `Error: Could not find handler for button:settings_edit.`, ephemeral: true });
            }
            return;
        } else if (int.customId.startsWith('commission_modal_')) {
            // <--- MODIFICACIÓN: Manejo de modales de comisión redirigido al comando /commission
            const commissionCommand = client.commands.get('commission');
            if (commissionCommand && commissionCommand.handleComponentInteraction) {
                try {
                    await commissionCommand.handleComponentInteraction(int);
                } catch (error) {
                    console.error('Error handling commission modal submit:', error);
                    await int.reply({ content: '❌ Error processing your commission modal submission.', ephemeral: true });
                }
            } else {
                console.warn("WARN: Commission command or its component handler not found for modal.");
                await int.reply({ content: '❌ Could not find the commission command handler for this modal.', ephemeral: true });
            }
            return;
        }
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
    // <--- MODIFICACIÓN: Asegurar que el nombre del botón de fatui-fact sea el correcto en client.buttons
    if (int.isButton() && (Object.keys(require('./fatui_facts.json').fatui_facts).map(key => key.toLowerCase()).includes(int.customId) || int.customId === 'general')) {
        const button = client.buttons.get('fatui-fact-button'); // Asumo que tienes un manejador general para estos botones
        if (button && button.run) { // Asegúrate de que el handler exista y tenga un método 'run'
            try {
                await button.run(client, int, tools); // Usa la instancia 'tools'
            } catch (error) {
                console.error(`Error executing fatui-fact button ${int.customId}:`, error);
                await int.reply({ content: 'There was an error while processing this Fatui fact!', ephemeral: true });
            }
        } else {
            console.warn(`WARN: Fatui fact button handler "fatui-fact-button" not found or missing 'run' method.`);
            await int.reply({ content: `Error: Could not find handler for ${int.customId}.`, ephemeral: true });
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
                .setColor('#325a97')
                .setDescription(announcementContent)
                .setTimestamp();

            await announcementChannel.send({ embeds: [announcementEmbed], allowedMentions: { parse: ['users', 'roles'] } });
            await int.editReply({ content: `Announcement sent to #${announcementChannel.name}! ✅`});
        } catch (error) {
            console.error('Error sending announcement:', error);
            console.error('Error details:', error.message, error.stack);
            await int.editReply({ content: 'Error: Could not send the announcement as an embed. See console for details.', ephemeral: true });
        }
        return;
    }
    // --- End ANNOUNCE Handling (Simplified with Button) ---

    // <--- MODIFICACIÓN: ELIMINADO POR COMPLETO EL BLOQUE REDUNDANTE DE COMMISSION BUTTONS HANDLING
    // Este bloque fue eliminado porque la lógica de botones y selectores de comisión
    // ahora se maneja dentro del comando '/commission' mismo, redirigido desde el
    // 'if (int.isButton())' y 'if (int.isStringSelectMenu())' en este archivo.

    // general commands and buttons
    let foundCommand;

    // Aquí manejamos si es un comando de chat (slash)
    if (int.isChatInputCommand()) {
        // Obtenemos el comando principal por su nombre (ej. 'give', 'commission')
        foundCommand = client.commands.get(int.commandName);
        
        // No necesitamos buscar subcomandos o grupos aquí.
        // El archivo del comando (ej. 'commission.js') manejará internamente
        // `interaction.options.getSubcommand()` para el routing.
        
    } else if (int.isButton()) { // Si es un botón
        // <--- MODIFICACIÓN: Manejo de botones de comisión redirigido al comando /commission
        if (int.customId.startsWith('commission_')) {
            foundCommand = client.commands.get('commission');
            if (foundCommand && foundCommand.handleComponentInteraction) {
                try {
                    await foundCommand.handleComponentInteraction(int);
                } catch (error) {
                    console.error('Error handling commission button:', error);
                    await int.reply({ content: '❌ Error processing your commission button.', ephemeral: true });
                }
            } else {
                console.warn("WARN: Commission command or its component handler not found for button.");
                await int.reply({ content: '❌ Could not find the commission command handler for this button.', ephemeral: true });
            }
            return; // Importante: salir después de manejar la comisión
        }
        // Si no es un botón de comisión, busca en client.buttons (para otros botones generales)
        foundCommand = client.buttons.get(int.customId.split("~")[0]); // Asumiendo que tus botones están en client.buttons
    }
    // Puedes añadir más `else if` para otros tipos de interacción que no se hayan manejado arriba

    if (!foundCommand) {
        // Si no se encuentra un comando/botón válido, simplemente salimos.
        return; 
    }

    // Mantenemos la lógica de slashEquivalent si la necesitas para comandos híbridos,
    // pero para 'give' y 'commission' que son puros slash, esto probablemente no se ejecutará.
    if (foundCommand.metadata?.slashEquivalent) { 
        foundCommand = client.commands.get(foundCommand.metadata.slashEquivalent);
        if (!foundCommand) {
            console.warn(`Slash equivalent command "${foundCommand.metadata.slashEquivalent}" not found.`);
            return int.reply({ content: '❌ Related slash command not found or loaded correctly.', ephemeral: true });
        }
    }

    // dev perm check
    if (foundCommand.metadata.dev && !tools.isDev()) return tools.warn("Only developers can use this!");
    else if (config.lockBotToDevOnly && !tools.isDev()) return tools.warn("Only developers can use this bot!");
    
    try { 
        // <--- MODIFICACIÓN: Asegurar que se pase 'tools' a la función run
        await foundCommand.run(client, int, tools); 
    } catch(e) { 
        console.error(`Error ejecutando comando ${foundCommand.metadata?.name || int.commandName || 'Desconocido'}:`, e);
        if (int.replied || int.deferred) {
            await int.followUp({ content: "**Error!** Hubo un problema al ejecutar este comando!", ephemeral: true }).catch(() => {}); 
        } else {
            await int.reply({ content: "**Error!** Hubo un problema al ejecutar este comando!", ephemeral: true }).catch(() => {}); 
        }
    }
}); // <-- CIERRE CORRECTO DE interactionCreate

client.on('error', e => console.warn(e));
client.on('warn', e => console.warn(e));

process.on('uncaughtException', e => console.warn(e));
process.on('unhandledRejection', (e, p) => console.warn(e));

client.login(process.env.DISCORD_TOKEN);