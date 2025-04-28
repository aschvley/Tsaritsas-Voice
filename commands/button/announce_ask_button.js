const { ModalBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    metadata: {
        name: 'announce-ask-button',
    },
    async run(client, interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('announce-modal')
                .setTitle('📢 Select Mention 📢')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('mention-role-select')
                            .setPlaceholder('Select who to mention (optional)')
                            .addOptions([
                                { label: '@everyone', value: 'everyone', description: 'Mention all members of the server.' },
                                { label: '@Fatui Recruit', value: 'fatui_recruit', description: 'Mention the Fatui Recruit role.' },
                                { label: 'No Mention', value: 'none', description: 'Do not mention any role.' },
                            ]),
                    ),
                );
            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing modal (Select Menu only):', error);
            await interaction.followUp({ content: 'Failed to show the announcement modal (Select Menu only).', ephemeral: true });
        }
    },
};