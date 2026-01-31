# Admin Dashboard - Deutschlehrer Bot

Modernes React Admin Dashboard für die Verwaltung des Deutschlehrer Telegram Bots.

## 🚀 Features

- **Dashboard**: Live-Statistiken über Benutzer, Umsatz und Lektionen
- **Benutzer-Verwaltung**: Alle Telegram-Benutzer anzeigen, suchen und verwalten
- **Lektionen-Editor**: Lektionen erstellen, bearbeiten und löschen
- **JWT Authentifizierung**: Sichere Admin-Logins
- **Responsive Design**: Funktioniert auf Desktop und Mobile

## 🛠 Technologie-Stack

- **React 18**: Moderne UI-Library
- **Vite**: Schneller Build-Tool
- **React Router**: Client-side Routing
- **Tailwind CSS**: Utility-first CSS Framework
- **Axios**: HTTP Client für API-Calls

## 📦 Installation

### 1. Dependencies installieren

```bash
cd admin-dashboard
npm install
```

### 2. Environment Variables einrichten

Erstelle eine `.env` Datei im `admin-dashboard` Ordner:

```env
VITE_API_URL=https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app
```

Ersetze die URL mit deiner Railway Backend-URL.

### 3. Development Server starten

```bash
npm run dev
```

Das Dashboard wird auf `http://localhost:3000` geöffnet.

## 🔑 Login

Verwende deine Admin-Zugangsdaten, die du über die `/api/admin/setup` API erstellt hast:

- **Email**: Die E-Mail, die du beim Setup angegeben hast
- **Passwort**: Dein Admin-Passwort

## 📱 Dashboard-Bereiche

### 1. Dashboard (Startseite)

Zeigt Live-Statistiken:
- Gesamt Benutzer
- Premium vs. Free Benutzer
- Anzahl der Lektionen
- Monatlicher Umsatz
- Neue Benutzer diese Woche

### 2. Benutzer-Verwaltung

- Alle Telegram-Benutzer in einer Tabelle
- Suchfunktion (Name, E-Mail, Telegram ID)
- Abo-Typ ändern (Free ↔ Premium)
- Paginierung für große Benutzerlisten

### 3. Lektionen-Verwaltung

- Alle Lektionen anzeigen (veröffentlicht + Entwürfe)
- Neue Lektionen erstellen
- Bestehende Lektionen bearbeiten
- Lektionen löschen
- Einstellungen:
  - Titel und Inhalt
  - Schwierigkeitsgrad (A1-C2)
  - Lektionstyp (Grammatik, Vokabular, etc.)
  - Premium-Status
  - Veröffentlichungs-Status

## 🏗 Build für Production

```bash
npm run build
```

Die fertigen Dateien befinden sich im `dist/` Ordner und können auf jedem Static Hosting deployed werden (Vercel, Netlify, Railway, etc.).

## 🔒 Sicherheit

- JWT Token werden im `localStorage` gespeichert
- Alle API-Requests enthalten den Bearer Token im Authorization Header
- Bei 401 Unauthorized wird automatisch zum Login umgeleitet
- Passwörter werden niemals im Frontend gespeichert

## 📂 Projekt-Struktur

```
admin-dashboard/
├── src/
│   ├── api/              # API Service Layer
│   │   └── api.js        # Axios Konfiguration + API Calls
│   ├── components/       # Wiederverwendbare Komponenten
│   │   ├── Layout.jsx    # Hauptlayout mit Navigation
│   │   └── ProtectedRoute.jsx  # Auth Guard
│   ├── context/          # React Context
│   │   └── AuthContext.jsx     # Authentication State
│   ├── pages/            # Seiten-Komponenten
│   │   ├── Login.jsx     # Login-Seite
│   │   ├── Dashboard.jsx # Dashboard-Statistiken
│   │   ├── Users.jsx     # Benutzer-Verwaltung
│   │   └── Lessons.jsx   # Lektionen-Editor
│   ├── App.jsx           # Haupt-App mit Routing
│   ├── main.jsx          # React Entry Point
│   └── index.css         # Tailwind CSS Imports
├── index.html            # HTML Template
├── vite.config.js        # Vite Konfiguration
├── tailwind.config.js    # Tailwind Konfiguration
└── package.json          # Dependencies
```

## 🐛 Troubleshooting

### Dashboard zeigt "401 Unauthorized"

- Stelle sicher, dass du eingeloggt bist
- Überprüfe ob dein JWT Token noch gültig ist (7 Tage)
- Melde dich ab und wieder an

### "Network Error" beim API-Call

- Überprüfe die `VITE_API_URL` in der `.env` Datei
- Stelle sicher, dass dein Backend auf Railway läuft
- Überprüfe die Browser-Konsole für CORS-Fehler

### Lektionen werden nicht angezeigt

- Stelle sicher, dass Lektionen in der Datenbank existieren
- Überprüfe die Supabase Verbindung im Backend
- Schaue in die Browser-Konsole für Fehler

## 📞 Support

Bei Problemen überprüfe:
1. Browser-Konsole (F12 → Console Tab)
2. Network Tab für API-Requests
3. Backend-Logs auf Railway

---

**Viel Erfolg mit dem Admin Dashboard! 🎉**
