//ACTUALIZAR CON NUEVOS COMANDOS + DIFERENTE A ECONOMIA

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  metadata: {
      name: 'help',
      description: 'Displays a list of all available commands',
  },
    async run(client, interaction, tools) { // Modificamos la firma de la función run para aceptar los tres argumentos
        try {
            // Crear el embed para el comando de ayuda
            const embed = new EmbedBuilder()
                .setTitle("Tsaritsa\'s Voice — Command List ❄️")
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

            // Responder con el embed usando interaction.reply()
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error("Error en el comando Help:", error);

            // Si ocurrió un error, responder con un mensaje de error
            await interaction.reply({ content: 'Hubo un error al mostrar los comandos.', ephemeral: true });
        }
    }
};
