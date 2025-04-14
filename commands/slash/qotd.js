const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qotd')
    .setDescription('Sends a new Question of the Day to the QOTD channel')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)
    ),

  async run(interaction) {
    const question = interaction.options.getString('question');
    const qotdChannel = interaction.client.channels.cache.get('1305245878877028512'); // Replace with your actual QOTD channel ID

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

    // Follow-up message from the bot
    await thread.send("Answer the inquiry here, our Majesty will be reading you attentively ❄️");

    await interaction.reply({ content: `Question posted in ${qotdChannel}! ✅`, ephemeral: true });
  }
};
