// Tsaritsa's-Voice/commands/slash/economy/addmora.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateProfile, updateBalance } = require('../../../utils/economyUtils');

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('addmora')
        .setDescription('Add or remove Mora from a user. (Dev Only)')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to modify.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('The amount of Mora to add or remove (use negative for removal).')
                .setRequired(true)
        ),

    async run(client, interaction) {
        // ****** CONTROL DE PERMISOS PARA DEVS ******
        // Define aquí los IDs de usuario específicos de tus desarrolladores.
        const authorizedDevIds = ['1135568788985749554']; 
        
        // Verifica si el ID del usuario que ejecutó el comando está en la lista de IDs de desarrolladores autorizados
        if (!authorizedDevIds.includes(interaction.user.id)) {
            return interaction.reply({ content: 'You do not have permission to use this command. This command is restricted to developers.', ephemeral: true });
        }
        // ********************************************

        await interaction.deferReply({ ephemeral: true }); // Para que la respuesta sea privada

        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (isNaN(amount) || amount === 0) {
            return interaction.editReply({ content: 'Please provide a valid non-zero number for the amount.', ephemeral: true });
        }

        try {
            const newBalance = await updateBalance(targetUser.id, amount);

            const embed = new EmbedBuilder()
                .setTitle('💰 Mora Adjustment')
                .setDescription(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} Mora for **${targetUser.username}**.`)
                .addFields(
                    { name: 'New Balance', value: `${newBalance} Mora`, inline: true }
                )
                .setColor(amount > 0 ? '#00FF00' : '#FF0000'); // Verde para añadir, Rojo para quitar

            await interaction.editReply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(`Error adding/removing Mora: ${error.message}`);
            await interaction.editReply({ content: 'An error occurred while adjusting Mora. Please try again.', ephemeral: true });
        }
    },
};