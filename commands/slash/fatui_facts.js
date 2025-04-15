const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    metadata: new SlashCommandBuilder()
        .setName('fatui-fact')
        .setDescription('Get a Fatui fact from a selected Harbinger!'),

    async run(client, interaction, tools) {
        // Load Fatui facts from the JSON file
        const fatuiFactsPath = path.join(__dirname, '../../fatui_facts.json');
        const fatuiFacts = JSON.parse(fs.readFileSync(fatuiFactsPath, 'utf8')).fatui_facts;

        // Create a new ActionRowBuilder
        const row = new ActionRowBuilder();

        // Dynamically create buttons for each Harbinger
        for (const harbinger in fatuiFacts) {
            if (fatuiFacts.hasOwnProperty(harbinger) && harbinger !== "General") {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(harbinger.toLowerCase()) // Use the harbinger name in lowercase
                        .setLabel(harbinger)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        }

        // Add a General button for a random Fatui fact
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('general')
                .setLabel('General Fact')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            content: 'Select a Fatui Harbinger to get a fact! 🧊',
            components: [row],
        });
    },
};