// Tsaritsa's-Voice/commands/buttons/commission_button_outcome.js

const commissionsList = require('../../data/commissionsList.js');
const { getOrCreateProfile } = require('../../utils/economyUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  metadata: {
    name: 'commission_button_outcome',
  },

  async run(interaction) {
    const userId = interaction.user.id;
    const index = interaction.message?.components?.[0]?.components?.[0]?.data?.custom_id?.split('_')?.[2]; // backup fallback
    const commissionIndex = interaction.message?.commissionIndex ?? index ?? 0;

    const profile = await getOrCreateProfile(userId);
    const commissionData = profile.commissions?.[commissionIndex];

    if (!commissionData || commissionData.completed) {
      return interaction.reply({ content: '❌ This commission has already been completed or is invalid.', ephemeral: true });
    }

    const full = commissionsList.find(c => c.id === commissionData.id);
    if (!full || full.type !== 'buttonOutcome') {
      return interaction.reply({ content: '❌ Invalid commission data.', ephemeral: true });
    }

    // Resultado aleatorio
    const result = full.outcomes[Math.floor(Math.random() * full.outcomes.length)];
    const rewards = result.rewards || {};

    // Actualiza perfil
    commissionData.completed = true;
    profile.balance += rewards.mora || 0;
    profile.fragments = (profile.fragments || 0) + (rewards.intelFragments || 0);
    profile.reputation = (profile.reputation || 0) + (rewards.reputation || 0);
    await profile.save();

    const embed = new EmbedBuilder()
      .setTitle(full.title)
      .setDescription(result.label)
      .setColor(0x00b894)
      .addFields([
        { name: '💰 Rewards', value: [
          rewards.mora ? `🪙 Mora: ${rewards.mora}` : null,
          rewards.intelFragments ? `🧪 Intel Fragments: ${rewards.intelFragments}` : null,
          rewards.reputation ? `📜 Reputation: ${rewards.reputation}` : null,
        ].filter(Boolean).join('\n') || 'None' }
      ]);

    return interaction.update({ embeds: [embed], components: [] });
  }
};
