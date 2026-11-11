# Demo script: RetroBoard Lite in 3 minutes

The pitch is held in German, so the lines to say are in German.

## Preparation

- [ ] Open the live URL (or double-click `index.html`), zoom 125 %
- [ ] Click **«Neue Retro»** so the board is empty
- [ ] Have a Teams chat or a text editor ready for pasting
- [ ] Speakers on if the gong should be heard
- [ ] Rehearse once or twice with a stopwatch
- [ ] Record a backup video (macOS: ⇧⌘5)

## Flow

| Time | Click | Say |
|---|---|---|
| **0:00–0:30** | Show the empty board | «Nach jedem Sprint macht ein Scrum-Team eine Retrospektive: Was lief gut, was nicht, was machen wir anders? Im Homeoffice fehlt die Post-it-Wand. Viele Teams nutzen externe Online-Tools, und interne Themen landen bei fremden Anbietern. Das ist Shadow IT.» |
| **0:30–1:15** | Title «Sprint 42», timer **3 Min.** → **▶ Start**. Two notes per column, each with Enter | «Die moderierende Person teilt ihren Bildschirm und startet den Timer. Das Team nennt Punkte, sie tippt mit: Text, Enter, fertig.» |
| **1:15–1:35** | Click 👍 several times on «Zu viele Meetings», then **Nach Stimmen sortieren** | «Abstimmen: Wo drückt der Schuh am meisten? Das Top-Thema jeder Spalte ist rot umrandet. Ein Klick sortiert, und die wichtigsten Punkte stehen oben.» |
| **1:35–1:50** | Click the red-framed note, once **Weiter ›**, then **Schliessen** | «Zum Besprechen zeigen wir einen Zettel gross, so liest ihn auch die hinterste Reihe. Und dank der festen Nummer kann jede Person sagen: Ich möchte noch über #4 reden.» |
| **1:50–2:05** | **Ergebnis kopieren**, paste into Teams or the editor | «Ein Klick, und das Ergebnis steht im Teams-Kanal. Mehr braucht es nicht.» |
| **2:05–3:00** | Show `miniapp.json` / `AGENTS.md` or a slide | «Das Wichtigste sieht man nicht: Kein Server, kein Login, keine Personendaten. Die Sicherheitsregel im Browser verhindert jeden Netzwerkzugriff, und automatische Tests prüfen das vor jeder Veröffentlichung. Gebaut ist die App nach unserem Team-Template: Die Regeln in AGENTS.md gelten für Menschen und für die KI, die beim Bauen hilft. Der Steckbrief beschreibt Zweck, Owner, Risikostufe und Review-Datum, und er sagt, wann die Stufe steigt: Sobald alle gleichzeitig schreiben sollen oder eine KI mitliest, braucht es eine Prüfung. Freiheit innerhalb klarer Leitplanken.» |

## Answers to typical questions

- **«Können alle gleichzeitig schreiben?»** Nicht in dieser Version, das bräuchte einen gemeinsamen Speicher, also einen Server. Das Zielbild dafür ist eine Teams-App mit Live Share im AXA-Tenant, mit Prüfung durch Security. Genau das steht im Steckbrief unter «Stufe steigt, wenn …».
- **«Warum nicht eine Datei auf GitHub als Speicher?»** Dafür bräuchte der Browser einen Schreibschlüssel, den jede Person sehen könnte, und die Inhalte wären öffentlich. Bewusst nicht gemacht (AGENTS.md, D-10).
- **«Wo liegen die Daten?»** Nur im Browser der moderierenden Person. «Neue Retro» löscht sie.
- **«Warum so wenige Funktionen?»** Eine Mini-App soll ein Problem lösen, ohne zu überfordern. Unsere erste Version war zu kompliziert, die zweite zu knapp. Jetzt ist nur drin, was man in einer Retro wirklich braucht.
- **«Wo ist die KI?»** Die App selbst nutzt keine. Sie wurde aber mit KI gebaut, und AGENTS.md legt die Leitplanken fest, an die sich die KI halten muss.

## If something goes wrong

- **Board not empty:** «Neue Retro».
- **Copying fails** (browser permissions): show the notes directly on screen.
- **No internet:** double-click `index.html` on the laptop, or play the backup video.
