const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qotd')
        .setDescription('Sends a new Question of the Day to the QOTD channel')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question you want to ask')
                .setRequired(true)
        ),
    async run(client, interaction, tools) {
        try {
            const question = interaction.options.getString('question');
            const qotdChannel = client.channels.cache.get('1305245878877028512');

            if (!qotdChannel) {
                return interaction.reply({ content: 'QOTD channel not found.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('`QOTD`')
                .setDescription(`# ${question}`)
                .setColor('#93caf6') // Establecer el color aquí
                .setFooter({ text: 'Reply in the thread below 👇' });

            const message = await qotdChannel.send({ embeds: [embed] });

            const thread = await message.startThread({
                name: "Discuss the Tsaritsa's question here",
                autoArchiveDuration: 1440,
                reason: 'QOTD Thread'
            });

            // Eliminar el envío duplicado del embed al hilo
            await thread.send("Answer the inquiry here, our Majesty will be reading you attentively❄️");

            // Responder a la interacción DESPUÉS de enviar el mensaje al canal
            await interaction.reply({ content: `Question posted in ${qotdChannel}! ✅`, ephemeral: true });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Something went wrong while sending the QOTD.', ephemeral: true });
        }
    },
};