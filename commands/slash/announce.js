const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ANNOUNCE_BUTTON_ID = 'announce-ask-button'; // Asegúrate de que esta constante coincida con el ID del botón

module.exports = {
    metadata: {
        name: 'announce',
        description: 'Sends an announcement to the designated channel.',
    },
    async run(client, interaction, tools) { // ✅ Usando 'run' con async
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

        await interaction.reply({ embeds: [initialEmbed], components: [actionRow] });
    },
};