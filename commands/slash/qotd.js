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
    // Get the 'question' option from the interaction
    const question = interaction.options.getString('question');
    
    // Check if the question exists
    if (!question) {
      return interaction.reply({ content: 'No question was provided!', ephemeral: true });
    }

    // Get the QOTD channel by ID
    const qotdChannel = interaction.client.channels.cache.get('YOUR_PUBLIC_CHANNEL_ID'); // Replace with your actual QOTD channel ID

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

    try {
      // Send the question to the QOTD channel
      const message = await qotdChannel.send({ embeds: [embed] });

      // Create a thread for the message
      const thread = await message.startThread({
        name: "Discuss the Tsaritsa's question here",
        autoArchiveDuration: 1440,
        reason: 'QOTD Thread'
      });

      // Resend the same embed in the thread
      await thread.send({ embeds: [embed] });

      // Add a follow-up message in the thread
      await thread.send("Answer the inquiry here, our Majesty will be reading you attentively ❄️");

      // Reply to the user confirming that the question was posted
      await interaction.reply({ content: `Question posted in ${qotdChannel}! ✅`, ephemeral: true });
    } catch (error) {
      console.error("Error in the QOTD command:", error);
      await interaction.reply({ content: 'There was an error posting the QOTD.', ephemeral: true });
    }
  }
};
