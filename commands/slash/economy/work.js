// Tsaritsa's-Voice/commands/slash/economy/work.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserEconomy = require('../../../utils/UserEconomy');

const WORK_MIN_AMOUNT = 100;
const WORK_MAX_AMOUNT = 300;
const WORK_COOLDOWN = 1 * 60 * 60 * 1000;
// Define el emoji de mora personalizado aquí
const MORA_EMOJI = '<:mora:1390470693648470026>';

const WORK_MESSAGES = [
    "Ayudaste a un comerciante en Port Ormos a cargar mercancías y ganaste",
    "Trabajaste limpiando las calles de Sumeru City y recibiste",
    "Ayudaste a la Academia a organizar pergaminos y te pagaron",
    "Realizaste una tarea extraña para un ciudadano de Fontaine y conseguiste",
    "Mineraste en Liyue y encontraste algunas vetas de mora, ganando",
    "Entrenaste con los Caballeros de Favonius y te dieron",
    "Ayudaste a Paimon a encontrar una especialidad local y te recompensó con",
    "Realizaste una entrega urgente para la Guild de Aventureros y ganaste",
    "Cocinaste un banquete para los Fatui y te pagaron",
    "Recogiste cristal de topocristal para un alquimista y obtuviste"
];

module.exports = {
    metadata: {
        name: 'work',
        type: 'slash',
        category: 'economy',
    },
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabaja y gana algo de mora.'),
    
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
                .setTitle('⏳ ¡Aún no puedes trabajar! ⏳')
                .setDescription(`Necesitas descansar un poco. Vuelve en ${hours}h ${minutes}m ${seconds}s para tu próximo trabajo.`)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [cooldownEmbed] });
        } else {
            const earnedAmount = Math.floor(Math.random() * (WORK_MAX_AMOUNT - WORK_MIN_AMOUNT + 1)) + WORK_MIN_AMOUNT;
            userProfile.balance += earnedAmount;
            userProfile.lastWork = new Date(now);
            await userProfile.save();

            const randomMessage = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('💼 ¡Trabajo Completo! 💼')
                // --- CAMBIO AQUÍ: Usando el emoji personalizado ---
                .setDescription(`${randomMessage} **${earnedAmount} ${MORA_EMOJI} mora**.\nTu nuevo balance es: **${userProfile.balance} ${MORA_EMOJI} mora**.`)
                .setTimestamp()
                .setFooter({ text: 'Sistema de Economía de Tsaritsa\'s Voice', iconURL: client.user.displayAvatarURL() });

            return await interaction.editReply({ embeds: [successEmbed] });
        }
    },
};