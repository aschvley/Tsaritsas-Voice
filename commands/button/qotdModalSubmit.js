const { EmbedBuilder } = require('discord.js');

module.exports = {
    metadata: {
        name: 'qotd-modal', // Usamos el customId como nombre
    },
    async execute(client, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const question = interaction.fields.getTextInputValue('qotd-question-input');
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
    },
};