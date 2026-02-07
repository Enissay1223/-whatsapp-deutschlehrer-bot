// ===================================================================
// SETUP-DATABASE.JS - Einmaliges Setup-Script
// ===================================================================
// Dieses Script müssen Sie nur EINMAL laufen lassen, um die Datenbank zu initialisieren
// Danach macht server.js alles automatisch

const { initializeDatabase, closeDatabase } = require('./database');

async function setupDatabase() {
    console.log('🚀 Starte Datenbank-Setup...');
    
    try {
        // Prüfe ob DATABASE_URL gesetzt ist
        if (!process.env.DATABASE_URL) {
            console.error('❌ FEHLER: DATABASE_URL Umgebungsvariable ist nicht gesetzt!');
            console.log('💡 Lösung: Gehen Sie zu Railway und fügen Sie PostgreSQL hinzu');
            process.exit(1);
        }
        
        console.log('✅ DATABASE_URL gefunden');
        console.log('🔧 Erstelle Tabellen...');
        
        // Datenbank initialisieren
        await initializeDatabase();
        
        console.log('🎉 DATENBANK ERFOLGREICH EINGERICHTET!');
        console.log('');
        console.log('🔍 Was wurde erstellt:');
        console.log('   📊 users - Alle Benutzerinformationen');
        console.log('   📚 lessons - Lektionen und Fortschritt');
        console.log('   🏆 achievements - Erfolge und Abzeichen');
        console.log('   💬 user_sessions - Gesprächs-Kontext');
        console.log('');
        console.log('✅ Sie können jetzt Ihren Bot starten mit: npm start');
        
    } catch (error) {
        console.error('❌ SETUP FEHLGESCHLAGEN:', error.message);
        console.log('');
        console.log('🔧 FEHLERBEHEBUNG:');
        console.log('1. Prüfen Sie, ob PostgreSQL in Railway hinzugefügt wurde');
        console.log('2. Prüfen Sie, ob DATABASE_URL korrekt gesetzt ist');
        console.log('3. Warten Sie 1-2 Minuten nach dem PostgreSQL-Setup');
        
    } finally {
        // Datenbank-Verbindung schließen
        await closeDatabase();
    }
}

// Setup nur ausführen, wenn dieses Script direkt aufgerufen wird
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
