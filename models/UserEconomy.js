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
    dailyCommissions: [{
        id: { type: String, required: true },
        completed: { type: Boolean, default: false },
    }],
    // ****** ¡¡¡ESTE ES EL CAMBIO CRÍTICO Y CORRECTO AHORA!!! ******
    acceptedCommission: {
        id: { type: String },
        type: { type: String },
        index: { type: Number }
    },
    // ***************************************
    lastCommissionDate: {
        type: Date,
        default: null
    },
    skippedCommission: {
        type: Boolean,
        default: false
    }
});

// AÑADIDO: Método para manejar el valor por defecto de acceptedCommission
// Esto es para que si no se provee un valor, se guarde como null/undefined, no como un objeto vacío
UserEconomySchema.path('acceptedCommission').default(function() {
    return null;
});


const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);
module.exports = UserEconomy;