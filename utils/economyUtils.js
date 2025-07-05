// Tsaritsa's-Voice/utils/economyUtils.js

const UserEconomy = require('../models/UserEconomy');
const commissionsList = require('../data/commissionsList'); 

// Función auxiliar para obtener 4 comisiones aleatorias y únicas
function getRandomCommissions(count = 4) {
    const shuffled = commissionsList.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);
    return selected.map(comm => ({ id: comm.id, completed: false }));
}

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

/**
 * Calcula si la fecha de referencia es de "hoy" en UTC.
 * @param {Date} referenceDate La fecha de la última acción (ej. lastDaily, lastCommissionDate).
 * @returns {boolean} True si la fecha es de "hoy" en UTC, false si es de "ayer" o antes.
 */
function isSameUtcDay(referenceDate) {
    if (!referenceDate) return false; // Si nunca ha hecho la acción, no es del mismo día.

    const now = new Date();
    // Comparar solo el día, mes y año en UTC
    return (
        now.getUTCFullYear() === referenceDate.getUTCFullYear() &&
        now.getUTCMonth() === referenceDate.getUTCMonth() &&
        now.getUTCDate() === referenceDate.getUTCDate()
    );
}

// Función que se encarga de verificar y asignar comisiones si es un nuevo día UTC
async function ensureDailyCommissions(userId) {
    const profile = await getOrCreateProfile(userId);
    // Usa la nueva función isSameUtcDay para el reinicio
    const isTodayCommission = isSameUtcDay(profile.lastCommissionDate);

    if (!isTodayCommission) {
        profile.dailyCommissions = getRandomCommissions(4); // Asigna 4 nuevas misiones
        profile.lastCommissionDate = new Date(); // Actualiza la fecha de la última asignación (en UTC)
        profile.acceptedCommission = null; // Reinicia la comisión aceptada
        profile.skippedCommission = false; // Reinicia el contador de skip
        await profile.save();
        return { newCommissions: true, commissions: profile.dailyCommissions };
    }
    return { newCommissions: false, commissions: profile.dailyCommissions };
}

/**
 * Verifica si el usuario puede reclamar su recompensa diaria.
 * @param {UserEconomy} userProfile El perfil del usuario.
 * @returns {boolean} True si puede reclamar, false si no.
 */
async function canClaimDaily(userProfile) {
    // Comprueba si la última vez que reclamó el daily fue "hoy" en UTC
    return !isSameUtcDay(userProfile.lastDaily);
}


async function acceptCommission(userId, commissionId) {
    const profile = await getOrCreateProfile(userId);
    // Asegurarse de que la comisión exista en dailyCommissions antes de aceptarla
    // También asegúrate de que el acceptedCommission sea un objeto como en tu esquema
    const commission = profile.dailyCommissions.find(c => c.id === commissionId && !c.completed);
    if (commission) {
        // Debes almacenar el objeto completo o al menos los datos necesarios
        const commissionIndex = profile.dailyCommissions.findIndex(c => c.id === commissionId);
        const commissionDetails = commissionsList.find(c => c.id === commissionId);

        if (commissionIndex !== -1 && commissionDetails) {
             profile.acceptedCommission = {
                id: commissionDetails.id,
                type: commissionDetails.type,
                index: commissionIndex,
            };
            await profile.save();
            return true; // Éxito
        }
    }
    return false; // Comisión no encontrada o ya completada
}

async function skipCommission(userId) {
    const profile = await getOrCreateProfile(userId);

    if (profile.skippedCommission) {
        return { success: false, message: 'You have already skipped a mission today. Try again tomorrow.' };
    }

    const remainingCommissions = profile.dailyCommissions.filter(c => !c.completed);

    if (remainingCommissions.length === 0) {
        return { success: false, message: '🎉 You\'ve completed all your missions today.' };
    }

    let commissionToSkipData;
    let indexToSkip = -1;

    // Si hay una comisión aceptada y no completada, la saltamos
    if (profile.acceptedCommission && !profile.dailyCommissions[profile.acceptedCommission.index].completed) {
        commissionToSkipData = profile.dailyCommissions[profile.acceptedCommission.index];
        indexToSkip = profile.acceptedCommission.index;
    } else {
        // De lo contrario, saltamos la primera comisión pendiente
        commissionToSkipData = remainingCommissions[0];
        indexToSkip = profile.dailyCommissions.findIndex(c => c.id === commissionToSkipData.id);
    }

    if (indexToSkip !== -1) {
        profile.dailyCommissions[indexToSkip].completed = true;
        profile.skippedCommission = true; // Marca que ya saltó una hoy
        profile.acceptedCommission = null; // Siempre limpia acceptedCommission después de saltar/completar
        await profile.save();
        const skippedCommissionData = commissionsList.find(c => c.id === commissionToSkipData.id);
        const skippedTitle = skippedCommissionData ? skippedCommissionData.title : 'Unknown Mission';
        return { success: true, message: `🗑 You skipped the mission: **${skippedTitle}**.` };
    }
    
    return { success: false, message: 'Could not find a mission to skip.' };
}

// Función para completar la comisión y aplicar recompensas
async function completeCommissionOutcome(userProfile, commissionIndex, rewards) {
    if (!userProfile || commissionIndex === undefined || commissionIndex < 0 || commissionIndex >= userProfile.dailyCommissions.length) {
        console.error("Invalid userProfile or commissionIndex provided to completeCommissionOutcome.");
        return { success: false, message: "Invalid commission data." };
    }

    userProfile.dailyCommissions[commissionIndex].completed = true;

    if (rewards && typeof rewards === 'object') {
        if (rewards.mora) {
            userProfile.balance += rewards.mora; // Usar 'balance' para mora
        }
        if (rewards.intelFragments) {
            userProfile.intelFragments += rewards.intelFragments;
        }
        if (rewards.reputation) {
            userProfile.reputation += rewards.reputation;
        }
    }

    userProfile.acceptedCommission = null; // Siempre limpiar después de completar
    await userProfile.save();

    return { success: true, message: "Commission completed and rewards applied!" };
}

// Esta función ya no será tan relevante si el reinicio es global y fijo
// Pero la mantenemos por si la usas en otros sitios para mostrar tiempos
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
    acceptCommission,
    skipCommission,
    ensureDailyCommissions,
    completeCommissionOutcome,
    canClaimDaily, // Asegúrate de exportar esta
    formatTime
};