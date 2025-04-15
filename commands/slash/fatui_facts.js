const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('fatui-fact')
        .setDescription('Get a Fatui fact from a selected Harbinger!'),

    async run(client, interaction, tools) {
        // Load Fatui facts
        const fatuiFactsPath = path.join(__dirname, '../../fatui_facts.json');
        const fatuiFacts = JSON.parse(fs.readFileSync(fatuiFactsPath, 'utf8')).fatui_facts;

        const harbingerButtons = [];
        for (const harbinger in fatuiFacts) {
            if (fatuiFacts.hasOwnProperty(harbinger) && harbinger !== "General") {
                harbingerButtons.push(
                    new ButtonBuilder()
                        .setCustomId(harbinger.toLowerCase())
                        .setLabel(harbinger)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        }

        const rows = [];
        for (let i = 0; i < harbingerButtons.length; i += 5) {
            const row = new ActionRowBuilder()
                .addComponents(harbingerButtons.slice(i, i + 5));
            rows.push(row);
        }

        // Add the General button to the last row or a new row if needed
        const generalButton = new ButtonBuilder()
            .setCustomId('general')
            .setLabel('General Fact')
            .setStyle(ButtonStyle.Secondary);

        if (rows.length > 0 && rows[rows.length - 1].components.length < 5) {
            rows[rows.length - 1].addComponents(generalButton);
        } else {
            rows.push(new ActionRowBuilder().addComponents(generalButton));
        }

        await interaction.reply({
            content: 'Select a Fatui Harbinger to get a fact! 🧊',
            components: rows,
        });
    },
};