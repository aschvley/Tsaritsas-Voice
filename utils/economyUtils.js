// Tsaritsa's-Voice/utils/economyUtils.js

const UserEconomy = require('../models/UserEconomy');
const commissionsList = require('../data/commissionsList'); // Asegúrate de que esta ruta sea correcta

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

// Función que se encarga de verificar y asignar comisiones si es un nuevo día
async function ensureDailyCommissions(userId) {
    const profile = await getOrCreateProfile(userId);
    const today = new Date();
    const lastCommissionDate = profile.lastCommissionDate;

    // Convertir a fecha "pura" (sin hora) para la comparación
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastDateOnly = lastCommissionDate ? new Date(lastCommissionDate.getFullYear(), lastCommissionDate.getMonth(), lastCommissionDate.getDate()) : null;

    // Si no hay fecha de la última comisión o es un nuevo día
    if (!lastDateOnly || lastDateOnly.getTime() !== todayDateOnly.getTime()) {
        profile.dailyCommissions = getRandomCommissions(4); // Asigna 4 nuevas misiones
        profile.lastCommissionDate = today; // Actualiza la fecha de la última asignación
        profile.acceptedCommission = null; // Reinicia la comisión aceptada
        profile.skippedCommission = false; // Reinicia el contador de skip
        await profile.save();
        return { newCommissions: true, commissions: profile.dailyCommissions };
    }
    return { newCommissions: false, commissions: profile.dailyCommissions };
}

async function acceptCommission(userId, commissionId) {
    const profile = await getOrCreateProfile(userId);
    // Asegurarse de que la comisión exista en dailyCommissions antes de aceptarla
    const commission = profile.dailyCommissions.find(c => c.id === commissionId && !c.completed);
    if (commission) {
        profile.acceptedCommission = commissionId;
        await profile.save();
        return true; // Éxito
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

    // Marca la primera misión no completada como completada (efecto de "saltar")
    const commissionToSkip = remainingCommissions[0];
    const indexToSkip = profile.dailyCommissions.findIndex(c => c.id === commissionToSkip.id);

    if (indexToSkip !== -1) {
        profile.dailyCommissions[indexToSkip].completed = true; // La marcamos como completada para "saltarla"
        profile.skippedCommission = true; // Marca que ya saltó una hoy
        // Si hay una misión aceptada que se va a skipear, la desactiva
        if (profile.acceptedCommission === commissionToSkip.id) {
            profile.acceptedCommission = null;
        }
        await profile.save();
        const skippedCommissionData = commissionsList.find(c => c.id === commissionToSkip.id);
        const skippedTitle = skippedCommissionData ? skippedCommissionData.title : 'Unknown Mission';
        return { success: true, message: `🗑 You skipped the mission: **${skippedTitle}**.` };
    }
    
    return { success: false, message: 'Could not find a mission to skip.' };
}

// *********** ¡¡¡AÑADE ESTA FUNCIÓN AQUÍ!!! ***********
async function completeCommissionOutcome(userProfile, commissionIndex, rewards) {
    // Asegúrate de que userProfile y commissionIndex sean válidos
    if (!userProfile || commissionIndex === undefined || commissionIndex < 0 || commissionIndex >= userProfile.dailyCommissions.length) {
        console.error("Invalid userProfile or commissionIndex provided to completeCommissionOutcome.");
        return { success: false, message: "Invalid commission data." };
    }

    // Marca la comisión como completada
    userProfile.dailyCommissions[commissionIndex].completed = true;

    // Aplica las recompensas
    if (rewards && typeof rewards === 'object') {
        if (rewards.mora) {
            userProfile.balance += rewards.mora;
        }
        if (rewards.intelFragments) {
            userProfile.intelFragments += rewards.intelFragments;
        }
        if (rewards.reputation) {
            userProfile.reputation += rewards.reputation;
        }
    }

    // Limpia la comisión aceptada
    userProfile.acceptedCommission = null;

    // Guarda los cambios
    await userProfile.save();

    return { success: true, message: "Commission completed and rewards applied!" };
}
// *****************************************************

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
    ensureDailyCommissions, //nueva funcion para exportar
    completeCommissionOutcome, // añadida para eliminar error
    formatTime
};