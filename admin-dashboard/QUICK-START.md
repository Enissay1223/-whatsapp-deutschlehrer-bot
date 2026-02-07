# 🚀 QUICK START - Admin Dashboard

Einfache Schritt-für-Schritt Anleitung, um das Admin Dashboard zu starten.

---

## ⚡ Schnellstart (5 Minuten)

### Schritt 1: In den Ordner wechseln

Öffne ein Terminal und gehe in den `admin-dashboard` Ordner:

```bash
cd admin-dashboard
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

Das dauert ca. 1-2 Minuten. Warte bis es fertig ist.

### Schritt 3: Environment Variable erstellen

Erstelle eine neue Datei namens `.env` im `admin-dashboard` Ordner mit folgendem Inhalt:

```
VITE_API_URL=https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app
```

**Wichtig:** Ersetze die URL mit deiner Railway Backend-URL!

### Schritt 4: Development Server starten

```bash
npm run dev
```

Das Dashboard startet auf: `http://localhost:3000`

### Schritt 5: Login

Öffne deinen Browser und gehe zu: `http://localhost:3000`

Melde dich an mit:
- **Email**: Die E-Mail, die du in Postman beim Setup verwendet hast
- **Passwort**: Dein Admin-Passwort

---

## 🎉 Fertig!

Du solltest jetzt das Dashboard sehen mit:
- 📊 **Dashboard**: Statistiken über Benutzer und Umsatz
- 👥 **Benutzer**: Alle Telegram-Benutzer verwalten
- 📚 **Lektionen**: Lektionen erstellen und bearbeiten

---

## 🐛 Probleme?

### "Cannot find module..."

Stelle sicher, dass du `npm install` ausgeführt hast.

### "401 Unauthorized"

Dein Login ist falsch. Verwende die E-Mail und das Passwort, das du bei der Admin-Erstellung verwendet hast.

### "Network Error"

Überprüfe die `.env` Datei - die `VITE_API_URL` muss korrekt sein und dein Backend muss auf Railway laufen.

### Port 3000 ist bereits belegt

Ändere den Port in `vite.config.js`:
```javascript
server: {
  port: 3001, // Ändere auf einen freien Port
  ...
}
```

---

## 🛑 Server stoppen

Drücke `Ctrl + C` im Terminal, wo der Dev-Server läuft.

---

## 📦 Für Production deployen

Wenn du das Dashboard online stellen möchtest (z.B. auf Vercel oder Netlify):

```bash
npm run build
```

Die fertigen Dateien befinden sich im `dist/` Ordner.

---

**Viel Spaß mit dem Admin Dashboard! 🎉**
