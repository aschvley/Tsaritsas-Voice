// Tsaritsa's-Voice/commands/slash/economy/work.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../models/UserEconomy');

const WORK_MIN_AMOUNT = 100;
const WORK_MAX_AMOUNT = 300;
const WORK_COOLDOWN = 1 * 60 * 60 * 1000;
// Define el emoji de mora personalizado aquí
const MORA_EMOJI = '<:mora:1390470693648470026>';

const WORK_MESSAGES = [
    "You helped a merchant in Port Ormos load goods and earned",
    "You worked cleaning the streets of Sumeru City and received",
    "You helped the Akademiya organize scrolls and were paid",
    "You performed an odd job for a Fontaine citizen and got",
    "You mined in Liyue and found some mora veins, earning",
    "You trained with the Knights of Favonius and were given",
    "You helped Paimon find a local specialty and were rewarded with",
    "You made an urgent delivery for the Adventurers' Guild and earned",
    "You cooked a banquet for the Fatui and were paid",
    "You collected Topaz Crystal for an alchemist and obtained"
];

module.exports = {
    metadata: {
        name: 'work',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work and get some mora.'),
    
    async run(client, interaction, tools) {
        await interaction.deferReply({ ephemeral: false });

        let userProfile = await UserEconomy.findOne({ userId: interaction.user.id });

        if (!userProfile) {
            userProfile = await UserEconomy.create({ userId: interaction.user.id });
        }

        const now = Date.now();
        const lastWork = userProfile.lastWork ? userProfile.lastWork.getTime() : 0;
        const timeLeft = WORK_COOLDOWN - (now - lastWork);

        if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            const cooldownEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⏳ You can\'t work yet! ⏳')
                .setDescription(`You need to rest a bit. Come back in ${hours}h ${minutes}m ${seconds}s for your next work.`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [cooldownEmbed] });
        } else {
            const earnedAmount = Math.floor(Math.random() * (WORK_MAX_AMOUNT - WORK_MIN_AMOUNT + 1)) + WORK_MIN_AMOUNT;
            userProfile.balance += earnedAmount;
            userProfile.lastWork = new Date(now);
            await userProfile.save();

            const randomMessage = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('💼 Work Complete! 💼')
                // --- CHANGE HERE: Using the custom emoji ---
                .setDescription(`${randomMessage} **${earnedAmount} ${MORA_EMOJI} mora**.\nYour new balance is: **${userProfile.balance} ${MORA_EMOJI} mora**.`)
                .setTimestamp()
                .setFooter({ text: 'Tsaritsa\'s Voice Economy System', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [successEmbed] });
        }
    },
};