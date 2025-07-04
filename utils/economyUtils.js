// Tsaritsa's-Voice/utils/economyUtils.js

const UserEconomy = require('../models/UserEconomy');

async function getOrCreateProfile(userId) {
    let profile = await UserEconomy.findOne({ userId });
    if (!profile) {
        profile = new UserEconomy({ userId });
        await profile.save();
    }
    return profile;
}

async function updateBalance(userId, amount) {
    const profile = await getOrCreateProfile(userId);
    profile.balance = Math.max(0, profile.balance + amount);
    await profile.save();
    return profile.balance;
}

async function updateIntelFragments(userId, amount) {
    const profile = await getOrCreateProfile(userId);
    profile.intelFragments = Math.max(0, profile.intelFragments + amount);
    await profile.save();
    return profile.intelFragments;
}

async function updateReputation(userId, amount) {
    const profile = await getOrCreateProfile(userId);
    profile.reputation = Math.max(0, profile.reputation + amount);
    await profile.save();
    return profile.reputation;
}

async function assignCommissions(userId, commissionIds) {
    const profile = await getOrCreateProfile(userId);
    // ¡¡¡CAMBIO CRÍTICO AQUÍ!!!
    // Mapea los IDs a objetos con 'completed: false'
    profile.dailyCommissions = commissionIds.map(id => ({ id: id, completed: false }));
    profile.lastCommissionDate = new Date();
    profile.acceptedCommission = null; // Reinicia la comisión aceptada
    profile.skippedCommission = false;
    await profile.save();
    return profile.dailyCommissions;
}

async function acceptCommission(userId, commissionId) {
    const profile = await getOrCreateProfile(userId);
    profile.acceptedCommission = commissionId;
    await profile.save();
    return commissionId;
}

async function skipCommission(userId) {
    const profile = await getOrCreateProfile(userId);
    profile.skippedCommission = true;
    await profile.save();
}

async function resetCommissionsIfNewDay(userId) {
    const profile = await getOrCreateProfile(userId);
    const today = new Date();
    const last = profile.lastCommissionDate;

    // Compara solo la fecha (día, mes, año)
    if (!last || last.toDateString() !== today.toDateString()) {
        profile.dailyCommissions = []; // Vacía las comisiones para el nuevo día
        profile.acceptedCommission = null;
        profile.skippedCommission = false;
        profile.lastCommissionDate = today;
        await profile.save();
        return true; // Indica que se resetearon
    }
    return false; // Indica que no se resetearon
}

function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) {
        parts.push(`${days}d`);
    }
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}m`);
    }
    if (seconds > 0) {
        parts.push(`${seconds}s`);
    }

    return parts.length > 0 ? parts.join(' ') : '0s';
}

module.exports = {
    getOrCreateProfile,
    updateBalance,
    updateIntelFragments,
    updateReputation,
    assignCommissions,
    acceptCommission,
    skipCommission,
    resetCommissionsIfNewDay,
    formatTime
};