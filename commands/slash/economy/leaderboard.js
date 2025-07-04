// Tsaritsa's-Voice/commands/slash/economy/leaderboard.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy'); // Ruta ajustada

const MORA_EMOJI = '<:mora:1390470693648470026>'; // Tu emoji personalizado

module.exports = {
    metadata: {
        name: 'leaderboard',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the users with the most mora.'),
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        // Obtener los 10 usuarios con más mora, ordenados de forma descendente
        // Excluir usuarios con balance 0 si quieres
        const topUsers = await UserEconomy.find()
            .sort({ balance: -1 }) // Ordenar de mayor a menor
            .limit(10); // Limitar a los 10 primeros

        if (topUsers.length === 0) {
            const noDataEmbed = new EmbedBuilder()
                .setColor('Yellow')
                .setDescription('Currently there is no economy data to display in the leaderboard.')
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });
            return await interaction.editReply({ embeds: [noDataEmbed] });
        }

        let description = '';
        for (let i = 0; i < topUsers.length; i++) {
            const userProfile = topUsers[i];
            const user = await client.users.fetch(userProfile.userId).catch(() => null); // Obtener el objeto de usuario de Discord
            const username = user ? user.username : 'Unknown User';

            description += `**${i + 1}.** ${username}: **${userProfile.balance} ${MORA_EMOJI}**\n`;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#0099ff') // Un color azul para el leaderboard
            .setTitle('🏆 Top 10 Rich 🏆')
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [leaderboardEmbed] });
    },
};