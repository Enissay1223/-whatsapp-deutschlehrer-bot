// ===================================================================
// WHATSAPP DEUTSCHLEHRER BOT - HAUPTDATEI
// ===================================================================
// Diese Datei ist das "Gehirn" deines Bots
// Hier passiert ALLES: WhatsApp empfangen, KI antworten, Nutzer verwalten

// ===== SCHRITT 1: WERKZEUGE LADEN =====
// Das sind wie "Apps" die unser Bot braucht
const express = require('express');      // Web-Server (für Admin-Panel)
const twilio = require('twilio');        // WhatsApp Verbindung
const OpenAI = require('openai');        // Künstliche Intelligenz
const fs = require('fs').promises;       // Dateien lesen (für training_data.txt)
const path = require('path');            // Dateipfade verwalten

// ===== SCHRITT 2: EXPRESS APP ERSTELLEN =====
// Das ist unser Web-Server der 24/7 läuft
const app = express();
app.use(express.urlencoded({ extended: true })); // WhatsApp Nachrichten verstehen
app.use(express.json());                         // JSON Daten verstehen
app.use(express.static('public'));               // Admin-Panel Dateien bereitstellen

// ===== SCHRITT 3: VERBINDUNGEN AUFBAUEN =====
// Hier verbindet sich der Bot mit Twilio und OpenAI
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,    // Deine Twilio Account ID
    process.env.TWILIO_AUTH_TOKEN      // Dein Twilio Passwort
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY  // Dein OpenAI Schlüssel
});

// ===== SCHRITT 4: ADMIN KONFIGURATION =====
// Wer darf den Bot verwalten? (Du und deine Frau)
const ADMIN_NUMBERS = [
    process.env.ADMIN_PHONE_1 || 'whatsapp:+491234567890',  // DEINE Nummer
    process.env.ADMIN_PHONE_2 || 'whatsapp:+491234567891'   // Deiner FRAU Nummer
];

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'DeutschLehrer2024!';

// ===== SCHRITT 5: NUTZER STATUS DEFINITIONEN =====
// Jeder Nutzer kann verschiedene Status haben
const USER_STATUS = {
    PENDING: 'pending',       // Wartet auf Genehmigung
    APPROVED: 'approved',     // Darf den Bot benutzen
    REJECTED: 'rejected',     // Wurde abgelehnt
    SUSPENDED: 'suspended'    // Wurde gesperrt
};

// ===== SCHRITT 6: DATEN SPEICHER =====
// Hier speichert der Bot alle Nutzer-Informationen
// WICHTIG: In echter Produktion würdest du eine richtige Datenbank benutzen
let userData = {};           // Alle genehmigten Nutzer
let pendingUsers = {};       // Nutzer die auf Genehmigung warten
let customTrainingData = ''; // Das Wissen deiner Frau

// ===== SCHRITT 7: TRAINING DATA LADEN =====
// Beim Start lädt der Bot das Wissen deiner Frau
async function loadTrainingData() {
    try {
        const data = await fs.readFile('./training_data.txt', 'utf8');
        customTrainingData = data;
        console.log('✅ Training Data geladen:', data.length, 'Zeichen');
    } catch (error) {
        console.log('⚠️ Keine training_data.txt gefunden, verwende Standard-Wissen');
        customTrainingData = 'Standard DaF/DaZ Wissen wird verwendet.';
    }
}

// ===== SCHRITT 8: DEUTSCHLEHRER-GEHIRN =====
// Das ist der wichtigste Teil! Hier wird deine Frau's Expertise definiert
const getSystemPrompt = () => `Du bist eine hochqualifizierte DaF/DaZ-Lehrerin mit 15+ Jahren Erfahrung.

🎓 DEINE QUALIFIKATIONEN:
- Expertin für Deutsch als Fremdsprache (DaF) und Zweitsprache (DaZ)
- Spezialistin für arabisch- und französischsprachige Lernende
- Erfahrung mit allen deutschen Prüfungen (A1-C2, telc, Goethe, DTZ, TestDaF)
- Kontrastive Linguistik: Arabisch ↔ Deutsch, Französisch ↔ Deutsch

📚 CUSTOM TRAINING DATA (Das Wissen deiner Frau):
${customTrainingData}

🎯 DEINE UNTERRICHTSMETHODE:
1. Erkenne das Sprachniveau präzise (A1-C2)
2. Fokussiere auf EINEN Hauptfehler pro Nachricht
3. Erkläre Grammatik kontrastiv zur Muttersprache
4. Verwende Arabisch/Französisch nur für komplexe Erklärungen
5. Gib konkrete Übungsaufgaben
6. Bereite gezielt auf Prüfungen vor
7. Sei geduldig, motivierend und professionell

✅ KORREKTUR-STRUKTUR:
1. Positive Verstärkung zuerst: "Sehr gut, dass Sie..."
2. Hauptkorrektur: "Eine kleine Verbesserung: ..."
3. Regel erklären: "Die Regel ist..."
4. Beispiel geben: "Zum Beispiel..."
5. Übung vorschlagen: "Versuchen Sie..."

🎯 PRÜFUNGSVORBEREITUNG:
- A1: Grundwortschatz, sich vorstellen, einfache Gespräche
- A2: Perfekt, Modalverben, Brief schreiben, Alltagssituationen
- B1: Konjunktiv II, Passiv, Präsentationen, DTZ-Vorbereitung
- B2+: Komplexe Texte, Diskussionen, berufliche Kommunikation

Antworte immer professionell, geduldig und motivierend!`;

// ===== SCHRITT 9: NUTZER VERWALTUNG =====
// Funktionen um Nutzer zu verwalten

function getUserData(phoneNumber) {
    // Wenn Nutzer noch nicht existiert, erstelle neuen Eintrag
    if (!userData[phoneNumber]) {
        userData[phoneNumber] = {
            status: USER_STATUS.PENDING,
            level: null,                    // A1, A2, B1, etc.
            targetExam: null,              // Goethe, telc, DTZ, etc.
            lessonsCompleted: 0,
            vocabulary: [],
            weaknesses: [],                // Schwächen des Schülers
            strengths: [],                 // Stärken des Schülers
            lastActive: new Date(),
            streak: 0,                     // Wie viele Tage hintereinander aktiv
            registrationDate: new Date(),
            approvedBy: null,              // Welcher Admin hat genehmigt
            personalInfo: {}
        };
    }
    return userData[phoneNumber];
}

// ===== SCHRITT 10: FREIGABE-SYSTEM =====
// Wenn sich jemand registriert, bekommen Admins eine Benachrichtigung
async function requestApproval(phoneNumber, userInfo) {
    pendingUsers[phoneNumber] = {
        ...userInfo,
        requestDate: new Date(),
        status: USER_STATUS.PENDING
    };

    // Nachricht an alle Admins senden
    const approvalMessage = `🔔 NEUE ANMELDUNG FÜR DEUTSCHLEHRER-BOT

📱 Telefon: ${phoneNumber}
👤 Name: ${userInfo.name}
🌍 Herkunft: ${userInfo.country}
🗣️ Sprachen: ${userInfo.languages}
🎯 Lernziel: ${userInfo.goal}
💡 Motivation: ${userInfo.motivation}
⏰ Anmeldung: ${new Date().toLocaleString('de-DE')}

✅ GENEHMIGEN: Antworte "APPROVE ${phoneNumber}"
❌ ABLEHNEN: Antworte "REJECT ${phoneNumber}"
📊 STATISTIK: Antworte "STATS"

Admin Panel: https://deine-app.railway.app/admin`;

    // An alle Admin-Nummern senden
    for (const adminNumber of ADMIN_NUMBERS) {
        try {
            await client.messages.create({
                body: approvalMessage,
                from: 'whatsapp:+14155238886', // Twilio Sandbox Nummer
                to: adminNumber
            });
            console.log(`📨 Admin-Benachrichtigung gesendet an ${adminNumber}`);
        } catch (error) {
            console.error(`❌ Fehler beim Benachrichtigen von ${adminNumber}:`, error);
        }
    }
}

// ===== SCHRITT 11: ADMIN KOMMANDOS =====
// Was können Admins per WhatsApp steuern?
async function handleAdminCommand(message, fromNumber) {
    // Prüfe: Ist das wirklich ein Admin?
    if (!ADMIN_NUMBERS.includes(fromNumber)) {
        return false; // Nicht autorisiert
    }

    console.log(`🔧 Admin-Kommando von ${fromNumber}: ${message}`);

    // APPROVE Kommando
    if (message.includes('APPROVE')) {
        const phoneNumber = message.split(' ')[1];
        if (pendingUsers[phoneNumber]) {
            // Nutzer genehmigen
            userData[phoneNumber] = {
                ...getUserData(phoneNumber),
                ...pendingUsers[phoneNumber],
                status: USER_STATUS.APPROVED,
                approvedBy: fromNumber,
                approvalDate: new Date()
            };
            delete pendingUsers[phoneNumber];

            // Nutzer benachrichtigen
            await client.messages.create({
                body: `🎉 HERZLICHEN GLÜCKWUNSCH!

Ihre Anmeldung für den Deutschlehrer-Bot wurde genehmigt!

Sie können jetzt mit dem Deutschlernen beginnen. Schreiben Sie einfach eine Nachricht und ich helfe Ihnen beim Deutschlernen.

Viel Erfolg! 📚✨

Ihr digitaler Deutschlehrer 👩‍🏫`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });

            return `✅ Nutzer ${phoneNumber} wurde erfolgreich genehmigt und benachrichtigt.`;
        }
        return `❌ Nutzer ${phoneNumber} nicht in der Warteliste gefunden.`;
    }

    // REJECT Kommando
    if (message.includes('REJECT')) {
        const phoneNumber = message.split(' ')[1];
        if (pendingUsers[phoneNumber]) {
            delete pendingUsers[phoneNumber];
            
            await client.messages.create({
                body: `❌ Ihre Anmeldung für den Deutschlehrer-Bot wurde leider nicht genehmigt.

Für weitere Informationen wenden Sie sich bitte an den Administrator.`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });

            return `❌ Nutzer ${phoneNumber} wurde abgelehnt und benachrichtigt.`;
        }
        return `❌ Nutzer ${phoneNumber} nicht in der Warteliste gefunden.`;
    }

    // STATS Kommando
    if (message.includes('STATS')) {
        const approvedCount = Object.keys(userData).filter(k => userData[k].status === USER_STATUS.APPROVED).length;
        const pendingCount = Object.keys(pendingUsers).length;
        const suspendedCount = Object.keys(userData).filter(k => userData[k].status === USER_STATUS.SUSPENDED).length;

        const stats = `📊 DEUTSCHLEHRER-BOT STATISTIKEN

👥 Genehmigte Nutzer: ${approvedCount}
⏳ Wartende Anmeldungen: ${pendingCount}
🚫 Gesperrte Nutzer: ${suspendedCount}
📚 Gesamt registriert: ${Object.keys(userData).length}

📈 Level-Verteilung:
A1: ${Object.values(userData).filter(u => u.level === 'A1').length}
A2: ${Object.values(userData).filter(u => u.level === 'A2').length}
B1: ${Object.values(userData).filter(u => u.level === 'B1').length}
B2+: ${Object.values(userData).filter(u => u.level && !['A1','A2','B1'].includes(u.level)).length}

🏆 Aktivste Nutzer heute: ${Object.values(userData).filter(u => {
    const today = new Date().toDateString();
    return new Date(u.lastActive).toDateString() === today;
}).length}`;

        return stats;
    }

    // SUSPEND Kommando (Nutzer sperren)
    if (message.includes('SUSPEND')) {
        const phoneNumber = message.split(' ')[1];
        if (userData[phoneNumber]) {
            userData[phoneNumber].status = USER_STATUS.SUSPENDED;
            return `🚫 Nutzer ${phoneNumber} wurde gesperrt.`;
        }
        return `❌ Nutzer ${phoneNumber} nicht gefunden.`;
    }

    return false; // Unbekanntes Kommando
}

// ===== SCHRITT 12: KI-ANTWORT GENERIEREN =====
// Das ist wo die Magie passiert - hier antwortet der Bot wie deine Frau
async function getEnhancedAIResponse(userMessage, phoneNumber) {
    const user = getUserData(phoneNumber);
    
    if (user.status !== USER_STATUS.APPROVED) {
        return "⛔ Sie sind noch nicht für den Deutschlehrer-Bot freigeschaltet. Bitte warten Sie auf die Genehmigung durch den Administrator.";
    }

    // Kontext für die KI zusammenstellen
    const contextPrompt = `
NUTZER-PROFIL:
- Status: ${user.status}
- Sprachniveau: ${user.level || 'Wird ermittelt...'}
- Zielprüfung: ${user.targetExam || 'Nicht festgelegt'}
- Abgeschlossene Lektionen: ${user.lessonsCompleted}
- Bekannte Schwächen: ${user.weaknesses.join(', ') || 'Noch keine bekannt'}
- Bekannte Stärken: ${user.strengths.join(', ') || 'Noch keine bekannt'}
- Letztes Niveau-Update: vor ${Math.floor((new Date() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24))} Tagen

AKTUELLE NACHRICHT DES SCHÜLERS: "${userMessage}"

Antworte als professionelle DaF/DaZ-Lehrerin basierend auf deiner Expertise!`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: contextPrompt }
            ],
            max_tokens: 400,
            temperature: 0.7 // Etwas Kreativität, aber nicht zu viel
        });

        // Nutzer-Aktivität aktualisieren
        user.lastActive = new Date();
        user.lessonsCompleted += 0.5; // Jede Interaktion zählt als halbe Lektion
        
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('❌ OpenAI API Fehler:', error);
        return `🔧 Entschuldigung, ich habe gerade technische Probleme.

Bitte versuchen Sie es in ein paar Minuten erneut.

Falls das Problem weiterhin besteht, wenden Sie sich an den Administrator.`;
    }
}

// ===== SCHRITT 13: WHATSAPP WEBHOOK =====
// Das ist der wichtigste Teil! Hier kommen alle WhatsApp Nachrichten an
app.post('/webhook', async (req, res) => {
    const incomingMessage = req.body.Body;      // Was hat der User geschrieben?
    const fromNumber = req.body.From;           // Von welcher Nummer?
    
    console.log(`📱 Nachricht empfangen von ${fromNumber}: "${incomingMessage}"`);

    try {
        // SCHRITT 1: Ist das ein Admin-Kommando?
        const adminResponse = await handleAdminCommand(incomingMessage, fromNumber);
        if (adminResponse) {
            await client.messages.create({
                body: adminResponse,
                from: 'whatsapp:+14155238886',
                to: fromNumber
            });
            res.status(200).send('OK');
            return;
        }

        const user = getUserData(fromNumber);

        // SCHRITT 2: Registrierungsprozess für neue Nutzer
        if (user.status === USER_STATUS.PENDING && !user.personalInfo.name) {
            await handleRegistration(incomingMessage, fromNumber, user);
            res.status(200).send('OK');
            return;
        }

        // SCHRITT 3: Ist der Nutzer genehmigt?
        if (user.status !== USER_STATUS.APPROVED) {
            let statusMessage = "⏳ Ihre Anmeldung wird noch geprüft. Bitte haben Sie etwas Geduld.";
            
            if (user.status === USER_STATUS.REJECTED) {
                statusMessage = "❌ Ihre Anmeldung wurde leider abgelehnt. Kontaktieren Sie den Administrator für weitere Informationen.";
            } else if (user.status === USER_STATUS.SUSPENDED) {
                statusMessage = "🚫 Ihr Zugang wurde temporär gesperrt. Kontaktieren Sie den Administrator.";
            }

            await client.messages.create({
                body: statusMessage,
                from: 'whatsapp:+14155238886',
                to: fromNumber
            });

            res.status(200).send('OK');
            return;
        }

        // SCHRITT 4: Normale Deutschlehrer-Konversation
        const aiResponse = await getEnhancedAIResponse(incomingMessage, fromNumber);
        
        await client.messages.create({
            body: aiResponse,
            from: 'whatsapp:+14155238886',
            to: fromNumber
        });

        console.log(`✅ Antwort gesendet an ${fromNumber}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten der Nachricht:', error);
        
        // Fehler-Nachricht an User senden
        try {
            await client.messages.create({
                body: `🔧 Entschuldigung, es gab einen technischen Fehler.

Bitte versuchen Sie es in ein paar Minuten erneut.

Technische Details für Admin: ${error.message}`,
                from: 'whatsapp:+14155238886',
                to: fromNumber
            });
        } catch (sendError) {
            console.error('❌ Konnte Fehler-Nachricht nicht senden:', sendError);
        }

        res.status(200).send('OK'); // Immer OK zurückgeben, sonst versucht Twilio erneut
    }
});

// ===== SCHRITT 14: REGISTRIERUNGSPROZESS =====
async function handleRegistration(message, phoneNumber, user) {
    // Erste Nachricht - Registrierung starten
    if (!user.registrationStep) {
        if (message.toLowerCase().includes('/register') || message.toLowerCase().includes('register') || message.toLowerCase().includes('anmelden')) {
            user.registrationStep = 'name';
            await client.messages.create({
                body: `🇩🇪 Willkommen beim professionellen Deutschlehrer-Bot!

Ich bin Ihr digitaler DaF/DaZ-Lehrer und helfe Ihnen beim Deutschlernen.

Für die Anmeldung benötige ich einige Informationen:

👤 Bitte nennen Sie mir Ihren vollständigen Namen.`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            return;
        } else {
            await client.messages.create({
                body: `👋 Hallo! Willkommen beim Deutschlehrer-Bot!

Um diesen Service zu nutzen, müssen Sie sich zuerst registrieren.

Schreiben Sie "REGISTER" oder "ANMELDEN" um zu beginnen.

🇩🇪 Hello! Welcome to the German Teacher Bot!
To use this service, you need to register first.
Write "REGISTER" to start.

🇫🇷 Bonjour! Bienvenue au Bot Professeur d'Allemand!
Pour utiliser ce service, vous devez d'abord vous inscrire. 
Écrivez "REGISTER" pour commencer.

مرحبا! أهلا بك في بوت معلم الألمانية! 🇸🇦
لاستخدام هذه الخدمة، يجب عليك التسجيل أولاً
اكتب "REGISTER" للبدء`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            return;
        }
    }

    // Registrierungsschritte durchlaufen
    switch (user.registrationStep) {
        case 'name':
            user.personalInfo.name = message;
            user.registrationStep = 'country';
            await client.messages.create({
                body: `Danke, ${message}! 👍

🌍 Aus welchem Land kommen Sie?`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'country':
            user.personalInfo.country = message;
            user.registrationStep = 'languages';
            await client.messages.create({
                body: `Interessant! 🌍

🗣️ Welche Sprachen sprechen Sie? 
(z.B. "Arabisch und Französisch" oder "Nur Arabisch")`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'languages':
            user.personalInfo.languages = message;
            user.registrationStep = 'goal';
            await client.messages.create({
                body: `Super! 🗣️

🎯 Was ist Ihr Deutschlern-Ziel?
Beispiele:
• "A1 Prüfung bestehen"
• "B1 für die Arbeit"
• "Alltägliche Gespräche führen"
• "DTZ (Deutsch-Test für Zuwanderer)"`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'goal':
            user.personalInfo.goal = message;
            user.registrationStep = 'motivation';
            await client.messages.create({
                body: `Sehr gut! 🎯

💡 Warum möchten Sie Deutsch lernen?
(z.B. "Für die Arbeit", "Ich lebe in Deutschland", "Studium")`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'motivation':
            user.personalInfo.motivation = message;
            
            // Registrierung abschließen
            await requestApproval(phoneNumber, user.personalInfo);
            
            await client.messages.create({
                body: `✅ REGISTRIERUNG ABGESCHLOSSEN!

📋 Ihre Angaben:
👤 Name: ${user.personalInfo.name}
🌍 Herkunft: ${user.personalInfo.country}
🗣️ Sprachen: ${user.personalInfo.languages}
🎯 Ziel: ${user.personalInfo.goal}
💡 Motivation: ${user.personalInfo.motivation}

⏳ Ihre Anmeldung wird jetzt vom Administrator geprüft.

Sie erhalten eine Nachricht, sobald Sie freigeschaltet sind. Dies kann bis zu 24 Stunden dauern.

Vielen Dank für Ihr Interesse! 🙏`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
    }
}

// ===== SCHRITT 15: ADMIN PANEL (WEB-INTERFACE) =====
// Eine Webseite wo du Nutzer verwalten kannst
app.get('/admin', (req, res) => {
    const pendingCount = Object.keys(pendingUsers).length;
    const approvedCount = Object.keys(userData).filter(k => userData[k].status === 'approved').length;
    
    res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deutschlehrer Bot - Admin Panel</title>
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
        .stats { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .stat-card { 
            background: white; padding: 20px; border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #667eea; }
        .user-card { 
            background: white; border: 1px solid #ddd; padding: 20px; 
            margin: 15px 0; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .pending { border-left: 5px solid #ffc107; }
        .approved { border-left: 5px solid #28a745; }
        .rejected { border-left: 5px solid #dc3545; }
        button { 
            padding: 8px 16px; margin: 5px; border: none; border-radius: 5px; 
            cursor: pointer; font-weight: bold;
        }
        .approve { background: #28a745; color: white; }
        .reject { background: #dc3545; color: white; }
        .approve:hover { background: #218838; }
        .reject:hover { background: #c82333; }
        .user-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
        .info-item { padding: 8px; background: #f8f9fa; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇩🇪 Deutschlehrer Bot - Admin Panel</h1>
            <p>Professionelle DaF/DaZ Bot-Verwaltung</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${pendingCount}</div>
                <div>Wartende Anmeldungen</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${approvedCount}</div>
                <div>Aktive Nutzer</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(userData).length}</div>
                <div>Gesamt Registriert</div>
            </div>
        </div>
        
        <h2>⏳ Wartende Anmeldungen (${pendingCount})</h2>
        ${Object.entries(pendingUsers).map(([phone, info]) => `
        <div class="user-card pending">
            <h3>📱 ${info.name}</h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${phone}</div>
                <div class="info-item"><strong>Land:</strong> ${info.country}</div>
                <div class="info-item"><strong>Sprachen:</strong> ${info.languages}</div>
                <div class="info-item"><strong>Ziel:</strong> ${info.goal}</div>
            </div>
            <p><strong>Motivation:</strong> ${info.motivation}</p>
            <p><strong>Anmeldung:</strong> ${new Date(info.requestDate).toLocaleString('de-DE')}</p>
            <button class="approve" onclick="approveUser('${phone}')">✅ Genehmigen</button>
            <button class="reject" onclick="rejectUser('${phone}')">❌ Ablehnen</button>
        </div>
        `).join('')}
        
        ${pendingCount === 0 ? '<p>🎉 Keine wartenden Anmeldungen!</p>' : ''}
        
        <h2>✅ Aktive Nutzer (${approvedCount})</h2>
        ${Object.entries(userData)
            .filter(([_, user]) => user.status === 'approved')
            .map(([phone, user]) => `
        <div class="user-card approved">
            <h3>👤 ${user.personalInfo?.name || 'Unbekannt'}</h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${phone}</div>
                <div class="info-item"><strong>Level:</strong> ${user.level || 'Unbekannt'}</div>
                <div class="info-item"><strong>Lektionen:</strong> ${Math.floor(user.lessonsCompleted)}</div>
                <div class="info-item"><strong>Letztes Login:</strong> ${new Date(user.lastActive).toLocaleDateString('de-DE')}</div>
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
            });
        }
    }
    </script>
</body>
</html>
    `);
});

// Admin API Endpoints
app.post('/admin/approve', (req, res) => {
    const { phone, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    if (pendingUsers[phone]) {
        userData[phone] = {
            ...getUserData(phone),
            ...pendingUsers[phone],
            status: USER_STATUS.APPROVED,
            approvedBy: 'web_admin',
            approvalDate: new Date()
        };
        delete pendingUsers[phone];
        
        // Nutzer benachrichtigen
        client.messages.create({
            body: `🎉 HERZLICHEN GLÜCKWUNSCH!

Ihre Anmeldung wurde genehmigt! Sie können jetzt mit dem Deutschlernen beginnen.

Schreiben Sie einfach eine Nachricht und ich helfe Ihnen beim Deutschlernen.

Viel Erfolg! 📚✨`,
            from: 'whatsapp:+14155238886',
            to: phone
        });
        
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Nutzer nicht gefunden' });
    }
});

app.post('/admin/reject', (req, res) => {
    const { phone, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    if (pendingUsers[phone]) {
        delete pendingUsers[phone];
        
        client.messages.create({
            body: `❌ Ihre Anmeldung wurde leider nicht genehmigt.

Für weitere Informationen wenden Sie sich bitte an den Administrator.`,
            from: 'whatsapp:+14155238886',
            to: phone
        });
        
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Nutzer nicht gefunden' });
    }
});

// ===== SCHRITT 16: GESUNDHEITSCHECK =====
// Eine einfache Seite um zu prüfen ob der Bot läuft
app.get('/', (req, res) => {
    res.send(`
    <h1>🇩🇪 Deutschlehrer WhatsApp Bot</h1>
    <h2>✅ Bot läuft erfolgreich!</h2>
    <p><strong>Status:</strong> Online und bereit</p>
    <p><strong>Aktive Nutzer:</strong> ${Object.keys(userData).filter(k => userData[k].status === 'approved').length}</p>
    <p><strong>Wartende Anmeldungen:</strong> ${Object.keys(pendingUsers).length}</p>
    <p><strong>Training Data:</strong> ${customTrainingData.length} Zeichen geladen</p>
    <p><strong>Server Zeit:</strong> ${new Date().toLocaleString('de-DE')}</p>
    
    <h3>🔗 Links:</h3>
    <p><a href="/admin" target="_blank">🔧 Admin Panel</a></p>
    
    <h3>📱 WhatsApp Bot Nummer:</h3>
    <p><strong>+1 415 523 8886</strong> (Twilio Sandbox)</p>
    
    <h3>💡 Erste Schritte:</h3>
    <ol>
        <li>Sende "join [sandbox-name]" an +1 415 523 8886</li>
        <li>Schreibe "REGISTER" um dich anzumelden</li>
        <li>Warte auf Admin-Genehmigung</li>
        <li>Beginne mit dem Deutschlernen!</li>
    </ol>
    `);
});

// ===== SCHRITT 17: SERVER STARTEN =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 Deutschlehrer Bot erfolgreich gestartet!`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: https://deine-app.railway.app`);
    console.log(`🔧 Admin Panel: https://deine-app.railway.app/admin`);
    console.log(`📱 WhatsApp: +1 415 523 8886`);
    
    // Training Data beim Start laden
    await loadTrainingData();
    
    console.log(`✅ Bot ist bereit für WhatsApp Nachrichten!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Bot wird heruntergefahren...');
    process.exit(0);
});

module.exports = app;
