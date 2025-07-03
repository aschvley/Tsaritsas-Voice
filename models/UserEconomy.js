// Tsaritsa's-Voice/models/UserEconomy.js

const mongoose = require('mongoose');

const UserEconomySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true // Cada ID de usuario debe ser único
    },
    balance: {
        type: Number,
        default: 0,
        min: 0 // Opcional: Asegura que el balance no sea negativo
    },
    lastDaily: {
        type: Date,
        default: null // Por defecto, no ha reclamado el daily aún
    },
    lastWork: {
        type: Date,
        default: null // Por defecto, no ha trabajado aún
    }
});

const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);

module.exports = UserEconomy;