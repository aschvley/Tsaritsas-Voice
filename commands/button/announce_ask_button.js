const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    metadata: {
        name: 'announce-ask-button',
    },
    async run(client, interaction) {
        try {
            await interaction.reply({ content: 'Preparing announcement modal...', ephemeral: true });

            const modal = new ModalBuilder()
                .setCustomId('announce-modal')
                .setTitle('📢 Write Your Announcement 📢')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('announcement-input')
                            .setLabel('Announcement Content (Supports Markdown)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Enter your announcement here. You can use **bold**, *italic*, lists, etc.')
                            .setRequired(true),
                    ),
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('mention-role-select')
                            .setPlaceholder('Select who to mention (optional)')
                            .addOptions(
                                { label: '@everyone', value: 'everyone', description: 'Mention all members of the server.' },
                                { label: '@Fatui Recruit', value: 'fatui_recruit', description: 'Mention the Fatui Recruit role.' },
                                { label: 'No Mention', value: 'none', description: 'Do not mention any role.' },
                            ),
                    ),
                );
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error in announce-ask-button:', error);
            await interaction.followUp({ content: 'Failed to show the announcement modal.', ephemeral: true });
        }
    },
};