const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    metadata: {
        name: 'announce-ask-button',
    },
    async run(client, interaction) { // ✅ Cambiado 'execute' a 'run'
        const modal = new ModalBuilder()
            .setCustomId('announce-modal')
            .setTitle('✍️ Write Your Announcement ✍️');

        const announcementInput = new TextInputBuilder()
            .setCustomId('announcement-input')
            .setLabel('Announcement Content (Supports Markdown)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter your announcement here. You can use **bold**, *italic*, lists, etc.')
            .setRequired(true);

        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId('mention-role-select')
            .setPlaceholder('Select who to mention (optional)')
            .addOptions(
                {
                    label: '@everyone',
                    value: 'everyone',
                    description: 'Mention all members of the server.',
                },
                {
                    label: '@Fatui Recruit',
                    value: 'fatui_recruit',
                    description: 'Mention the Fatui Recruit role.',
                },
                {
                    label: 'No Mention',
                    value: 'none',
                    description: 'Do not mention any role.',
                },
            );

        const firstActionRow = new ActionRowBuilder().addComponents(announcementInput);
        const secondActionRow = new ActionRowBuilder().addComponents(roleSelect);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    },
};