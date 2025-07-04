// Tsaritsa's-Voice/commands/slash/economy/commission_status.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const commissionsList = require('../../../data/commissionsList');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

module.exports = {
  metadata: new SlashCommandBuilder()
    .setName('commission')
    .setDescription('Interact with your current missions')
    .addSubcommand(sub => sub.setName('status').setDescription('Check your current mission status')),

  async run(interaction) {
    const userId = interaction.user.id;
    const profile = await getOrCreateProfile(userId);

    if (!profile.commissions || profile.commissions.length === 0) {
      return interaction.reply({ content: 'You don\'t have any assigned missions yet. Use /commissions to get them.', ephemeral: true });
    }

    const description = profile.commissions.map((c, i) => {
      const data = commissionsList.find(x => x.id === c.id);
      return `**${i + 1}. [${data.title}]** — ${c.completed ? '✅ Completed' : '🕒 Pending'}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📋 Your Commission Status')
      .setDescription(description)
      .setColor(0xfacc15)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
