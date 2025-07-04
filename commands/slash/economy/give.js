// Tsaritsa's-Voice/commands/slash/economy/give.js

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy'); // Ruta ajustada

const MORA_EMOJI = '<:mora:1390470693648470026>'; // Tu emoji personalizado

module.exports = {
    metadata: {
        name: 'give',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Da mora a otro usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres dar mora')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de mora a dar')
                .setRequired(true)
                .setMinValue(1)) // Asegura que la cantidad sea al menos 1
        // Puedes restringir este comando solo a roles específicos o permisos, por ejemplo:
        // .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        ,
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('usuario');
        const amount = interaction.options.getInteger('cantidad');

        // Evitar que un usuario se dé mora a sí mismo si no lo deseas
        if (targetUser.id === interaction.user.id) {
            const selfGiveEmbed = new EmbedBuilder()
                .setColor('Red')
                .setDescription(`❌ ¡No puedes darte mora a ti mismo!`)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });
            return await interaction.editReply({ embeds: [selfGiveEmbed] });
        }

        // Obtener el perfil del usuario que recibe
        let targetProfile = await UserEconomy.findOne({ userId: targetUser.id });
        if (!targetProfile) {
            targetProfile = await UserEconomy.create({ userId: targetUser.id });
        }

        // Actualizar el balance del usuario objetivo
        targetProfile.balance += amount;
        await targetProfile.save();

        const giveEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✨ ¡Mora Entregada! ✨')
            .setDescription(`**${interaction.user.username}** ha dado **${amount} ${MORA_EMOJI} mora** a **${targetUser.username}**.\nNuevo balance de ${targetUser.username}: **${targetProfile.balance} ${MORA_EMOJI} mora**.`)
            .setTimestamp()
            .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [giveEmbed] });
    },
};