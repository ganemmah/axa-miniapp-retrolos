# Spec — Retro Board

| Field | Value |
|---|---|
| ID | `001-retro-board` |
| Status | implemented |
| Owner | ZHAW team (AXA hackathon 2026) |
| Last updated | 2026-11-11 |

## 1. Purpose

Scrum teams look back on every sprint in a retrospective. Working remotely, the physical sticky-note wall is
missing, so many teams use external online retro tools and internal topics end up with third-party providers.
RetroBoard Lite gives the person moderating a sticky-note wall in the browser: collect, vote, discuss, share —
without an account, without a server, and without data leaving the browser.

## 2. User Roles

| Role | Description | Needs from this feature |
|---|---|---|
| Moderator | Scrum master or team lead, shares the screen in the meeting | Capture notes fast, run the vote, show one note large, share the result |
| Team member | Takes part in the meeting | Read the board on the shared screen, refer to a note by its number |

## 3. User Stories

| ID | Story |
|---|---|
| US-1 | As a moderator, I want to type a note into one of three columns and press Enter so that I can capture points as fast as the team says them. |
| US-2 | As a moderator, I want to give and take back votes on a note so that the team can pick the most important topics. |
| US-3 | As a moderator, I want to sort the board by votes when I decide to so that notes do not jump while people are still voting. |
| US-4 | As a team member, I want the top topic of each column highlighted and every note numbered so that we can talk about «#7». |
| US-5 | As a moderator, I want a timer with a gong so that the collecting phase has a clear end. |
| US-6 | As a moderator, I want to show one note large and browse through all notes so that everyone can read it on the projector. |
| US-7 | As a moderator, I want to copy the result as text so that I can post it in the Teams channel. |
| US-8 | As a moderator, I want the board to survive a page reload and to start a new retro so that nothing is lost by accident. |

## 4. Acceptance Criteria

| ID | Story | Given | When | Then |
|---|---|---|---|---|
| AC-1 | US-1 | the board is open | I type text into a column and press Enter | a sticky note with that text and the next number appears in that column; the input is empty and keeps the focus |
| AC-2 | US-1 | a column input | I submit only spaces | nothing is added |
| AC-3 | US-2 | a note with 2 votes | I click «−» | it shows 1 vote; votes never go below 0 |
| AC-4 | US-3 | note B (1 vote) left of note A (0 votes) | I click A's 👍 three times at the same spot | A has 3 votes, B still 1; no note moves |
| AC-5 | US-3 | notes with different votes | I click «Nach Stimmen sortieren» | each column shows most votes first; ties keep their order; the order stays after further votes and after a reload |
| AC-6 | US-4 | a column where one note has the most votes | the board renders | that note has a red frame; on a tie all tied notes have it; with no votes none has it |
| AC-7 | US-4 | notes #1–#3 | I delete #2 and add a note | the new note is #4; numbers never change when sorting |
| AC-8 | US-5 | the timer shows 05:00 | I choose «3 Min.» and click Start | it counts down from 03:00; at 00:00 it blinks, a gong sounds (unless 🔕) and a message appears |
| AC-9 | US-6 | several notes | I click the text of a note | a dialog shows it large with column, number, votes; ‹ › and arrow keys browse; Esc or «Schliessen» returns focus to that note |
| AC-10 | US-7 | notes with votes | I click «Ergebnis kopieren» | the clipboard holds the title, date, and per column the notes sorted by votes with number and «Top-Thema» |
| AC-11 | US-8 | a board with notes | I reload the page | title, notes, votes, and order are still there |
| AC-12 | US-8 | a board with notes | I click «Neue Retro» and confirm | the board and title are empty |
| AC-13 | — | JavaScript is disabled | I open `index.html` | toolbar, three columns, and buttons render, plus a notice that JavaScript is needed |
| AC-14 | — | a note text containing HTML | it is added | the text is shown literally; no HTML is interpreted |
| AC-15 | — | localStorage is blocked | I use the app | everything works; the notice says that nothing is saved |

## 5. Non-Goals

- Several people writing at the same time from their own devices (needs a server — next risk level)
- Login, user names, or any personal data on notes
- Export to Jira, Confluence, or e-mail; AI summaries
- Editing a note (delete and write it again)

## 6. Open Questions

| # | Question | Blocking? | Owner |
|---|---|---|---|
| Q1 | Should the vote button use «+1» instead of 👍? | no | team |
| Q2 | Is a «data protection guard» (warning when a note looks like an e-mail, phone, AHV or IBAN) wanted? | no | team |
