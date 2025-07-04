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
const { getOrCreateProfile, ensureDailyCommissions, acceptCommission, skipCommission } = require('../../../utils/economyUtils'); 
const MORA_EMOJI = '<:mora:1390470693648470026>'; // Asegúrate de que este emoji sea correcto

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('commission')
        .setDescription('Interact with your current commissions')
        .addSubcommand(subcommand =>
            subcommand.setName('status')
                .setDescription('Check your current commission status')
        )
        .addSubcommand(subcommand =>
            subcommand.setName('claim')
                .setDescription('Claim a commission mission to start it')
                .addIntegerOption(opt =>
                    opt.setName('number')
                        .setDescription('Mission number (1-4)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('skip')
                .setDescription('Skip one of your current missions for today')
        ),

    async run(client, interaction, tools) {
        const subCommandName = interaction.options.getSubcommand();

        try {
            await interaction.deferReply({ ephemeral: true }); 

            const userId = interaction.user.id;
            // AHORA LLAMAMOS A ensureDailyCommissions AL PRINCIPIO
            const { newCommissions, commissions: userCommissions } = await ensureDailyCommissions(userId);
            const profile = await getOrCreateProfile(userId); // Obtener el perfil actualizado

            if (newCommissions && subCommandName !== 'status') {
                // Si se asignaron nuevas misiones y no es un comando de 'status', informar
                await interaction.followUp({ 
                    content: '📅 Your daily commissions have been reset and new ones assigned! Please use `/commission status` to see them.', 
                    ephemeral: true 
                });
                return; // Evitar que siga procesando con datos potencialmente viejos si se acaba de resetear
            }


            // --- Lógica para el subcomando 'status' ---
            if (subCommandName === 'status') {
                if (!userCommissions || userCommissions.length === 0) {
                    return interaction.editReply({ content: 'You don\'t have any assigned commissions yet. New ones will be assigned automatically tomorrow, or if you run this command after a daily reset.' });
                }

                const description = userCommissions.map((c, i) => {
                    const data = commissionsList.find(x => x.id === c.id);
                    const title = data ? data.title : 'Unknown Mission';
                    // Indicar si es la misión activa
                    const activeIndicator = profile.acceptedCommission === c.id && !c.completed ? ' (Active)' : '';
                    return `**${i + 1}. [${title}]** ${activeIndicator} — ${c.completed ? '✅ Completed' : '🕒 Pending'}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📋 Your Commission Status')
                    .setDescription(description)
                    .setColor(0xfacc15)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }

            // --- Lógica para el subcomando 'claim' ---
            else if (subCommandName === 'claim') {
                const num = interaction.options.getInteger('number');
                
                if (!userCommissions || num < 1 || num > userCommissions.length) {
                    return interaction.editReply({ content: '❌ There is no commission in that slot.' });
                }

                const commissionToClaim = userCommissions[num - 1];
                const data = commissionsList.find(x => x.id === commissionToClaim.id);

                if (!data) {
                    return interaction.editReply({ content: '❌ The selected commission data could not be found.' });
                }

                if (commissionToClaim.completed) {
                    return interaction.editReply({ content: '✅ That commission is already completed.' });
                }

                // Verificar si ya hay una comisión *activa* (aceptada y no completada)
                if (profile.acceptedCommission && profile.dailyCommissions.find(c => c.id === profile.acceptedCommission && !c.completed)) {
                    const acceptedCommData = commissionsList.find(x => x.id === profile.acceptedCommission);
                    const acceptedTitle = acceptedCommData ? acceptedCommData.title : 'Unknown Mission';
                    // Si la misión que se intenta reclamar NO es la misma que la activa
                    if (profile.acceptedCommission !== commissionToClaim.id) {
                        return interaction.editReply({
                            content: `❌ You already have an active commission: **${acceptedTitle}**. Complete or skip that one first.`,
                        });
                    }
                    // Si es la misma misión, simplemente la volvemos a mostrar (o se permite continuar si ya fue "aceptada")
                    // No hay "else return" aquí, deja que la lógica de abajo la maneje de nuevo.
                }

                // Intentar aceptar la comisión. La función acceptCommission en economyUtils
                // ahora maneja si la comisión es válida para ser aceptada.
                const accepted = await acceptCommission(userId, commissionToClaim.id);

                if (!accepted) {
                    return interaction.editReply({ content: '❌ Could not accept this commission. It might be already completed or invalid.' });
                }
                
                // Si llegamos aquí, la comisión fue aceptada (o ya estaba aceptada)
                // Ahora, manejar los diferentes tipos de comisiones
                
                // --- 🎯 HANDLE TYPE: SIMPLE (auto-completed) ---
                if (data.type === 'simple') {
                    // La lógica para completar y dar recompensas ya la tienes aquí.
                    // Asegúrate de usar 'commissionToClaim' para actualizar el objeto correcto en el array
                    commissionToClaim.completed = true; 
                    profile.balance = Math.max(0, profile.balance + (data.reward?.mora || 0));
                    profile.intelFragments = Math.max(0, (profile.intelFragments || 0) + (data.reward?.intelFragments || 0));
                    profile.reputation = Math.max(0, (profile.reputation || 0) + (data.reward?.reputation || 0));
                    profile.acceptedCommission = null; // No hay misión "activa" si es simple
                    await profile.save(); // Guarda los cambios en el perfil

                    const embed = new EmbedBuilder()
                        .setTitle(`🎯 Completed: ${data.title}`)
                        .setDescription(`${data.outcome}`)
                        .addFields(
                            { name: 'Rewards', value: `💰 ${data.reward?.mora || 0} ${MORA_EMOJI}, 🧩 ${data.reward?.intelFragments || 0} Intel Fragments, ⭐ ${data.reward?.reputation || 0} Reputation` }
                        )
                        .setColor(0x22c55e)
                        .setTimestamp();

                    return interaction.editReply({ embeds: [embed] });
                }

                // --- 🔘 HANDLE TYPE: BUTTON ---
                else if (data.type === 'buttonOutcome') {
                    const button = new ButtonBuilder()
                        .setCustomId(`commission_button_outcome_${num - 1}_${interaction.user.id}`) // Asegúrate de que el CustomId incluya el UserID
                        .setLabel(data.buttonLabel || 'Start Mission')
                        .setStyle(ButtonStyle.Primary);

                    const embed = new EmbedBuilder()
                        .setTitle(`${data.title}`)
                        .setDescription(`${data.description}`)
                        .setColor(0x3b82f6)
                        .setFooter({ text: 'Click the button to begin the task.' });

                    const row = new ActionRowBuilder().addComponents(button);
                    return interaction.editReply({
                        embeds: [embed],
                        components: [row],
                    });
                }

                // --- 🧠 HANDLE TYPE: MULTIPLE CHOICE ---
                else if (data.type === 'multipleChoice') {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`commission_multiple_choice_${num - 1}_${interaction.user.id}`) // Asegúrate de que el CustomId incluya el UserID
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
                    return interaction.editReply({
                        embeds: [embed],
                        components: [row],
                    });
                }

                return interaction.editReply({
                    content: '⚠ This type of commission is not yet supported for claiming.',
                });
            }

            // --- Lógica para el subcomando 'skip' ---
            else if (subCommandName === 'skip') {
                const skipResult = await skipCommission(userId); // Usa la nueva función de economyUtils

                if (skipResult.success) {
                    await interaction.editReply({ content: skipResult.message });
                } else {
                    await interaction.editReply({ content: `⚠ ${skipResult.message}` });
                }
            }
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