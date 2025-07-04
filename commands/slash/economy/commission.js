// Tsaritsa's-Voice/commands/slash/economy/commission.js

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');

const commissionsList = require('../../../data/commissionsList');
// Asegúrate de importar resetCommissionsIfNewDay si lo vas a usar en 'skip'
const { getOrCreateProfile, resetCommissionsIfNewDay } = require('../../../utils/economyUtils'); 

module.exports = {
    // metadata para el comando principal '/commission'
    metadata: new SlashCommandBuilder()
        .setName('commission')
        .setDescription('Interact with your current missions')
        // Definición del subcomando 'status'
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('Check your current mission status')
        )
        // Definición del subcomando 'claim'
        .addSubcommand(subcommand =>
            subcommand.setName('claim')
                .setDescription('Start a commission mission')
                .addIntegerOption(opt =>
                    opt.setName('number')
                        .setDescription('Mission number (1-4)')
                        .setRequired(true)
                )
        )
        // Definición del subcomando 'skip'
        .addSubcommand(subcommand =>
            subcommand.setName('skip')
                .setDescription('Skip one of your missions for today')
        ),

    // La función 'run' del comando principal '/commission'
    async run(client, interaction, tools) {
        // Obtener el nombre del subcomando que fue invocado
        const subCommandName = interaction.options.getSubcommand();

        try {
            // Deferir la respuesta al inicio para todos los subcomandos
            await interaction.deferReply({ ephemeral: true }); 

            const userId = interaction.user.id;
            const profile = await getOrCreateProfile(userId);

            // Lógica para el subcomando 'status'
            if (subCommandName === 'status') {
                // CAMBIO: Usar profile.dailyCommissions
                if (!profile.dailyCommissions || profile.dailyCommissions.length === 0) {
                    return interaction.editReply({ content: 'You don\'t have any assigned missions yet. Use /commissions to get them.' });
                }

                // CAMBIO: c es ahora un objeto { id: "...", completed: boolean }
                const description = profile.dailyCommissions.map((c, i) => {
                    const data = commissionsList.find(x => x.id === c.id);
                    // Asegúrate de que 'data' exista antes de acceder a data.title
                    const title = data ? data.title : 'Unknown Mission';
                    return `**${i + 1}. [${title}]** — ${c.completed ? '✅ Completed' : '🕒 Pending'}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📋 Your Commission Status')
                    .setDescription(description)
                    .setColor(0xfacc15)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] }); // Usar editReply
            }
            // Lógica para el subcomando 'claim'
            else if (subCommandName === 'claim') {
                const num = interaction.options.getInteger('number');
                
                // CAMBIO: Usar profile.dailyCommissions
                if (!profile.dailyCommissions || num < 1 || num > profile.dailyCommissions.length) {
                    return interaction.editReply({ // Usar editReply
                        content: '❌ There is no mission in that slot.',
                    });
                }

                const commission = profile.dailyCommissions[num - 1]; // Obtener el objeto comisión
                const data = commissionsList.find(x => x.id === commission.id); // 'data' debe existir para continuar

                if (!data) { // Si la comisión no se encuentra en commissionsList
                    return interaction.editReply({
                        content: '❌ The selected mission data could not be found.',
                    });
                }

                if (commission.completed) {
                    return interaction.editReply({ // Usar editReply
                        content: '✅ That mission is already completed.',
                    });
                }

                // Lógica para verificar si ya hay una comisión aceptada y no completada
                if (profile.acceptedCommission) {
                    const acceptedCommObject = profile.dailyCommissions.find(c => c.id === profile.acceptedCommission);
                    if (acceptedCommObject && !acceptedCommObject.completed) {
                        return interaction.editReply({
                            content: `❌ Ya tienes una misión aceptada: **${data.title}**. ¡Completa esa primero!`,
                        });
                    }
                }

                // ───── 🎯 HANDLE TYPE: SIMPLE (auto-completed) ─────
                if (data.type === 'simple') {
                    commission.completed = true; // Marca como completada
                    profile.balance = Math.max(0, profile.balance + (data.reward?.mora || 0)); // Asegura que no sea negativo
                    profile.intelFragments = Math.max(0, (profile.intelFragments || 0) + (data.reward?.intelFragments || 0));
                    profile.reputation = Math.max(0, (profile.reputation || 0) + (data.reward?.reputation || 0));
                    profile.acceptedCommission = null; // No hay misión "activa" si es simple
                    await profile.save();

                    const embed = new EmbedBuilder()
                        .setTitle(`🎯 Completed: ${data.title}`)
                        .setDescription(`${data.outcome}`)
                        .addFields(
                            { name: 'Rewards', value: `💰 ${data.reward?.mora || 0} Mora, 🧩 ${data.reward?.intelFragments || 0} Intel Fragments, ⭐ ${data.reward?.reputation || 0} Reputation` }
                        )
                        .setColor(0x22c55e)
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] }); // Usar editReply
                }

                // ───── 🔘 HANDLE TYPE: BUTTON ─────
                else if (data.type === 'buttonOutcome') { // Usa else if para asegurar exclusividad
                    // Marca la misión como "aceptada" en el perfil para seguimiento
                    profile.acceptedCommission = commission.id;
                    await profile.save();

                    const button = new ButtonBuilder()
                        .setCustomId(`commission_button_${num - 1}`) // Pasamos el índice
                        .setLabel(data.buttonLabel || 'Start')
                        .setStyle(ButtonStyle.Primary);

                    const embed = new EmbedBuilder()
                        .setTitle(`${data.title}`)
                        .setDescription(`${data.description}`)
                        .setColor(0x3b82f6)
                        .setFooter({ text: 'Click the button to begin the task.' });

                    const row = new ActionRowBuilder().addComponents(button);
                    return interaction.editReply({ // Usar editReply
                        embeds: [embed],
                        components: [row],
                    });
                }

                // ───── 🧠 HANDLE TYPE: MULTIPLE CHOICE ─────
                else if (data.type === 'multipleChoice') { // Usa else if
                    // Marca la misión como "aceptada" en el perfil para seguimiento
                    profile.acceptedCommission = commission.id;
                    await profile.save();

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`commission_select_${num - 1}`) // Pasamos el índice
                        .setPlaceholder('Choose your decision')
                        .addOptions(data.options.map(opt => ({
                            label: opt.label,
                            value: opt.value,
                        })));

                    const embed = new EmbedBuilder()
                        .setTitle(`${data.title}`)
                        .setDescription(`${data.question}`)
                        .setColor(0xfacc15)
                        .setFooter({ text: 'Make your choice wisely.' });

                    const row = new ActionRowBuilder().addComponents(menu);
                    return interaction.editReply({ // Usar editReply
                        embeds: [embed],
                        components: [row],
                    });
                }

                return interaction.editReply({ // Usar editReply
                    content: '⚠ This type of commission is not yet supported.',
                });
            }
            // Lógica para el subcomando 'skip'
            else if (subCommandName === 'skip') {
                // Primero, asegúrate de resetear si es un nuevo día para que skippedCommission se resetee
                // OJO: Si resetCommissionsIfNewDay asigna nuevas comisiones, esto podría ser problemático.
                // Idealmente, resetCommissionsIfNewDay se llama en un evento diario (cron job)
                // para todos los usuarios, no aquí en cada comando 'skip'.
                // Por ahora, lo dejo para que lo tengas en cuenta, pero si te da problemas, quítalo de aquí.
                // const wasReset = await resetCommissionsIfNewDay(userId);
                // if (wasReset) {
                //     return interaction.editReply({ content: 'Your daily commissions have been reset for a new day! Try getting new ones with /commissions.', ephemeral: true });
                // }

                if (profile.skippedCommission) { // CAMBIO: Usar profile.skippedCommission
                    return interaction.editReply({ content: '⚠ You have already skipped a mission today. Try again tomorrow.' });
                }

                // CAMBIO: Usar profile.dailyCommissions
                const remaining = profile.dailyCommissions?.filter(c => !c.completed);
                if (!remaining || remaining.length === 0) {
                    return interaction.editReply({ content: '🎉 You\'ve completed all your missions today.' });
                }

                const skipped = remaining[0]; // La primera misión no completada
                // Remover la misión de dailyCommissions
                profile.dailyCommissions = profile.dailyCommissions.filter(c => c.id !== skipped.id); // Filtrar por ID
                profile.skippedCommission = true; // Marcar que ha saltado una hoy

                await profile.save();

                await interaction.editReply({ content: `🗑 You skipped a mission: ${skipped.id}` });
            }
            // Fallback en caso de que el subcomando no se encuentre (no debería ocurrir si está bien definido td)
            else {
                await interaction.editReply({ content: 'Subcommand of commission not recognized.' });
            }
        } catch (error) {
            console.error(`Error executing commission subcommand ${subCommandName}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error processing this mission.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error processing this mission.', ephemeral: true });
            }
        }
    },
};