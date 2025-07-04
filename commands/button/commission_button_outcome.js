// Tsaritsa's-Voice/commands/buttons/commission_button_outcome.js

const commissionsList = require('../../data/commissionsList.js');
const { getOrCreateProfile } = require('../../utils/economyUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    metadata: {
        name: 'commission_button_outcome',
    },

    async run(interaction) {
        // Deferir la interacción inmediatamente para evitar errores de timeout
        await interaction.deferUpdate();

        const userId = interaction.user.id;
        // Parsear el customId para obtener el índice. Asume que el customId es 'commission_button_X'
        const parts = interaction.customId.split('_');
        const commissionIndex = parseInt(parts[2]);

        const profile = await getOrCreateProfile(userId);
        
        // CAMBIO CRÍTICO AQUÍ: Usar profile.dailyCommissions y el índice correcto
        // Asegurarse de que el array dailyCommissions exista y el índice sea válido
        if (!profile.dailyCommissions || commissionIndex < 0 || commissionIndex >= profile.dailyCommissions.length) {
            return interaction.followUp({ content: '❌ La misión asociada a este botón ya no es válida o no se encuentra.', ephemeral: true });
        }

        const commissionData = profile.dailyCommissions[commissionIndex]; //

        // Ahora commissionData es el objeto { id: "...", completed: boolean }
        if (!commissionData || commissionData.completed) { //
            return interaction.followUp({ content: '❌ Esta misión ya ha sido completada o es inválida.', ephemeral: true });
        }

        const full = commissionsList.find(c => c.id === commissionData.id); //
        if (!full || full.type !== 'buttonOutcome') {
            return interaction.followUp({ content: '❌ Datos de la misión inválidos.', ephemeral: true });
        }

        // Resultado aleatorio
        const result = full.outcomes[Math.floor(Math.random() * full.outcomes.length)];
        const rewards = result.rewards || {};

        // Actualiza perfil y la comisión específica
        commissionData.completed = true; //
        profile.balance += rewards.mora || 0;
        profile.intelFragments = (profile.intelFragments || 0) + (rewards.intelFragments || 0); // Corrección: fragments a intelFragments
        profile.reputation = (profile.reputation || 0) + (rewards.reputation || 0);
        profile.acceptedCommission = null; // Asumiendo que al completar se "desactiva" la aceptada
        await profile.save();

        const embed = new EmbedBuilder()
            .setTitle(full.title)
            .setDescription(result.label)
            .setColor(0x00b894)
            .addFields([
                { name: '💰 Rewards', value: [
                    rewards.mora ? `🪙 Mora: ${rewards.mora}` : null,
                    rewards.intelFragments ? `🧪 Intel Fragments: ${rewards.intelFragments}` : null, // Corrección: fragments a intelFragments
                    rewards.reputation ? `📜 Reputation: ${rewards.reputation}` : null,
                ].filter(Boolean).join('\n') || 'None' }
            ]);

        // Usar followUp en lugar de update, si se usó deferUpdate. Los componentes se vacían al enviar.
        // Si quieres que el mensaje original se actualice, podrías usar interaction.message.edit()
        await interaction.followUp({ embeds: [embed], components: [], ephemeral: true });
    }
};