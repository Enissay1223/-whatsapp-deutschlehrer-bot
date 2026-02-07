# 🔐 ADMIN DASHBOARD SETUP - Schritt für Schritt Anleitung

Diese Anleitung erklärt, wie du das Admin Dashboard einrichtest. Folge den Schritten nacheinander.

---

## ✅ Schritt 1: Admin Datenbank-Tabelle erstellen (2 Minuten)

Die Admin-Tabelle speichert die Login-Daten für das Admin Dashboard.

### Was zu tun ist:

1. Öffne **Supabase** in deinem Browser: https://supabase.com
2. Wähle dein Projekt aus
3. Klicke links auf **"SQL Editor"** (das Symbol sieht aus wie `</>`  )
4. Klicke auf **"New Query"** (oben rechts, blauer Button)
5. Kopiere den gesamten Inhalt aus der Datei: `backend/database-admin-table.sql`
6. Füge ihn in den SQL Editor ein
7. Klicke auf **"Run"** (grüner Button unten rechts)

### Erwartetes Ergebnis:

Du solltest sehen: `Success. No rows returned`

Das bedeutet, die Tabelle `admin_users` wurde erfolgreich erstellt.

### Überprüfung:

1. Klicke links auf **"Table Editor"**
2. Scrolle nach unten in der Tabellenliste
3. Du solltest jetzt die Tabelle **"admin_users"** sehen (mit 0 rows)

---

## ✅ Schritt 2: JWT Secret - Bereits vorhanden!

**Gute Nachricht:** Die `JWT_SECRET` Variable existiert bereits in deinem Railway Projekt!

Der Admin-Code verwendet dieselbe `JWT_SECRET` Variable wie der Rest deines Bots. Du musst nichts hinzufügen.

---

## 👤 Schritt 3: Ersten Admin-Benutzer erstellen (3 Minuten)

Jetzt erstellst du deinen ersten Admin-Account, mit dem du dich später einloggen kannst.

### Was zu tun ist:

Öffne ein Tool zum API-Testen:
- **Option A:** Verwende **Postman** (https://www.postman.com/downloads/)
- **Option B:** Verwende **Thunder Client** (VS Code Extension)
- **Option C:** Verwende **curl** im Terminal (siehe unten)

### Mit Postman oder Thunder Client:

1. Erstelle einen neuen **POST** Request
2. URL: `https://[DEINE-RAILWAY-URL]/api/admin/setup`
   - Ersetze `[DEINE-RAILWAY-URL]` mit deiner Railway-Domain
3. Wähle **"Body"** → **"raw"** → **"JSON"**
4. Füge ein:
   ```json
   {
     "email": "deine-email@beispiel.de",
     "password": "DeinSicheresPasswort123!",
     "displayName": "Dein Name"
   }
   ```
5. Klicke auf **"Send"**

### Mit curl im Terminal:

```bash
curl -X POST https://[DEINE-RAILWAY-URL]/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deine-email@beispiel.de",
    "password": "DeinSicheresPasswort123!",
    "displayName": "Dein Name"
  }'
```

### Erwartetes Ergebnis:

```json
{
  "success": true,
  "message": "Super admin created successfully",
  "admin": {
    "id": "...",
    "email": "deine-email@beispiel.de",
    "display_name": "Dein Name",
    "role": "superadmin"
  }
}
```

### ⚠️ Wichtig:

- Dieser Endpoint funktioniert **nur beim ersten Mal**
- Sobald ein Admin existiert, wird dieser Endpoint gesperrt
- Notiere dir dein Passwort sicher!

---

## 🧪 Schritt 4: Admin Login testen (2 Minuten)

Jetzt testen wir, ob der Login funktioniert.

### Mit Postman oder Thunder Client:

1. Erstelle einen neuen **POST** Request
2. URL: `https://[DEINE-RAILWAY-URL]/api/admin/login`
3. Wähle **"Body"** → **"raw"** → **"JSON"**
4. Füge ein:
   ```json
   {
     "email": "deine-email@beispiel.de",
     "password": "DeinSicheresPasswort123!"
   }
   ```
5. Klicke auf **"Send"**

### Mit curl:

```bash
curl -X POST https://[DEINE-RAILWAY-URL]/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deine-email@beispiel.de",
    "password": "DeinSicheresPasswort123!"
  }'
```

### Erwartetes Ergebnis:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "email": "deine-email@beispiel.de",
    "display_name": "Dein Name",
    "role": "superadmin"
  }
}
```

### ⚠️ Wichtig:

**Kopiere den `token` Wert!** Du brauchst ihn für alle weiteren Admin-API-Anfragen.

---

## 🔒 Schritt 5: Geschützte API testen (Optional, 2 Minuten)

Teste, ob die Authentifizierung funktioniert.

### Mit Postman oder Thunder Client:

1. Erstelle einen neuen **GET** Request
2. URL: `https://[DEINE-RAILWAY-URL]/api/admin/me`
3. Gehe zu **"Headers"**
4. Füge hinzu:
   ```
   Key:   Authorization
   Value: Bearer [DEIN-TOKEN-AUS-SCHRITT-4]
   ```
   (Ersetze `[DEIN-TOKEN-AUS-SCHRITT-4]` mit dem kompletten Token, inkl. "Bearer " davor)
5. Klicke auf **"Send"**

### Mit curl:

```bash
curl -X GET https://[DEINE-RAILWAY-URL]/api/admin/me \
  -H "Authorization: Bearer [DEIN-TOKEN]"
```

### Erwartetes Ergebnis:

```json
{
  "id": "...",
  "email": "deine-email@beispiel.de",
  "display_name": "Dein Name",
  "role": "superadmin",
  "is_active": true,
  "created_at": "2026-01-31T..."
}
```

---

## 📊 Schritt 6: Dashboard Statistiken abrufen (Optional, 1 Minute)

Teste die Dashboard-Statistiken API.

### Request:

- **Method:** GET
- **URL:** `https://[DEINE-RAILWAY-URL]/api/admin/stats`
- **Headers:** `Authorization: Bearer [DEIN-TOKEN]`

### Erwartetes Ergebnis:

```json
{
  "totalUsers": 5,
  "premiumUsers": 2,
  "freeUsers": 3,
  "totalLessons": 15,
  "monthlyRevenue": 19.98,
  "newUsersThisWeek": 3
}
```

---

## ✅ Setup abgeschlossen!

Das Backend für das Admin Dashboard ist jetzt einsatzbereit.

### Verfügbare Admin APIs:

| Endpoint | Method | Beschreibung | Auth |
|----------|--------|--------------|------|
| `/api/admin/login` | POST | Admin Login | Nein |
| `/api/admin/setup` | POST | Ersten Admin erstellen | Nein* |
| `/api/admin/me` | GET | Eigene Admin-Info | Ja |
| `/api/admin/stats` | GET | Dashboard Statistiken | Ja |
| `/api/admin/users` | GET | Alle Benutzer auflisten | Ja |
| `/api/admin/users/:id` | GET | Benutzer-Details | Ja |
| `/api/admin/users/:id` | PATCH | Benutzer bearbeiten | Ja |
| `/api/lessons` | GET | Alle Lessons (öffentlich) | Nein |
| `/api/lessons/:id` | GET | Einzelne Lesson | Nein |
| `/api/lessons/admin/all` | GET | Alle Lessons (inkl. unveröffentlicht) | Ja |
| `/api/lessons` | POST | Neue Lesson erstellen | Ja |
| `/api/lessons/:id` | PATCH | Lesson bearbeiten | Ja |
| `/api/lessons/:id` | DELETE | Lesson löschen | Ja |

*Nur verfügbar wenn noch kein Admin existiert

---

## 🚀 Nächste Schritte:

Das Backend ist fertig. Als nächstes bauen wir das **React Frontend** für das Admin Dashboard:

1. Login-Seite
2. Dashboard mit Statistiken
3. Benutzer-Verwaltung
4. Lesson-Editor
5. Umsatz-Übersicht

---

## 🆘 Häufige Fehler:

### Fehler: "Admin users already exist"
- **Problem:** Du versuchst `/api/admin/setup` aufzurufen, aber es gibt bereits einen Admin
- **Lösung:** Verwende stattdessen `/api/admin/login`

### Fehler: "Invalid or expired token"
- **Problem:** Der JWT Token ist abgelaufen (nach 7 Tagen) oder ungültig
- **Lösung:** Melde dich neu an über `/api/admin/login`

### Fehler: "JWT_SECRET is not defined"
- **Problem:** Railway hat kein JWT_SECRET Environment Variable
- **Lösung:** Gehe zurück zu Schritt 3 und füge JWT_SECRET hinzu

### Fehler: "relation admin_users does not exist"
- **Problem:** Die Datenbank-Tabelle wurde nicht erstellt
- **Lösung:** Gehe zurück zu Schritt 1 und führe das SQL aus

---

**Viel Erfolg! 🎉**
