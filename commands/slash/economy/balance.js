// Tsaritsa's-Voice/commands/slash/economy/balance.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy');

// Define el emoji de mora personalizado aquí para fácil acceso y consistencia
const MORA_EMOJI = '<:mora:1390470693648470026>';

module.exports = {
    metadata: {
        name: 'balance',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Muestra tu balance de mora actual.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario cuyo balance deseas ver')
                .setRequired(false)),
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('usuario') || interaction.user;

        let userProfile = await UserEconomy.findOne({ userId: targetUser.id });

        if (!userProfile) {
            userProfile = await UserEconomy.create({ userId: targetUser.id });
        }

        const balanceEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('💰 Balance de Mora 💰') // Puedes dejar este icono si te gusta, o cambiarlo
            // --- CAMBIO AQUÍ: Usando el emoji personalizado ---
            .setDescription(`**${targetUser.username}** tiene **${userProfile.balance} ${MORA_EMOJI} mora**.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [balanceEmbed] });
    },
};