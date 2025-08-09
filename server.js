// ===================================================================
// WHATSAPP DEUTSCHLEHRER BOT - VERSION 2.0 MIT POSTGRESQL
// ===================================================================
// HAUPTVERBESSERUNGEN:
// - PostgreSQL Datenbank für permanente Speicherung
// - Mehrsprachiger Start (Englisch, Französisch, Arabisch)
// - Gamification-System mit Erfahrungspunkten
// - Verbessertes Dashboard mit Fortschrittsverfolgung
// - Multiple Choice Aufgaben

const express = require('express');
const twilio = require('twilio');
const OpenAI = require('openai');
const fs = require('fs').promises;

// Unsere neue Datenbank-Funktionen importieren
const {
    initializeDatabase,
    getOrCreateUser,
    updateUserRegistration,
    approveUser,
    rejectUser,
    updateLastActive,
    addExperiencePoints,
    addAchievement,
    saveLesson,
    getPendingUsers,
    getApprovedUsers,
    getStatistics,
    getUserDashboardData
} = require('./database');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ===== VERBINDUNGEN =====
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ===== KONFIGURATION =====
const ADMIN_NUMBERS = [
    process.env.ADMIN_PHONE_1 || 'whatsapp:+491234567890',
    process.env.ADMIN_PHONE_2 || 'whatsapp:+491234567891'
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'DeutschLehrer2024!';

// ===== MEHRSPRACHIGE NACHRICHTEN =====
const WELCOME_MESSAGES = {
    initial: `🇩🇪 Welcome to the German Teacher Bot! / Bienvenue au Bot Professeur d'Allemand! / مرحباً بكم في بوت معلم الألمانية!

📱 Choose your language / Choisissez votre langue / اختاروا لغتكم:

1️⃣ English
2️⃣ Français 
3️⃣ العربية (Arabic)

Reply with 1, 2, or 3 / Répondez avec 1, 2 ou 3 / أجيبوا بـ 1 أو 2 أو 3`,

    english: {
        start: "🎓 Great! Let's get you registered for German lessons.\n\n👤 Please tell me your full name:",
        name_received: "Thank you, {name}! 👍\n\n🌍 Which country are you from?",
        country_received: "Interesting! 🌍\n\n🗣️ What languages do you speak?",
        languages_received: "Perfect! 🗣️\n\n🎯 What is your German learning goal?\n(e.g. 'A1 exam', 'daily life', 'work')",
        completed: "✅ REGISTRATION COMPLETED!\n\n📋 Your information:\n👤 Name: {name}\n🌍 Country: {country}\n🗣️ Languages: {languages}\n🎯 Goal: {goal}\n\n⏳ Your application is being reviewed.\nYou'll receive a message once you're approved.\n\nThank you! 🙏",
        approved: "🎉 CONGRATULATIONS!\n\nYour registration has been approved! You can now start learning German.\n\nSimply write: \"Hello, I want to learn German\"\n\nGood luck! 📚✨",
        not_approved: "⏳ Your registration is still being reviewed. Please be patient."
    },
    
    french: {
        start: "🎓 Parfait! Inscrivons-vous pour les cours d'allemand.\n\n👤 Dites-moi votre nom complet:",
        name_received: "Merci, {name}! 👍\n\n🌍 De quel pays venez-vous?",
        country_received: "Intéressant! 🌍\n\n🗣️ Quelles langues parlez-vous?",
        languages_received: "Parfait! 🗣️\n\n🎯 Quel est votre objectif d'apprentissage de l'allemand?\n(ex: 'examen A1', 'vie quotidienne', 'travail')",
        completed: "✅ INSCRIPTION TERMINÉE!\n\n📋 Vos informations:\n👤 Nom: {name}\n🌍 Pays: {country}\n🗣️ Langues: {languages}\n🎯 Objectif: {goal}\n\n⏳ Votre candidature est en cours d'examen.\nVous recevrez un message une fois approuvé.\n\nMerci! 🙏",
        approved: "🎉 FÉLICITATIONS!\n\nVotre inscription a été approuvée! Vous pouvez maintenant commencer à apprendre l'allemand.\n\nÉcrivez simplement: \"Bonjour, je veux apprendre l'allemand\"\n\nBonne chance! 📚✨",
        not_approved: "⏳ Votre inscription est toujours en cours d'examen. Soyez patient."
    },
    
    arabic: {
        start: "🎓 ممتاز! دعونا نسجلكم في دروس الألمانية.\n\n👤 أخبروني باسمكم الكامل:",
        name_received: "شكراً، {name}! 👍\n\n🌍 من أي بلد أنتم؟",
        country_received: "مثير للاهتمام! 🌍\n\n🗣️ ما هي اللغات التي تتحدثون بها؟",
        languages_received: "ممتاز! 🗣️\n\n🎯 ما هو هدفكم من تعلم الألمانية؟\n(مثل: 'امتحان A1'، 'الحياة اليومية'، 'العمل')",
        completed: "✅ التسجيل مكتمل!\n\n📋 معلوماتكم:\n👤 الاسم: {name}\n🌍 البلد: {country}\n🗣️ اللغات: {languages}\n🎯 الهدف: {goal}\n\n⏳ طلبكم قيد المراجعة.\nستتلقون رسالة عند الموافقة.\n\nشكراً لكم! 🙏",
        approved: "🎉 مبروك!\n\nتم قبول تسجيلكم! يمكنكم الآن بدء تعلم الألمانية.\n\nاكتبوا ببساطة: \"مرحبا، أريد تعلم الألمانية\"\n\nحظاً موفقاً! 📚✨",
        not_approved: "⏳ تسجيلكم ما زال قيد المراجعة. يرجى الصبر."
    }
};

// ===== TRAINING DATA LADEN =====
let customTrainingData = '';

async function loadTrainingData() {
    try {
        const data = await fs.readFile('./training_data.txt', 'utf8');
        customTrainingData = data;
        console.log('✅ Training Data geladen:', data.length, 'Zeichen');
    } catch (error) {
        console.log('⚠️ Keine training_data.txt gefunden');
        customTrainingData = 'Standard DaF/DaZ Wissen wird verwendet.';
    }
}

// ===== DEUTSCHLEHRER SYSTEM PROMPT =====
const getSystemPrompt = (userLanguage = 'english', userLevel = 'A1') => `Du bist eine hochqualifizierte DaF/DaZ-Lehrerin.

📚 TRAINING DATA:
${customTrainingData}

🌍 BENUTZER-INFO:
- Muttersprache: ${userLanguage}
- Deutschniveau: ${userLevel}

🎯 UNTERRICHTSMETHODE:
1. Erkenne Sprachniveau (A1-C2)
2. Korrigiere einen Hauptfehler pro Nachricht
3. Erkläre Grammatik kontrastiv zur Muttersprache
4. Gib konkrete Übungsaufgaben
5. Sei geduldig und motivierend
6. Belohne Fortschritte mit Erfahrungspunkten

✅ KORREKTUR-STRUKTUR:
1. Positive Verstärkung: "Sehr gut, dass Sie..."
2. Korrektur: "Eine kleine Verbesserung: ..."
3. Regel: "Die Regel ist..."
4. Übung: "Versuchen Sie..."
5. Punkte: "Sie haben X Punkte verdient!"

🎮 GAMIFICATION:
- 10 Punkte für richtige Antworten
- 5 Punkte für Versuche
- 20 Punkte für schwierige Aufgaben
- Multiple Choice Aufgaben regelmäßig einbauen`;

// ===== UTILITY FUNKTIONEN =====
function detectLanguageFromNumber(message) {
    const msg = message.trim();
    if (msg === '1') return 'english';
    if (msg === '2') return 'french';
    if (msg === '3') return 'arabic';
    return null;
}

function formatMessage(template, replacements) {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
}

// ===== BENUTZER-VERWALTUNG MIT DATENBANK =====
async function handleNewUser(phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        console.log(`📱 Benutzer geladen/erstellt: ${phoneNumber}`, user);
        return user;
    } catch (error) {
        console.error('❌ Fehler beim Laden des Benutzers:', error);
        return null;
    }
}

// ===== REGISTRIERUNG MIT MEHRSPRACHIGKEIT =====
async function handleRegistration(message, phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        
        // Schritt 1: Sprachenauswahl
        if (!user.registration_step) {
            const selectedLanguage = detectLanguageFromNumber(message);
            
            if (selectedLanguage) {
                // Sprache wurde gewählt, starte Registrierung
                await pool.query(
                    'UPDATE users SET registration_step = $1, preferred_language = $2 WHERE phone_number = $3',
                    ['name', selectedLanguage, phoneNumber]
                );
                
                const welcomeMsg = WELCOME_MESSAGES[selectedLanguage].start;
                await sendMessage(phoneNumber, welcomeMsg);
                return;
            } else {
                // Zeige Sprachenauswahl
                await sendMessage(phoneNumber, WELCOME_MESSAGES.initial);
                return;
            }
        }
        
        const userLang = user.preferred_language || 'english';
        const messages = WELCOME_MESSAGES[userLang];
        
        // Registrierungsschritte basierend auf gewählter Sprache
        switch (user.registration_step) {
            case 'name':
                await pool.query(
                    'UPDATE users SET name = $1, registration_step = $2 WHERE phone_number = $3',
                    [message, 'country', phoneNumber]
                );
                
                const nameMsg = formatMessage(messages.name_received, { name: message });
                await sendMessage(phoneNumber, nameMsg);
                break;
                
            case 'country':
                await pool.query(
                    'UPDATE users SET country = $1, registration_step = $2 WHERE phone_number = $3',
                    [message, 'languages', phoneNumber]
                );
                
                await sendMessage(phoneNumber, messages.country_received);
                break;
                
            case 'languages':
                await pool.query(
                    'UPDATE users SET native_languages = $1, registration_step = $2 WHERE phone_number = $3',
                    [message, 'goal', phoneNumber]
                );
                
                await sendMessage(phoneNumber, messages.languages_received);
                break;
                
            case 'goal':
                // Registrierung abschließen
                await updateUserRegistration(phoneNumber, {
                    goal: message,
                    status: 'pending'
                });
                
                await pool.query(
                    'UPDATE users SET learning_goal = $1, registration_step = NULL WHERE phone_number = $2',
                    [message, phoneNumber]
                );
                
                const updatedUser = await getOrCreateUser(phoneNumber);
                const completedMsg = formatMessage(messages.completed, {
                    name: updatedUser.name,
                    country: updatedUser.country,
                    languages: updatedUser.native_languages,
                    goal: message
                });
                
                await sendMessage(phoneNumber, completedMsg);
                
                console.log(`✅ Registrierung abgeschlossen für: ${phoneNumber}`);
                break;
        }
        
    } catch (error) {
        console.error('❌ Registrierungsfehler:', error);
        await sendMessage(phoneNumber, "Sorry, there was a technical error. Please try again.");
    }
}

// ===== MESSAGE SENDING HELPER =====
async function sendMessage(phoneNumber, message) {
    try {
        await client.messages.create({
            body: message,
            from: 'whatsapp:+14155238886',
            to: phoneNumber
        });
        console.log(`✅ Nachricht gesendet an ${phoneNumber}`);
    } catch (error) {
        console.error(`❌ Fehler beim Senden an ${phoneNumber}:`, error);
    }
}

// ===== ADMIN KOMMANDOS =====
async function handleAdminCommand(message, fromNumber) {
    if (!ADMIN_NUMBERS.includes(fromNumber)) {
        return false;
    }

    console.log(`🔧 Admin-Kommando: ${message} von ${fromNumber}`);

    if (message.includes('STATS')) {
        const stats = await getStatistics();
        
        return `📊 BOT STATISTIKEN
👥 Aktive Nutzer: ${stats.approved_count}
⏳ Wartende: ${stats.pending_count}
📚 Gesamt Nutzer: ${stats.total_users}
📖 Lektionen: ${stats.total_lessons}
⭐ Ø Erfahrung: ${Math.round(stats.avg_experience)}

💻 Web Admin: https://deine-app.railway.app/admin`;
    }

    if (message.includes('APPROVE')) {
        const phoneNumber = message.split(' ')[1];
        return await handleAdminApproval(phoneNumber, fromNumber);
    }

    return false;
}

// ===== ADMIN GENEHMIGUNG =====
async function handleAdminApproval(phoneNumber, approvedBy) {
    try {
        const success = await approveUser(phoneNumber, approvedBy);
        
        if (success) {
            const user = await getOrCreateUser(phoneNumber);
            const userLang = user.preferred_language || 'english';
            const approvalMsg = WELCOME_MESSAGES[userLang].approved;
            
            await sendMessage(phoneNumber, approvalMsg);
            
            // Willkommens-Erfolg hinzufügen
            await addAchievement(
                phoneNumber,
                'welcome',
                'Deutschlehrer-Bot beigetreten',
                'Herzlich willkommen beim Deutschlernen!',
                50
            );
            
            console.log(`✅ Benutzer genehmigt: ${phoneNumber}`);
            return `✅ Benutzer ${phoneNumber} wurde genehmigt und benachrichtigt.`;
        }
        
        return `❌ Benutzer ${phoneNumber} konnte nicht genehmigt werden.`;
        
    } catch (error) {
        console.error('❌ Genehmigungsfehler:', error);
        return `❌ Fehler bei der Genehmigung: ${error.message}`;
    }
}

// ===== KI ANTWORT GENERIEREN =====
async function getAIResponse(userMessage, phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        
        if (user.status !== 'approved') {
            const userLang = user.preferred_language || 'english';
            return WELCOME_MESSAGES[userLang].not_approved;
        }

        await updateLastActive(phoneNumber);

        const contextPrompt = `
NUTZER: ${userMessage}
SPRACHNIVEAU: ${user.german_level || 'A1'}
MUTTERSPRACHE: ${user.preferred_language || 'english'}

Antworte als DaF/DaZ-Lehrerin und vergib Punkte für gute Antworten!`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: getSystemPrompt(user.preferred_language, user.german_level) },
                { role: "user", content: contextPrompt }
            ],
            max_tokens: 400,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0].message.content;
        
        // Punkte vergeben für Interaktion
        const pointsEarned = 10;
        await addExperiencePoints(phoneNumber, pointsEarned, 'lesson_interaction');
        
        // Lektion speichern
        await saveLesson(phoneNumber, {
            type: 'conversation',
            content: userMessage,
            userResponse: userMessage,
            aiFeedback: aiResponse,
            points: pointsEarned,
            isCorrect: true,
            level: user.german_level || 'A1',
            grammarTopic: 'conversation'
        });

        return aiResponse;
        
    } catch (error) {
        console.error('❌ OpenAI Fehler:', error);
        return "🔧 Technisches Problem. Bitte versuchen Sie es später erneut.";
    }
}

// ===== WHATSAPP WEBHOOK =====
app.post('/webhook', async (req, res) => {
    const incomingMessage = req.body.Body;
    const fromNumber = req.body.From;
    
    console.log(`📱 WEBHOOK: Nachricht von ${fromNumber}: "${incomingMessage}"`);

    try {
        // Admin-Kommandos prüfen
        const adminResponse = await handleAdminCommand(incomingMessage, fromNumber);
        if (adminResponse) {
            await sendMessage(fromNumber, adminResponse);
            res.status(200).send('OK');
            return;
        }

        const user = await handleNewUser(fromNumber);
        if (!user) {
            await sendMessage(fromNumber, "Technical error. Please try again later.");
            res.status(200).send('OK');
            return;
        }

        console.log(`👤 User Status: ${user.status}, Step: ${user.registration_step}`);

        // Registrierung handhaben (für neue und unvollständige Benutzer)
        if (user.status === 'pending' && (!user.name || user.registration_step)) {
            await handleRegistration(incomingMessage, fromNumber);
            res.status(200).send('OK');
            return;
        }

        // Nicht genehmigte Benutzer
        if (user.status !== 'approved') {
            const userLang = user.preferred_language || 'english';
            await sendMessage(fromNumber, WELCOME_MESSAGES[userLang].not_approved);
            res.status(200).send('OK');
            return;
        }

        // Normale Deutschlehrer-Konversation
        const aiResponse = await getAIResponse(incomingMessage, fromNumber);
        await sendMessage(fromNumber, aiResponse);

        console.log(`✅ Antwort gesendet an ${fromNumber}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ WEBHOOK FEHLER:', error);
        res.status(200).send('OK');
    }
});

// ===== WEB ADMIN PANEL =====
app.get('/admin', async (req, res) => {
    try {
        const stats = await getStatistics();
        const pendingUsers = await getPendingUsers();
        const activeUsers = await getApprovedUsers();
        
        console.log(`🌐 Admin Panel aufgerufen - Wartende: ${stats.pending_count}, Aktive: ${stats.approved_count}`);
        
        res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deutschlehrer Bot - Admin Panel v2.0</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f5f5f5; 
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;
            text-align: center;
        }
        .version-badge {
            background: rgba(255,255,255,0.2); padding: 5px 15px; 
            border-radius: 20px; font-size: 0.9em; margin-top: 10px;
        }
        .debug { 
            background: #fff3cd; border: 1px solid #ffeaa7; 
            padding: 15px; border-radius: 10px; margin-bottom: 20px;
            font-family: monospace; font-size: 12px;
        }
        .stats { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .stat-card { 
            background: white; padding: 20px; border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;
        }
        .stat-number { font-size: 2.2em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .user-card { 
            background: white; border: 1px solid #ddd; padding: 20px; 
            margin: 15px 0; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .pending { border-left: 5px solid #ffc107; }
        .approved { border-left: 5px solid #28a745; }
        button { 
            padding: 8px 16px; margin: 5px; border: none; border-radius: 5px; 
            cursor: pointer; font-weight: bold; transition: all 0.3s;
        }
        .approve { background: #28a745; color: white; }
        .reject { background: #dc3545; color: white; }
        .approve:hover { background: #218838; transform: translateY(-1px); }
        .reject:hover { background: #c82333; transform: translateY(-1px); }
        .user-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
        .info-item { padding: 8px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em; }
        .refresh-btn { 
            background: #007bff; color: white; padding: 10px 20px; 
            border-radius: 5px; text-decoration: none; display: inline-block; margin-bottom: 20px;
            transition: all 0.3s;
        }
        .refresh-btn:hover { background: #0056b3; transform: translateY(-1px); }
        .dashboard-link {
            background: #17a2b8; color: white; padding: 10px 20px; 
            border-radius: 5px; text-decoration: none; display: inline-block; margin-left: 10px;
        }
        .language-flag { font-size: 1.2em; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇩🇪 Deutschlehrer Bot - Admin Panel</h1>
            <p>Professionelle DaF/DaZ Bot-Verwaltung mit PostgreSQL</p>
            <div class="version-badge">Version 2.0 - Mehrsprachig & Gamification</div>
        </div>
        
        <a href="/admin" class="refresh-btn">🔄 Seite aktualisieren</a>
        <a href="/dashboard" class="dashboard-link">📊 Dashboard</a>
        
        <div class="debug">
            <strong>🔍 DEBUG INFO:</strong><br>
            Server Zeit: ${new Date().toLocaleString('de-DE')}<br>
            Datenbank: PostgreSQL Connected ✅<br>
            Mehrsprachigkeit: Aktiv (EN/FR/AR) ✅<br>
            Gamification: Aktiv ✅<br>
            Training Data: ${customTrainingData.length} Zeichen geladen<br>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${stats.pending_count}</div>
                <div class="stat-label">Wartende Anmeldungen</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.approved_count}</div>
                <div class="stat-label">Aktive Nutzer</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_users}</div>
                <div class="stat-label">Gesamt Registriert</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_lessons}</div>
                <div class="stat-label">Lektionen Absolviert</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(stats.avg_experience)}</div>
                <div class="stat-label">Ø Er
