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
        .setDescription('Shows your actual mora balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose balance you want to view')
                .setRequired(false)),
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('user') || interaction.user;

        let userProfile = await UserEconomy.findOne({ userId: targetUser.id });

        if (!userProfile) {
            userProfile = await UserEconomy.create({ userId: targetUser.id });
        }

        const balanceEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('💰 Mora Balance 💰') // Puedes dejar este icono si te gusta, o cambiarlo
            // --- CAMBIO AQUÍ: Usando el emoji personalizado ---
            .setDescription(`**${targetUser.username}** has **${userProfile.balance} ${MORA_EMOJI} mora**.`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [balanceEmbed] });
    },
};