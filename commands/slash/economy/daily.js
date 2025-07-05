// Tsaritsa's-Voice/commands/slash/economy/daily.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateProfile, canClaimDaily } = require('../../../utils/economyUtils'); // Importa canClaimDaily

const DAILY_AMOUNT = 500;
// Define el emoji de mora personalizado aquí
const MORA_EMOJI = '<:mora:1390470693648470026>';

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily mora.'),

    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        const userProfile = await getOrCreateProfile(interaction.user.id);

        // Usa la nueva función para verificar si puede reclamar (basado en UTC)
        const canClaim = await canClaimDaily(userProfile);

        if (!canClaim) {
            // Ya reclamó hoy en UTC
            const cooldownEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⏳ You can\'t claim your daily mora yet! ⏳')
                .setDescription(`You have already claimed your daily rewards today. Please try again after **00:00 UTC**!`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [cooldownEmbed] });
        } else {
            userProfile.balance += DAILY_AMOUNT; // Usa 'balance'
            userProfile.lastDaily = new Date(); // Actualiza la fecha de la última reclamación (en UTC)
            await userProfile.save();

            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎉 Daily Mora claimed! 🎉')
                .setDescription(`You have claimed **${DAILY_AMOUNT} ${MORA_EMOJI} mora** from your daily reward.\nYour new balance is: **${userProfile.balance} ${MORA_EMOJI} mora**.`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [successEmbed] });
        }
    },
};