const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    metadata: {
        name: 'announce-ask-button', // Usamos el customId como nombre
    },
    async execute(client, interaction) {
        const modal = new ModalBuilder()
            .setCustomId('announce-modal')
            .setTitle('✍️ Write Your Announcement ✍️')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('announcement-input')
                        .setLabel('Announcement Content (Supports Markdown)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Enter your announcement here. You can use **bold**, *italic*, lists, etc.')
                        .setRequired(true),
                ),
            );
        await interaction.showModal(modal);
    },
};