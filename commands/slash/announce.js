const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const ANNOUNCE_BUTTON_ID = 'announce-ask-button'; // ID único para el botón

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Sends an announcement to the designated channel.'),
    async run(client, interaction) {
        const initialEmbed = new EmbedBuilder()
            .setTitle('📢 Create New Announcement 📢')
            .setDescription('Press the button below to write the announcement that will be sent to the announcement channel.')
            .setColor('#325a97');

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(ANNOUNCE_BUTTON_ID) // Usamos la constante aquí
                    .setLabel('Write Announcement')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [initialEmbed], components: [actionRow]});
    },
};