# Telegram Webhook Test & Fix

## Problem: Callbacks kommen nicht an

Wenn Sie auf den Button klicken, sehen wir KEINE Logs von:
- `🔔 Webhook update received`
- `🔘 Processing callback_query`

Das bedeutet: Telegram sendet die Callbacks NICHT an unseren Server.

## Lösung: Webhook neu setzen

### Schritt 1: Webhook Info prüfen

Öffnen Sie im Browser (ersetzen Sie Ihren Token):
```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/getWebhookInfo
```

Sie sollten sehen welche URL aktuell gesetzt ist.

### Schritt 2: Webhook löschen (Reset)

```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/deleteWebhook
```

Sollte zurückgeben: `{"ok":true,"result":true}`

### Schritt 3: Webhook neu setzen

Mit Ihrer Railway URL:
```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/setWebhook?url=https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app/telegram-webhook
```

**WICHTIG:** Die URL muss EXAKT Ihre Railway URL sein!

### Schritt 4: Webhook testen

```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/getWebhookInfo
```

Sollte zeigen:
```json
{
  "url": "https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app/telegram-webhook",
  "has_custom_certificate": false,
  "pending_update_count": 0,
  "last_error_date": 0
}
```

### Schritt 5: Bot neu testen

1. Neuen Chat mit Bot starten
2. `/start` senden
3. Button klicken
4. **JETZT sollten Railway Logs zeigen:**
```
🔔 Webhook update received: {"callback_query":...
🔘 Processing callback_query
📱 Callback received: ...
```

---

## Alternative: Pending Updates clearen

Falls Updates "stecken":
```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/getUpdates
```

Dann:
```
https://api.telegram.org/bot<IHR_TELEGRAM_TOKEN>/getUpdates?offset=-1
```

---

## Railway URL herausfinden

Falls Sie Ihre Railway URL nicht wissen:
1. Railway Dashboard → Ihr Projekt
2. Settings → Domains
3. URL kopieren (z.B. `whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app`)

---

Führen Sie diese Schritte aus und testen Sie erneut!
