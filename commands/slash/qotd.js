const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qotd')
        .setDescription('Sends a new Question of the Day to the QOTD channel')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question you want to ask')
                .setRequired(true)
        ),
    async run(client, interaction, tools) { // Modificamos la firma de la función run para aceptar los tres argumentos
        try {
            const question = interaction.options.getString('question');
            const qotdChannel = client.channels.cache.get('1305245878877028512'); // Usamos 'client' para acceder a los canales

            if (!qotdChannel) {
                return interaction.reply({ content: 'QOTD channel not found.', ephemeral: true });
            }

            const embed = {
                title: '`QOTD`',
                description: `# ${question}`,
                color: 0x1abc9c,
                footer: {
                    text: 'Reply in the thread below 👇'
                }
            };

            const message = await qotdChannel.send({ embeds: [embed] });

            const thread = await message.startThread({
                name: "Discuss the Tsaritsa's question here",
                autoArchiveDuration: 1440,
                reason: 'QOTD Thread'
            });

            // Resend the same embed in the thread
            await thread.send({ embeds: [embed] });

            // Send a message in the thread
            await thread.send("Answer the inquiry here, our Majesty will be reading you attentively ❄️");

            // Reply to the interaction with success message
            await interaction.reply({ content: `Question posted in ${qotdChannel}! ✅`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Something went wrong while sending the QOTD.', ephemeral: true });
        }
    },
};