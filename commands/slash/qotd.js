const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const QOTD_BUTTON_ID = 'qotd-ask-button'; // Asegúrate de que esta constante coincida

module.exports = {
    metadata: {
        name: 'qotd',
        description: 'Sends a new Question of the Day to the QOTD channel',
    },
    async run(client, interaction, tools) {
        const initialEmbed = new EmbedBuilder()
            .setTitle('🧊 New Question of the Day 🧊')
            .setDescription('Press the button below to write the question that will be sent to the QOTD channel.')
            .setColor('#325a97');

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(QOTD_BUTTON_ID) // Usamos la constante aquí
                    .setLabel('Write QOTD Question')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [initialEmbed], components: [actionRow], ephemeral: true });
    },
};