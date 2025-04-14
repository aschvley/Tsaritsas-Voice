const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all available commands.'),
  
  async run(interaction) {
    // Create an embed to display all commands available
    const embed = new EmbedBuilder()
      .setTitle("Tsaritsa's Voice — Command List ❄️")
      .setColor(0x91c9f7)
      .setDescription("Here is what I can do for you, servant of Her Majesty:")
      .addFields(
        {
          name: "📊 XP & Levels",
          value: "`addxp`, `calculate`, `clear`, `multiplier`, `rank`, `rewardrole`, `sync`, `top`"
        },
        {
          name: "🔧 Configuration",
          value: "`config`"
        },
        {
          name: "🎤 Bot Status & Info",
          value: "`botstatus`, `dev_setactivity`, `dev_setversion`"
        },
        {
          name: "🧪 Development",
          value: "`dev_db`, `dev_deploy`, `dev_run`"
        },
        {
          name: "🧊 Community",
          value: "`qotd`"
        }
      )
      .setFooter({ text: "Type a command with / to use it." });

    try {
      // Reply to the interaction with the embed
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error in the Help command:", error);
      await interaction.followUp({ content: 'There was an error displaying the help command.', ephemeral: true });
    }
  }
};
