// Tsaritsa's-Voice/commands/slash/economy/inventoryjs

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

module.exports = {
  metadata: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Check your current resources'),

  async run(interaction) {
    const profile = await getOrCreateProfile(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('🎒 Your Inventory')
      .setDescription(`🪙 Mora: ${profile.balance || 0}\n🧪 Intel Fragments: ${profile.fragments || 0}\n📜 Reputation: ${profile.reputation || 0}`)
      .setColor(0x8b5cf6)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
