const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const ANNOUNCE_BUTTON_ID = 'announce-ask-button'; // ID único para el botón

module.exports = {
    metadata: {
        name: 'announce',
        description: 'Sends an announcement to the designated channel.',
        slashCommand: { // Puedes anidar la información específica del Slash Command
            builder: (builder) => builder
                .setName('announce')
                .setDescription('Sends an announcement to the designated channel.'),
        },
    },
    async execute(client, interaction) { // 🔄 Cambiado de 'run' a 'execute'
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