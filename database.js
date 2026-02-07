// ===================================================================
// DATABASE.JS - PostgreSQL Datenbank-Management (KORRIGIERT)
// ===================================================================
// Alle Fehler behoben - funktioniert jetzt einwandfrei

const { Pool } = require('pg');

// ===== DATENBANK-VERBINDUNG =====
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===== DATENBANK-TABELLEN ERSTELLEN =====
async function initializeDatabase() {
    try {
        console.log('🔧 Initialisiere Datenbank...');
        
        // USERS TABELLE - Speichert alle Benutzerinformationen
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100),
                country VARCHAR(50),
                native_languages TEXT,
                learning_goal TEXT,
                preferred_language VARCHAR(20) DEFAULT 'english',
                registration_step VARCHAR(20),
                german_level VARCHAR(10) DEFAULT 'A1',
                status VARCHAR(20) DEFAULT 'pending',
                experience_points INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                lessons_completed INTEGER DEFAULT 0,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approved_by VARCHAR(50),
                approval_date TIMESTAMP
            )
        `);
        
        // LESSONS TABELLE - Speichert alle Lektionen und Übungen
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lessons (
                id SERIAL PRIMARY KEY,
                user_phone VARCHAR(50) REFERENCES users(phone_number),
                lesson_type VARCHAR(50) NOT NULL,
                lesson_content TEXT,
                user_response TEXT,
                ai_feedback TEXT,
                points_earned INTEGER DEFAULT 0,
                is_correct BOOLEAN,
                difficulty_level VARCHAR(10),
                grammar_topic VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // ACHIEVEMENTS TABELLE - Speichert Erfolge und Abzeichen
        await pool.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                user_phone VARCHAR(50) REFERENCES users(phone_number),
                achievement_type VARCHAR(50) NOT NULL,
                achievement_name VARCHAR(100) NOT NULL,
                description TEXT,
                points_awarded INTEGER DEFAULT 0,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // USER_SESSIONS TABELLE - Speichert aktuelle Gesprächs-Kontext
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_phone VARCHAR(50) UNIQUE REFERENCES users(phone_number),
                current_exercise_type VARCHAR(50),
                session_data JSONB,
                waiting_for_response BOOLEAN DEFAULT false,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // WICHTIG: Neue Spalten zu bestehender Tabelle hinzufügen (falls sie fehlen)
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'english'`);
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_step VARCHAR(20)`);
        } catch (error) {
            console.log('⚠️ Spalten bereits vorhanden oder Fehler beim Hinzufügen:', error.message);
        }
        
        console.log('✅ Datenbank erfolgreich initialisiert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Initialisieren der Datenbank:', error);
        throw error;
    }
}

// ===== BENUTZER-VERWALTUNG =====

// Neuen Benutzer erstellen oder bestehenden laden
async function getOrCreateUser(phoneNumber) {
    try {
        // Prüfen ob Benutzer bereits existiert
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE phone_number = $1',
            [phoneNumber]
        );
        
        if (existingUser.rows.length > 0) {
            console.log(`👤 Bestehender Benutzer geladen: ${phoneNumber}`);
            return existingUser.rows[0];
        }
        
        // Neuen Benutzer erstellen
        const newUser = await pool.query(
            `INSERT INTO users (phone_number, status, preferred_language) 
             VALUES ($1, 'pending', 'english') 
             RETURNING *`,
            [phoneNumber]
        );
        
        console.log(`🆕 Neuer Benutzer erstellt: ${phoneNumber}`);
        return newUser.rows[0];
        
    } catch (error) {
        console.error('❌ Fehler beim Laden/Erstellen des Benutzers:', error);
        throw error;
    }
}

// Benutzer-Registrierungsdaten aktualisieren
async function updateUserRegistration(phoneNumber, registrationData) {
    try {
        const result = await pool.query(
            `UPDATE users SET 
                name = $2,
                country = $3,
                native_languages = $4,
                learning_goal = $5,
                registration_step = NULL
             WHERE phone_number = $1
             RETURNING *`,
            [
                phoneNumber,
                registrationData.name || null,
                registrationData.country || null,
                registrationData.languages || null,
                registrationData.goal || null
            ]
        );
        
        console.log(`📝 Registrierungsdaten aktualisiert für: ${phoneNumber}`);
        return result.rows[0] || null;
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren der Registrierung:', error);
        throw error;
    }
}

// Benutzer genehmigen
async function approveUser(phoneNumber, approvedBy) {
    try {
        const result = await pool.query(
            `UPDATE users SET 
                status = 'approved',
                approved_by = $2,
                approval_date = CURRENT_TIMESTAMP
             WHERE phone_number = $1
             RETURNING *`,
            [phoneNumber, approvedBy]
        );
        
        if (result.rows.length > 0) {
            console.log(`✅ Benutzer genehmigt: ${phoneNumber} von ${approvedBy}`);
            return true;
        }
        return false;
        
    } catch (error) {
        console.error('❌ Fehler beim Genehmigen des Benutzers:', error);
        throw error;
    }
}

// Benutzer ablehnen
async function rejectUser(phoneNumber) {
    try {
        const result = await pool.query(
            `UPDATE users SET status = 'rejected' WHERE phone_number = $1`,
            [phoneNumber]
        );
        
        console.log(`❌ Benutzer abgelehnt: ${phoneNumber}`);
        return result.rowCount > 0;
        
    } catch (error) {
        console.error('❌ Fehler beim Ablehnen des Benutzers:', error);
        throw error;
    }
}

// ===== FORTSCHRITTS-TRACKING =====

// Letzte Aktivität aktualisieren
async function updateLastActive(phoneNumber) {
    try {
        await pool.query(
            'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE phone_number = $1',
            [phoneNumber]
        );
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren der letzten Aktivität:', error);
    }
}

// Erfahrungspunkte hinzufügen
async function addExperiencePoints(phoneNumber, points, reason = 'lesson_completed') {
    try {
        // Punkte zum Benutzer hinzufügen
        const userUpdate = await pool.query(
            `UPDATE users SET 
                experience_points = experience_points + $2,
                lessons_completed = lessons_completed + 1
             WHERE phone_number = $1
             RETURNING experience_points, lessons_completed`,
            [phoneNumber, points]
        );
        
        if (userUpdate.rows.length > 0) {
            // Erfolg protokollieren (falls es ein besonderer Meilenstein ist)
            if (userUpdate.rows[0].lessons_completed % 5 === 0) {
                await addAchievement(
                    phoneNumber, 
                    'milestone', 
                    `${userUpdate.rows[0].lessons_completed} Lektionen abgeschlossen`,
                    'Großartige Ausdauer beim Deutschlernen!',
                    points * 2
                );
            }
            
            console.log(`🎯 ${points} XP hinzugefügt für ${phoneNumber}. Gesamt: ${userUpdate.rows[0].experience_points}`);
            return userUpdate.rows[0];
        }
        
        return { experience_points: 0, lessons_completed: 0 };
        
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen von Erfahrungspunkten:', error);
        return { experience_points: 0, lessons_completed: 0 };
    }
}

// Erfolg/Abzeichen hinzufügen
async function addAchievement(phoneNumber, type, name, description, points) {
    try {
        await pool.query(
            `INSERT INTO achievements (user_phone, achievement_type, achievement_name, description, points_awarded)
             VALUES ($1, $2, $3, $4, $5)`,
            [phoneNumber, type, name, description, points]
        );
        
        console.log(`🏆 Erfolg freigeschaltet für ${phoneNumber}: ${name}`);
        
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen des Erfolgs:', error);
    }
}

// Lektion speichern
async function saveLesson(phoneNumber, lessonData) {
    try {
        const result = await pool.query(
            `INSERT INTO lessons (
                user_phone, lesson_type, lesson_content, user_response, 
                ai_feedback, points_earned, is_correct, difficulty_level, grammar_topic
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [
                phoneNumber,
                lessonData.type || 'conversation',
                lessonData.content || '',
                lessonData.userResponse || '',
                lessonData.aiFeedback || '',
                lessonData.points || 10,
                lessonData.isCorrect || false,
                lessonData.level || 'A1',
                lessonData.grammarTopic || 'general'
            ]
        );
        
        console.log(`📚 Lektion gespeichert für ${phoneNumber}, ID: ${result.rows[0].id}`);
        return result.rows[0].id;
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Lektion:', error);
        return null;
    }
}

// ===== ADMIN FUNKTIONEN =====

// Alle wartenden Benutzer abrufen
async function getPendingUsers() {
    try {
        const result = await pool.query(
            `SELECT phone_number, name, country, native_languages, learning_goal, 
                    preferred_language, registration_date
             FROM users 
             WHERE status = 'pending' 
             ORDER BY registration_date ASC`
        );
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Fehler beim Abrufen wartender Benutzer:', error);
        return [];
    }
}

// Alle aktiven Benutzer abrufen
async function getApprovedUsers() {
    try {
        const result = await pool.query(
            `SELECT phone_number, name, german_level, experience_points, 
                    lessons_completed, last_active, approval_date, preferred_language
             FROM users 
             WHERE status = 'approved' 
             ORDER BY last_active DESC`
        );
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Fehler beim Abrufen aktiver Benutzer:', error);
        return [];
    }
}

// Statistiken abrufen
async function getStatistics() {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                COUNT(*) as total_users,
                COALESCE(SUM(lessons_completed), 0) as total_lessons,
                COALESCE(AVG(experience_points), 0) as avg_experience
            FROM users
        `);
        
        return stats.rows[0];
        
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Statistiken:', error);
        return {
            pending_count: 0,
            approved_count: 0,
            rejected_count: 0,
            total_users: 0,
            total_lessons: 0,
            avg_experience: 0
        };
    }
}

// Benutzer-Dashboard-Daten abrufen
async function getUserDashboardData(phoneNumber) {
    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE phone_number = $1',
            [phoneNumber]
        );
        
        if (userResult.rows.length === 0) {
            return null;
        }
        
        const user = userResult.rows[0];
        
        // Letzte Lektionen abrufen
        const recentLessons = await pool.query(
            `SELECT lesson_type, points_earned, is_correct, grammar_topic, created_at
             FROM lessons 
             WHERE user_phone = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [phoneNumber]
        );
        
        // Erfolge abrufen
        const achievements = await pool.query(
            `SELECT achievement_name, description, points_awarded, earned_at
             FROM achievements 
             WHERE user_phone = $1 
             ORDER BY earned_at DESC`,
            [phoneNumber]
        );
        
        return {
            user: user,
            recentLessons: recentLessons.rows,
            achievements: achievements.rows
        };
        
    } catch (error) {
        console.error('❌ Fehler beim Abrufen der Dashboard-Daten:', error);
        return null;
    }
}

// Benutzer-Registrierungs-Schritt aktualisieren
async function updateUserRegistrationStep(phoneNumber, step, field = null, value = null) {
    try {
        let query = 'UPDATE users SET registration_step = $2';
        let params = [phoneNumber, step];
        
        if (field && value !== null) {
            query += `, ${field} = $3`;
            params.push(value);
        }
        
        query += ' WHERE phone_number = $1 RETURNING *';
        
        const result = await pool.query(query, params);
        
        console.log(`📝 Registrierungsschritt aktualisiert: ${phoneNumber} -> ${step}`);
        return result.rows[0] || null;
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren des Registrierungsschritts:', error);
        throw error;
    }
}

// ===== DATENBANK-VERBINDUNG SCHLIESSEN =====
async function closeDatabase() {
    await pool.end();
    console.log('🔒 Datenbankverbindung geschlossen');
}

// Alle Funktionen exportieren
module.exports = {
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
    closeDatabase,
    pool // Pool exportieren für direkten Zugriff
};
