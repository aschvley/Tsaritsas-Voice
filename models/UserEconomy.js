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
    dailyCommissions: {
        type: [String], // IDs o claves de las comisiones asignadas
        default: []
    },
    acceptedCommission: {
        type: String,
        default: null // ID de la comisión aceptada (solo una a la vez)
    },
    lastCommissionDate: {
        type: Date,
        default: null // Para limitar la generación diaria
    },
    skippedCommission: {
        type: Boolean,
        default: false // Solo puede saltarse una por día
    }
});

const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);
module.exports = UserEconomy;
