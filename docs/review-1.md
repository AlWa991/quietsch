# Review 1 (Gate 1, Commit 8547a48) – Sonnet-Reviewer, fresh

Verdikt: CHANGES REQUIRED, keine Blocker. Alle Checks grün, kein Fake-Green, keine externen Requests (DSGVO ok), Docker non-root ok.

## Should (vor Deploy bzw. in P4 erledigen)
1. README.md:38 und docs/CREDITS.md:16: ZzFX-Behauptung streichen (Audio ist reines WebAudio).
2. package.json: `zzfx` entfernen (ungenutzt).
3. Hohle Wand im Flur (Schrei-Reaktion „Hohl.“) fehlt → gehört zu P4 Keller (T16).
4. main.ts: `window.__game.actions` nur bei `?debug=1` bereitstellen; e2e-Specs dann mit `?debug=1` laden.
5. e2e/playthrough.spec.ts: mindestens das Echo-Rätsel real per Taste E durchspielen statt `completeMission`.

## Nice
6. 730-kB-Chunk per dynamischem Import teilen.
7. Köder `comingSoon` + twist2-Text dokumentieren, falls P4 gestrichen wird.
8. Test „Hände greifen bei Nähe“ in tests/spook-fsm.test.ts.

## GDD-Lücken (alle P4/Stretch, bewusst offen)
Keller/Krone/twist2, Hohle Wand, Halsband/Dachboden/7-Sterne, Köder (Shift), Geisterlichter in Geheimräumen.
