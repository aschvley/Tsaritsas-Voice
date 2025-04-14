const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of all available commands.'),

  async run(interaction) {
    try {
      // Verificar si la interacción es de tipo Slash
      if (!interaction.isCommand()) {
        return console.error("No es una interacción de tipo Slash Command");
      }

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

      // Verificar si la interacción ya ha sido respondida
      if (!interaction.deferred) {
        await interaction.deferReply(); // Defer if needed
      }

      // Enviar el mensaje
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error in the Help command:", error);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'There was an error displaying the help command.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error displaying the help command.', ephemeral: true });
      }
    }
  }
};
