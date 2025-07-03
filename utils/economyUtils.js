// Tsaritsa's-Voice/utils/economyUtils.js

const UserEconomy = require('../models/UserEconomy'); // Ruta ajustada: desde 'utils' a 'models'

/**
 * Obtiene el perfil económico de un usuario o lo crea si no existe.
 * @param {string} userId - El ID del usuario de Discord.
 * @returns {Promise<Object>} El objeto del perfil económico del usuario.
 */
async function getOrCreateProfile(userId) {
    let profile = await UserEconomy.findOne({ userId });
    if (!profile) {
        profile = new UserEconomy({ userId });
        await profile.save();
    }
    return profile;
}

/**
 * Añade o resta una cantidad al balance de un usuario.
 * @param {string} userId - El ID del usuario de Discord.
 * @param {number} amount - La cantidad a añadir (positiva) o restar (negativa).
 * @returns {Promise<number>} El nuevo balance del usuario.
 */
async function updateBalance(userId, amount) {
    const profile = await getOrCreateProfile(userId);
    profile.balance += amount;
    // Opcional: Asegurarse de que el balance no sea negativo si no lo quieres
    if (profile.balance < 0) {
        profile.balance = 0;
    }
    await profile.save();
    return profile.balance;
}

/**
 * Formatea un número de milisegundos a un formato legible (ej. 1h 30m 5s).
 * @param {number} ms - Milisegundos a formatear.
 * @returns {string} Tiempo formateado.
 */
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

module.exports = {
    getOrCreateProfile,
    updateBalance,
    formatTime
};