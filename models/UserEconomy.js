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
    // ****** ¡¡¡CAMBIO CRÍTICO AQUI!!! ******
    // acceptedCommission ya no es un String, ahora es un Objeto con la estructura esperada
    acceptedCommission: {
        type: { // Define la estructura del objeto anidado
            id: { type: String },
            type: { type: String }, // Para almacenar el tipo de misión (simple, buttonOutcome, etc.)
            index: { type: Number } // Para almacenar el índice de la misión en dailyCommissions
        },
        default: null // Sigue siendo null por defecto si no hay comisión aceptada
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