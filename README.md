# Villa De Girafjes

Een webspel om Franse woordjes te oefenen uit het handboek **Contact 1 tot 4** (Salut!, Ils vont où?, Vous êtes là?, Tu as de la chance).

Je wandelt rond met je monster. In een gevecht val je pas aan als je een vraag juist beantwoordt:

- **Woordjes**: Nederlands naar Frans en Frans naar Nederlands, altijd 4 keuzes.
- **Werkwoorden**: aller (Contact 2), être (Contact 3), avoir (Contact 4).
- **Lidwoorden**: le, la, l', un, une (Contact 3).
- **Gesprekjes**: de mensen in het dorp (Héléna, Adam, Séverine...) spreken je aan in het Frans, naar de dialogen uit het boek, en jij kiest het juiste antwoord.
- **Luisteren**: de computer leest Franse woorden en zinnen voor. Soms krijg je een "Wat hoor je?"-vraag.
- **Zeg me na**: zeg Franse woorden luidop na (knop op het startscherm, of praat met Léa). Hier kan je niets fout doen: elke poging levert sterren op.

- **Kermis**: open de kermis via het menu (ENTER) of praat met Hugo. Drie kramen: blikken gooien naar het juiste Franse woord, memory (Frans en Nederlands koppelen) en eendjes vissen met le/la/l'/un/une. Elke 10 sterren levert een prijs op in je tas (een drankje of een bal).

Fout antwoord? Dan valt het wilde monster aan en zie je het juiste antwoord. Woordjes die je fout had, komen vaker terug.

Bij de start kies je welke Contacts je wil oefenen.

## Bediening

| Toets | Wat |
| --- | --- |
| Pijltjes | Wandelen en kiezen |
| Spatie | Bevestigen |
| 1 tot 4 of klikken | Antwoord kiezen in een vraag |
| Shift | Terug |
| Enter | Menu (kermis, tas, bewaren) |
| Klik / tik | Berichten verder zetten, antwoorden kiezen |
| L | Luisteren (Frans voorlezen) |
| F | Volledig scherm |

## Woordenlijst aanpassen

- Woorden: `src/vocab/words.js` (Frans, Nederlands, Contact).
- Gesprekjes: `src/vocab/dialogues.js` (het eerste antwoord is altijd het juiste).

## Lokaal spelen

Start een eenvoudige webserver in deze map, bijvoorbeeld `python3 -m http.server`, en open http://localhost:8000.

## Gebaseerd op

[Monster Tamer](https://github.com/devshareacademy/monster-tamer) van Dev Share Academy (MIT-licentie). Phaser 3.60 en webfontloader zitten in `vendor/`.

## Credits

This project uses both assets I developed as well as other assets that have been created by some wonderful creators. This project would not have been possible without the following people/resources:

| Asset                       | Author           | Link                                                                                              |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| Fonts                       | Kenney           | [Kenney Fonts](https://www.kenney.nl/assets/kenney-fonts)                                         |
| UI Panel                    | Kenney           | [Kenney UI Space Pack](https://www.kenney.nl/assets/ui-pack-space-expansion)                      |
| UI Pack                     | Kenney           | [Kenney UI Pack](https://www.kenney.nl/assets/ui-pack)                                            |
| Board Game Info             | Kenney           | [Kenney Board Game Info Pack](https://www.kenney.nl/assets/board-game-info)                       |
| Ice Attack                  | Pimen            | [Pimen Ice Spell Effect](https://pimen.itch.io/ice-spell-effect-01)                               |
| Slash Attack                | Pimen            | [Pimen Slash VFX](https://pimen.itch.io/battle-vfx-slashes-and-thrusts)                           |
| NPC                         | Parabellum Games | [Retro RPG Character Pack](https://parabellum-games.itch.io/retro-rpg-character-pack)             |
| Player Character            | AxulArt          | [Small 8-direction Characters](https://axulart.itch.io/small-8-direction-characters)              |
| Basic Plains Tileset        | AxulArt          | [AxulArt's BasicPlains Tileset Ver. 2](https://axulart.itch.io/axularts-basicplains-tileset-ver2) |
| Beach & Caves Tileset       | AxulArt          | [AxulArt's Beach and caves tileset](https://axulart.itch.io/axularts-beach-and-caves-tileset)     |
| Building Interiors          | AxulArt          | [Basic Top-down Interior](https://axulart.itch.io/axularts-basic-top-down-interior)               |
| Retro RPG Buildings Tileset | The Pixel Nook   | [Retro RPG Buildings](https://the-pixel-nook.itch.io/rpg-building-pack)                           |
| Game BG Music               | xdeviruchi       | [xdeviruchi Sound Cloud](https://soundcloud.com/xdeviruchi)                                       |
| Sound Effects               | leohpaz          | [RPG Essentials SFX Free](https://leohpaz.itch.io/rpg-essentials-sfx-free)                        |


## Spraak

Voorlezen gebruikt de stemmen van je toestel (gratis, werkt offline). Op een Mac of iPad klinkt dat het mooist.
"Zeg me na" gebruikt spraakherkenning van de browser als die er is (Chrome, Edge, Safari). In Chrome gaat de opname daarvoor naar Google. Zonder spraakherkenning (bv. Firefox) druk je gewoon op "Ik heb het gezegd!".

Het spel bewaart automatisch (elke 15 seconden en bij het sluiten van het venster), in de browser zelf.
