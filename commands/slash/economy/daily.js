// Tsaritsa's-Voice/commands/slash/economy/daily.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../utils/UserEconomy');

const DAILY_AMOUNT = 500;
const COOLDOWN = 24 * 60 * 60 * 1000;
// Define el emoji de mora personalizado aquí
const MORA_EMOJI = '<:mora:1390470693648470026>';

module.exports = {
    metadata: {
        name: 'daily',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Reclama tu mora diaria.'),
    
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
                .setTitle('⏳ ¡Aún no puedes reclamar tu mora diaria! ⏳')
                .setDescription(`Por favor, espera ${hours}h ${minutes}m ${seconds}s para reclamar tu próxima mora diaria.`)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [cooldownEmbed] });
        } else {
            userProfile.balance += DAILY_AMOUNT;
            userProfile.lastDaily = new Date(now);
            await userProfile.save();

            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('🎉 ¡Mora Diaria Reclamada! 🎉')
                // --- CAMBIO AQUÍ: Usando el emoji personalizado ---
                .setDescription(`Has reclamado **${DAILY_AMOUNT} ${MORA_EMOJI} mora** de tu recompensa diaria.\nTu nuevo balance es: **${userProfile.balance} ${MORA_EMOJI} mora**.`)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [successEmbed] });
        }
    },
};