// Tsaritsa's-Voice/commands/slash/economy/commission.js

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    // Puedes necesitar estas si las usas en otras partes de tus subcomandos
} = require('discord.js');

const commissionsList = require('../../../data/commissionsList');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

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
            // Lógica para el subcomando 'status'
            if (subCommandName === 'status') {
                const userId = interaction.user.id;
                const profile = await getOrCreateProfile(userId);

                if (!profile.commissions || profile.commissions.length === 0) {
                    return interaction.reply({ content: 'You don\'t have any assigned missions yet. Use /commissions to get them.', ephemeral: true });
                }

                const description = profile.commissions.map((c, i) => {
                    const data = commissionsList.find(x => x.id === c.id);
                    return `**${i + 1}. [${data.title}]** — ${c.completed ? '✅ Completed' : '🕒 Pending'}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📋 Your Commission Status')
                    .setDescription(description)
                    .setColor(0xfacc15)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });

            }
            // Lógica para el subcomando 'claim'
            else if (subCommandName === 'claim') {
                const userId = interaction.user.id;
                const num = interaction.options.getInteger('number');
                const profile = await getOrCreateProfile(userId);

                if (!profile.commissions || !profile.commissions[num - 1]) {
                    return interaction.reply({
                        content: '❌ There is no mission in that slot.',
                        ephemeral: true,
                    });
                }

                const commission = profile.commissions[num - 1];
                if (commission.completed) {
                    return interaction.reply({
                        content: '✅ That mission is already completed.',
                        ephemeral: true,
                    });
                }

                const data = commissionsList.find(x => x.id === commission.id);

                // ───── 🎯 HANDLE TYPE: SIMPLE (auto-completed) ─────
                if (data.type === 'simple') {
                    commission.completed = true;
                    profile.balance += data.reward?.mora || 0;
                    profile.fragments = (profile.fragments || 0) + (data.reward?.intelFragments || 0);
                    profile.reputation = (profile.reputation || 0) + (data.reward?.reputation || 0);
                    await profile.save();

                    const embed = new EmbedBuilder()
                        .setTitle(`🎯 Completed: ${data.title}`)
                        .setDescription(`${data.outcome}`)
                        .setColor(0x22c55e)
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // ───── 🔘 HANDLE TYPE: BUTTON ─────
                if (data.type === 'buttonOutcome') {
                    const button = new ButtonBuilder()
                        .setCustomId(`commission_button_${num - 1}`)
                        .setLabel(data.buttonLabel || 'Start')
                        .setStyle(ButtonStyle.Primary);

                    const embed = new EmbedBuilder()
                        .setTitle(`${data.title}`)
                        .setDescription(`${data.description}`)
                        .setColor(0x3b82f6)
                        .setFooter({ text: 'Click the button to begin the task.' });

                    const row = new ActionRowBuilder().addComponents(button);
                    return interaction.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: true,
                    });
                }

                // ───── 🧠 HANDLE TYPE: MULTIPLE CHOICE ─────
                if (data.type === 'multipleChoice') {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`commission_select_${num - 1}`)
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
                    return interaction.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: true,
                    });
                }

                return interaction.reply({
                    content: '⚠ This type of commission is not yet supported.',
                    ephemeral: true,
                });
            }
            // Lógica para el subcomando 'skip'
            else if (subCommandName === 'skip') {
                const userId = interaction.user.id;
                const profile = await getOrCreateProfile(userId);

                if (profile.skipped_today) {
                    return interaction.reply({ content: '⚠ You have already skipped a mission today. Try again tomorrow.', ephemeral: true });
                }

                const remaining = profile.commissions?.filter(c => !c.completed);
                if (!remaining || remaining.length === 0) {
                    return interaction.reply({ content: '🎉 You\'ve completed all your missions today.', ephemeral: true });
                }

                const skipped = remaining[0];
                profile.commissions = profile.commissions.filter(c => c !== skipped);
                profile.skipped_today = true;

                await profile.save();

                await interaction.reply({ content: `🗑 You skipped a mission: ${skipped.id}`, ephemeral: true });
            }
            // Fallback en caso de que el subcomando no se encuentre (no debería ocurrir si está bien definido td)
            else {
                await interaction.reply({ content: 'Subcommand of commission not recognized.', ephemeral: true });
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