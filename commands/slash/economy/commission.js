// commands/slash/economy/commission.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getOrCreateProfile, ensureDailyCommissions, completeCommissionOutcome } = require('../../../utils/economyUtils');
const UserEconomy = require('../../../models/UserEconomy');
const commissionsList = require('../../../data/commissionsList');

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
        await interaction.deferReply(); 

        const userProfile = await getOrCreateProfile(interaction.user.id);
        await ensureDailyCommissions(userProfile.userId);
        await userProfile.save(); // Guardar cualquier cambio de ensureDailyCommissions

        const command = interaction.options.getSubcommand();

        if (command === 'status') {
            const freshUserProfile = await UserEconomy.findOne({ userId: interaction.user.id });
            if (!freshUserProfile) {
                return interaction.editReply({ content: 'Your profile could not be found after update. Please try again or contact support.', ephemeral: true });
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
                    // Modificación: Verifica si la acceptedCommission no es null y si el ID coincide
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
            await interaction.editReply({ embeds: [embed], ephemeral: true });

        } else if (command === 'claim') {
            const num = interaction.options.getInteger('number');
            const commissionIndex = num - 1;

            if (num < 1 || num > 4) {
                return interaction.editReply({ content: 'Please provide a commission number between 1 and 4.', ephemeral: true });
            }

            const userCommissions = userProfile.dailyCommissions;
            if (!userCommissions || userCommissions.length === 0) {
                return interaction.editReply({ content: 'You have no daily commissions to claim. Use `/commission status` to check.', ephemeral: true });
            }

            const commissionToClaimData = userCommissions[commissionIndex];
            if (!commissionToClaimData) {
                return interaction.editReply({ content: 'There is no mission in that slot. Please check your `/commission status`.', ephemeral: true });
            }

            if (commissionToClaimData.completed) {
                return interaction.editReply({ content: 'This commission has already been completed or skipped today.', ephemeral: true });
            }

            const commissionDetails = commissionsList.find(c => c.id === commissionToClaimData.id);

            if (!commissionDetails) {
                return interaction.editReply({ content: 'The selected commission data could not be found. It might be corrupted or removed.', ephemeral: true });
            }
            
            // ****** CAMBIO CLAVE AQUÍ: LÓGICA PARA RECLAMAR / RE-RECLAMAR *******
            if (userProfile.acceptedCommission) {
                // Si el usuario ya tiene una misión activa
                if (userProfile.acceptedCommission.id === commissionToClaimData.id) {
                    // Si intenta reclamar la MISMA misión activa, le volvemos a mostrar la interfaz interactiva.
                    // Esto es para que pueda intentar de nuevo si falló la interacción previa.
                    await interaction.editReply({ content: `You already have an active commission: **[[${commissionDetails.title}]]**. Showing it again.`, ephemeral: true }); // Mensaje efímero para indicar que ya está activa
                } else {
                    // Si tiene una misión activa DIFERENTE, no puede reclamar otra.
                    const activeMissionTitle = commissionsList.find(c => c.id === userProfile.acceptedCommission.id)?.title || 'Unknown Mission';
                    return interaction.editReply({ content: `You already have an active commission: **[[${activeMissionTitle}]]**. Complete or skip that one first.`, ephemeral: true });
                }
            } else {
                // Si no hay misión activa, establecer esta como la aceptada.
                userProfile.acceptedCommission = {
                    id: commissionDetails.id,
                    type: commissionDetails.type,
                    index: commissionIndex,
                };
                await userProfile.save(); // Guarda el estado de misión aceptada
                await interaction.editReply({ content: `You have accepted: **[[${commissionDetails.title}]]**`, ephemeral: true }); // Mensaje inicial de aceptación (efímero)
            }
            // *******************************************************************

            let replyMessage = `<@${interaction.user.id}> has accepted: **[[${commissionDetails.title}]]**\n`;
            const row = new ActionRowBuilder();
            let componentsToAdd = [];
            let ephemeralClaim = false; // Los mensajes de claim ahora NO son efímeros por defecto.

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

                    userProfile.acceptedCommission = null; // Se limpia aquí porque ya se completó.
                    await userProfile.save();

                    await interaction.editReply({ embeds: [simpleRewardEmbed] });
                    return;

                case 'buttonOutcome':
                    replyMessage += commissionDetails.description;
                    commissionDetails.outcomes.forEach((outcome, idx) => {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`commission_button_${commissionDetails.id}_${idx}`)
                                .setLabel(outcome.label)
                                .setStyle(ButtonStyle.Primary)
                        );
                    });
                    componentsToAdd.push(row);
                    ephemeralClaim = false; // Este es público, con botones
                    break;

                case 'multipleChoice':
                    replyMessage += `\n**${commissionDetails.question}**`;
                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`commission_select_${commissionDetails.id}`)
                        .setPlaceholder('Choose your decision')
                        .addOptions(
                            commissionDetails.options.map(option => ({
                                label: option.label,
                                value: option.value,
                            }))
                        );
                    row.addComponents(selectMenu);
                    componentsToAdd.push(row);
                    ephemeralClaim = false; // Este es público, con selector
                    break;

                case 'reactionChallenge':
                    replyMessage += `\n**${commissionDetails.prompt}**\nReact with the appropriate emoji!`;
                    ephemeralClaim = false; // Este es público, con reacciones
                    break;

                default:
                    // Si el tipo de comisión no es compatible, debemos limpiar acceptedCommission
                    userProfile.acceptedCommission = null;
                    await userProfile.save();
                    return interaction.editReply({ content: `This type of commission (${commissionDetails.type}) is not yet supported and your active commission has been cleared.`, ephemeral: true });
            }

            // CAMBIO: Si el tipo de misión no es 'simple', la respuesta con los componentes SÍ debe ser pública.
            // La línea `await interaction.editReply({ content: `You have accepted: **[[${commissionDetails.title}]]**`, ephemeral: true });`
            // ya se encarga del primer mensaje efímero cuando se acepta la misión por primera vez.
            // Aquí, si es una misión interactiva, vamos a hacer un followUp si ya se ha respondido o editar si no.
            // Para simplificar, haremos que el mensaje con los componentes SIEMPRE sea un followUp, y el ephemeral lo maneja la lógica de cada tipo.

            // Para asegurar que la interacción con botones/selectores se muestre públicamente, incluso si fue re-reclamada
            await interaction.followUp({ content: replyMessage, components: componentsToAdd, ephemeral: false });

        } else if (command === 'skip') {
            if (userProfile.skippedCommission) {
                return interaction.editReply({ content: 'You have already skipped a mission today. Try again tomorrow.', ephemeral: true });
            }

            const pendingCommissions = userProfile.dailyCommissions.filter(c => !c.completed);
            if (pendingCommissions.length === 0) {
                return interaction.editReply({ content: 'You have no pending commissions to skip!', ephemeral: true });
            }

            // Si hay una comisión activa, esta es la que debería skipearse primero.
            let commissionToSkipData;
            let indexToSkip = -1;

            if (userProfile.acceptedCommission && !userProfile.dailyCommissions[userProfile.acceptedCommission.index].completed) {
                commissionToSkipData = userProfile.dailyCommissions[userProfile.acceptedCommission.index];
                indexToSkip = userProfile.acceptedCommission.index;
            } else {
                // Si no hay activa o la activa ya está completada (error de estado), toma la primera pendiente.
                commissionToSkipData = pendingCommissions[0];
                indexToSkip = userProfile.dailyCommissions.findIndex(c => c.id === commissionToSkipData.id);
            }

            if (indexToSkip === -1 || !commissionToSkipData) {
                return interaction.editReply({ content: 'Could not find a commission to skip.', ephemeral: true });
            }
            
            userProfile.dailyCommissions[indexToSkip].completed = true;
            userProfile.skippedCommission = true;
            userProfile.acceptedCommission = null; // Siempre se limpia la activa al skipear
            await userProfile.save();

            const skippedDetails = commissionsList.find(c => c.id === commissionToSkipData.id);
            const skippedName = skippedDetails ? skippedDetails.title : 'Unknown Mission';

            await interaction.editReply({ content: `🗑️ <@${interaction.user.id}> skipped the mission: **[[${skippedName}]]**. They can skip another one tomorrow.`, ephemeral: false });
        }
    },

    async handleComponentInteraction(interaction) {
        // Asumiendo que esta función siempre es invocada por una interacción con componentes (botones/select)
        // y que el mensaje inicial de "claim" ya fue editado o respondido.
        // Aquí siempre respondemos con followUp si la interacción es para un usuario diferente
        // o editamos el mensaje original si es para el mismo usuario.
        
        // Deferir la interacción del componente (puede ser visible o no dependiendo del contexto)
        await interaction.deferUpdate(); // Esto evita el "This interaction failed" si la respuesta tarda

        const [commandPrefix, componentType, missionId, outcomeIndexStr] = interaction.customId.split('_');

        const userProfile = await getOrCreateProfile(interaction.user.id);
        const acceptedCommission = userProfile.acceptedCommission;

        // Validar que la interacción corresponde a la misión activa del usuario
        // Y que el usuario que interactúa es el mismo que la aceptó (opcional, pero buena práctica)
        if (!acceptedCommission || acceptedCommission.id !== missionId || userProfile.userId !== interaction.user.id) {
            // Si la interacción no es para la misión activa de este usuario, respondemos efímeramente.
            return interaction.followUp({ content: 'This interaction is not for your current active commission or is outdated.', ephemeral: true });
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
        } else if (componentType === 'modal') {
             // Modales son un poco diferentes, la respuesta inicial se maneja en el listener del modal
             // Aquí solo procesamos el resultado del modal si se invoca esta función desde ahí.
             // Para simplificar, asumimos que completeCommissionOutcome se llama después de procesar el modal.
            return; // No necesitamos más lógica aquí si el modal ya llamó a completeCommissionOutcome
        }

        if (!outcomeData) {
            return interaction.followUp({ content: 'Could not process your choice for the commission. Outcome data missing.', ephemeral: true });
        }

        const rewards = outcomeData.rewards || {};
        const message = `${interaction.user.username} has chosen: **${outcomeData.label || selectedValue || "a path"}**. ${outcomeData.message || ''}`;

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
        userProfile.acceptedCommission = null; // Se limpia la misión activa después de completarla
        await userProfile.save();

        // Editar el mensaje original para mostrar el resultado y eliminar los componentes.
        // Si el mensaje original del "claim" fue efímero, `editReply` funciona con `ephemeral: true`.
        // Si fue público, `editReply` lo edita públicamente.
        await interaction.message.edit({ embeds: [resultEmbed], components: [] });
    }
};