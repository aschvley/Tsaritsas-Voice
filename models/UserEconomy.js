// Tsaritsa's-Voice/models/UserEconomy.js

const mongoose = require('mongoose');
const { Schema } = mongoose; // Desestructuramos Schema

const UserEconomySchema = new Schema({
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
    // ****** ¡¡¡NUEVO INTENTO PARA acceptedCommission!!! ******
    acceptedCommission: {
        type: new Schema({ // Definimos un esquema anidado explícitamente para el sub-documento
            id: { type: String, required: true }, // Aunque sea opcional el acceptedCommission, si existe, estas propiedades son requeridas
            type: { type: String, required: true },
            index: { type: Number, required: true }
        }, { _id: false }), // _id: false para que Mongoose no cree un _id para este sub-documento
        default: null // Permitimos que el campo completo sea null si no hay comisión aceptada
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

const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);
module.exports = UserEconomy;