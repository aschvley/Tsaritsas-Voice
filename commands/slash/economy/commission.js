// commands/slash/economy/commission.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

    async run(client, interaction, tools) {
        // CAMBIO AQUI: Quitar { ephemeral: true } para que el deferReply sea público.
        // Si queremos que solo el 'status' sea privado, podemos manejarlo adentro.
        await interaction.deferReply(); // OJO: Quité el 'ephemeral: true' AQUI

        const userProfile = await getOrCreateProfile(interaction.user.id);
        await ensureDailyCommissions(userProfile.userId);
        await userProfile.save();

        const command = interaction.options.getSubcommand();

        if (command === 'status') {
            const freshUserProfile = await UserEconomy.findOne({ userId: interaction.user.id });
            if (!freshUserProfile) {
                return interaction.editReply({ content: 'Your profile could not be found after update. Please try again or contact support.', ephemeral: true }); // Este sí lo dejamos privado
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
            // CAMBIO AQUI: La respuesta de status SIEMPRE debe ser privada.
            await interaction.editReply({ embeds: [embed], ephemeral: true }); // Este se mantiene privado
            
        } else if (command === 'claim') {
            const num = interaction.options.getInteger('number');
            const commissionIndex = num - 1;

            if (num < 1 || num > 4) {
                return interaction.editReply({ content: 'Please provide a commission number between 1 and 4.', ephemeral: true }); // Privado
            }

            const userCommissions = userProfile.dailyCommissions;
            if (!userCommissions || userCommissions.length === 0) {
                return interaction.editReply({ content: 'You have no daily commissions to claim. Use `/commission status` to check.', ephemeral: true }); // Privado
            }

            const commissionToClaimData = userCommissions[commissionIndex];
            if (!commissionToClaimData) {
                return interaction.editReply({ content: 'There is no mission in that slot. Please check your `/commission status`.', ephemeral: true }); // Privado
            }

            if (commissionToClaimData.completed) {
                return interaction.editReply({ content: 'This commission has already been completed or skipped today.', ephemeral: true }); // Privado
            }

            if (userProfile.acceptedCommission && userProfile.acceptedCommission.id === commissionToClaimData.id) {
                return interaction.editReply({ content: `You already have an active commission: **[[${commissionsList.find(c => c.id === userProfile.acceptedCommission.id)?.title || 'Unknown Mission'}]]**. Complete or skip that one first.`, ephemeral: true }); // Privado
            }
            if (userProfile.acceptedCommission) {
                return interaction.editReply({ content: `You already have an active commission. Complete or skip that one first.`, ephemeral: true }); // Privado
            }

            const commissionDetails = commissionsList.find(c => c.id === commissionToClaimData.id);

            if (!commissionDetails) {
                return interaction.editReply({ content: 'The selected commission data could not be found. It might be corrupted or removed.', ephemeral: true }); // Privado
            }

            // Marcar la misión como aceptada en el perfil del usuario
            userProfile.acceptedCommission = {
                id: commissionDetails.id,
                type: commissionDetails.type,
                index: commissionIndex, // Guardar el índice para saber qué misión es
            };
            await userProfile.save();

            let replyMessage = `<@${interaction.user.id}> has accepted: **[[${commissionDetails.title}]]**\n`; // CAMBIO: Mensaje público
            const row = new ActionRowBuilder();
            let componentsToAdd = [];
            let ephemeralClaim = false; // CAMBIO CLAVE: Los mensajes de claim ahora NO son efímeros por defecto.

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

                    // CAMBIO AQUI: La respuesta final de simple siempre será pública.
                    await interaction.editReply({ embeds: [simpleRewardEmbed] }); // NO ephemeral
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
                    // ephemeralClaim se mantiene en false
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
                    // ephemeralClaim se mantiene en false
                    break;

                case 'reactionChallenge':
                    replyMessage += `\n**${commissionDetails.prompt}**\nReact with the appropriate emoji!`;
                    ephemeralClaim = false; // Ya era false para este tipo
                    break;

                default:
                    return interaction.editReply({ content: `This type of commission (${commissionDetails.type}) is not yet supported.`, ephemeral: true }); // Esto sí, que sea privado.
            }

            // CAMBIO AQUI: Usar ephemeralClaim para la respuesta de claim
            await interaction.editReply({ content: replyMessage, components: componentsToAdd, ephemeral: ephemeralClaim });

        } else if (command === 'skip') {
            if (userProfile.skippedCommission) {
                return interaction.editReply({ content: 'You have already skipped a mission today. Try again tomorrow.', ephemeral: true }); // Privado
            }

            const pendingCommissions = userProfile.dailyCommissions.filter(c => !c.completed);
            if (pendingCommissions.length === 0) {
                return interaction.editReply({ content: 'You have no pending commissions to skip!', ephemeral: true }); // Privado
            }

            const commissionToSkipData = pendingCommissions[0];
            const commissionIndex = userProfile.dailyCommissions.findIndex(c => c.id === commissionToSkipData.id);

            if (commissionIndex === -1) {
                return interaction.editReply({ content: 'Could not find a commission to skip.', ephemeral: true }); // Privado
            }

            userProfile.dailyCommissions[commissionIndex].completed = true;
            userProfile.skippedCommission = true;
            userProfile.acceptedCommission = null;
            await userProfile.save();

            const skippedDetails = commissionsList.find(c => c.id === commissionToSkipData.id);
            const skippedName = skippedDetails ? skippedDetails.title : 'Unknown Mission';

            // CAMBIO AQUI: Skip siempre público
            await interaction.editReply({ content: `🗑️ <@${interaction.user.id}> skipped the mission: **[[${skippedName}]]**. They can skip another one tomorrow.`, ephemeral: false });
        }
    },

    // Función para manejar las interacciones de componentes (botones y selectores) de las comisiones
    async handleComponentInteraction(interaction) {
        // En handleComponentInteraction NO se usa deferReply inicial, la interacción ya está "deferida"
        // o respondida por el mensaje que contiene el componente.
        // Lo que debemos hacer es MANEJAR LA RESPUESTA al componente.

        const [commandPrefix, componentType, missionId, outcomeIndexStr] = interaction.customId.split('_');

        const userProfile = await getOrCreateProfile(interaction.user.id);
        const acceptedCommission = userProfile.acceptedCommission;

        // Validar que la interacción corresponde a la misión activa del usuario
        if (!acceptedCommission || acceptedCommission.id !== missionId) {
            // CAMBIO AQUI: Siempre usar followUp y asegurarse de que sea público si el original es público.
            // Si el mensaje original era efímero, este followUp debe serlo también.
            // Si el mensaje original NO era efímero, este followUp PUEDE serlo o no.
            // Para simplicidad, haremos que las interacciones de componente de "claim" siempre resulten en un mensaje público.
            await interaction.deferReply({ ephemeral: false }); // Deferir la respuesta como pública
            return interaction.editReply({ content: 'This interaction is no longer valid or not for your current active commission.', ephemeral: false });
        }

        const commissionDetails = commissionsList.find(c => c.id === missionId);
        if (!commissionDetails) {
            await interaction.deferReply({ ephemeral: false });
            return interaction.editReply({ content: 'Commission details not found. Please contact support.', ephemeral: false });
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
        } else if (componentType === 'modal') { // Para modales, la interacción ya fue deferida al enviar el modal.
            const modalInput = interaction.fields.getTextInputValue('commission_modal_input');
            outcomeData = {
                message: `You submitted: "${modalInput}". Processing the result...`,
                rewards: { mora: 20, reputation: 1 } // Ejemplo de recompensa para el modal
            };
            // No es necesario deferir aquí, la interacción de modal ya se responde al final
        }

        if (!outcomeData) {
            await interaction.deferReply({ ephemeral: false });
            return interaction.editReply({ content: 'Could not process your choice for the commission. Outcome data missing.', ephemeral: false });
        }

        const rewards = outcomeData.rewards || {};
        // Mensaje visible en el canal con el resultado.
        const message = `${interaction.user.username} has chosen: ${outcomeData.label || selectedValue || "a path"}. ${outcomeData.message || ''}`;

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

        // CAMBIO CLAVE AQUI PARA HACER LA RESPUESTA PÚBLICA
        // La interaction.message es el mensaje original que contenía los componentes.
        // Si ese mensaje era efímero, no se puede editar a público.
        // La mejor manera es eliminar el mensaje efímero anterior y enviar uno nuevo público.

        if (interaction.message.ephemeral) {
            // Si el mensaje original era efímero, lo borramos y enviamos uno nuevo público.
            await interaction.message.delete().catch(err => console.error("Error deleting ephemeral message:", err)); // Intentamos borrarlo silenciosamente
            await interaction.followUp({ embeds: [resultEmbed], ephemeral: false }); // Nuevo mensaje público
        } else {
            // Si el mensaje original NO era efímero (como en reactionChallenge), entonces sí podemos editarlo.
            await interaction.editReply({ embeds: [resultEmbed], components: [] }); // Edita el mensaje original (público)
        }
    }
};