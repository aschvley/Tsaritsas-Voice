const { MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  metadata: {
    name: 'fatui-fact-button',
  },

  async execute(interaction) {
    // Load Fatui facts from the JSON file
    const fatuiFactsPath = path.join(__dirname, '../../fatui_facts.json');
    const fatuiFacts = JSON.parse(fs.readFileSync(fatuiFactsPath, 'utf8')).fatui_facts;

    // Determine which Harbinger fact to send based on button click
    let fact = '🧊 Here is a general Fatui fact:';
    
    if (interaction.customId === 'general') {
      fact = fatuiFacts.General[Math.floor(Math.random() * fatuiFacts.General.length)];
    } else if (fatuiFacts[interaction.customId]) {
      const selectedFacts = fatuiFacts[interaction.customId];
      fact = selectedFacts[Math.floor(Math.random() * selectedFacts.length)];
    }

    // Send fact message
    await interaction.update({
      content: fact,
      components: [], // Disable buttons after one selection
    });
  },
};
