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
        .setDescription('Give mora to other user')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('User you want to give mora to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Quantity of mora to give')
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
                .setDescription(`❌ You can't give mora to yourself!`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });
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
            .setTitle('✨ Mora given! ✨')
            .setDescription(`**${interaction.user.username}** has given **${amount} ${MORA_EMOJI} mora** to **${targetUser.username}**.\n${targetUser.username}'s new balance: **${targetProfile.balance} ${MORA_EMOJI} mora**.`)
            .setTimestamp()
            .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [giveEmbed] });
    },
};