// Tsaritsa's-Voice/commands/slash/economy/give.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy');
const MORA_EMOJI = '<:mora:1390470693648470026>';

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give mora to another user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to give mora to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of mora to give.')
                .setRequired(true)
                .setMinValue(1)),
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const senderId = interaction.user.id;

        if (targetUser.id === senderId) {
            return await interaction.editReply({ content: '❌ You cannot give mora to yourself!', ephemeral: true });
        }

        if (targetUser.bot) {
            return await interaction.editReply({ content: '❌ You cannot give mora to a bot!', ephemeral: true });
        }

        let senderProfile = await UserEconomy.findOne({ userId: senderId });
        if (!senderProfile || senderProfile.balance < amount) {
            return await interaction.editReply({ content: `❌ You do not have enough mora for this transaction! Your current balance is: **${senderProfile ? senderProfile.balance : 0} ${MORA_EMOJI}**.`, ephemeral: true });
        }

        // Deduct from sender
        senderProfile.balance -= amount;
        await senderProfile.save();

        // Add to recipient
        let targetProfile = await UserEconomy.findOne({ userId: targetUser.id });
        if (!targetProfile) {
            targetProfile = new UserEconomy({ userId: targetUser.id });
        }
        targetProfile.balance += amount;
        await targetProfile.save();

        const giveEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('💸 Transaction Successful! 💸')
            .setDescription(`**${interaction.user.username}** has given **${amount} ${MORA_EMOJI}** to **${targetUser.username}**.\n\n` +
                            `Your new balance: **${senderProfile.balance} ${MORA_EMOJI}**\n` +
                            `**${targetUser.username}**'s new balance: **${targetProfile.balance} ${MORA_EMOJI}**`)
            .setTimestamp()
            .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [giveEmbed] });
    },
};