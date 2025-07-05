// commands/slash/economy/commission.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const { getOrCreateProfile, ensureDailyCommissions, completeCommissionOutcome } = require('../../../utils/economyUtils');
const UserEconomy = require('../../../models/UserEconomy');
const commissionsList = require('../../../data/commissionsList');

// ********** NUEVA FUNCIÓN PARA MANEJAR REACTION CHALLENGE **********
async function handleReactionChallenge(client, interaction, userProfile, commissionDetails, commissionIndex) {
    const filter = (reaction, user) => {
        const validEmojis = commissionDetails.reactions.map(r => r.emoji);
        return user.id === interaction.user.id && validEmojis.includes(reaction.emoji.name);
    };

    const challengeMessage = await interaction.followUp({ 
        content: `**${interaction.user.username}**, for your mission **${commissionDetails.title}**: ${commissionDetails.prompt}\n(React below with your choice)`, 
        ephemeral: false 
    });

    for (const reaction of commissionDetails.reactions) {
        await challengeMessage.react(reaction.emoji);
    }

    challengeMessage.awaitReactions({ filter, max: 1, time: 60_000, errors: ['time'] })
        .then(async collected => {
            const reaction = collected.first();
            const chosenOutcome = commissionDetails.reactions.find(r => r.emoji === reaction.emoji.name);

            if (!chosenOutcome) {
                console.error("Reaction collected but no matching outcome found.");
                return interaction.followUp({ content: 'An unknown error occurred with your reaction. Please try again later.', ephemeral: true });
            }

            const outcomeData = commissionDetails.outcomes[chosenOutcome.outcome];
            const rewards = outcomeData.rewards || {};
            const message = `${interaction.user.username} chose ${chosenOutcome.label}. ${outcomeData.message || ''}`;

            const resultEmbed = new EmbedBuilder()
                .setTitle(`✅ Completed: ${commissionDetails.title}`) // Removido corchetes extra
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

            await completeCommissionOutcome(userProfile, commissionIndex, rewards);
            userProfile.acceptedCommission = null; 
            await userProfile.save();

            await challengeMessage.edit({ embeds: [resultEmbed], content: `${interaction.user.username}'s challenge completed!`, components: [] });
            await challengeMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions:', error));

        })
        .catch(async collected => {
            console.log('No reaction collected or time expired for reaction challenge.');
            userProfile.acceptedCommission = null; 
            await userProfile.save();
            await interaction.followUp({ content: 'You took too long to react, mission failed. Your active commission has been cleared, try again!', ephemeral: false });
            await challengeMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions:', error));
        });
}
// *******************************************************************


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
        await userProfile.save(); 

        const command = interaction.options.getSubcommand();

        if (command === 'status') {
            const freshUserProfile = await UserEconomy.findOne({ userId: interaction.user.id });
            if (!freshUserProfile) {
                return interaction.editReply({ content: 'Your profile could not be found after update. Please try again or contact support.', ephemeral: true });
            }

            const activeCommission = freshUserProfile.acceptedCommission;
            const embed = new EmbedBuilder()
                .setTitle('📜 Your Commission Status')
                .setColor('#B30000'); 

            if (!freshUserProfile.dailyCommissions || freshUserProfile.dailyCommissions.length === 0) {
                embed.setDescription('You have no daily commissions assigned. They should reset at the start of a new day.');
            } else {
                let description = '';
                freshUserProfile.dailyCommissions.forEach((commissionData, index) => {
                    const commissionDetails = commissionsList.find(c => c.id === commissionData.id);
                    const statusEmoji = commissionData.completed ? '✅ Completed' : '🕒 Pending';
                    const activeIndicator = activeCommission && activeCommission.id === commissionData.id ? '(Active)' : '';

                    if (commissionDetails) {
                        // **** CAMBIO AQUÍ: Formato del título sin corchetes dobles extra ****
                        description += `${index + 1}. ${commissionDetails.title} ${statusEmoji} ${activeIndicator}\n`;
                    } else {
                        // Mensaje más amigable si una misión es "desconocida", aunque esto debería ser raro ahora.
                        description += `${index + 1}. Unknown Mission (ID: ${commissionData.id}) ${statusEmoji}\n`;
                    }
                });
                embed.setDescription(description);

                // **** NUEVO MENSAJE DE AYUDA ****
                const hasPending = freshUserProfile.dailyCommissions.some(c => !c.completed);
                if (hasPending) {
                    embed.addFields({ name: '\u200B', value: 'Use `/commission claim <number>` to begin one of your available missions.' });
                }
            }

            // **** CAMBIO AQUÍ: Formato de la hora ****
            // Opciones para toLocaleTimeString para un formato más legible (ej. "10:39 PM")
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true }; 
            // Usamos 'en-US' para asegurar el formato AM/PM estándar.
            const formattedTime = new Date().toLocaleTimeString('en-US', timeOptions); 

            embed.setFooter({ text: `Today at ${formattedTime}` });
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
                return interaction.editReply({ 
                    content: `Error: The selected commission data (ID: \`${commissionToClaimData.id}\`) could not be found in the bot's mission list. Please report this to an admin.`, 
                    ephemeral: true 
                });
            }
            
            if (userProfile.acceptedCommission) {
                if (userProfile.acceptedCommission.id === commissionToClaimData.id) {
                    await interaction.editReply({ content: `You already have an active commission: **${commissionDetails.title}**. Showing it again.`, ephemeral: true });
                } else {
                    const activeMissionTitle = commissionsList.find(c => c.id === userProfile.acceptedCommission.id)?.title || 'Unknown Mission';
                    return interaction.editReply({ content: `You already have an active commission: **${activeMissionTitle}**. Complete or skip that one first.`, ephemeral: true });
                }
            } else {
                userProfile.acceptedCommission = {
                    id: commissionDetails.id,
                    type: commissionDetails.type,
                    index: commissionIndex,
                };
                await userProfile.save();
                await interaction.editReply({ content: `You have accepted: **${commissionDetails.title}**`, ephemeral: true });
            }

            let replyMessage = `<@${interaction.user.id}> has accepted: **${commissionDetails.title}**\n`;
            const row = new ActionRowBuilder();
            let componentsToAdd = [];

            switch (commissionDetails.type) {
                case 'simple':
                    const simpleRewardEmbed = new EmbedBuilder()
                        .setTitle(`✅ Completed: ${commissionDetails.title}`)
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

                    await interaction.followUp({ embeds: [simpleRewardEmbed], ephemeral: false }); 
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
                    await interaction.followUp({ content: replyMessage, components: componentsToAdd, ephemeral: false });
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
                    await interaction.followUp({ content: replyMessage, components: componentsToAdd, ephemeral: false });
                    break;

                case 'reactionChallenge':
                    await handleReactionChallenge(client, interaction, userProfile, commissionDetails, commissionIndex);
                    break; 

                default:
                    userProfile.acceptedCommission = null;
                    await userProfile.save();
                    return interaction.editReply({ content: `This type of commission (${commissionDetails.type}) is not yet supported and your active commission has been cleared.`, ephemeral: true });
            }

        } else if (command === 'skip') {
            if (userProfile.skippedCommission) {
                return interaction.editReply({ content: 'You have already skipped a mission today. Try again tomorrow.', ephemeral: true });
            }

            const pendingCommissions = userProfile.dailyCommissions.filter(c => !c.completed);
            if (pendingCommissions.length === 0) {
                return interaction.editReply({ content: 'You have no pending commissions to skip!', ephemeral: true });
            }

            let commissionToSkipData;
            let indexToSkip = -1;

            if (userProfile.acceptedCommission && !userProfile.dailyCommissions[userProfile.acceptedCommission.index].completed) {
                commissionToSkipData = userProfile.dailyCommissions[userProfile.acceptedCommission.index];
                indexToSkip = userProfile.acceptedCommission.index;
            } else {
                commissionToSkipData = pendingCommissions[0];
                indexToSkip = userProfile.dailyCommissions.findIndex(c => c.id === commissionToSkipData.id);
            }

            if (indexToSkip === -1 || !commissionToSkipData) {
                return interaction.editReply({ content: 'Could not find a commission to skip.', ephemeral: true });
            }
            
            userProfile.dailyCommissions[indexToSkip].completed = true;
            userProfile.skippedCommission = true;
            userProfile.acceptedCommission = null;
            await userProfile.save();

            const skippedDetails = commissionsList.find(c => c.id === commissionToSkipData.id);
            const skippedName = skippedDetails ? skippedDetails.title : 'Unknown Mission';

            await interaction.editReply({ content: `🗑️ <@${interaction.user.id}> skipped the mission: **${skippedName}**. They can skip another one tomorrow.`, ephemeral: false });
        }
    },

    async handleComponentInteraction(interaction) {
        await interaction.deferUpdate();

        const [commandPrefix, componentType, missionId, outcomeIndexStr] = interaction.customId.split('_');

        const userProfile = await getOrCreateProfile(interaction.user.id);
        const acceptedCommission = userProfile.acceptedCommission;

        if (!acceptedCommission || acceptedCommission.id !== missionId || userProfile.userId !== interaction.user.id) {
            return interaction.followUp({ content: 'This interaction is not for your current active commission or is outdated.', ephemeral: true });
        }

        const commissionDetails = commissionsList.find(c => c.id === missionId);
        if (!commissionDetails) {
            return interaction.followUp({ content: 'Commission details not found. Please contact support.', ephemeral: true });
        }

        let outcomeData;
        let selectedValue; 

        if (componentType === 'button') {
            const outcomeIdx = parseInt(outcomeIndexStr);
            outcomeData = commissionDetails.outcomes[outcomeIdx];
        } else if (componentType === 'select') {
            selectedValue = interaction.values[0]; 
            const selectedOption = commissionDetails.options.find(opt => opt.value === selectedValue);
            if (selectedOption && commissionDetails.outcomes[selectedOption.outcome]) {
                outcomeData = commissionDetails.outcomes[selectedOption.outcome]; 
            }
        } else if (componentType === 'modal') {
            return;
        }

        if (!outcomeData) {
            return interaction.followUp({ content: 'Could not process your choice for the commission. Outcome data missing.', ephemeral: true });
        }

        const rewards = outcomeData.rewards || {};
        const message = `${interaction.user.username} has chosen: **${outcomeData.label || selectedValue || "a path"}**. ${outcomeData.message || ''}`;

        const resultEmbed = new EmbedBuilder()
            .setTitle(`✅ Completed: ${commissionDetails.title}`) // Removido corchetes extra
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

        await interaction.message.edit({ embeds: [resultEmbed], components: [] });
    }
};