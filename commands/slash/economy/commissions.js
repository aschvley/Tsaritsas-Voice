// Tsaritsa's-Voice/commands/slash/economy/commissions.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const commissionsList = require('../../../data/commissionsList');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

module.exports = {
  metadata: new SlashCommandBuilder()
    .setName('commissions')
    .setDescription('Check your daily Fatui missions.'),

  async run(interaction) {
    const userId = interaction.user.id;
    const profile = await getOrCreateProfile(userId);

    if (!profile.commissions || profile.commissions.length === 0) {
      const shuffled = commissionsList.sort(() => 0.5 - Math.random());
      profile.commissions = shuffled.slice(0, 4).map(c => ({ id: c.id, completed: false }));
      profile.skipped_today = false;
      await profile.save();
    }

    const missions = profile.commissions.map((c, i) => {
      const data = commissionsList.find(x => x.id === c.id);
      return `**${i + 1}. [${data.title}]**\n${c.completed ? '✅ Completed' : '🕒 Pending'}\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🧭 Daily Fatui Commissions')
      .setDescription(missions.join('\n'))
      .setColor(0x3b82f6)
      .setFooter({ text: 'Use /commission claim <number> to begin one.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
