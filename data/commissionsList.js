// Tsaritsa's-Voice/data/commissionsList.js

module.exports = [
  {
    id: "1", // ¡Cambiado a STRING!
    title: "[Pantalone] Debt Collection",
    description: "A debtor has been... reluctant. Convince them to pay up.",
    reward: { mora: 150 },
    type: "multipleChoice",
    question: "How do you deal with the debtor?",
    options: [
      { label: "Negotiate terms", value: "A", outcome: "success" },
      { label: "Threaten with consequences", value: "B", outcome: "partial" },
      { label: "Forgive the debt", value: "C", outcome: "fail" }
    ],
    outcomes: {
      success: {
        message: "✅ The debtor caved. Payment secured.",
        rewards: { mora: 150 }
      },
      partial: {
        message: "⚠ They gave in partially. Not bad.",
        rewards: { mora: 75 }
      },
      fail: {
        message: "❌ They fled the city. You gained nothing.",
        rewards: { mora: 0 }
      }
    }
  },
  {
    id: "2", // ¡Cambiado a STRING!
    title: "[Dottore] Specimen Retrieval",
    description: "A subject has escaped. Again. Go retrieve it before it contaminates the environment.",
    reward: { intelFragments: 1 },
    type: "buttonOutcome",
    buttonLabel: "Begin Retrieval",
    outcomes: [
      {
        label: "✅ Success! The specimen has been secured.",
        rewards: { intelFragments: 1 }
      },
      {
        label: "⚠ Partial Containment. It left a trace.",
        rewards: { intelFragments: 1, mora: 50 }
      },
      {
        label: "❌ Containment Failed. The subject escaped.",
        rewards: {}
      }
    ]
  },
  {
    id: "3", // ¡Cambiado a STRING!
    title: "[Capitano] Training Protocol",
    description: "You are tasked to evaluate recruits in a high-pressure simulation.",
    reward: { reputation: 1 },
    type: "reactionChallenge", //YA TENEMOS CODIGO PARA ESTO
    prompt: "A surprise attack hits the squad. What do you do?",
    reactions: [
      { emoji: "🛡️", label: "Protect them", outcome: "success" },
      { emoji: "⚔️", label: "Lead the counterattack", outcome: "partial" },
      { emoji: "🏃", label: "Retreat", outcome: "fail" }
    ],
    outcomes: {
      success: {
        message: "✅ You saved the team. Promotion recommended.",
        rewards: { reputation: 1 }
      },
      partial: {
        message: "⚠ Mixed results. Room for improvement.",
        rewards: { reputation: 1, mora: 50 }
      },
      fail: {
        message: "❌ Your unit was wiped out.",
        rewards: {}
      }
    }
  },
  {
    id: "4", // ¡Cambiado a STRING!
    title: "[Arlecchino] Loyalty Test",
    description: "A subordinate is accused of betrayal. Your judgment is final.",
    reward: { reputation: 1 },
    type: "multipleChoice",
    question: "What do you decide?",
    options: [
      { label: "Spare them – loyalty can be earned", value: "A", outcome: "fail" },
      { label: "Interrogate and then release", value: "B", outcome: "partial" },
      { label: "Eliminate without hesitation", value: "C", outcome: "success" }
    ],
    outcomes: {
      success: {
        message: "✅ Your ruthless efficiency earned praise.",
        rewards: { reputation: 1 }
      },
      partial: {
        message: "⚠ You avoided a scandal, but suspicions remain.",
        rewards: { mora: 50 }
      },
      fail: {
        message: "❌ They vanished days later. You showed weakness.",
        rewards: {}
      }
    }
  },

  // Misiones adicionales genéricas para rotar
  {
    id: "5", // ¡Cambiado a STRING!
    title: "[Columbina] Choral Directive",
    description: "Lead a choir of orphans in a performance for a diplomat.",
    reward: { mora: 100 },
    type: "simple",
    outcome: "✅ Performance brought tears. +100 Mora"
  },
  {
    id: "6", // ¡Cambiado a STRING!
    title: "[Sandrone] Drone Escort",
    description: "Escort her newest prototype through enemy territory.",
    reward: { intelFragments: 1 },
    type: "simple",
    outcome: "✅ Escort complete. Tech stable. +1 Intel Fragment"
  },
  {
    id: "7", // ¡Cambiado a STRING!
    title: "[Signora] Heat Resistance Test",
    description: "Stand in a furnace room and endure.",
    reward: { mora: 50, reputation: 1 },
    type: "simple",
    outcome: "✅ You didn’t pass out. Barely. +50 Mora, +1 Reputation"
  },
  {
    id: "8", // ¡Cambiado a STRING!
    title: "[Pulcinella] Bureaucratic Task",
    description: "Stamp and organize 300 pages of paperwork.",
    reward: { mora: 75 },
    type: "simple",
    outcome: "✅ Order restored. You hate your life. +75 Mora"
  },
  {
    id: "9", // ¡Cambiado a STRING!
    title: "[Pantalone] Logistics Audit",
    description: "Cross-check cargo reports for anomalies.",
    reward: { intelFragments: 1 },
    type: "simple",
    outcome: "✅ Detected irregularities. +1 Intel Fragment"
  },
  {
    id: "10", // ¡Cambiado a STRING!
    title: "[Dottore] Autopsy Report",
    description: "Analyze remains from a failed experiment.",
    reward: { mora: 100 },
    type: "simple",
    outcome: "✅ Report filed. Fascinating results. +100 Mora"
  },
  {
    id: "11", // ¡Cambiado a STRING!
    title: "[Capitano] Surveillance Run",
    description: "Patrol hostile territory undetected.",
    reward: { reputation: 1 },
    type: "simple",
    outcome: "✅ No one saw you. Good. +1 Reputation"
  },
  {
    id: "12", // ¡Cambiado a STRING!
    title: "[Arlecchino] Ward Supervision",
    description: "Keep the orphans in line before inspection.",
    reward: { mora: 50 },
    type: "simple",
    outcome: "✅ Not a single smudge. Impressive. +50 Mora"
  },
  {
    id: "13", // ¡Cambiado a STRING!
    title: "[Signora] Ice Delivery",
    description: "Deliver enchanted ice blocks to a nobles' banquet.",
    reward: { mora: 75 },
    type: "simple",
    outcome: "✅ The banquet was a success. +75 Mora"
  },
  {
    id: "14", // ¡Cambiado a STRING!
    title: "[Columbina] Lullaby Experiment",
    description: "Sing a lullaby and record the neural effects.",
    reward: { intelFragments: 1 },
    type: "simple",
    outcome: "✅ Neurological data obtained. +1 Intel Fragment"
  },
  {
    id: "15", // ¡Cambiado a STRING!
    title: "[Pulcinella] Census Operation",
    description: "Visit remote homes to verify identities.",
    reward: { mora: 100 },
    type: "simple",
    outcome: "✅ You were offered 6 types of soup. +100 Mora"
  }
];