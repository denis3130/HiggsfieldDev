# Il Bivio — come si produce un episodio (tutto gratis, in locale, senza Higgsfield)

Stato al 23/11: 11 storie scritte (`data/horror/storie/`). Episodio 1 di «La voce nel bosco» montato come modello
(`data/horror/ep1_voce_nel_bosco/`, non pubblicato). Gli script stanno in `scripts/bivio/`.

Regole fisse: niente servizi a pagamento, niente Higgsfield. Una sola voce (il narratore). Suoni veri registrati (CC0), mai sintetici.
La musica la sceglie l'utente: se non ne manda una sua gli si propongono tre brani veri e gratuiti (CC0) già montati sotto l'inizio dell'episodio (`scripts/bivio/musica/`, vedi «Musica di sottofondo» in `scripts/bivio/3d/LEGGIMI.md`). Si deve vedere ogni cosa che la voce dice.

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
- Timbro: `scripts/bivio/voci/narratore.wav`, uguale per tutta la serie e per le guide di stacappella. Dal 24/11 è la **voce nuova 2 «più chiara»**,
  l'unica tenuta dall'utente (scartate la 3A, la «calda» e la fusione delle due): voce sintetica Kokoro `bm_daniel` che legge in italiano
  a velocità 0,95, senza cambi di tono (non è una persona reale). Il riferimento si rifà così:
  `Kokoro(...).create(testo_italiano, voice=<voices/bm_daniel.bin da onnx-community/Kokoro-82M-v1.0-ONNX>, speed=0.95, lang="it")`.
  Impostazioni predefinite di voce.py per questa voce: ENFASI 0,5, VOCE_TEMP 0,65, VOCE_TOP_P 0,9, CHIARA 4, nessun rallentamento,
  ritmo continuo del reel (PAUSA_FRASI 0, PAUSA_RIGHE 0,08): circa 3 parole al secondo.
  `RIF=altra_voce.wav` per cambiarlo. Se l'utente manda la propria voce da clonare, quel file resta solo sulla macchina: non va nel repository.
- Il testo va passato al modello in minuscolo e con gli accenti scomposti (NFKD): con «È», «già», «lì» scritti normalmente sbaglia le parole.
  Lo fa `prepara()`; anche due punti e puntini diventano virgole.
- Ogni pezzo (frase del narratore, grido, messaggio letto, voce lontana, opzione A, opzione B, chiusura) si genera da solo e si riascolta con Whisper:
  si tiene il primo seme in cui le parole sentite sono esattamente quelle del copione (fino a 8 tentativi). I pezzi buoni restano in `_voce/`
  e non si rifanno. Nel log: `ok` = identico, `quasi` = da controllare, `DA RIFARE` = cambiare il testo o riprovare.
  Se una parola esce sbagliata in tutti i tentativi (es. «ninna» sentita «linda», «a chi lo do» → «a chi l'odo»), si riscrive la battuta
  con parole equivalenti invece di accettare un `quasi`.
- Ritmo: dal 24/11 racconto continuo come nel reel (nessuna pausa aggiunta dopo i punti, 0,08 s tra le righe). Per il narratore lento dei primi
  episodi: `PAUSA_FRASI=0.42 PAUSA_RIGHE=0.25`.
- Pronuncia più scandita (24/11): `VOCE_TEMP=0.65 VOCE_TOP_P=0.9` rendono il campionamento più stabile; `CHIARA=4` fa generare ogni frase finché ci sono
  4 versioni con le parole giuste e tiene quella che Whisper capisce con più sicurezza; `RALLENTA=1.07` rallenta ogni pezzo del 7% senza cambiare
  il tono (serve `apt-get install -y rubberband-cli`). Il campione di riferimento deve leggere in italiano: con un campione inglese l'accento
  peggiora la pronuncia («Apri gli occhi. È notte.» non usciva giusta in 4 tentativi su 4).
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
- **Movimento continuo come nel reel di riferimento (24/11)**: niente deve restare fermo. Per ogni riga:
  `"anima": {"vento": {"forza": 3-6, "zona": "alto|basso|tutto|vicino"}, "respiro": [cx, cy, raggio, 0.02], "luce": 0.05, "polvere": 30, "pioggia": 80}`
  (rami ed erba che ondeggiano, petto che respira, luce che trema, pulviscolo, pioggia) e `"tagli": [[0.5, 1.4, cx, cy]]` per staccare a metà riga
  su un'inquadratura più stretta della stessa immagine (nel reel l'immagine cambia ogni 2 secondi circa).
- **Sottotitoli come il reel**: `"sottotitoli": "reel"` in episodio.json → in alto, lettere normali, parola detta in grassetto bianco, parole già dette
  in grigio chiaro, quelle che arrivano appena accennate; pezzi di frase che si chiudono a punto o virgola (massimo 6 parole). Niente titolo iniziale.
- **Ritmo della voce come il reel**: è quello predefinito di voce.py dal 24/11 → racconto continuo, circa 3 parole al secondo.
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
2. Log della voce: tutti `ok` (o `quasi` verificati), durata totale circa 2 minuti (formato dal 24/11; prima 50–60 secondi).
3. Anteprime: sottotitoli dentro la zona sicura, scheda finale leggibile, etichette che non escono dalle carte.
4. Video finale riguardato a campione (inizio, grido o colpo di scena, scheda finale).

## 7. Video veri (dal 24/11: per l'utente è la parte più importante)
Il reel di riferimento è fatto di veri video 3D (personaggi che camminano, porte che si aprono, camera che si sposta), non di immagini con effetti.
Stile scelto: **3D cartone come il reel**. Il reel è fatto tutto con Claude: le scene si costruiscono col codice in three.js e si renderizzano
fotogramma per fotogramma (`scripts/bivio/3d/`, vedi LEGGIMI.md). Niente PC dell'utente e niente modelli video.

**Modelli 3D (regola del 25/11, per tutte le sessioni, anche quelle aperte prima).** Si fanno come la mano della carta A de «Il testimone»,
che l'utente ha approvato: «molto bravo la mano ora si che sembra una vera mano, annotati da qualche parte che per le sessioni precedenti e
future, devi fare i modelli in quel modo». Cioè: una forma modellata vera in una superficie sola (mai pezzi incollati), piegata con le ossa
e chiusa davvero su quello che tocca, lisciata e dipinta, e messa accanto a una foto vera per il confronto prima di mandarla. Il codice e
i passi stanno sul ramo principale del repository: `scripts/bivio/3d/cast/sets/mano_mesh.js` e «Come si fa un modello» in
`scripts/bivio/3d/LEGGIMI.md`. Una sessione aperta prima del 25/11 lavora su un suo ramo, che non li ha: prima di costruire un modello li
prende dal ramo principale (`git fetch origin claude/gta6-auto-clipping-system-p29knx`).

Prova scartata (24/11, «non mi piace»): `scripts/bivio/ltx_video.py` con LTX-Video 2B int8 per OpenVINO, da un'immagine (la prima inquadratura resta
quella, poi la scena si muove) o solo dal testo.
- Modello: `rahmanbazarov/LTX-Video-int8-ov` (licenza LTX-Video Open Weights) scaricato senza `text_encoder/openvino_model.*`: il codificatore
  del testo è lo stesso T5-XXL di FLUX, quindi `text_encoder/openvino_model.xml|bin` sono collegamenti a quelli di `flux-schnell-int4/text_encoder_2/`.
  Cartella del modello in `LTX_DIR`.
- Lo script carica un pezzo del modello alla volta e decodifica a tessere: con la pipeline pronta di OpenVINO GenAI la decodifica del video
  intero finisce la RAM.
- `cond_noise` 0,15 (un po' di rumore sul fotogramma di partenza) e descrizioni del movimento esplicite danno più movimento.
- Tempi (4 vCPU): clip da 2 secondi (49 fotogrammi) a 384×672 con 20 passi in circa 5 minuti; il risultato è morbido e va ingrandito.

## 8. Prova delle voci di Higgsfield (25/11, chiesta dall'utente)
L'utente ha chiesto se su Higgsfield si può «prendere un loro doppiatore IA e usarlo illimitatamente una volta spesi dei crediti». Risposta: no,
ogni generazione costa crediti (nessuna quota illimitata sul suo account); copiare il timbro di una loro voce per usarla in locale non si fa
(le voci sono del fornitore e dei suoi doppiatori). La regola «niente Higgsfield per Il Bivio» resta finché non decide lui.
- Costo della narrazione di un episodio intero (circa 1750 caratteri), da `estimate_audio_cost`: Qwen TTS 0,74 crediti; `text2speech_v2` con
  `variant: elevenlabs` 5,25; Eleven v4 8,05; Seed Audio 11,4. Il costo va a caratteri (0,45 crediti per 131 caratteri, 0,6 per 157).
- Con il suo ok ho speso 1,35 crediti (da 662,4 a 661,05) per due frasi dell'episodio 1 con tre voci preimpostate, motore ElevenLabs
  (`model: text2speech_v2`, `voice_type: preset`): Gideon `1ad38ba4-9cc4-4f2f-9fde-b0fefdf67ae5` (grave, 73 Hz, 3,1 parole/s),
  Luc `04e867c7-9e41-5cff-80d3-5284e74d7bd1` (narratore, 107 Hz, 3,1 parole/s), Julian `95429266-c0ac-4137-a209-63b8812b0f23`
  (confidenziale, 126 Hz, 3,8 parole/s: troppo veloce, rallentata del 25%). L'italiano è uscito corretto in tutte e tre.
  Ha scelto Luc («il 2 luc narratore di storie»): è la voce della serie. La narrazione intera dell'episodio 1 (1883 caratteri con gli a capo tra le
  righe del copione) è costata 5,25 crediti in una sola generazione: 130 secondi, 2,75 parole al secondo mentre parla (non serve rallentarla),
  testo corretto. Generare riga per riga costerebbe di più (il prezzo si arrotonda a ogni richiesta).
- Le anteprime e i file generati stanno su `d1xarpci4ikg0w.cloudfront.net`, `cdn.higgsfield.ai` e `d8j0ntlcm91z4.cloudfront.net` (aggiunti alla rete
  dell'ambiente). Dopo la generazione: `python3 scripts/bivio/3d/voce_esterna.py <audio> <cartella con episodio.json>` (tempi delle parole con Whisper
  sul testo del copione, più `controllo.txt` con le righe sentite diverse), poi `prepara_voce.py` per le pause delle azioni e `mix.py`, che porta la voce
  sempre allo stesso livello (-19,4 LUFS) prima di mescolarla ai suoni.
