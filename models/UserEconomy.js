// Tsaritsa's-Voice/models/UserEconomy.js

const mongoose = require('mongoose');

const UserEconomySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    lastDaily: {
        type: Date,
        default: null
    },
    lastWork: {
        type: Date,
        default: null
    },
    intelFragments: {
        type: Number,
        default: 0,
        min: 0
    },
    reputation: {
        type: Number,
        default: 0,
        min: 0
    },
    // ¡CAMBIO AQUÍ! Ahora es un array de objetos
    dailyCommissions: [{
        id: { type: String, required: true },
        completed: { type: Boolean, default: false },
        // Puedes añadir más campos si lo necesitas, como 'currentStep', 'progress', etc.
    }],
    acceptedCommission: { // Este debería almacenar el ID de la misión aceptada actualmente para el progreso
        type: String,
        default: null
    },
    lastCommissionDate: {
        type: Date,
        default: null
    },
    skippedCommission: {
        type: Boolean,
        default: false
    }
});

const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);
module.exports = UserEconomy;
