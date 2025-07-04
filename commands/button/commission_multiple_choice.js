// Tsaritsa's-Voice/commands/buttons/commission_multiple_choice.js

const commissionsList = require('../../data/commissionsList.js');
const { getOrCreateProfile } = require('../../utils/economyUtils');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  metadata: {
    name: 'commission_button_outcome',
  },

  async run(interaction) {
    const userId = interaction.user.id;
    const choice = interaction.values?.[0];
    const index = interaction.message?.commissionIndex ?? 0;

    const profile = await getOrCreateProfile(userId);
    const commissionData = profile.commissions?.[index];

    if (!commissionData || commissionData.completed) {
      return interaction.reply({ content: '❌ This commission has already been completed or is invalid.', ephemeral: true });
    }

    const full = commissionsList.find(c => c.id === commissionData.id);
    if (!full || full.type !== 'multipleChoice') {
      return interaction.reply({ content: '❌ Invalid commission type.', ephemeral: true });
    }

    const selected = full.options.find(o => o.value === choice);
    const outcomeData = full.outcomes[selected.outcome];
    const rewards = outcomeData.rewards || {};

    // Actualiza perfil
    commissionData.completed = true;
    profile.balance += rewards.mora || 0;
    profile.fragments = (profile.fragments || 0) + (rewards.intelFragments || 0);
    profile.reputation = (profile.reputation || 0) + (rewards.reputation || 0);
    await profile.save();

    const embed = new EmbedBuilder()
      .setTitle(full.title)
      .setDescription(outcomeData.message)
      .setColor(0x9b59b6)
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
