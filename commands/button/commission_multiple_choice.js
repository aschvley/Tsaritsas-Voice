// Tsaritsa's-Voice/commands/buttons/commission_multiple_choice.js

const commissionsList = require('../../data/commissionsList.js');
const { getOrCreateProfile } = require('../../utils/economyUtils');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    metadata: {
        // CAMBIO: ACORTAR ESTE NOMBRE. Era 'commission_multiple_choice_handler'
        name: 'commission_multiple_choice', // Lo acortamos a 26 caracteres, que es seguro.
    },

    async run(interaction) {
        // Deferir la interacción inmediatamente para evitar errores de timeout
        await interaction.deferUpdate();

        const userId = interaction.user.id;
        const choice = interaction.values?.[0]; // Valor seleccionado del menú

        // CAMBIO CRÍTICO: Obtener el índice del customId del select menu
        const parts = interaction.customId.split('_');
        const commissionIndex = parseInt(parts[2]); // Asume customId es 'commission_select_X'

        const profile = await getOrCreateProfile(userId);
        
        // CAMBIO CRÍTICO AQUÍ: Usar profile.dailyCommissions y el índice correcto
        // Asegurarse de que el array dailyCommissions exista y el índice sea válido
        if (!profile.dailyCommissions || commissionIndex < 0 || commissionIndex >= profile.dailyCommissions.length) {
            return interaction.followUp({ content: '❌ La misión asociada a esta selección ya no es válida o no se encuentra.', ephemeral: true });
        }
        
        const commissionData = profile.dailyCommissions[commissionIndex]; //

        // Ahora commissionData es el objeto { id: "...", completed: boolean }
        if (!commissionData || commissionData.completed) {
            return interaction.followUp({ content: '❌ Esta misión ya ha sido completada o es inválida.', ephemeral: true });
        }

        const full = commissionsList.find(c => c.id === commissionData.id); //
        if (!full || full.type !== 'multipleChoice') {
            return interaction.followUp({ content: '❌ Tipo de comisión inválido.', ephemeral: true });
        }

        const selected = full.options.find(o => o.value === choice);
        if (!selected) { // Asegurarse de que la opción seleccionada es válida
            return interaction.followUp({ content: '❌ Opción seleccionada no válida.', ephemeral: true });
        }

        const outcomeData = full.outcomes[selected.outcome];
        if (!outcomeData) { // Asegurarse de que el resultado de la opción existe
             return interaction.followUp({ content: '❌ Resultado de la opción no encontrado.', ephemeral: true });
        }

        const rewards = outcomeData.rewards || {};

        // Actualiza perfil y la comisión específica
        commissionData.completed = true; //
        profile.balance = Math.max(0, profile.balance + (rewards.mora || 0)); // Usar Math.max para evitar negativos
        profile.intelFragments = Math.max(0, (profile.intelFragments || 0) + (rewards.intelFragments || 0)); // Corrección: fragments a intelFragments
        profile.reputation = Math.max(0, (profile.reputation || 0) + (rewards.reputation || 0));
        profile.acceptedCommission = null; // Asumiendo que al completar se "desactiva" la aceptada
        await profile.save();

        const embed = new EmbedBuilder()
            .setTitle(full.title)
            .setDescription(outcomeData.message)
            .setColor(0x9b59b6)
            .addFields([
                { name: '💰 Rewards', value: [
                    rewards.mora ? `🪙 Mora: ${rewards.mora}` : null,
                    rewards.intelFragments ? `🧪 Intel Fragments: ${rewards.intelFragments}` : null, // Corrección: fragments a intelFragments
                    rewards.reputation ? `📜 Reputation: ${rewards.reputation}` : null,
                ].filter(Boolean).join('\n') || 'None' }
            ]);

        // Usar followUp en lugar de update, si se usó deferUpdate. Los componentes se vacían al enviar.
        await interaction.followUp({ embeds: [embed], components: [], ephemeral: true });
    }
};