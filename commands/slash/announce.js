const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ANNOUNCE_BUTTON_ID = 'announce-ask-button'; // Asegúrate de que coincida en index.js

module.exports = {
    metadata: {
        name: 'announce',
        description: 'Sends an announcement to the designated channel.',
        slashCommand: {
            builder: (builder) => builder
                .setName('announce')
                .setDescription('Sends an announcement with a button to write the content.'),
        },
    },
    async run(client, interaction) {
        const initialEmbed = new EmbedBuilder()
            .setTitle('📢 Create New Announcement 📢')
            .setDescription('Press the button below to write the announcement that will be sent to the announcement channel.')
            .setColor('#325a97');

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(ANNOUNCE_BUTTON_ID)
                    .setLabel('Write Announcement')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [initialEmbed], components: [actionRow], ephemeral: true });
    },
};