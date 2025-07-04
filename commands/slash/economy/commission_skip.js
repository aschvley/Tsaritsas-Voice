// Tsaritsa's-Voice/commands/slash/economy/commission_skip.js

const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

module.exports = {
  metadata: new SlashCommandBuilder()
    .setName('commission')
    .setDescription('Interact with your current missions')
    .addSubcommand(sub => sub.setName('skip').setDescription('Skip one of your missions for today')),

  async run(interaction) {
    const userId = interaction.user.id;
    const profile = await getOrCreateProfile(userId);

    if (profile.skipped_today) {
      return interaction.reply({ content: '⚠ You have already skipped a mission today. Try again tomorrow.', ephemeral: true });
    }

    const remaining = profile.commissions?.filter(c => !c.completed);
    if (!remaining || remaining.length === 0) {
      return interaction.reply({ content: '🎉 You\'ve completed all your missions today.', ephemeral: true });
    }

    const skipped = remaining[0];
    profile.commissions = profile.commissions.filter(c => c !== skipped);
    profile.skipped_today = true;

    await profile.save();

    await interaction.reply({ content: `🗑 You skipped a mission: ${skipped.id}`, ephemeral: true });
  },
};
