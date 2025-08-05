// ===================================================================
// WHATSAPP DEUTSCHLEHRER BOT - REPARIERTE VERSION
// ===================================================================
// HAUPTÄNDERUNGEN:
// - Web Admin Panel im Fokus (WhatsApp Admin optional)
// - Bessere Fehlerbehandlung und Debug-Logs
// - Einfacherer Registrierungsprozess
// - Admin/User Konflikt gelöst

const express = require('express');
const twilio = require('twilio');
const OpenAI = require('openai');
const fs = require('fs').promises;

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

// ===== STATUS DEFINITIONEN =====
const USER_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
};

// ===== DATEN SPEICHER =====
let userData = {};
let pendingUsers = {};
let customTrainingData = '';

// ===== TRAINING DATA LADEN =====
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
const getSystemPrompt = () => `Du bist eine hochqualifizierte DaF/DaZ-Lehrerin.

📚 TRAINING DATA:
${customTrainingData}

🎯 UNTERRICHTSMETHODE:
1. Erkenne Sprachniveau (A1-C2)
2. Korrigiere einen Hauptfehler pro Nachricht
3. Erkläre Grammatik kontrastiv zur Muttersprache
4. Gib konkrete Übungsaufgaben
5. Sei geduldig und motivierend

✅ KORREKTUR-STRUKTUR:
1. Positive Verstärkung: "Sehr gut, dass Sie..."
2. Korrektur: "Eine kleine Verbesserung: ..."
3. Regel: "Die Regel ist..."
4. Übung: "Versuchen Sie..."`;

// ===== NUTZER VERWALTUNG =====
function getUserData(phoneNumber) {
    if (!userData[phoneNumber]) {
        userData[phoneNumber] = {
            status: USER_STATUS.PENDING,
            level: null,
            lessonsCompleted: 0,
            lastActive: new Date(),
            registrationDate: new Date(),
            personalInfo: {},
            registrationStep: null
        };
        console.log(`🆕 Neuer Nutzer erstellt: ${phoneNumber}`);
    }
    return userData[phoneNumber];
}

// ===== ADMIN KOMMANDOS (Optional - Web ist primär) =====
async function handleAdminCommand(message, fromNumber) {
    if (!ADMIN_NUMBERS.includes(fromNumber)) {
        return false;
    }

    console.log(`🔧 Admin-Kommando: ${message} von ${fromNumber}`);

    if (message.includes('STATS')) {
        const approvedCount = Object.keys(userData).filter(k => userData[k].status === USER_STATUS.APPROVED).length;
        const pendingCount = Object.keys(pendingUsers).length;
        
        return `📊 BOT STATISTIKEN
👥 Aktive Nutzer: ${approvedCount}
⏳ Wartende: ${pendingCount}
📚 Registriert: ${Object.keys(userData).length}

💻 Web Admin: https://deine-app.railway.app/admin`;
    }

    if (message.includes('APPROVE')) {
        const phoneNumber = message.split(' ')[1];
        return approveUserViaCommand(phoneNumber, fromNumber);
    }

    return false;
}

// ===== NUTZER GENEHMIGUNG (Hauptfunktion) =====
async function approveUserViaCommand(phoneNumber, approvedBy) {
    if (pendingUsers[phoneNumber]) {
        // Verschiebe von pending zu approved
        userData[phoneNumber] = {
            ...getUserData(phoneNumber),
            ...pendingUsers[phoneNumber],
            status: USER_STATUS.APPROVED,
            approvedBy: approvedBy,
            approvalDate: new Date()
        };
        delete pendingUsers[phoneNumber];

        // Nutzer benachrichtigen
        try {
            await client.messages.create({
                body: `🎉 HERZLICHEN GLÜCKWUNSCH!

Ihre Anmeldung wurde genehmigt! Sie können jetzt mit dem Deutschlernen beginnen.

Schreiben Sie einfach: "Hallo, ich möchte Deutsch lernen"

Viel Erfolg! 📚✨`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            console.log(`✅ Genehmigungsbenachrichtigung gesendet an ${phoneNumber}`);
        } catch (error) {
            console.error(`❌ Fehler beim Benachrichtigen: ${error}`);
        }

        return true;
    }
    return false;
}

// ===== KI ANTWORT GENERIEREN =====
async function getAIResponse(userMessage, phoneNumber) {
    const user = getUserData(phoneNumber);
    
    if (user.status !== USER_STATUS.APPROVED) {
        return "⛔ Sie sind noch nicht freigeschaltet. Bitte warten Sie auf die Genehmigung.";
    }

    const contextPrompt = `
NUTZER: ${userMessage}
SPRACHNIVEAU: ${user.level || 'Unbekannt'}

Antworte als DaF/DaZ-Lehrerin!`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: getSystemPrompt() },
                { role: "user", content: contextPrompt }
            ],
            max_tokens: 400,
            temperature: 0.7
        });

        user.lastActive = new Date();
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('❌ OpenAI Fehler:', error);
        return "🔧 Technisches Problem. Bitte versuchen Sie es später erneut.";
    }
}

// ===== REGISTRIERUNG (Vereinfacht) =====
async function handleRegistration(message, phoneNumber, user) {
    console.log(`📝 Registrierungsschritt: ${user.registrationStep} für ${phoneNumber}`);

    if (!user.registrationStep) {
        if (message.toLowerCase().includes('register') || message.toLowerCase().includes('anmelden')) {
            user.registrationStep = 'name';
            await client.messages.create({
                body: `🇩🇪 Willkommen beim Deutschlehrer-Bot!

Für die Anmeldung benötige ich einige Informationen:

👤 Bitte nennen Sie mir Ihren vollständigen Namen.`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            console.log(`✅ Registrierung gestartet für ${phoneNumber}`);
            return;
        } else {
            await client.messages.create({
                body: `👋 Willkommen beim Deutschlehrer-Bot!

Schreiben Sie "REGISTER" um sich anzumelden.`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            return;
        }
    }

    // Registrierungsschritte
    switch (user.registrationStep) {
        case 'name':
            user.personalInfo.name = message;
            user.registrationStep = 'country';
            await client.messages.create({
                body: `Danke, ${message}! 👍\n\n🌍 Aus welchem Land kommen Sie?`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            console.log(`📝 Name gespeichert: ${message}`);
            break;
            
        case 'country':
            user.personalInfo.country = message;
            user.registrationStep = 'languages';
            await client.messages.create({
                body: `Interessant! 🌍\n\n🗣️ Welche Sprachen sprechen Sie?`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'languages':
            user.personalInfo.languages = message;
            user.registrationStep = 'goal';
            await client.messages.create({
                body: `Super! 🗣️\n\n🎯 Was ist Ihr Deutschlern-Ziel?\n(z.B. "A1 Prüfung", "Alltag", "Beruf")`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            break;
            
        case 'goal':
            user.personalInfo.goal = message;
            
            // REGISTRIERUNG ABSCHLIESSEN - IN WARTELISTE EINREIHEN
            pendingUsers[phoneNumber] = {
                ...user.personalInfo,
                requestDate: new Date(),
                status: USER_STATUS.PENDING,
                phoneNumber: phoneNumber
            };
            
            console.log(`✅ NUTZER IN WARTELISTE: ${phoneNumber}`, pendingUsers[phoneNumber]);
            
            await client.messages.create({
                body: `✅ REGISTRIERUNG ABGESCHLOSSEN!

📋 Ihre Angaben:
👤 Name: ${user.personalInfo.name}
🌍 Land: ${user.personalInfo.country}
🗣️ Sprachen: ${user.personalInfo.languages}
🎯 Ziel: ${user.personalInfo.goal}

⏳ Ihre Anmeldung wird jetzt geprüft.
Sie erhalten eine Nachricht sobald Sie freigeschaltet sind.

Vielen Dank! 🙏`,
                from: 'whatsapp:+14155238886',
                to: phoneNumber
            });
            
            console.log(`📊 Aktuelle Warteliste:`, Object.keys(pendingUsers));
            break;
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
            await client.messages.create({
                body: adminResponse,
                from: 'whatsapp:+14155238886',
                to: fromNumber
            });
            res.status(200).send('OK');
            return;
        }

        const user = getUserData(fromNumber);
        console.log(`👤 User Status: ${user.status}, Step: ${user.registrationStep}`);

        // Registrierung handhaben
        if (user.status === USER_STATUS.PENDING && (!user.personalInfo.name || user.registrationStep)) {
            await handleRegistration(incomingMessage, fromNumber, user);
            res.status(200).send('OK');
            return;
        }

        // Nutzer-Status prüfen
        if (user.status !== USER_STATUS.APPROVED) {
            await client.messages.create({
                body: "⏳ Ihre Anmeldung wird noch geprüft. Bitte haben Sie Geduld.",
                from: 'whatsapp:+14155238886',
                to: fromNumber
            });
            res.status(200).send('OK');
            return;
        }

        // Normale Deutschlehrer-Konversation
        const aiResponse = await getAIResponse(incomingMessage, fromNumber);
        await client.messages.create({
            body: aiResponse,
            from: 'whatsapp:+14155238886',
            to: fromNumber
        });

        console.log(`✅ Antwort gesendet an ${fromNumber}`);
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ WEBHOOK FEHLER:', error);
        res.status(200).send('OK');
    }
});

// ===== WEB ADMIN PANEL (HAUPTFOKUS) =====
app.get('/admin', (req, res) => {
    const pendingCount = Object.keys(pendingUsers).length;
    const approvedCount = Object.keys(userData).filter(k => userData[k].status === 'approved').length;
    
    console.log(`🌐 Admin Panel aufgerufen - Wartende: ${pendingCount}, Aktive: ${approvedCount}`);
    console.log(`📋 Wartende Nutzer:`, Object.keys(pendingUsers));
    
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
        .debug { 
            background: #fff3cd; border: 1px solid #ffeaa7; 
            padding: 15px; border-radius: 10px; margin-bottom: 20px;
            font-family: monospace; font-size: 12px;
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
        .refresh-btn { 
            background: #007bff; color: white; padding: 10px 20px; 
            border-radius: 5px; text-decoration: none; display: inline-block; margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇩🇪 Deutschlehrer Bot - Admin Panel</h1>
            <p>Professionelle DaF/DaZ Bot-Verwaltung</p>
        </div>
        
        <a href="/admin" class="refresh-btn">🔄 Seite aktualisieren</a>
        
        <div class="debug">
            <strong>🔍 DEBUG INFO:</strong><br>
            Server Zeit: ${new Date().toLocaleString('de-DE')}<br>
            Wartende Nutzer: ${JSON.stringify(Object.keys(pendingUsers))}<br>
            Alle Nutzer: ${JSON.stringify(Object.keys(userData))}<br>
            Training Data: ${customTrainingData.length} Zeichen geladen<br>
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
            <h3>📱 ${info.name || 'Unbekannt'}</h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${phone}</div>
                <div class="info-item"><strong>Land:</strong> ${info.country || 'Unbekannt'}</div>
                <div class="info-item"><strong>Sprachen:</strong> ${info.languages || 'Unbekannt'}</div>
                <div class="info-item"><strong>Ziel:</strong> ${info.goal || 'Unbekannt'}</div>
            </div>
            <p><strong>Anmeldung:</strong> ${new Date(info.requestDate).toLocaleString('de-DE')}</p>
            <button class="approve" onclick="approveUser('${phone}')">✅ Genehmigen</button>
            <button class="reject" onclick="rejectUser('${phone}')">❌ Ablehnen</button>
        </div>
        `).join('')}
        
        ${pendingCount === 0 ? '<div class="user-card"><p>🎉 Keine wartenden Anmeldungen!</p><p><em>Neue Nutzer müssen sich erst über WhatsApp registrieren.</em></p></div>' : ''}
        
        <h2>✅ Aktive Nutzer (${approvedCount})</h2>
        ${Object.entries(userData)
            .filter(([_, user]) => user.status === 'approved')
            .map(([phone, user]) => `
        <div class="user-card approved">
            <h3>👤 ${user.personalInfo?.name || 'Unbekannt'}</h3>
            <div class="user-info">
                <div class="info-item"><strong>Telefon:</strong> ${phone}</div>
                <div class="info-item"><strong>Level:</strong> ${user.level || 'Unbekannt'}</div>
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
});

// ===== ADMIN API ENDPOINTS =====
app.post('/admin/approve', async (req, res) => {
    const { phone, password } = req.body;
    
    console.log(`🔑 Admin approval attempt for ${phone}`);
    
    if (password !== ADMIN_PASSWORD) {
        console.log(`❌ Wrong password attempt`);
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    const success = await approveUserViaCommand(phone, 'web_admin');
    
    if (success) {
        console.log(`✅ User ${phone} approved via web`);
        res.json({ success: true });
    } else {
        console.log(`❌ User ${phone} not found in pending list`);
        res.status(404).json({ error: 'Nutzer nicht in Warteliste gefunden' });
    }
});

app.post('/admin/reject', (req, res) => {
    const { phone, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Falsches Passwort' });
    }
    
    if (pendingUsers[phone]) {
        delete pendingUsers[phone];
        console.log(`❌ User ${phone} rejected via web`);
        
        client.messages.create({
            body: `❌ Ihre Anmeldung wurde leider nicht genehmigt.`,
            from: 'whatsapp:+14155238886',
            to: phone
        });
        
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Nutzer nicht gefunden' });
    }
});

// ===== STATUS SEITE =====
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
    
    <h3>📱 WhatsApp Bot:</h3>
    <p><strong>+1 415 523 8886</strong> (Twilio Sandbox)</p>
    
    <h3>💡 Test-Ablauf:</h3>
    <ol>
        <li>Sende "join [sandbox-name]" an +1 415 523 8886</li>
        <li>Schreibe "REGISTER" um dich anzumelden</li>
        <li>Folge dem Registrierungsprozess</li>
        <li>Gehe zu /admin und genehmige dich</li>
        <li>Beginne mit dem Deutschlernen!</li>
    </ol>
    `);
});

// ===== SERVER STARTEN =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 DEUTSCHLEHRER BOT GESTARTET!`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Status: http://localhost:${PORT}`);
    console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
    console.log(`📱 WhatsApp: +1 415 523 8886`);
    console.log(`🔑 Admin Password: ${ADMIN_PASSWORD}`);
    
    await loadTrainingData();
    
    console.log(`✅ Bot bereit für WhatsApp Nachrichten!`);
    console.log(`📋 Admin Nummern:`, ADMIN_NUMBERS);
});

module.exports = app;
