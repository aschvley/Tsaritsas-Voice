// Tsaritsa's-Voice/commands/slash/economy/commission_claim.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const commissionsList = require('../../../data/commissionsList');
const { getOrCreateProfile } = require('../../../utils/economyUtils');

module.exports = {
  metadata: new SlashCommandBuilder()
    .setName('commission')
    .setDescription('Interact with your current missions')
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Start a commission mission')
        .addIntegerOption(opt =>
          opt.setName('number')
            .setDescription('Mission number (1-4)')
            .setRequired(true)
        )
    ),

  async run(interaction) {
    const userId = interaction.user.id;
    const num = interaction.options.getInteger('number');
    const profile = await getOrCreateProfile(userId);

    if (!profile.commissions || !profile.commissions[num - 1]) {
      return interaction.reply({
        content: '❌ There is no mission in that slot.',
        ephemeral: true,
      });
    }

    const commission = profile.commissions[num - 1];
    if (commission.completed) {
      return interaction.reply({
        content: '✅ That mission is already completed.',
        ephemeral: true,
      });
    }

    const data = commissionsList.find(x => x.id === commission.id);

    // ───── 🎯 HANDLE TYPE: SIMPLE (auto-completed) ─────
    if (data.type === 'simple') {
      commission.completed = true;
      profile.balance += data.reward?.mora || 0;
      profile.fragments = (profile.fragments || 0) + (data.reward?.intelFragments || 0);
      profile.reputation = (profile.reputation || 0) + (data.reward?.reputation || 0);
      await profile.save();

      const embed = new EmbedBuilder()
        .setTitle(`🎯 Completed: ${data.title}`)
        .setDescription(`${data.outcome}`)
        .setColor(0x22c55e)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ───── 🔘 HANDLE TYPE: BUTTON ─────
    if (data.type === 'buttonOutcome') {
      const button = new ButtonBuilder()
        .setCustomId(`commission_button_${num - 1}`)
        .setLabel(data.buttonLabel || 'Start')
        .setStyle(ButtonStyle.Primary);

      const embed = new EmbedBuilder()
        .setTitle(`${data.title}`)
        .setDescription(`${data.description}`)
        .setColor(0x3b82f6)
        .setFooter({ text: 'Click the button to begin the task.' });

      const row = new ActionRowBuilder().addComponents(button);
      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }

    // ───── 🧠 HANDLE TYPE: MULTIPLE CHOICE ─────
    if (data.type === 'multipleChoice') {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`commission_select_${num - 1}`)
        .setPlaceholder('Choose your decision')
        .addOptions(data.options.map(opt => ({
          label: opt.label,
          value: opt.value,
        })));

      const embed = new EmbedBuilder()
        .setTitle(`${data.title}`)
        .setDescription(`${data.question}`)
        .setColor(0xfacc15)
        .setFooter({ text: 'Make your choice wisely.' });

      const row = new ActionRowBuilder().addComponents(menu);
      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: '⚠ This type of commission is not yet supported.',
      ephemeral: true,
    });
  },
};
