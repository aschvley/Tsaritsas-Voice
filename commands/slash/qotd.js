const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const QOTD_MODAL_ID = 'qotd-modal';
const QOTD_QUESTION_INPUT_ID = 'qotd-question-input';
const QOTD_BUTTON_ID = 'qotd-ask-button';

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
                    .setCustomId(QOTD_BUTTON_ID)
                    .setLabel('Write QOTD Question')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.reply({ embeds: [initialEmbed], components: [actionRow], ephemeral: true });
    },
};

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === QOTD_BUTTON_ID) {
        const modal = new ModalBuilder()
            .setCustomId(QOTD_MODAL_ID)
            .setTitle('❄️ Write the Question of the Day ❄️')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(QOTD_QUESTION_INPUT_ID)
                        .setLabel('Question of the Day')
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder('Write the question for today here...')
                        .setRequired(true),
                ),
            );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === QOTD_MODAL_ID) {
        await interaction.deferReply({ ephemeral: true }); // Defer modal reply

        const question = interaction.fields.getTextInputValue(QOTD_QUESTION_INPUT_ID);
        const qotdChannel = client.channels.cache.get('1305245878877028512');

        if (!qotdChannel) {
            return await interaction.editReply({ content: 'QOTD channel not found.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('`QOTD`')
            .setDescription(`# ${question}`)
            .setColor('#325a97')
            .setFooter({ text: 'Reply in the thread below 👇' });

        try {
            const message = await qotdChannel.send({ embeds: [embed] });
            const thread = await message.startThread({
                name: "Discuss the Tsaritsa's question here",
                autoArchiveDuration: 1440,
                reason: 'QOTD Thread'
            });
            await thread.send("Answer the inquiry here, our Majesty will be reading you attentively ❄️");
            await interaction.editReply({ content: `Question posted in ${qotdChannel.name}! ✅`, ephemeral: true });
        } catch (error) {
            console.error('Error sending QOTD:', error);
            await interaction.editReply({ content: 'An error occurred while sending the Question of the Day.', ephemeral: true });
        }
    }
});