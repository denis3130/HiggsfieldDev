# Corpo, vestiti e scarpe modellati: da dove vengono e con che licenza

Tutto il materiale di questa cartella viene da **MakeHuman** (www.makehumancommunity.org) ed è libero: **CC0 1.0** (pubblico dominio).
Qui ci sono solo i dati già convertiti per `corpo_mesh.js`; gli originali non stanno nel repository, si riscaricano (vedi sotto).

| Che cosa | Originale | Autori | Da dove l'ho preso |
|---|---|---|---|
| Corpo umano (maglia «hm08»), forme (uomo giovane, uomo anziano, peso, donna giovane), scheletro e pesi delle ossa | dati di MPFB2 (MakeHuman Plugin For Blender) | MakeHuman Team | pacchetto Python `anny` 0.6.2 (`pip download anny`), cartella `anny/data/mpfb2`: lì c'è il file `LICENSE.md` con il testo CC0 1.0 |
| Maglietta e jeans (`male_casualsuit06`) | vestiti in dotazione a MakeHuman | Manuel Bastioni, Jonas Hauquier | pacchetto npm `makehuman-data` 0.0.2 (i vestiti di MakeHuman convertiti in JSON per three.js da «wassname») |
| Completo con camicia e cravatta (`male_elegantsuit01`), da cui sono fatti il cappotto dell'ispettore e quello rosso di Elena | idem | Manuel Bastioni | idem |
| Scarpe da ginnastica (`shoes05`) | idem | Jonas Hauquier | idem |
| Scarpe nere (`shoes03`) | idem | Manuel Bastioni | idem |
| Borsa a tracolla di Elena (borsa, patta, cinghia) | nessun originale: è costruita dal convertitore (`tracolla()`) | fatta per questo progetto | — |

**Sulla licenza dei vestiti e delle scarpe.** Nei file del pacchetto npm (del 2017) c'è ancora scritta la licenza di allora (AGPL3, con
l'eccezione CC0 per i modelli esportati). Da MakeHuman 1.2 il progetto ha rilasciato in CC0 tutto il materiale grafico in dotazione; nel
programma ufficiale (pacchetto Python `makehuman` 1.3.2, file `makehuman/makehuman.py`) si legge: «The MakeHuman source code is released
under the AGPL license. The graphical assets bundled with MakeHuman have been released as CC0.» I vestiti e le scarpe usati qui sono
proprio quelli in dotazione al programma. Il codice di MakeHuman (AGPL) e quello di `anny` (Apache 2.0) non sono usati né copiati.

**Che cosa ho fatto io sopra gli originali** (`converti_corpo.py`): forma del corpo per ogni personaggio, vestiti adattati al corpo, pelle
tolta sotto i vestiti, testa e mani tolte (restano la testa disegnata e la mano modellata), ossa ridotte a quelle del pupazzo, lisciatura,
il cappotto dell'ispettore e quello di Elena (la giacca allungata fino al ginocchio), le spalle a tappe (tre ossa in più per lato tra busto e
braccio), le maniche della maglietta più aderenti, texture ridipinte coi colori piatti dei personaggi (`pittura.py`).

**Per rifare i dati da capo:**
```
pip download anny==0.6.2 --no-deps -d giu && unzip -q giu/anny-*.whl 'anny/data/mpfb2/*' -d anny_x
npm pack makehuman-data@0.0.2 && tar -xzf makehuman-data-0.0.2.tgz --wildcards 'package/public/data/proxies/clothes/male_*' 'package/public/data/proxies/clothes/shoes0*'
python3 converti_corpo.py anny_x/anny/data/mpfb2 package/public/data/proxies/clothes .
```
