/**
 * SEED LESSONS
 * Creates sample lessons in Supabase and indexes them in Pinecone
 */

import { createLesson } from '../services/lesson.service.js';
import dotenv from 'dotenv';

dotenv.config();

const SAMPLE_LESSONS = [
  {
    title: 'Grundlegende Grüße',
    description: 'Learn basic German greetings for everyday conversations',
    content: `# Grundlegende Grüße

## Vocabulary
- **Guten Morgen** - Good morning (until ~11 AM)
- **Guten Tag** - Good day (11 AM - 6 PM)
- **Guten Abend** - Good evening (after 6 PM)
- **Hallo** - Hello (informal)
- **Tschüss** - Bye (informal)
- **Auf Wiedersehen** - Goodbye (formal)

## Example Dialogues
**Meeting someone:**
- A: Guten Morgen! Wie geht es Ihnen?
- B: Gut, danke! Und Ihnen?

**Informal greeting:**
- A: Hallo! Wie geht's?
- B: Super! Und dir?

## Practice
Try greeting someone in German at different times of the day!`,
    level: 'A1',
    lesson_type: 'vocabulary',
    difficulty_score: 1,
    tags: ['greetings', 'beginner', 'conversation'],
    is_premium: false
  },
  {
    title: 'Der, Die, Das - German Articles',
    description: 'Master the three German articles and their usage',
    content: `# German Articles: Der, Die, Das

## The Three Genders
German nouns have three genders:
- **Masculine (der)** - der Mann, der Tisch, der Apfel
- **Feminine (die)** - die Frau, die Tür, die Blume
- **Neuter (das)** - das Kind, das Buch, das Haus

## Tips for Learning
1. **Diminutives** always take "das": das Mädchen, das Häuschen
2. **Plural** always uses "die": die Männer, die Frauen, die Kinder
3. Learn the article WITH the noun, not separately

## Common Patterns
**Masculine (-er endings):** der Lehrer, der Fahrer
**Feminine (-ung, -heit, -keit):** die Zeitung, die Freiheit
**Neuter (-chen, -lein):** das Kätzchen, das Büchlein

## Practice
Identify the gender of: Auto, Schule, Buch, Telefon`,
    level: 'A1',
    lesson_type: 'grammar',
    difficulty_score: 2,
    tags: ['articles', 'grammar', 'gender'],
    is_premium: false
  },
  {
    title: 'Perfekt Tense - Past Actions',
    description: 'Learn how to talk about completed actions in the past',
    content: `# Perfekt Tense (Present Perfect)

## Formation
**haben/sein + past participle**

- Ich **habe** gegessen (I have eaten)
- Er **ist** gegangen (He has gone)

## Regular Verbs (Weak)
**ge- + stem + -t**
- machen → gemacht
- kaufen → gekauft
- lernen → gelernt

## Irregular Verbs (Strong)
**ge- + changed stem + -en**
- essen → gegessen
- trinken → getrunken
- gehen → gegangen

## Haben vs. Sein
**Use "sein" with:**
- Movement: gehen, fahren, fliegen
- Change of state: werden, sterben, aufwachen
- sein, bleiben

**Use "haben" with:**
- Everything else!

## Examples
- Ich habe Pizza gegessen.
- Wir sind nach Berlin gefahren.
- Sie hat ein Buch gelesen.

## Practice
Convert these to Perfekt:
1. Ich lerne Deutsch.
2. Er geht nach Hause.
3. Wir machen Hausaufgaben.`,
    level: 'A2',
    lesson_type: 'grammar',
    difficulty_score: 4,
    tags: ['perfekt', 'past-tense', 'verbs'],
    is_premium: false
  },
  {
    title: 'Im Restaurant - Ordering Food',
    description: 'Essential phrases for dining out in Germany',
    content: `# Im Restaurant

## Useful Phrases

**Arriving:**
- Einen Tisch für zwei Personen, bitte. (A table for two, please)
- Haben Sie reserviert? (Do you have a reservation?)

**Ordering:**
- Ich hätte gerne... (I would like...)
- Für mich bitte... (For me, please...)
- Was empfehlen Sie? (What do you recommend?)
- Ich bin Vegetarier/Veganer. (I'm vegetarian/vegan)

**During the meal:**
- Guten Appetit! (Enjoy your meal!)
- Das schmeckt gut! (This tastes good!)
- Noch etwas zu trinken? (Anything else to drink?)

**Paying:**
- Die Rechnung, bitte. (The bill, please)
- Zahlen bitte! (Check, please!)
- Zusammen oder getrennt? (Together or separate?)
- Das stimmt so. (Keep the change)

## Menu Vocabulary
- die Vorspeise - appetizer
- das Hauptgericht - main course
- die Nachspeise - dessert
- die Beilage - side dish
- das Getränk - beverage

## Practice Dialogue
**Kellner:** Guten Abend! Was darf es sein?
**Sie:** Ich hätte gerne das Schnitzel mit Pommes.
**Kellner:** Und zu trinken?
**Sie:** Ein großes Wasser, bitte.`,
    level: 'A2',
    lesson_type: 'conversation',
    difficulty_score: 3,
    tags: ['restaurant', 'food', 'conversation'],
    is_premium: false
  },
  {
    title: 'Konjunktiv II - Hypothetical Situations',
    description: 'Express wishes, hypothetical situations, and polite requests',
    content: `# Konjunktiv II (Subjunctive II)

## Uses
1. **Wishes**: Ich wünschte, ich wäre reich.
2. **Hypothetical**: Wenn ich Zeit hätte, würde ich reisen.
3. **Polite requests**: Könnten Sie mir helfen?

## Formation

### Regular Verbs
**würde + infinitive**
- Ich würde gehen
- Er würde lernen

### Common Irregular Verbs
- sein → wäre
- haben → hätte
- werden → würde
- können → könnte
- müssen → müsste
- wollen → wollte

## Conditional Sentences

**Type 2 (Unreal present):**
- **Wenn** ich reich **wäre**, **würde** ich ein Haus kaufen.
- If I were rich, I would buy a house.

**Type 3 (Unreal past):**
- **Wenn** ich früher aufgestanden **wäre**, **hätte** ich den Bus erreicht.
- If I had gotten up earlier, I would have caught the bus.

## Polite Requests
- Könnten Sie das Fenster schließen?
- Würden Sie mir bitte helfen?
- Hätten Sie einen Moment Zeit?

## Practice
Rewrite in Konjunktiv II:
1. Ich habe Zeit. → Wenn ich Zeit...
2. Können Sie helfen? → (polite form)
3. Er ist hier. → Ich wünschte, er...`,
    level: 'B1',
    lesson_type: 'grammar',
    difficulty_score: 6,
    tags: ['konjunktiv', 'subjunctive', 'advanced-grammar'],
    is_premium: true
  },
  {
    title: 'Idioms and Expressions',
    description: 'Common German idioms that make you sound like a native',
    content: `# German Idioms and Expressions

## Animal Idioms

**Schwein haben**
- Literal: to have pig
- Meaning: to be lucky
- Example: Du hast echt Schwein gehabt!

**die Katze aus dem Sack lassen**
- Literal: let the cat out of the bag
- Meaning: reveal a secret
- Example: Jetzt lass die Katze aus dem Sack!

## Body Idioms

**Daumen drücken**
- Literal: press thumbs
- Meaning: keep fingers crossed
- Example: Ich drücke dir die Daumen!

**die Nase voll haben**
- Literal: have one's nose full
- Meaning: be fed up
- Example: Ich habe die Nase voll von dieser Arbeit!

## Weather Idioms

**ins Wasser fallen**
- Literal: fall into water
- Meaning: be cancelled
- Example: Die Party ist ins Wasser gefallen.

**aus allen Wolken fallen**
- Literal: fall from all clouds
- Meaning: be shocked/surprised
- Example: Ich bin aus allen Wolken gefallen!

## Food Idioms

**Das ist nicht mein Bier**
- Literal: That's not my beer
- Meaning: That's not my problem
- Example: Das ist wirklich nicht mein Bier!

**die Kirsche auf der Torte**
- Literal: the cherry on the cake
- Meaning: the icing on the cake
- Example: Und das war die Kirsche auf der Torte!

## Practice
Use these idioms in sentences!`,
    level: 'B2',
    lesson_type: 'vocabulary',
    difficulty_score: 7,
    tags: ['idioms', 'expressions', 'advanced'],
    is_premium: true
  }
];

async function seedLessons() {
  try {
    console.log('🌱 Seeding sample lessons...\n');

    for (const lessonData of SAMPLE_LESSONS) {
      console.log(`Creating: "${lessonData.title}" (${lessonData.level})`);

      const lesson = await createLesson(lessonData);

      console.log(`✅ Created and indexed: ${lesson.id}\n`);
    }

    console.log('✅ All sample lessons created and indexed in Pinecone!');
    console.log(`\n📊 Summary: ${SAMPLE_LESSONS.length} lessons created`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding lessons:', error);
    process.exit(1);
  }
}

seedLessons();
