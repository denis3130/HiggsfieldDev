# Il Bivio — come si produce un episodio (tutto gratis, in locale, senza Higgsfield)

Stato al 23/11: 11 storie scritte (`data/horror/storie/`). Episodio 1 di «La voce nel bosco» montato come modello
(`data/horror/ep1_voce_nel_bosco/`, non pubblicato). Gli script stanno in `scripts/bivio/`.

Regole fisse: niente servizi a pagamento, niente Higgsfield. Una sola voce (il narratore). Suoni veri registrati (CC0), mai sintetici.
La musica la sceglie l'utente: finché non la manda, solo ambiente scuro CC0. Si deve vedere ogni cosa che la voce dice.

## Cartella di un episodio
```
episodio/
  episodio.json     copione montabile: una riga per inquadratura + telefono, ambiente, silenzi, suoni
  lavori.json       prompt delle immagini (per flux_locale.py)
  img/              immagini 576×1024 generate
  sfx/              suoni dell'episodio (monta.py cerca prima qui, poi in scripts/bivio/sfx/)
  licenze_suoni.json
```
Modello da copiare: `data/horror/ep1_voce_nel_bosco/episodio.json`.

## 1. Immagini: FLUX.1-schnell in locale (OpenVINO int4, solo CPU)
- `pip install openvino-genai` (porta openvino e openvino-tokenizers), poi il modello `OpenVINO/FLUX.1-schnell-int4-ov` da Hugging Face
  (8,7 GB; Apache 2.0, uso commerciale consentito). Scaricare con `HF_HUB_DISABLE_XET=1`.
- `FLUX_DIR=<cartella del modello> python scripts/bivio/flux_locale.py lavori.json`
  con `lavori.json` = `[{"out": "img/s01.png", "prompt": "...", "w": 576, "h": 1024, "seed": 1, "steps": 4}]`.
  Lo script carica i pezzi del modello uno alla volta (prima T5 e CLIP, poi il transformer): 15 GB di RAM altrimenti non bastano.
- Tempi (4 vCPU, 15 GB): circa 3 minuti a immagine, RAM massima 14 GB. Mentre gira non lanciare altro di pesante (voce, Whisper, montaggio).
  Non usare la cache OpenVINO su disco (`CACHE_DIR`): riempie il disco con 9 GB.
- Prompt in inglese, tutti con lo stesso suffisso di stile. Buio e nebbia vengono molto bene. Niente testo leggibile nelle immagini
  (si aggiunge in montaggio), niente volti in primo piano, niente mani complicate. Se un'immagine esce sbagliata si rifà con un altro seed.
- Guardare sempre ogni immagine prima di montare: deve mostrare esattamente quello che dice la battuta.

## 2. Voce: Chatterbox multilingue (MIT), ONNX, senza torch
- `python scripts/bivio/voce.py cartella_episodio` → `voce.wav`, `tempi.json`, `parole.json`. Modello `onnx-community/chatterbox-multilingual-ONNX`
  (si scarica da solo, 3 GB), più Whisper `medium` per il controllo. Caricamento 70 s, poi 10–20 s a frase.
- Timbro: `scripts/bivio/voci/narratore.wav` (voce sintetica profonda, non una persona reale), uguale per tutta la serie.
  `RIF=altra_voce.wav` per cambiarlo. Se l'utente manda la propria voce da clonare, quel file resta solo sulla macchina: non va nel repository.
- Il testo va passato al modello in minuscolo e con gli accenti scomposti (NFKD): con «È», «già», «lì» scritti normalmente sbaglia le parole.
  Lo fa `prepara()`; anche due punti e puntini diventano virgole.
- Ogni pezzo (frase del narratore, grido, messaggio letto, voce lontana, opzione A, opzione B, chiusura) si genera da solo e si riascolta con Whisper:
  si tiene il primo seme in cui le parole sentite sono esattamente quelle del copione (fino a 8 tentativi). I pezzi buoni restano in `_voce/`
  e non si rifanno. Nel log: `ok` = identico, `quasi` = da controllare, `DA RIFARE` = cambiare il testo o riprovare.
  Se una parola esce sbagliata in tutti i tentativi (es. «ninna» sentita «linda», «a chi lo do» → «a chi l'odo»), si riscrive la battuta
  con parole equivalenti invece di accettare un `quasi`.
- Le pause dopo punto, due punti e punto di domanda vengono allungate a 0,42 s: il modello legge di fila, il narratore deve lasciar cadere le frasi.
- Nella riga: `voce` (narratore), `grido` + `sottotitolo_grido` (urlo del protagonista, detto dal narratore: più enfasi, più forte, saturato),
  `citazione` (messaggio o scritta letta), `lontana` (una voce lontana, sempre detta dal narratore: piano e ovattata), `silenzio` (secondi senza voce).

## 3. Suoni
- Registrazioni vere CC0 da Freesound, cercate con l'API di Openverse: `https://api.openverse.org/v1/audio/?q=<parole in inglese>&license=cc0`
  (senza il parametro `category`); i file stanno su `cdn.freesound.org` e si scaricano con curl semplice (con user agent da browser dà 403).
  Per ogni file annotare titolo, autore, licenza e pagina in `licenze_suoni.json`.
- In `scripts/bivio/sfx/` ci sono i suoni comuni a tutta la serie: `colpo.mp3` + `rise_long.mp3` + `heart60.mp3` per la scheda finale,
  `amb_slow.mp3` come ambiente scuro di fondo, più respiro, notifica, vibrazione del telefono, stoffa, legno, gocce.
- In `episodio.json`:
  - `ambiente`: `[{"file", "da", "vol"}]` (vol anche `[inizio, fine]`), in ciclo per tutto l'episodio;
  - `silenzi`: `[{"da_riga", "a_riga"}]` silenzio totale dell'ambiente tra la fine della voce di una riga e l'inizio dell'altra;
  - `suoni`: `[{"file", "riga", "dopo", "parola", "vol", "da", "dur", "sfuma", "cresce": [a, b], "fino_alla_fine"}]`.
    `parola` aggancia il suono all'attimo in cui il narratore dice quella parola (es. lo scivolone su «scivolare»).

## 4. Montaggio: `python scripts/bivio/monta.py cartella_episodio`
- `ANTEPRIMA=3.5,24,52 python scripts/bivio/monta.py cartella` salva solo quei fotogrammi (con i sottotitoli) in `anteprima/`: usarlo sempre
  per controllare ogni inquadratura e la scheda finale prima del montaggio intero. `RIUSA=1` rifà solo sottotitoli e audio.
- Per ogni immagine: profondità (Depth-Anything piccolo, ONNX, si scarica da solo) e movimento di camera 2,5D (`mov`: avanza, avanza_lento,
  arretra, scendi, panoramica, mano, fermo, apri_occhi). Sopra: nebbia che scorre, grana, vignettatura; `vapore` per il fiato, `scurisci` per
  nascondere un volto, `apri_occhi` per le palpebre che si aprono.
- Schermo del telefono disegnato col codice: righe con `schermo: "blocco" | "messaggio"`, testi in `telefono` (ora, data, batteria, rete, mittente, messaggio).
- Cose che servono a una storia sola (display dell'ascensore, monitor, citofono, cartelli, radio, pioggia, luce che trema): si scrivono in
  `cartella_episodio/extra.py`, senza toccare gli script comuni, e si disegnano sempre col codice (mai testo generato dal modello).
  `disegna(r, tau, u, t, m)` disegna per intero le righe con `"speciale": "nome"`; `dopo(fr, r, tau, u, t, m)` ritocca ogni inquadratura normale
  prima di nebbia e grana. `m` è monta.py stesso (m.muovi, m.atmosfera, m.font, m.IMG, m.W, m.H…). Spiegazione nel commento «estensioni» di monta.py.
- L'aspetto della scheda finale, dei sottotitoli e del titolo iniziale è uguale per tutta la serie: non si cambia nelle singole storie.
  Il carattere è Roboto e sta in `scripts/bivio/fonts/` (Apache 2.0): monta.py e i sottotitoli lo prendono da lì, così l'aspetto è identico anche sulle macchine dove Roboto non è installato.
- Sottotitoli parola per parola (testo esatto del copione), a gruppi di tre; il grido più grande, la voce lontana in corsivo.
- Scheda finale (ultima riga): `voce: "Cosa fai?"`, `opzioni: {a, b}` ognuna con `voce` («La A: …» / «Oppure la B: …»), `testo` (etichetta su due righe con `\n`),
  `img`, `ritaglio: [cx, cy, lato]` per la miniatura; `chiusura: "Scrivilo nei commenti."`, `sfondo`. Due carte con miniatura viva, bollo A oro e B azzurro;
  mentre il narratore legge un'opzione la sua carta si illumina e la frase compare in alto; alla fine «Scrivi A o B nei commenti».
  Se `sfondo` è l'immagine dell'inquadratura precedente la camera prosegue senza stacco e va fuori fuoco.
- Mix: voce + suoni + ambiente (che si abbassa sotto la voce), −14 LUFS. File finale 1080×1920, 30 fps, circa 7 Mbit/s.

## 5. Tempi di un episodio
Immagini 40–45 minuti (13–15 immagini), voce 8–10 minuti, montaggio 6–7 minuti. Fare le cose una alla volta: la RAM non basta per due lavori pesanti insieme.

## 6. Controlli prima di consegnare
1. Ogni immagine mostra quello che dice la battuta; nessun volto in primo piano, nessun testo generato.
2. Log della voce: tutti `ok` (o `quasi` verificati), durata totale 50–60 secondi.
3. Anteprime: sottotitoli dentro la zona sicura, scheda finale leggibile, etichette che non escono dalle carte.
4. Video finale riguardato a campione (inizio, grido o colpo di scena, scheda finale).
