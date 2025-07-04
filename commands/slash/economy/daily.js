// Tsaritsa's-Voice/commands/slash/economy/daily.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy');

const DAILY_AMOUNT = 500;
const COOLDOWN = 24 * 60 * 60 * 1000;
// Define el emoji de mora personalizado aquí
const MORA_EMOJI = '<:mora:1390470693648470026>';

module.exports = {
    // ¡¡¡CAMBIO CRÍTICO AQUÍ!!!
    // El SlashCommandBuilder debe ser directamente la propiedad 'metadata'
    metadata: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily mora.'),

    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        let userProfile = await UserEconomy.findOne({ userId: interaction.user.id });

        if (!userProfile) {
            userProfile = await UserEconomy.create({ userId: interaction.user.id });
        }

        const now = Date.now();
        const lastDaily = userProfile.lastDaily ? userProfile.lastDaily.getTime() : 0;
        const timeLeft = COOLDOWN - (now - lastDaily);

        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            const cooldownEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⏳ You can\'t claim your daily mora yet! ⏳')
                .setDescription(`Please wait ${hours}h ${minutes}m ${seconds}s to claim your next daily mora.`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [cooldownEmbed] });
        } else {
            userProfile.balance += DAILY_AMOUNT;
            userProfile.lastDaily = new Date(now);
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