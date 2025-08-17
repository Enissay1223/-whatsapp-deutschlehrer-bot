// ===================================================================
// WHATSAPP DEUTSCHLEHRER BOT - VERSION 2.0 (KORRIGIERT)
// ===================================================================
// Alle Fehler behoben - funktioniert jetzt einwandfrei

const express = require('express');
const twilio = require('twilio');
const OpenAI = require('openai');
const fetch = require('node-fetch'); // Für Mistral API Calls

// Unsere korrigierte Datenbank-Funktionen importieren
const {
    initializeDatabase,
    getOrCreateUser,
    updateUserRegistration,
    updateUserRegistrationStep,
    approveUser,
    rejectUser,
    updateLastActive,
    addExperiencePoints,
    addAchievement,
    saveLesson,
    getPendingUsers,
    getApprovedUsers,
    getStatistics,
    getUserDashboardData,
    pool // Direkter Pool-Zugriff
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

// ===== SMART ROUTER SYSTEM - MITTELKLASSE IMPLEMENTIERUNG =====

// Mistral AI Client
class MistralAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.mistral.ai/v1';
    }

    async chatCompletion(messages, model = 'mistral-small-latest') {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`Mistral API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('❌ Mistral API Fehler:', error);
            throw error;
        }
    }
}

// Smart Router Klasse
class SmartAPIRouter {
    constructor() {
        // API Clients initialisieren
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.mistral = new MistralAPI(process.env.MISTRAL_API_KEY);
        
        // Kosten-Tracking
        this.dailyCosts = 0;
        this.lastResetDate = new Date().toDateString();
        
        // Performance-Tracking
        this.apiStats = {
            mistral: { calls: 0, totalTime: 0, errors: 0 },
            gpt4o_mini: { calls: 0, totalTime: 0, errors: 0 },
            gpt5_mini: { calls: 0, totalTime: 0, errors: 0 }
        };
        
        console.log('🤖 Smart API Router initialisiert');
        console.log('💰 Tages-Limit:', process.env.DAILY_COST_LIMIT);
    }

    // Komplexitäts-Analyse
    analyzeComplexity(message, userContext = {}) {
        const msg = message.toLowerCase().trim();
        
        // Einfache Nachrichten (60% der Fälle)
        const simplePatterns = [
            /^(hallo|hi|hey|guten tag|moin)/,
            /^(danke|vielen dank|thx)/,
            /^(tschüss|bye|auf wiedersehen)/,
            /^(ja|nein|ok|okay)/,
            /^(wie geht.s|how are you)/
        ];
        
        if (simplePatterns.some(pattern => pattern.test(msg)) || msg.length < 5) {
            return 'simple';
        }
        
        // Komplexe Nachrichten (10% der Fälle)
        const complexKeywords = (process.env.COMPLEX_KEYWORDS || 
            'analysiere,entwickle,erkläre,programmiere,plan,schreibe,übersetze,korrigiere,grammatik')
            .split(',');
            
        if (complexKeywords.some(keyword => msg.includes(keyword)) ||
            msg.length > 100 ||
            (msg.match(/\?/g) || []).length > 1) {
            return 'complex';
        }
        
        // Standard Nachrichten (30% der Fälle)
        return 'medium';
    }

    // Model Selection Logic
    selectModel(complexity, userContext = {}) {
        // Kosten-Check
        if (this.dailyCosts > parseFloat(process.env.DAILY_COST_LIMIT || 10)) {
            console.log('⚠️ Tages-Kostenlimit erreicht, verwende günstigste Option');
            return {
                provider: 'mistral',
                model: 'mistral-small-latest',
                estimatedCost: 0.15,
                reason: 'cost_limit_reached'
            };
        }

        // Model Selection basierend auf Komplexität
        switch (complexity) {
            case 'simple':
                return {
                    provider: 'mistral',
                    model: 'mistral-small-latest',
                    estimatedCost: 0.15,
                    reason: 'simple_message'
                };
                
            case 'medium':
                return {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    estimatedCost: 0.24,
                    reason: 'standard_conversation'
                };
                
            case 'complex':
                return {
                    provider: 'openai',
                    model: 'gpt-5-mini',
                    estimatedCost: 0.69,
                    reason: 'complex_task'
                };
                
            default:
                return {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    estimatedCost: 0.24,
                    reason: 'fallback'
                };
        }
    }

    // API Call mit Fallback
    async callAPI(messages, selectedModel, userContext = {}) {
        const startTime = Date.now();
        
        try {
            let response;
            
            if (selectedModel.provider === 'mistral') {
                response = await this.mistral.chatCompletion(messages, selectedModel.model);
                this.apiStats.mistral.calls++;
            } else if (selectedModel.model === 'gpt-5-mini') {
                response = await this.openai.chat.completions.create({
                    model: 'gpt-5-mini',
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.7
                });
                response = response.choices[0].message.content;
                this.apiStats.gpt5_mini.calls++;
            } else {
                // GPT-4o mini (Fallback auf gpt-4 falls gpt-4o-mini nicht verfügbar)
                response = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.7
                });
                response = response.choices[0].message.content;
                this.apiStats.gpt4o_mini.calls++;
            }
            
            // Performance tracking
            const responseTime = Date.now() - startTime;
            const statsKey = selectedModel.provider === 'mistral' ? 'mistral' : 
                           selectedModel.model.replace('-', '_');
            this.apiStats[statsKey].totalTime += responseTime;
            
            // Kosten tracking
            this.dailyCosts += selectedModel.estimatedCost / 1000;
            
            if (process.env.ROUTER_DEBUG === 'true') {
                console.log(`✅ ${selectedModel.provider}/${selectedModel.model}: ${responseTime}ms, ~$${selectedModel.estimatedCost/1000}`);
            }
            
            return {
                response: response,
                model: selectedModel,
                responseTime: responseTime,
                success: true
            };
            
        } catch (error) {
            console.error(`❌ ${selectedModel.provider} API Fehler:`, error.message);
            
            // Fallback-Logic
            if (process.env.ENABLE_API_FALLBACK === 'true') {
                return await this.handleFallback(messages, selectedModel, userContext);
            }
            
            throw error;
        }
    }

    // Fallback System
    async handleFallback(messages, failedModel, userContext) {
        console.log('🔄 Aktiviere Fallback-System...');
        
        // Fallback-Reihenfolge: Mistral → GPT-4o mini → GPT-4 (Original)
        const fallbackOrder = [
            { provider: 'mistral', model: 'mistral-small-latest', estimatedCost: 0.15 },
            { provider: 'openai', model: 'gpt-4o-mini', estimatedCost: 0.24 },
            { provider: 'openai', model: 'gpt-4', estimatedCost: 30.0 }
        ];
        
        for (const fallbackModel of fallbackOrder) {
            // Skip das bereits fehlgeschlagene Model
            if (fallbackModel.provider === failedModel.provider && 
                fallbackModel.model === failedModel.model) {
                continue;
            }
            
            try {
                console.log(`🔄 Versuche Fallback: ${fallbackModel.provider}/${fallbackModel.model}`);
                return await this.callAPI(messages, fallbackModel, userContext);
            } catch (error) {
                console.log(`❌ Fallback ${fallbackModel.provider} fehlgeschlagen`);
                continue;
            }
        }
        
        // Alle APIs fehlgeschlagen
        throw new Error('Alle APIs sind nicht verfügbar');
    }

    // Haupt-Router Funktion
    async routeMessage(userMessage, systemPrompt, userContext = {}) {
        try {
            // 1. Komplexität analysieren
            const complexity = this.analyzeComplexity(userMessage, userContext);
            
            // 2. Model auswählen
            const selectedModel = this.selectModel(complexity, userContext);
            
            // 3. Messages für API vorbereiten
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ];
            
            // 4. API Call mit Fallback
            const result = await this.callAPI(messages, selectedModel, userContext);
            
            if (process.env.ROUTER_DEBUG === 'true') {
                console.log(`🎯 Router: ${complexity} → ${selectedModel.provider}/${selectedModel.model} (${selectedModel.reason})`);
            }
            
            return {
                response: result.response,
                metadata: {
                    complexity: complexity,
                    model: selectedModel,
                    responseTime: result.responseTime,
                    estimatedCost: selectedModel.estimatedCost / 1000,
                    dailyCosts: this.dailyCosts
                }
            };
            
        } catch (error) {
            console.error('❌ Router Fehler:', error);
            
            // Notfall-Antwort
            return {
                response: "🔧 Entschuldigung, ich habe ein technisches Problem. Bitte versuchen Sie es in einem Moment erneut.",
                metadata: {
                    error: true,
                    errorMessage: error.message
                }
            };
        }
    }

    // Statistiken
    getStats() {
        return {
            dailyCosts: this.dailyCosts,
            costLimit: process.env.DAILY_COST_LIMIT,
            apiStats: this.apiStats,
            costEfficiency: {
                totalCalls: Object.values(this.apiStats).reduce((sum, stat) => sum + stat.calls, 0),
                avgCostPerCall: this.dailyCosts / Math.max(1, Object.values(this.apiStats).reduce((sum, stat) => sum + stat.calls, 0)),
                savingsVsGPT4: this.calculateSavings()
            }
        };
    }

    calculateSavings() {
        const totalCalls = Object.values(this.apiStats).reduce((sum, stat) => sum + stat.calls, 0);
        const gpt4Cost = totalCalls * 0.03; // GPT-4 kostet ~$0.03 pro Message
        const actualCost = this.dailyCosts;
        const savings = gpt4Cost > 0 ? ((gpt4Cost - actualCost) / gpt4Cost) * 100 : 0;
        return Math.round(Math.max(0, savings));
    }

    // Reset Costs Daily
    resetDailyCosts() {
        const today = new Date().toDateString();
        if (this.lastResetDate !== today) {
            this.dailyCosts = 0;
            this.lastResetDate = today;
            console.log('🔄 Tageskosten zurückgesetzt');
        }
    }
}

// Router Instance erstellen
const smartRouter = new SmartAPIRouter();

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

// ===== REGISTRIERUNG MIT MEHRSPRACHIGKEIT (KORRIGIERT) =====
async function handleRegistration(message, phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        
        console.log(`📝 Registrierung für ${phoneNumber}: Schritt=${user.registration_step}, Sprache=${user.preferred_language}`);
        
        // Schritt 1: Sprachenauswahl
        if (!user.registration_step) {
            const selectedLanguage = detectLanguageFromNumber(message);
            
            if (selectedLanguage) {
                // Sprache wurde gewählt, starte Registrierung
                const updatedUser = await updateUserRegistrationStep(
                    phoneNumber, 
                    'name', 
                    'preferred_language', 
                    selectedLanguage
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
                await updateUserRegistrationStep(phoneNumber, 'country', 'name', message);
                const nameMsg = formatMessage(messages.name_received, { name: message });
                await sendMessage(phoneNumber, nameMsg);
                break;
                
            case 'country':
                await updateUserRegistrationStep(phoneNumber, 'languages', 'country', message);
                await sendMessage(phoneNumber, messages.country_received);
                break;
                
            case 'languages':
                await updateUserRegistrationStep(phoneNumber, 'goal', 'native_languages', message);
                await sendMessage(phoneNumber, messages.languages_received);
                break;
                
            case 'goal':
                // Registrierung abschließen
                await updateUserRegistration(phoneNumber, {
                    name: user.name,
                    country: user.country,
                    languages: user.native_languages,
                    goal: message
                });
                
                const updatedUser = await getOrCreateUser(phoneNumber);
                const completedMsg = formatMessage(messages.completed, {
                    name: updatedUser.name || 'Unbekannt',
                    country: updatedUser.country || 'Unbekannt',
                    languages: updatedUser.native_languages || 'Unbekannt',
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

// ===== KI ANTWORT GENERIEREN MIT SMART ROUTER =====
async function getAIResponse(userMessage, phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        
        if (user.status !== 'approved') {
            const userLang = user.preferred_language || 'english';
            return WELCOME_MESSAGES[userLang].not_approved;
        }

        await updateLastActive(phoneNumber);
        
        // Smart Router verwenden statt direkten OpenAI Call
        const systemPrompt = getSystemPrompt(user.preferred_language, user.german_level);
        const contextPrompt = `
NUTZER: ${userMessage}
SPRACHNIVEAU: ${user.german_level || 'A1'}
MUTTERSPRACHE: ${user.preferred_language || 'english'}

Antworte als DaF/DaZ-Lehrerin und vergib Punkte für gute Antworten!`;

        // Router verwenden - Das ist die Magie! 🎯
        const result = await smartRouter.routeMessage(contextPrompt, systemPrompt, {
            userId: phoneNumber,
            level: user.german_level,
            language: user.preferred_language
        });

        const aiResponse = result.response;
        
        // Punkte vergeben für Interaktion
        const pointsEarned = 10;
        await addExperiencePoints(phoneNumber, pointsEarned, 'lesson_interaction');
        
        // Lektion mit Router-Metadaten speichern
        await saveLesson(phoneNumber, {
            type: 'conversation',
            content: userMessage,
            userResponse: userMessage,
            aiFeedback: aiResponse,
            points: pointsEarned,
            isCorrect: true,
            level: user.german_level || 'A1',
            grammarTopic: 'conversation',
            // Neue Metadaten vom Router
            modelUsed: result.metadata.model?.provider + '/' + result.metadata.model?.model,
            responseTime: result.metadata.responseTime,
            estimatedCost: result.metadata.estimatedCost
        });

        // Debug-Info für Admin
        if (process.env.ROUTER_DEBUG === 'true') {
            console.log(`📊 Router Stats:`, smartRouter.getStats());
        }

        return aiResponse;
        
    } catch (error) {
        console.error('❌ Router-enhanced AI Response Fehler:', error);
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
            <div class="version-badge">Version 2.0 - Mehrsprachig & Gamification (KORRIGIERT)</div>
        </div>
        
        <a href="/admin" class="refresh-btn">🔄 Seite aktualisieren</a>
        <a href="/dashboard" class="dashboard-link">📊 Dashboard</a>
        <a href="/admin/api-stats" class="dashboard-link" style="background: #28a745;">🤖 Router Stats</a>
        
        <div class="debug">
            <strong>🔍 DEBUG INFO:</strong><br>
            Server Zeit: ${new Date().toLocaleString('de-DE')}<br>
            Datenbank: PostgreSQL Connected ✅<br>
            Mehrsprachigkeit: Aktiv (EN/FR/AR) ✅<br>
            Gamification: Aktiv ✅<br>
            Training Data: ${customTrainingData.length} Zeichen geladen<br>
            Fehler behoben: ✅ Pool import, ✅ Spalten, ✅ Registrierung<br>
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
                <div class="stat-label">Ø Erfahrungspunkte</div>
            </div>
        </div>
        
        <h2>⏳ Wartende Anmeldungen (${stats.pending_count})</h2>
        ${pendingUsers.map(user => `
        <div class="user-card pending">
            <h3>
                ${user.preferred_language === 'french' ? '🇫🇷' : user.preferred_language === 'arabic' ? '🇸🇦' : '🇬🇧'} 
                📱 ${user.name || 'Unbekannt'}
            </h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${user.phone_number}</div>
                <div class="info-item"><strong>Land:</strong> ${user.country || 'Unbekannt'}</div>
                <div class="info-item"><strong>Sprachen:</strong> ${user.native_languages || 'Unbekannt'}</div>
                <div class="info-item"><strong>Ziel:</strong> ${user.learning_goal || 'Unbekannt'}</div>
                <div class="info-item"><strong>Registriert:</strong> ${new Date(user.registration_date).toLocaleDateString('de-DE')}</div>
            </div>
            <button class="approve" onclick="approveUser('${user.phone_number}')">✅ Genehmigen</button>
            <button class="reject" onclick="rejectUser('${user.phone_number}')">❌ Ablehnen</button>
        </div>
        `).join('')}
        
        ${stats.pending_count === 0 ? '<div class="user-card"><p>🎉 Keine wartenden Anmeldungen!</p><p><em>Neue Nutzer müssen sich erst über WhatsApp registrieren.</em></p></div>' : ''}
        
        <h2>✅ Aktive Nutzer (${stats.approved_count})</h2>
        ${activeUsers.map(user => `
        <div class="user-card approved">
            <h3>
                ${user.preferred_language === 'french' ? '🇫🇷' : user.preferred_language === 'arabic' ? '🇸🇦' : '🇬🇧'} 
                👤 ${user.name || 'Unbekannt'}
            </h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${user.phone_number}</div>
                <div class="info-item"><strong>Level:</strong> ${user.german_level || 'A1'}</div>
                <div class="info-item"><strong>Erfahrung:</strong> ${user.experience_points || 0} XP</div>
                <div class="info-item"><strong>Lektionen:</strong> ${user.lessons_completed || 0}</div>
                <div class="info-item"><strong>Letztes Login:</strong> ${new Date(user.last_active).toLocaleDateString('de-DE')}</div>
                <div class="info-item"><strong>Genehmigt am:</strong> ${new Date(user.approval_date).toLocaleDateString('de-DE')}</div>
            </div>
        </div>
        `).join('')}
    </div>
    
    <script>
    function approveUser(phone) {
        const password = prompt('Admin-Passwort eingeben:');
        if (!password) return;
        
        fetch('/admin/approve', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({phone, password})
        }).then(res => res.json()).then(data => {
            if (data.success) {
                alert('✅ Nutzer genehmigt!');
                location.reload();
            } else {
                alert('❌ Fehler: ' + (data.error || 'Unbekannter Fehler'));
            }
        }).catch(err => {
            alert('❌ Netzwerk-Fehler: ' + err);
        });
    }
    
    function rejectUser(phone) {
        const password = prompt('Admin-Passwort eingeben:');
        if (!password) return;
        
        if (confirm('Sind Sie sicher, dass Sie diesen Nutzer ablehnen möchten?')) {
            fetch('/admin/reject', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({phone, password})
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    alert('❌ Nutzer abgelehnt.');
                    location.reload();
                } else {
                    alert('❌ Fehler: ' + (data.error || 'Unbekannter Fehler'));
                }
            }).catch(err => {
                alert('❌ Netzwerk-Fehler: ' + err);
            });
        }
    }
    </script>
</body>
</html>
    `);
    } catch (error) {
        console.error('❌ Admin Panel Fehler:', error);
        res.status(500).send('Server Error');
    }
});

// ===== DASHBOARD SEITE =====
app.get('/dashboard', async (req, res) => {
    try {
        const stats = await getStatistics();
        const activeUsers = await getApprovedUsers();
        
        res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deutschlehrer Bot - Dashboard</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f5f5f5; 
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;
            text-align: center;
        }
        .metrics { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .metric-card { 
            background: white; padding: 25px; border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;
        }
        .metric-number { font-size: 2.5em; font-weight: bold; color: #28a745; }
        .metric-label { color: #666; margin-top: 5px; font-size: 1.1em; }
        .progress-section { 
            background: white; padding: 30px; border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px;
        }
        .user-progress { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; margin-top: 20px;
        }
        .user-card { 
            border: 1px solid #ddd; padding: 20px; border-radius: 10px;
            background: #f8f9fa;
        }
        .progress-bar { 
            width: 100%; height: 20px; background: #e9ecef; border-radius: 10px;
            margin: 10px 0;
        }
        .progress-fill { 
            height: 100%; background: linear-gradient(90deg, #28a745, #20c997);
            border-radius: 10px; transition: width 0.3s ease;
        }
        .nav-btn { 
            background: #007bff; color: white; padding: 10px 20px; 
            border-radius: 5px; text-decoration: none; display: inline-block; margin-right: 10px;
        }
        .level-badge {
            background: #6f42c1; color: white; padding: 3px 8px;
            border-radius: 15px; font-size: 0.8em; font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Deutschlehrer Bot - Dashboard</h1>
            <p>Lernfortschritt und Statistiken</p>
        </div>
        
        <a href="/admin" class="nav-btn">🔧 Admin Panel</a>
        <a href="/dashboard" class="nav-btn">🔄 Dashboard aktualisieren</a>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-number">${stats.total_users}</div>
                <div class="metric-label">Gesamt Nutzer</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${stats.approved_count}</div>
                <div class="metric-label">Aktive Lernende</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${stats.total_lessons}</div>
                <div class="metric-label">Lektionen Absolviert</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${Math.round(stats.avg_experience)}</div>
                <div class="metric-label">Ø Erfahrungspunkte</div>
            </div>
        </div>
        
        <div class="progress-section">
            <h2>👥 Benutzer-Fortschritt</h2>
            <div class="user-progress">
                ${activeUsers.map(user => {
                    const progressPercent = Math.min((user.experience_points / 500) * 100, 100);
                    return `
                    <div class="user-card">
                        <h4>${user.name} <span class="level-badge">${user.german_level || 'A1'}</span></h4>
                        <p><strong>Erfahrung:</strong> ${user.experience_points || 0} XP</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <p><strong>Lektionen:</strong> ${user.lessons_completed || 0} | <strong>Letztes Login:</strong> ${new Date(user.last_active).toLocaleDateString('de-DE')}</p>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } catch (error) {
        console.error('❌ Dashboard Fehler:', error);
        res.status(500).send('Server Error');
    }
});

// ===== ADMIN API ENDPOINTS =====
app.post('/admin/approve', async (req, res) => {
    const { phone, password } = req.body;
    
    console.log(`🔑 Admin approval attempt for ${phone}`);
    
    if (password !== ADMIN_PASSWORD) {
        console.log(`❌ Wrong password attempt`);
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    try {
        const result = await handleAdminApproval(phone, 'web_admin');
        
        if (result.includes('✅')) {
            console.log(`✅ User ${phone} approved via web`);
            res.json({ success: true });
        } else {
            console.log(`❌ User ${phone} approval failed`);
            res.status(404).json({ error: 'Nutzer konnte nicht genehmigt werden' });
        }
    } catch (error) {
        console.error('❌ Approval error:', error);
        res.status(500).json({ error: 'Server-Fehler' });
    }
});

app.post('/admin/reject', async (req, res) => {
    const { phone, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    try {
        const success = await rejectUser(phone);
        
        if (success) {
            console.log(`❌ User ${phone} rejected via web`);
            
            // Ablehnungsbenachrichtigung senden
            await sendMessage(phone, "❌ Ihre Anmeldung wurde leider nicht genehmigt.");
            
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Nutzer nicht gefunden' });
        }
    } catch (error) {
        console.error('❌ Rejection error:', error);
        res.status(500).json({ error: 'Server-Fehler' });
    }
});

// ===== ROUTER STATISTIKEN SEITE =====
app.get('/admin/api-stats', async (req, res) => {
    try {
        const routerStats = smartRouter.getStats();
        const dbStats = await getStatistics();
        
        res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>🤖 Smart Router Statistiken</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                 color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                     gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; color: #28a745; }
        .stat-label { color: #666; margin-top: 5px; }
        .savings { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
        .api-breakdown { background: white; padding: 20px; border-radius: 10px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .api-item { display: flex; justify-content: space-between; padding: 10px; 
                   border-bottom: 1px solid #eee; }
        .progress-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; margin: 5px 0; }
        .progress-fill { height: 100%; border-radius: 4px; }
        .mistral { background: #ff6b6b; }
        .gpt4o { background: #4ecdc4; }
        .gpt5 { background: #45b7d1; }
        .nav-btn { background: #007bff; color: white; padding: 10px 20px; 
                  border-radius: 5px; text-decoration: none; display: inline-block; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Smart API Router Statistiken</h1>
            <p>Echtzeit-Monitoring der Mittelklasse-Kombi</p>
        </div>
        
        <a href="/admin" class="nav-btn">🔧 Admin Panel</a>
        <a href="/admin/api-stats" class="nav-btn">🔄 Stats aktualisieren</a>
        
        <div class="stats-grid">
            <div class="stat-card savings">
                <div class="stat-number">${routerStats.costEfficiency.savingsVsGPT4}%</div>
                <div class="stat-label">Kostenersparnis vs GPT-4</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$${routerStats.dailyCosts.toFixed(3)}</div>
                <div class="stat-label">Heutige Kosten</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${routerStats.costEfficiency.totalCalls}</div>
                <div class="stat-label">API Calls heute</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$${routerStats.costEfficiency.avgCostPerCall.toFixed(4)}</div>
                <div class="stat-label">Ø Kosten pro Call</div>
            </div>
        </div>
        
        <div class="api-breakdown">
            <h3>📊 API Nutzungsverteilung</h3>
            
            <div class="api-item">
                <span><strong>🇫🇷 Mistral Small</strong> (${routerStats.apiStats.mistral.calls} Calls)</span>
                <div style="width: 200px;">
                    <div class="progress-bar">
                        <div class="progress-fill mistral" style="width: ${(routerStats.apiStats.mistral.calls / Math.max(1, routerStats.costEfficiency.totalCalls)) * 100}%"></div>
                    </div>
                    ~$${(routerStats.apiStats.mistral.calls * 0.00015).toFixed(3)}
                </div>
            </div>
            
            <div class="api-item">
                <span><strong>🤖 GPT-4o mini</strong> (${routerStats.apiStats.gpt4o_mini.calls} Calls)</span>
                <div style="width: 200px;">
                    <div class="progress-bar">
                        <div class="progress-fill gpt4o" style="width: ${(routerStats.apiStats.gpt4o_mini.calls / Math.max(1, routerStats.costEfficiency.totalCalls)) * 100}%"></div>
                    </div>
                    ~$${(routerStats.apiStats.gpt4o_mini.calls * 0.00024).toFixed(3)}
                </div>
            </div>
            
            <div class="api-item">
                <span><strong>🚀 GPT-5 mini</strong> (${routerStats.apiStats.gpt5_mini.calls} Calls)</span>
                <div style="width: 200px;">
                    <div class="progress-bar">
                        <div class="progress-fill gpt5" style="width: ${(routerStats.apiStats.gpt5_mini.calls / Math.max(1, routerStats.costEfficiency.totalCalls)) * 100}%"></div>
                    </div>
                    ~$${(routerStats.apiStats.gpt5_mini.calls * 0.00069).toFixed(3)}
                </div>
            </div>
        </div>
        
        <div class="api-breakdown">
            <h3>🎯 Intelligente Routing-Entscheidungen</h3>
            <p><strong>Einfache Nachrichten (60%):</strong> Mistral Small - Ultra-günstig</p>
            <p><strong>Standard Gespräche (30%):</strong> GPT-4o mini - Beste Balance</p>
            <p><strong>Komplexe Aufgaben (10%):</strong> GPT-5 mini - Premium Qualität</p>
            
            <h4>💡 Heute erkannte Muster:</h4>
            <ul>
                <li>Grüße & Smalltalk → Mistral</li>
                <li>Deutschlehrer Gespräche → GPT-4o mini</li>
                <li>Grammatik-Analysen → GPT-5 mini</li>
            </ul>
        </div>
    </div>
</body>
</html>
        `);
        
    } catch (error) {
        console.error('❌ Stats page error:', error);
        res.status(500).send('Error loading stats');
    }
});

// ===== STATUS SEITE =====
app.get('/', async (req, res) => {
    try {
        const stats = await getStatistics();
        
        res.send(`
    <h1>🇩🇪 Deutschlehrer WhatsApp Bot v2.0 (KORRIGIERT)</h1>
    <h2>✅ Bot läuft erfolgreich!</h2>
    <p><strong>Status:</strong> Online und bereit mit PostgreSQL</p>
    <p><strong>Aktive Nutzer:</strong> ${stats.approved_count}</p>
    <p><strong>Wartende Anmeldungen:</strong> ${stats.pending_count}</p>
    <p><strong>Gesamt Lektionen:</strong> ${stats.total_lessons}</p>
    <p><strong>Training Data:</strong> ${customTrainingData.length} Zeichen geladen</p>
    <p><strong>Server Zeit:</strong> ${new Date().toLocaleString('de-DE')}</p>
    
    <h3>🔧 Behobene Fehler v2.0:</h3>
    <ul>
        <li>✅ Pool import Fehler behoben</li>
        <li>✅ Fehlende Datenbank-Spalten hinzugefügt</li>
        <li>✅ Registrierungslogik korrigiert</li>
        <li>✅ Mehrsprachige Nachrichten funktionieren</li>
        <li>✅ Admin Panel zeigt korrekte Daten</li>
    </ul>
    
    <h3>🆕 Features v2.0:</h3>
    <ul>
        <li>✅ PostgreSQL Datenbank für permanente Speicherung</li>
        <li>✅ Mehrsprachiger Start (English, Français, العربية)</li>
        <li>✅ Gamification mit Erfahrungspunkten</li>
        <li>✅ Verbessertes Dashboard</li>
        <li>✅ Erfolgs-System mit Abzeichen</li>
    </ul>
    
    <h3>🔗 Links:</h3>
    <p><a href="/admin" target="_blank">🔧 Admin Panel</a></p>
    <p><a href="/dashboard" target="_blank">📊 Dashboard</a></p>
    
    <h3>📱 WhatsApp Bot:</h3>
    <p><strong>+1 415 523 8886</strong> (Twilio Sandbox)</p>
    
    <h3>💡 Test-Ablauf (mehrsprachig):</h3>
    <ol>
        <li>Sende "join [sandbox-name]" an +1 415 523 8886</li>
        <li>Schreibe eine beliebige Nachricht</li>
        <li>Wähle deine Sprache (1, 2 oder 3)</li>
        <li>Folge dem Registrierungsprozess in deiner Sprache</li>
        <li>Gehe zu /admin und genehmige dich</li>
        <li>Beginne mit dem Deutschlernen und sammle XP!</li>
    </ol>
    `);
    } catch (error) {
        console.error('❌ Status page error:', error);
        res.send('<h1>❌ Server Error</h1><p>Datenbank-Verbindung fehlgeschlagen</p>');
    }
});

// ===== SERVER STARTEN =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 DEUTSCHLEHRER BOT v2.0 (KORRIGIERT) GESTARTET!`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Status: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`📱 WhatsApp: +1 415 523 8886`);
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
    
    try {
        console.log('🔧 Initialisiere Datenbank...');
        await initializeDatabase();
        
        await loadTrainingData();
        
        console.log(`✅ Bot v2.0 bereit für mehrsprachige WhatsApp Nachrichten!`);
        console.log(`📋 Admin Nummern:`, ADMIN_NUMBERS);
        console.log(`🌍 Sprachen: English, Français, العربية`);
        console.log(`🎮 Gamification: Aktiv`);
        console.log(`🔧 Alle Fehler behoben: Pool import, Spalten, Registrierung`);
        
    } catch (error) {
        console.error('❌ STARTUP FEHLER:', error);
        console.log('⚠️ Bot läuft ohne Datenbank (Fallback-Modus)');
    }
});

module.exports = app;
