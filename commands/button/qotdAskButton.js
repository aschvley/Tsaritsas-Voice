const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    metadata: {
        name: 'qotd-ask-button', // Usamos el customId como nombre
    },
    async execute(client, interaction) {
        const modal = new ModalBuilder()
            .setCustomId('qotd-modal')
            .setTitle('❄️ Write the Question of the Day ❄️')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('qotd-question-input')
                        .setLabel('Question of the Day')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Write the question for today here...')
                        .setRequired(true),
                ),
            );
        await interaction.showModal(modal);
    },
};