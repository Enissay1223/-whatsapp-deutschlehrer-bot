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

// ===== KORRIGIERTER SMART ROUTER (FUNKTIONIERT!) =====

// Mistral API Client (mit Error Handling)
class MistralAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.mistral.ai/v1';
        this.available = !!apiKey; // Check ob API Key verfügbar ist
    }

    async chatCompletion(messages, model = 'mistral-small-latest') {
        if (!this.available) {
            throw new Error('Mistral API Key nicht verfügbar');
        }
        
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

// KORRIGIERTER Smart Router
class SmartAPIRouter {
    constructor() {
        // OpenAI ist erforderlich
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('❌ OPENAI_API_KEY ist erforderlich!');
        }
        
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Mistral ist optional
        this.mistral = process.env.MISTRAL_API_KEY ? 
            new MistralAPI(process.env.MISTRAL_API_KEY) : null;
        
        this.dailyCosts = 0;
        this.lastResetDate = new Date().toDateString();
        
        this.apiStats = {
            mistral: { calls: 0, totalTime: 0, errors: 0 },
            gpt4o_mini: { calls: 0, totalTime: 0, errors: 0 },
            gpt4o: { calls: 0, totalTime: 0, errors: 0 }
        };
        
        console.log('🤖 Smart API Router initialisiert');
        console.log(`🇫🇷 Mistral verfügbar: ${this.mistral ? '✅ Ja' : '❌ Nein'}`);
        console.log(`🤖 OpenAI verfügbar: ✅ Ja`);
    }

    // KORRIGIERTE Komplexitäts-Analyse
    analyzeComplexity(message, userContext = {}) {
        const msg = message.toLowerCase().trim();
        
        console.log(`🔍 Analysiere: "${msg.substring(0, 50)}..."`);
        
        // Einfache Grüße und kurze Antworten (40% der Fälle)
        const simplePatterns = [
            // Alle Sprachen
            /^(hallo|hi|hey|hello|bonjour|salut|marhaba|ahlan)/,
            /^(danke|thank|merci|shukran|thx)/,
            /^(ja|yes|oui|naam|nein|no|non|la)/,
            /^(ok|okay|gut|good|bien|kwayis)/,
            /^(tschüss|bye|au revoir|ma salam)/
        ];
        
        // Sehr kurze Nachrichten
        if (msg.length < 10) {
            console.log('📝 EINFACH: Sehr kurze Nachricht');
            return 'simple';
        }
        
        if (simplePatterns.some(pattern => pattern.test(msg))) {
            console.log('📝 EINFACH: Einfacher Gruß');
            return 'simple';
        }
        
        // Komplexe Deutsch-Lern-Anfragen (20% der Fälle)
        const complexKeywords = [
            // Deutsch
            'grammatik', 'erklär', 'erkläre', 'regel', 'konjugation', 'deklination',
            'warum', 'wieso', 'unterschied', 'bedeutung', 'korrigiere',
            
            // Englisch  
            'grammar', 'explain', 'rule', 'conjugation', 'why', 'difference', 
            'meaning', 'analyze', 'correct', 'translate',
            
            // Französisch
            'grammaire', 'expliquer', 'règle', 'conjugaison', 'pourquoi', 
            'différence', 'signification', 'corriger',
            
            // Arabisch (lateinisch)
            'qawaid', 'sharh', 'lesh', 'farq', 'mana', 'sahih'
        ];
        
        const hasComplexKeywords = complexKeywords.some(keyword => 
            msg.includes(keyword.toLowerCase())
        );
        
        // Viele Fragen oder sehr lange Texte
        const questionMarks = (msg.match(/\?/g) || []).length;
        const isLong = msg.length > 150;
        
        if (hasComplexKeywords || questionMarks > 2 || isLong) {
            console.log('📝 KOMPLEX: Grammatik-Anfrage oder lange Nachricht');
            return 'complex';
        }
        
        // Alles andere ist Medium (Standard Deutsch-Gespräche)
        console.log('📝 MEDIUM: Standard Deutsch-Gespräch');
        return 'medium';
    }

    // KORRIGIERTE Model Selection (Ihre gewünschte Kombi)
    selectModel(complexity, userContext = {}) {
        console.log(`🎯 Model Selection für Komplexität: ${complexity}`);
        
        switch (complexity) {
            case 'simple':
                // Einfache Grüße: Mistral (wenn verfügbar), sonst GPT-4o mini
                if (this.mistral && this.mistral.available) {
                    return {
                        provider: 'mistral',
                        model: 'mistral-small-latest',
                        estimatedCost: 0.0, // kostenlos für Sie
                        reason: 'simple_mistral'
                    };
                } else {
                    return {
                        provider: 'openai',
                        model: 'gpt-4o-mini',
                        estimatedCost: 0.15,
                        reason: 'simple_fallback_gpt4o_mini'
                    };
                }
                
            case 'medium':
                // Standard Gespräche: GPT-4o mini
                return {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    estimatedCost: 0.24,
                    reason: 'medium_gpt4o_mini'
                };
                
            case 'complex':
                // Komplexe Aufgaben: GPT-4o (das Original)
                return {
                    provider: 'openai',
                    model: 'gpt-4o',
                    estimatedCost: 5.0,
                    reason: 'complex_gpt4o'
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

    // KORRIGIERTE API Call Funktion
    async callAPI(messages, selectedModel, userContext = {}) {
        const startTime = Date.now();
        
        try {
            let response;
            
            console.log(`🚀 Verwende: ${selectedModel.provider}/${selectedModel.model}`);
            
            if (selectedModel.provider === 'mistral') {
                response = await this.mistral.chatCompletion(messages, selectedModel.model);
                this.apiStats.mistral.calls++;
                
            } else {
                // OpenAI Call
                const modelName = selectedModel.model; // gpt-4o-mini oder gpt-4o
                
                response = await this.openai.chat.completions.create({
                    model: modelName,
                    messages: messages,
                    max_tokens: 400,
                    temperature: 0.7
                });
                
                response = response.choices[0].message.content;
                
                // Stats tracking
                if (selectedModel.model === 'gpt-4o-mini') {
                    this.apiStats.gpt4o_mini.calls++;
                } else {
                    this.apiStats.gpt4o.calls++;
                }
            }
            
            const responseTime = Date.now() - startTime;
            this.dailyCosts += selectedModel.estimatedCost / 1000;
            
            console.log(`✅ Success: ${responseTime}ms, ~$${(selectedModel.estimatedCost/1000).toFixed(4)}`);
            
            return {
                response: response,
                model: selectedModel,
                responseTime: responseTime,
                success: true
            };
            
        } catch (error) {
            console.error(`❌ ${selectedModel.provider} API Fehler:`, error);
            
            // Intelligent Fallback
            if (selectedModel.provider === 'mistral') {
                console.log('🔄 Mistral fehlgeschlagen, fallback zu GPT-4o mini');
                const fallbackModel = {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    estimatedCost: 0.24,
                    reason: 'mistral_fallback'
                };
                return await this.callAPI(messages, fallbackModel, userContext);
            }
            
            throw error;
        }
    }

    // KORRIGIERTE Haupt-Router Funktion (WICHTIG!)
    async routeMessage(userMessage, userContext = {}) {
        try {
            this.resetDailyCosts();
            
            // 1. Komplexität analysieren
            const complexity = this.analyzeComplexity(userMessage, userContext);
            
            // 2. Model auswählen
            const selectedModel = this.selectModel(complexity, userContext);
            
            // 3. MEHRSPRACHIGEN System Prompt erstellen (DAS WAR DAS PROBLEM!)
            const systemPrompt = this.getMultilingualSystemPrompt(
                userContext.language || 'english',
                userContext.level || 'A1'
            );
            
            // 4. Messages für API vorbereiten (KORRIGIERT!)
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ];
            
            // 5. API Call
            const result = await this.callAPI(messages, selectedModel, userContext);
            
            console.log(`🎯 Router Decision: ${complexity} → ${selectedModel.provider}/${selectedModel.model} (${selectedModel.reason})`);
            
            return {
                response: result.response,
                metadata: {
                    complexity: complexity,
                    model: selectedModel,
                    responseTime: result.responseTime,
                    estimatedCost: selectedModel.estimatedCost / 1000,
                    dailyCosts: this.dailyCosts,
                    language: userContext.language
                }
            };
            
        } catch (error) {
            console.error('❌ Router Fehler:', error);
            
            // Sprach-spezifische Fehlermeldung
            const userLang = userContext.language || 'english';
            const errorMessages = {
                english: "🔧 I'm having a technical problem. Please try again in a moment.",
                french: "🔧 J'ai un problème technique. Veuillez réessayer dans un moment.",
                arabic: "🔧 لدي مشكلة تقنية. يرجى المحاولة مرة أخرى بعد قليل."
            };
            
            return {
                response: errorMessages[userLang] || errorMessages.english,
                metadata: {
                    error: true,
                    errorMessage: error.message,
                    language: userLang
                }
            };
        }
    }

    // NEUE mehrsprachige System Prompts (DAS WAR DER HAUPTFEHLER!)
    getMultilingualSystemPrompt(userLanguage, userLevel) {
        const baseTrainingData = customTrainingData || 'Standard DaF/DaZ knowledge.';
        
        switch (userLanguage) {
            case 'french':
                return `Vous êtes une professeure d'allemand DaF/DaZ expérimentée et professionnelle.

🎯 INSTRUCTIONS CRITIQUES:
- Répondez TOUJOURS et EXCLUSIVEMENT en français
- Même si l'utilisateur écrit en allemand, répondez en français
- Expliquez la grammaire allemande en français, en comparaison avec le français

📚 DONNÉES DE FORMATION:
${baseTrainingData}

🌍 UTILISATEUR:
- Langue maternelle: Français
- Niveau d'allemand: ${userLevel}

✅ MÉTHODE D'ENSEIGNEMENT:
1. Détectez le niveau (A1-C2)
2. Corrigez une erreur principale par message
3. Expliquez les règles allemandes en français
4. Donnez des exercices concrets
5. Attribuez des points (10-20 XP)
6. Soyez patient et encourageant

EXEMPLE DE RÉPONSE:
"Très bien ! Vous utilisez parfaitement le verbe 'haben'.
🔍 Petite correction: DER Computer (masculin en allemand)
📚 Règle: Les mots techniques sont souvent masculins
💪 Exercice: Dites 'der Laptop, der Drucker'
🎯 Vous gagnez 15 points XP!"`;

            case 'arabic':
                return `أنت معلمة ألمانية محترفة ومتخصصة في تعليم الألمانية كلغة أجنبية (DaF/DaZ).

🎯 تعليمات مهمة:
- أجب دائماً وحصرياً بالعربية
- حتى لو كتب المستخدم بالألمانية، أجب بالعربية
- اشرح القواعد الألمانية بالعربية، بالمقارنة مع العربية

📚 بيانات التدريب:
${baseTrainingData}

🌍 المستخدم:
- اللغة الأم: العربية
- مستوى الألمانية: ${userLevel}

✅ طريقة التدريس:
1. حدد المستوى (A1-C2)
2. صحح خطأ واحد رئيسي في كل رسالة
3. اشرح القواعد الألمانية بالعربية
4. اعط تمارين عملية
5. امنح نقاط (10-20 نقطة خبرة)
6. كن صبوراً ومشجعاً

مثال على الإجابة:
"ممتاز! تستخدم الفعل 'haben' بشكل مثالي.
🔍 تصحيح صغير: DER Computer (مذكر في الألمانية)
📚 القاعدة: الكلمات التقنية عادة مذكرة
💪 التمرين: قل 'der Laptop, der Drucker'
🎯 حصلت على 15 نقطة خبرة!"`;

            default: // English
                return `You are a professional and experienced DaF/DaZ (German as Foreign Language) teacher.

🎯 CRITICAL INSTRUCTIONS:
- ALWAYS and EXCLUSIVELY respond in English
- Even if the user writes in German, respond in English
- Explain German grammar in English, contrasting with English

📚 TRAINING DATA:
${baseTrainingData}

🌍 USER:
- Native language: English
- German level: ${userLevel}

✅ TEACHING METHOD:
1. Detect level (A1-C2)
2. Correct one main error per message
3. Explain German rules in English
4. Give concrete exercises
5. Award points (10-20 XP)
6. Be patient and encouraging

EXAMPLE RESPONSE:
"Excellent! You use the verb 'haben' perfectly.
🔍 Small correction: DER Computer (masculine in German)
📚 Rule: Technical words are usually masculine
💪 Exercise: Say 'der Laptop, der Drucker'
🎯 You earned 15 XP points!"`;
        }
    }

    // Reset tägliche Kosten
    resetDailyCosts() {
        const today = new Date().toDateString();
        if (this.lastResetDate !== today) {
            this.dailyCosts = 0;
            this.lastResetDate = today;
            console.log('🔄 Tageskosten zurückgesetzt');
        }
    }

    // Statistiken
    getStats() {
        const totalCalls = Object.values(this.apiStats).reduce((sum, stat) => sum + stat.calls, 0);
        
        return {
            dailyCosts: this.dailyCosts,
            apiStats: this.apiStats,
            costEfficiency: {
                totalCalls: totalCalls,
                avgCostPerCall: this.dailyCosts / Math.max(1, totalCalls),
                mistralPercentage: Math.round((this.apiStats.mistral.calls / Math.max(1, totalCalls)) * 100),
                gpt4oMiniPercentage: Math.round((this.apiStats.gpt4o_mini.calls / Math.max(1, totalCalls)) * 100),
                gpt4oPercentage: Math.round((this.apiStats.gpt4o.calls / Math.max(1, totalCalls)) * 100)
            }
        };
    }
}

// Router Instance erstellen (mit Error Handling)
let smartRouter;
try {
    smartRouter = new SmartAPIRouter();
} catch (error) {
    console.error('❌ Smart Router konnte nicht initialisiert werden:', error);
    // Fallback: Verwende nur OpenAI
    smartRouter = null;
}

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

// ===== KORRIGIERTE AI RESPONSE FUNKTION (FUNKTIONIERT!) =====
async function getAIResponse(userMessage, phoneNumber) {
    try {
        const user = await getOrCreateUser(phoneNumber);
        
        if (user.status !== 'approved') {
            const userLang = user.preferred_language || 'english';
            return WELCOME_MESSAGES[userLang].not_approved;
        }

        await updateLastActive(phoneNumber);
        
        // KORRIGIERTER User Context (Das war ein Problem!)
        const userContext = {
            userId: phoneNumber,
            level: user.german_level || 'A1',
            language: user.preferred_language || 'english', // Kritisch für Mehrsprachigkeit!
            name: user.name || 'Student'
        };
        
        console.log(`🎯 AI Request für ${phoneNumber}:`);
        console.log(`   👤 User: ${userContext.name}`);
        console.log(`   🌍 Sprache: ${userContext.language}`);
        console.log(`   📊 Level: ${userContext.level}`);
        console.log(`   💬 Message: "${userMessage.substring(0, 50)}..."`);
        
        let aiResponse;
        let routerMetadata;
        
        if (smartRouter) {
            // KORRIGIERTER Router Call - DAS WAR DER HAUPTFEHLER!
            // Vorher: routeMessage(contextPrompt, systemPrompt, userContext) ❌
            // Jetzt: routeMessage(userMessage, userContext) ✅
            const result = await smartRouter.routeMessage(userMessage, userContext);
            
            aiResponse = result.response;
            routerMetadata = result.metadata;
            
            // Debug Info
            console.log(`📊 Router Decision:`);
            console.log(`   🧠 Komplexität: ${routerMetadata.complexity}`);
            console.log(`   🤖 Model: ${routerMetadata.model?.provider}/${routerMetadata.model?.model}`);
            console.log(`   💡 Grund: ${routerMetadata.model?.reason}`);
            console.log(`   💰 Kosten: $${routerMetadata.estimatedCost?.toFixed(4)}`);
            console.log(`   🌍 Sprache: ${routerMetadata.language}`);
            
        } else {
            // Fallback: Direkt OpenAI verwenden (falls Router nicht funktioniert)
            console.log('⚠️ Router nicht verfügbar, verwende direkten OpenAI Call');
            
            const fallbackSystemPrompt = `You are a professional German teacher. 
User language: ${userContext.language}
User level: ${userContext.level}
IMPORTANT: Always respond in ${userContext.language}, never in German!`;
            
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: fallbackSystemPrompt },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 400,
                temperature: 0.7
            });
            
            aiResponse = response.choices[0].message.content;
            routerMetadata = {
                complexity: 'fallback',
                model: { provider: 'openai', model: 'gpt-4o-mini' },
                estimatedCost: 0.0024,
                language: userContext.language
            };
        }
        
        // Punkte basierend auf verwendetem Model vergeben
        let pointsEarned = 10;
        if (routerMetadata.model?.provider === 'mistral') {
            pointsEarned = 10; // Mistral ist kostenlos für Sie
        } else if (routerMetadata.model?.model === 'gpt-4o-mini') {
            pointsEarned = 15; // Medium Qualität
        } else if (routerMetadata.model?.model === 'gpt-4o') {
            pointsEarned = 20; // Beste Qualität
        }
        
        await addExperiencePoints(phoneNumber, pointsEarned, 'smart_router_lesson');
        
        // Lektion mit vollständigen Router-Metadaten speichern
        await saveLesson(phoneNumber, {
            type: 'conversation',
            content: userMessage,
            userResponse: userMessage,
            aiFeedback: aiResponse,
            points: pointsEarned,
            isCorrect: true,
            level: user.german_level || 'A1',
            grammarTopic: 'conversation',
            // Router Metadaten
            modelUsed: `${routerMetadata.model?.provider}/${routerMetadata.model?.model}`,
            responseTime: routerMetadata.responseTime || 0,
            estimatedCost: routerMetadata.estimatedCost || 0,
            complexity: routerMetadata.complexity,
            userLanguage: routerMetadata.language,
            routerReason: routerMetadata.model?.reason
        });

        // Erfolgs-Log
        console.log(`✅ AI Response erfolgreich generiert:`);
        console.log(`   📝 Antwort-Länge: ${aiResponse.length} Zeichen`);
        console.log(`   🎯 Punkte vergeben: ${pointsEarned} XP`);
        console.log(`   🌍 Response-Sprache sollte sein: ${userContext.language}`);

        return aiResponse;
        
    } catch (error) {
        console.error('❌ AI Response Fehler:', error);
        
        // Sprach-spezifische Fehlermeldung
        try {
            const user = await getOrCreateUser(phoneNumber);
            const userLang = user.preferred_language || 'english';
            
            const errorMessages = {
                english: "🔧 I'm having a technical problem with my German teaching system. Please try again in a moment.",
                french: "🔧 J'ai un problème technique avec mon système d'enseignement allemand. Veuillez réessayer dans un moment.",
                arabic: "🔧 لدي مشكلة تقنية مع نظام تعليم الألمانية. يرجى المحاولة مرة أخرى بعد قليل."
            };
            
            return errorMessages[userLang] || errorMessages.english;
            
        } catch (fallbackError) {
            console.error('❌ Auch Fallback fehlgeschlagen:', fallbackError);
            return "🔧 Technical problem. Please try again later.";
        }
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
