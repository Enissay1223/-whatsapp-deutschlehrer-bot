# Stripe Setup Anleitung (für Nicht-Entwickler)

## Was ist Stripe?

Stripe ist wie PayPal - ein Service der Zahlungen abwickelt. Deine User können damit per Kreditkarte bezahlen.

**WICHTIG:** Stripe hat einen **Test Mode** (kein echtes Geld) und einen **Live Mode** (echtes Geld). Wir starten mit Test Mode!

---

## 🚀 Schritt 1: Stripe Account erstellen

1. Gehe zu: https://stripe.com/
2. Klicke auf **"Start now"** (oben rechts)
3. Erstelle einen Account:
   - E-Mail eingeben
   - Passwort festlegen
   - Bestätige deine E-Mail

4. Nach dem Login bist du im **Stripe Dashboard**

---

## 🔑 Schritt 2: API Keys holen (Test Mode)

### 2.1 Test Mode aktivieren
1. Oben links im Dashboard siehst du einen Schalter: **"Test mode"**
2. Stelle sicher, dass er **AN** ist (blau/aktiviert)
3. Wenn Test Mode an ist, siehst du oben ein oranges Banner: "You're in test mode"

### 2.2 API Keys kopieren
1. Klicke links auf **"Developers"** (Entwickler-Icon)
2. Klicke auf **"API keys"**
3. Du siehst zwei Keys:
   - **Publishable key** (fängt an mit `pk_test_...`) - NICHT DEN!
   - **Secret key** (fängt an mit `sk_test_...`) - **DEN BRAUCHEN WIR!**

4. Klicke bei "Secret key" auf **"Reveal test key"**
5. Kopiere den kompletten Key (beginnt mit `sk_test_...`)

### 2.3 Key zu Railway hinzufügen
1. Gehe zu Railway Dashboard
2. Wähle dein Projekt
3. Klicke auf **"Variables"**
4. Klicke **"+ New Variable"**
5. Name: `STRIPE_SECRET_KEY`
6. Value: Füge den kopierten Key ein (`sk_test_...`)
7. Klicke **"Add"**

---

## 🪝 Schritt 3: Webhook Secret erstellen

Webhooks = Stripe schickt uns Updates (z.B. "Zahlung erfolgreich")

### 3.1 Webhook hinzufügen
1. Im Stripe Dashboard, klicke links auf **"Developers"** → **"Webhooks"**
2. Klicke **"+ Add endpoint"**
3. **Endpoint URL:** `https://DEINE-RAILWAY-URL.up.railway.app/api/payments/webhook`
   - Ersetze `DEINE-RAILWAY-URL` mit deiner echten Railway URL!
   - Beispiel: `https://whatsapp-deutschlehrer-bot-production-3d6e.up.railway.app/api/payments/webhook`

4. **Description:** `Deutschlehrer Bot Payments`

5. **Events to send:** Klicke auf **"Select events"**
   - Suche und wähle diese Events:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `payment_intent.succeeded`
     - ✅ `payment_intent.payment_failed`

6. Klicke **"Add endpoint"**

### 3.2 Webhook Secret kopieren
1. Nach dem Hinzufügen siehst du den Webhook in der Liste
2. Klicke drauf
3. Scrolle runter zu **"Signing secret"**
4. Klicke **"Reveal"**
5. Kopiere den Secret (fängt an mit `whsec_...`)

### 3.3 Webhook Secret zu Railway hinzufügen
1. Gehe wieder zu Railway → Variables
2. **"+ New Variable"**
3. Name: `STRIPE_WEBHOOK_SECRET`
4. Value: Füge den Webhook Secret ein (`whsec_...`)
5. Klicke **"Add"**

---

## 🌐 Schritt 4: Bot Username in Railway setzen

Damit die "Zurück zum Bot" Links funktionieren:

1. Railway → Variables → **"+ New Variable"**
2. Name: `TELEGRAM_BOT_USERNAME`
3. Value: Dein Bot Username (z.B. `GermanTeacherBot` - OHNE @)
4. Klicke **"Add"**

---

## ✅ Schritt 5: Überprüfung

Jetzt solltest du in Railway diese Environment Variables haben:

```
TELEGRAM_BOT_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
BACKEND_URL=...
OPENAI_API_KEY=...
PINECONE_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...        ← NEU
STRIPE_WEBHOOK_SECRET=whsec_...       ← NEU
TELEGRAM_BOT_USERNAME=DeinBotName     ← NEU
```

Railway deployt automatisch neu wenn du neue Variables hinzufügst (1-2 Minuten warten).

---

## 🧪 Schritt 6: Testen mit Test-Kreditkarte

Nachdem Railway deployed ist:

### 6.1 Upgrade starten
1. Öffne deinen Bot in Telegram
2. Schreibe: `/upgrade`
3. Klicke: **"🚀 Jetzt upgraden!"**
4. Du wirst zu Stripe Checkout weitergeleitet

### 6.2 Test-Zahlung durchführen
Auf der Stripe Checkout Seite:
- **E-Mail:** Irgendeine E-Mail (z.B. `test@test.com`)
- **Kartennummer:** `4242 4242 4242 4242`
- **Ablaufdatum:** Irgendwas in der Zukunft (z.B. `12/34`)
- **CVC:** Irgendeine 3-stellige Zahl (z.B. `123`)
- **Name:** Irgendein Name
- **Land:** Germany (oder anderes EU-Land)

### 6.3 Zahlung abschließen
1. Klicke **"Subscribe"**
2. Du wirst zu einer Erfolgsseite weitergeleitet
3. Der Bot schickt dir eine Nachricht: **"🎉 Willkommen bei Premium!"**

### 6.4 Überprüfung
1. Schreibe `/start` im Bot
2. Du solltest sehen:
   ```
   Level: A1
   XP: 115 Punkte
   Plan: Premium ⭐
   💬 Unbegrenzte Nachrichten
   ```

---

## 🎯 Weitere Test-Kreditkarten

Stripe bietet viele Test-Karten für verschiedene Szenarien:

**Erfolgreiche Zahlung:**
- `4242 4242 4242 4242` - Visa

**Zahlung wird abgelehnt:**
- `4000 0000 0000 0002` - Karte abgelehnt

**3D Secure erforderlich:**
- `4000 0027 6000 3184` - Benötigt Authentifizierung

Alle Test-Karten: https://stripe.com/docs/testing

---

## 💰 Schritt 7: Live Mode aktivieren (SPÄTER!)

**WICHTIG:** Mach das erst wenn alles perfekt funktioniert!

### Voraussetzungen:
1. Stripe Account verifizieren:
   - Business Details angeben
   - Steuernummer
   - Bankkonto verbinden (wo Geld eingehen soll)

2. Live Keys verwenden:
   - Im Stripe Dashboard: **Test Mode AUS schalten**
   - Neue API Keys kopieren (fangen mit `sk_live_...` an)
   - In Railway: `STRIPE_SECRET_KEY` ersetzen mit Live Key
   - Webhook neu erstellen (mit Live URL)
   - `STRIPE_WEBHOOK_SECRET` ersetzen

3. Preise anpassen:
   - Im Code steht €9.99/Monat
   - Falls du anderen Preis willst, ändern wir das

---

## 📊 Dashboard & Verwaltung

### Stripe Dashboard verwenden:

**Kunden sehen:**
- Links: **"Customers"** → Alle deine zahlenden User

**Zahlungen sehen:**
- Links: **"Payments"** → Alle Transaktionen

**Abos verwalten:**
- Links: **"Subscriptions"** → Aktive Abos

**Berichte:**
- Links: **"Reports"** → Umsatz, Statistiken

---

## ⚠️ Troubleshooting

### "Webhook signature verification failed"
- `STRIPE_WEBHOOK_SECRET` ist falsch
- Kopiere ihn neu aus Stripe Dashboard → Webhooks → Signing secret

### "No such customer"
- User existiert nicht in Stripe
- Lösung: User soll nochmal `/upgrade` probieren

### "Payment requires authentication"
- Das ist normal bei manchen Karten (3D Secure)
- User muss im Browser die Authentifizierung durchführen

### Webhook kommt nicht an
- Webhook URL ist falsch
- Stelle sicher: `https://DEINE-URL.up.railway.app/api/payments/webhook`
- Teste Webhook in Stripe Dashboard → Webhooks → "Send test webhook"

---

## 🎉 Fertig!

Jetzt kannst du:
- ✅ Premium verkaufen (Test Mode)
- ✅ User verwalten in Stripe Dashboard
- ✅ Zahlungen sehen
- ✅ Abos verwalten

**Nächster Schritt:** Alles gründlich testen, dann auf Live Mode umschalten!

---

## 💡 Tipps

1. **Teste alles gründlich** im Test Mode bevor du Live gehst
2. **Stripe Logs checken** wenn etwas nicht funktioniert: Dashboard → Developers → Logs
3. **Webhook Logs** zeigen dir was Stripe an deine App sendet
4. **Railway Logs** zeigen dir ob deine App die Webhooks empfängt

Viel Erfolg! 🚀
