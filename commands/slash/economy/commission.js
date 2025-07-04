// commands/slash/economy/commission.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getOrCreateProfile, ensureDailyCommissions, completeCommissionOutcome } = require('../../../utils/economyUtils');
const UserEconomy = require('../../../models/UserEconomy'); // Asegúrate de tener este modelo
const commissionsList = require('../../../data/commissionsList'); // Asegúrate de la ruta correcta

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('commission')
        .setDescription('Manage your daily Fatui commissions.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your current daily commissions and their progress.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Begin an available daily commission.')
                .addIntegerOption(option =>
                    option
                        .setName('number')
                        .setDescription('The number of the commission to claim (1-4).')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('skip')
                .setDescription('Skip one daily commission for today.')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userProfile = await getOrCreateProfile(interaction.user.id);
        await ensureDailyCommissions(userProfile);
        await userProfile.save();

        const command = interaction.options.getSubcommand();

        if (command === 'status') {
            const freshUserProfile = await UserEconomy.findOne({ userId: interaction.user.id });
            if (!freshUserProfile) {
                return interaction.editReply('Your profile could not be found after update. Please try again or contact support.');
            }

            const activeCommission = freshUserProfile.acceptedCommission;
            const embed = new EmbedBuilder()
                .setTitle('📜 Your Commission Status')
                .setColor('#B30000'); // Color Fatui

            if (!freshUserProfile.dailyCommissions || freshUserProfile.dailyCommissions.length === 0) {
                embed.setDescription('You have no daily commissions assigned. They should reset at the start of a new day.');
            } else {
                let description = '';
                freshUserProfile.dailyCommissions.forEach((commissionData, index) => {
                    const commissionDetails = commissionsList.find(c => c.id === commissionData.id);
                    const statusEmoji = commissionData.completed ? '✅ Completed' : '🕒 Pending';
                    const activeIndicator = activeCommission && activeCommission.id === commissionData.id ? '(Active)' : '';

                    if (commissionDetails) {
                        description += `${index + 1}. [[${commissionDetails.title}]] ${statusEmoji} ${activeIndicator}\n`;
                    } else {
                        description += `${index + 1}. [Unknown Mission] ${statusEmoji}\n`;
                    }
                });
                embed.setDescription(description);
            }

            embed.setFooter({ text: `Today at ${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` });
            await interaction.editReply({ embeds: [embed] });

        } else if (command === 'claim') {
            const num = interaction.options.getInteger('number');
            const commissionIndex = num - 1;

            if (num < 1 || num > 4) {
                return interaction.editReply('Please provide a commission number between 1 and 4.');
            }

            const userCommissions = userProfile.dailyCommissions;
            if (!userCommissions || userCommissions.length === 0) {
                return interaction.editReply('You have no daily commissions to claim. Use `/commission status` to check.');
            }

            const commissionToClaimData = userCommissions[commissionIndex];
            if (!commissionToClaimData) {
                return interaction.editReply('There is no mission in that slot. Please check your `/commission status`.');
            }

            if (commissionToClaimData.completed) {
                return interaction.editReply('This commission has already been completed or skipped today.');
            }

            if (userProfile.acceptedCommission && userProfile.acceptedCommission.id === commissionToClaimData.id) {
                return interaction.editReply(`You already have an active commission: **[[${commissionsList.find(c => c.id === userProfile.acceptedCommission.id)?.title || 'Unknown Mission'}]]**. Complete or skip that one first.`);
            }
            if (userProfile.acceptedCommission) {
                return interaction.editReply(`You already have an active commission. Complete or skip that one first.`);
            }

            const commissionDetails = commissionsList.find(c => c.id === commissionToClaimData.id);

            if (!commissionDetails) {
                return interaction.editReply('The selected commission data could not be found. It might be corrupted or removed.');
            }

            // Marcar la misión como aceptada en el perfil del usuario
            userProfile.acceptedCommission = {
                id: commissionDetails.id,
                type: commissionDetails.type,
                index: commissionIndex, // Guardar el índice para saber qué misión es
            };
            await userProfile.save();

            let replyMessage = `You have accepted: **[[${commissionDetails.title}]]**\n`;
            const row = new ActionRowBuilder();
            let componentsToAdd = [];
            let ephemeral = true;

            switch (commissionDetails.type) {
                case 'simple':
                    const simpleRewardEmbed = new EmbedBuilder()
                        .setTitle(`✅ Completed: [[${commissionDetails.title}]]`)
                        .setDescription(commissionDetails.outcome || 'Mission completed successfully.')
                        .setColor('#00FF00');

                    let rewardsText = '';
                    for (const type in commissionDetails.reward) {
                        const amount = commissionDetails.reward[type];
                        if (amount > 0) {
                            switch (type) {
                                case 'mora': rewardsText += `💰 ${amount} Mora, `; break;
                                case 'intelFragments': rewardsText += `🧩 ${amount} Intel Fragments, `; break;
                                case 'reputation': rewardsText += `⭐ ${amount} Reputation, `; break;
                            }
                        }
                    }
                    if (rewardsText) {
                        simpleRewardEmbed.addFields({ name: 'Rewards', value: rewardsText.slice(0, -2) });
                        await completeCommissionOutcome(userProfile, commissionIndex, commissionDetails.reward);
                    } else {
                        await completeCommissionOutcome(userProfile, commissionIndex, {});
                    }

                    userProfile.acceptedCommission = null;
                    await userProfile.save();

                    await interaction.editReply({ embeds: [simpleRewardEmbed] });
                    return;

                case 'buttonOutcome':
                    replyMessage += commissionDetails.description;
                    commissionDetails.outcomes.forEach((outcome, idx) => {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`commission_button_${commissionDetails.id}_${idx}`) // Format: commission_button_<missionID>_<outcomeIndex>
                                .setLabel(outcome.label)
                                .setStyle(ButtonStyle.Primary)
                        );
                    });
                    componentsToAdd.push(row);
                    break;

                case 'multipleChoice':
                    replyMessage += `\n**${commissionDetails.question}**`;
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`commission_select_${commissionDetails.id}`) // Format: commission_select_<missionID>
                        .setPlaceholder('Choose your decision')
                        .addOptions(
                            commissionDetails.options.map(option => ({
                                label: option.label,
                                value: option.value,
                            }))
                        );
                    row.addComponents(selectMenu);
                    componentsToAdd.push(row);
                    break;

                case 'reactionChallenge':
                    replyMessage += `\n**${commissionDetails.prompt}**\nReact with the appropriate emoji!`;
                    // For reactionChallenge, the interaction is handled with reactions on a regular (non-ephemeral) message.
                    // This type will need a regular message (not ephemeral) and a message collector or similar logic.
                    ephemeral = false; // Make the message public for reactions
                    break;

                default:
                    return interaction.editReply(`This type of commission (${commissionDetails.type}) is not yet supported.`);
            }

            await interaction.editReply({ content: replyMessage, components: componentsToAdd, ephemeral: ephemeral });

        } else if (command === 'skip') {
            if (userProfile.skippedCommission) {
                return interaction.editReply('You have already skipped a mission today. Try again tomorrow.');
            }

            const pendingCommissions = userProfile.dailyCommissions.filter(c => !c.completed);
            if (pendingCommissions.length === 0) {
                return interaction.editReply('You have no pending commissions to skip!');
            }

            const commissionToSkipData = pendingCommissions[0];
            const commissionIndex = userProfile.dailyCommissions.findIndex(c => c.id === commissionToSkipData.id);

            if (commissionIndex === -1) {
                return interaction.editReply('Could not find a commission to skip.');
            }

            userProfile.dailyCommissions[commissionIndex].completed = true;
            userProfile.skippedCommission = true;
            userProfile.acceptedCommission = null;
            await userProfile.save();

            const skippedDetails = commissionsList.find(c => c.id === commissionToSkipData.id);
            const skippedName = skippedDetails ? skippedDetails.title : 'Unknown Mission';

            await interaction.editReply(`You skipped the mission: **[[${skippedName}]]**. You can skip another one tomorrow.`);
        }
    },
    
    // Función para manejar las interacciones de componentes (botones y selectores) de las comisiones
    async handleComponentInteraction(interaction) {
        await interaction.deferUpdate(); // Deferir la actualización para que el usuario sepa que se está procesando

        // El customId tendrá el formato: 'commission_select_<missionID>' o 'commission_button_<missionID>_<outcomeIndex>'
        const [commandPrefix, componentType, missionId, outcomeIndexStr] = interaction.customId.split('_');

        const userProfile = await getOrCreateProfile(interaction.user.id);
        const acceptedCommission = userProfile.acceptedCommission;

        // Validar que la interacción corresponde a la misión activa del usuario
        if (!acceptedCommission || acceptedCommission.id !== missionId) {
            return interaction.followUp({ content: 'This interaction is no longer valid or not for your current active commission.', ephemeral: true });
        }

        const commissionDetails = commissionsList.find(c => c.id === missionId);
        if (!commissionDetails) {
            return interaction.followUp({ content: 'Commission details not found. Please contact support.', ephemeral: true });
        }

        let outcomeData;
        let selectedValue; // Para multipleChoice

        if (componentType === 'button') {
            const outcomeIdx = parseInt(outcomeIndexStr);
            outcomeData = commissionDetails.outcomes[outcomeIdx];
        } else if (componentType === 'select') { // Para StringSelectMenu
            selectedValue = interaction.values[0]; // El valor seleccionado del menú
            const selectedOption = commissionDetails.options.find(opt => opt.value === selectedValue);
            if (selectedOption && commissionDetails.outcomes[selectedOption.outcome]) {
                outcomeData = commissionDetails.outcomes[selectedOption.outcome]; // Obtener el objeto de outcome real
            }
        }

        if (!outcomeData) {
            return interaction.followUp({ content: 'Could not process your choice for the commission. Outcome data missing.', ephemeral: true });
        }

        const rewards = outcomeData.rewards || {};
        const message = outcomeData.message || (componentType === 'button' ? outcomeData.label : `You chose: ${selectedValue}`);

        const resultEmbed = new EmbedBuilder()
            .setTitle(`✅ Completed: [[${commissionDetails.title}]]`)
            .setDescription(message)
            .setColor('#00FF00');

        let rewardsText = '';
        for (const type in rewards) {
            const amount = rewards[type];
            if (amount > 0) {
                switch (type) {
                    case 'mora': rewardsText += `💰 ${amount} Mora, `; break;
                    case 'intelFragments': rewardsText += `🧩 ${amount} Intel Fragments, `; break;
                    case 'reputation': rewardsText += `⭐ ${amount} Reputation, `; break;
                }
            }
        }
        if (rewardsText) {
            resultEmbed.addFields({ name: 'Rewards', value: rewardsText.slice(0, -2) });
        }

        await completeCommissionOutcome(userProfile, acceptedCommission.index, rewards);
        userProfile.acceptedCommission = null;
        await userProfile.save();

        // Editar el mensaje original de la interacción para mostrar el resultado y eliminar los componentes
        await interaction.editReply({ embeds: [resultEmbed], components: [] });
    }
};