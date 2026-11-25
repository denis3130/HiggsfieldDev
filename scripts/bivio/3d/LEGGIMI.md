# Il Bivio in 3D cartone, fatto col codice

Ogni episodio è un film three.js che è una funzione pura del tempo (`window.seek(t)` disegna il fotogramma t), costruito con la skill
motion-reel e renderizzato fotogramma per fotogramma in Chromium (anche senza scheda video: SwiftShader, circa 2 s a fotogramma 1080×1920).

- `ep1-prova/`: prova dell'inizio dell'episodio 1 de «La voce nel bosco» (24/11).
  - `sets/bosco.js`: il bosco, il protagonista, la bocca nel tronco, il manifesto.
  - `film.js`: le inquadrature agganciate alle parole della voce (`assets/parole.json`, scritto da `scripts/bivio/voce.py`), i sottotitoli
    come il reel, le palpebre.
  - `lib/`: viene dalla skill (motion.js, gl.js).
- Preparazione: copiare la cartella fuori dal repository (i render vanno in `out/`), poi `npm i` (three, opentype.js).
- Render: `node <skill>/scripts/render.mjs --film ep1-prova --format 9x16 --video-only --noblur --fps 30 --workers 3`.
  Con `--at 1.2,5.5` si ottengono solo i fotogrammi di controllo.
- Audio: voce (`audio/vo.wav`) più i suoni CC0 di `scripts/bivio/sfx/`, mixati con ffmpeg a -14 LUFS.
- La voce della prova era troppo veloce (3,6 parole/s). L'ho rallentata con `rubberband --fine -t 1.2` a 3 parole/s e ho scalato i tempi delle parole.

## Versione 3 (25/11): stile «vettoriale 3D», quello da usare
L'utente vuole personaggi come nel secondo reel di riferimento ma più curati: colori piatti con sfumature morbide, facce disegnate, niente effetto plastica.
- `cast/sets/stile.js`: materiali opachi (Lambert), niente tone mapping (`G.R.toneMapping = THREE.NoToneMapping` dopo `initGL`), luce ambiente +
  luce frontale che segue la camera (`luci().segui`) + luce dall'alto con le ombre; superfici `loft` a sezioni; le intensità delle luci sono
  «quanto colore si vede» (three.js divide per pi greco: `luci` rimoltiplica).
- `cast/sets/pupazzi.js`: `testa(F)` con la faccia DISEGNATA a ogni fotogramma su una pellicola (occhi con palpebre, sopracciglia, bocca con
  denti e lingua, guance, rughe, lentiggini, barba): espressioni `open, blink, smile, grin, fear, angry, sad, gazeX/Y, browUp, mouth, wide, round`;
  `capelli()` con l'attaccatura calcolata; `mano()` con dita, unghie e pose; `braccio()` che raggiunge un punto (`a` nel busto o `mondo` nella scena)
  con il dorso della mano orientabile; `gamba()`; `battito()` per le ciglia.
- `cast/sets/cast.js`: `nonna3()`, `tu3()`, `sara3()` (tavolozze e proporzioni lì dentro). `cast/film.js` è la scheda dei personaggi.
- `cast/sets/cucina3.js`: la cucina nello stesso stile (legno dipinto, tovaglia a quadri, stufa, pendolo, finestra con le assi, porta coi tre catenacci).
- `cena3/`: la scena di prova della cena (usa `../cast/sets`: nella cartella di lavoro `cena3/sets` è un collegamento a `cast/sets`).
  La bocca prende l'apertura dal volume della voce (`bocca.py`) e la forma dalla vocale della parola in corso.
Le versioni precedenti (`ep1-prova`, `nonna-porta`, `personaggi`, `cena-prova`) restano solo come storia: non usarle come base.

## Variante adulta (25/11): per le storie serie come «Il testimone»
Stesso stile vettoriale 3D, ma con adulti dalle proporzioni vere: teste piccole (sette teste e mezza), spalle larghe, facce meno da cartone.
In attesa del giudizio dell'utente sulla prova (scheda + scena dello spioncino).
- `cast/sets/adulti.js`: `uomo(o)` (corpo adulto generico: statura `k`, spalle `largo`, torso dipinto, cappotto, guanti), `testimone()` (tu: maglietta
  grigia, tuta blu, barba di due giorni) e `ispettore()` (l'ispettore Riva: cappotto antracite con revers, camicia e cravatta dipinti, stempiatura,
  palpebre pesanti, tre graffi sulla guancia, distintivo nel portafoglio: posa `distintivo: true`).
- `cast/sets/pupazzi.js`: naso adulto con `nose: { tipo: 'vero', … }` (`nasoVero`): un dorso lungo dalla radice alla punta con le normali mescolate
  a quelle della faccia, così di fronte è un rilievo morbido e non un cono, e di profilo la sagoma c'è; le narici e le loro pieghe sono disegnate.
  Il naso a sfera di prima resta per nonna, nipote e Sara. `F.graffi` disegna i tre graffi.
- `cast/sets/testimone_set.js`: `ingressoSet()` (il corridoio buio di casa: porta con lo spioncino acceso, lama di luce sotto la porta, ombre dei piedi
  `piedi`, scossa della porta `colpo`, `porta: false` per il primo piano di fronte) e `pianerottoloSet()` (il pianerottolo visto dallo spioncino).
- `cast2/film.js`: i fotogrammi della scheda dei personaggi adulti; `scheda_adulti.py` li impagina (va lanciato dalla cartella di lavoro, accanto a `out/`).
- `spioncino/`: la scena di prova (19 s): corridoio da dietro, primo piano, soggettiva dallo spioncino con la maschera tonda e lo zoom sui graffi.
  `mix.sh` monta voce e suoni veri CC0: l'ascensore che si ferma sul colpo, il campanello del piano, tre colpi veri tagliati dalla stessa bussata
  (uno per scossa della porta), il battito che parte solo dopo i colpi, ambiente, crescendo e colpo sul finale; -14 LUFS.
- Regia: evitare il profilo pieno (la faccia è una proiezione frontale: di lato si schiaccia); usare fronte e tre quarti.

## Episodio 1 de «Il testimone» (25/11): il primo episodio intero fatto così
Testo approvato dall'utente il 25/11 (`data/horror/storie/13_il_testimone.md`), copione per la voce in `data/horror/il_testimone/ep1/episodio.json`
(una riga per frase o gruppo di frasi: le pause per le azioni si mettono tra una riga e l'altra).
- `cast/sets/esterno_set.js`: `fuoriSet()`, un solo set con il palazzo di notte (facciata, finestre spente, balconi), la tua cucina al quarto piano
  dietro l'unica finestra accesa (tende, piano di lavoro col ceppo dei coltelli, frigo, radiosveglia 02:47, lampada) e il parcheggio sotto (asfalto
  bagnato, strisce, lampione col cono di luce e le ombre, auto ferme, l'auto grigia col baule che si apre). Dentro: tu (`testimone`), Riva (`ispettore`),
  Elena (`elena`). La camera sta alla tua finestra (vista dall'alto, anche col teleobiettivo), giù nel parcheggio, fuori dalla finestra o dentro la cucina:
  `interno`, `cucina` (luce accesa 0..1), `tenda`, `telTu`/`telFuori` (telefono in mano; `telFuori` = mentre filma: dritto, di traverso dietro le dita), `cofano`, `elena.cade`,
  `elena.sdraiata`, `elena.nascosta`.
- `cast/sets/adulti.js`: `elena()`, gli oggetti di Riva (`fazzoletto`, `radio`, `lama` = solo un luccichio), `telefono()`; i capelli del protagonista sono
  una `chioma()` scolpita (`pupazzi.js`): l'utente il 25/11 ha chiesto «migliora i capelli del protagonista» e la calotta liscia non andava.
- `ep1/film.js`: una trentina di inquadrature in `sequenza()`, ognuna agganciata alle parole: `r(n)` = inizio della riga n del copione, `w(n, 'parola')` =
  inizio di quella parola. La colluttazione (`zuffa`) è una funzione del tempo con tre ancore (graffio, luccichio, caduta) e serve sia all'aggancio iniziale
  sia alla scena vera. Sopra l'immagine: sottotitoli del reel, pioggia, bordi della finestra, schermo del telefono che registra (REC e secondi),
  maschera dello spioncino, galleria del telefono, le due carte A/B (immagini prese dai set in `init`).
- Voce: `voce.py` con `PAUSA_FRASI=0.16 PAUSA_RIGHE=0.22`, poi `prepara_voce.py <cartella voce> <film>`: rallenta a 2,85 parole al secondo mentre parla
  (`ART`; la prova era a 3,2 e l'utente ha chiesto due volte di rallentarla: «va troppo veloce»), inserisce i silenzi per le azioni (`PAUSE`), scrive `audio/vo.wav`,
  `assets/parole.json` e la durata. Con `--finta` inventa i tempi dal testo: serve per costruire le inquadrature mentre la voce si genera (ci mette 70 minuti).
  Poi `bocca.py audio/vo.wav assets/parole.json "op,op,isp,isp,isp,isp" assets/bocca.json` (chi parla in ogni battuta tra «»).
- Controlli: `provini.py <film> t1,t2,… uscita.jpg [colonne]` affianca i fotogrammi; `render.mjs --strip a:b:N` per vedere un movimento.
- Suoni: `cerca_suoni.py "parole in inglese"` cerca registrazioni CC0 su Openverse; `ep1/mix.py [video uscita]` monta voce e suoni sugli stessi momenti
  del film (pioggia fuori e dietro il vetro, grido lontano, tonfo, baule, battito, interruttore, squillo, radio, ascensore, tre colpi, scricchiolio)
  e porta tutto a -14 LUFS in due passate.
- Tempi: voce 70 minuti (33 righe, 4 versioni buone per riga), render 4140 fotogrammi con 3 processi.

## Mani e braccia (25/11): rifatte dopo «la mano è fatta male»
L'utente ha cerchiato la mano della carta A dell'episodio 1. Era ripiegata all'indietro sotto il polso e, anche raddrizzata, vista da dietro sembrava
una pallina. Cosa c'era di sbagliato e come si fa adesso:
- Le direzioni `dita`, `dorso` e `gomito` di `braccio.a()` sono nel verso del PERSONAGGIO (z = davanti a lui). Se il personaggio è girato (`yaw`) e le si
  scrive pensando alla scena, la mano si piega al contrario. Per darle nel verso della scena ci sono `ditaM`, `dorsoM`, `gomitoM` (li converte `braccia()`
  in `adulti.js`), come `mondo` per il punto da raggiungere.
- `mano()` (in `pupazzi.js`) è nuova: palmo a sezioni (`loft`: largo alle nocche, stretto al polso, dorso più piatto del palmo), nocche in rilievo, dita
  rastremate, pollice che parte dal polso dentro il suo monte. Il vecchio palmo era un ellissoide: di fronte un uovo, da dietro una palla.
  Pose nuove: `leva` (le dita avvolgono una sbarra orizzontale: la sbarra deve passare a y = -0.095 e z = -0.0245 nello spazio della mano, cioè col
  polso circa 10 cm prima dell'asse della maniglia e 3,8 cm più in alto, mano inclinata di poco verso il basso) e `tessera` (portafoglio o tesserino
  tenuto contro le dita, pollice davanti). Per le prese precise il pollice si mette con `pv` (le direzioni dei suoi tre pezzi) e `pb` (verso dell'unghia);
  `k` cambia quanto piega ogni giuntura delle dita.
- Avambracci nudi: `polsoZ` (il polso è piatto: l'avambraccio è un `loft` che si schiaccia verso la mano e ruota insieme al dorso, come quello vero),
  `gomitoM` + `orlo` (gomito di pelle e orlo netto della manica: prima la manica finiva in una palla di stoffa col bordo seghettato).
- Un oggetto in mano va tenuto davvero: il distintivo sta davanti alle dita col pollice sopra (prima era una mano aperta con il portafoglio sotto);
  il telefono che filma sta dietro le dita messe di traverso, con le punte che agganciano il bordo (posa `filma`; prima era appoggiato sul dorso
  della mano). Chi filma un parcheggio dal quarto piano tiene il telefono al petto, inclinato in giù: così il viso resta scoperto. Attenzione
  alle viste dal basso: un oggetto tenuto 35 cm davanti alla faccia, visto da giù, finisce sopra la testa.
- `prova_mano/`: il laboratorio. Ogni secondo una posa, vista da sei punti su fondo neutro e luce piena:
  `provini.py prova_mano 0.5,1.5,2.5,3.5,4.5,5.5,6.5 out/prova_mano/pose.jpg 7`. Una posa nuova si guarda prima qui, poi nell'episodio.
- Immagini delle carte A/B: `prova_carta/` mette a confronto più inquadrature della stessa immagine nel formato largo della carta. Niente grandangolo
  (deforma) e niente filtro di luminosità (brucia i chiari): `ingressoSet` accetta `amb`, `fronte` e `luce: { pos, k, colore }` per illuminare il soggetto.
  Una mano si legge se si vedono nocche e pollice: tre quarti dal lato del pollice, mai da dietro lungo il braccio.
- Dopo ogni modifica a mani o braccia: provini di TUTTE le scene con le mani (bocca, telefono, distintivo, fazzoletto, dito sulle labbra, baule, carte),
  ingranditi, e confronto con il render di prima. Cambiando la forma della mano si spostano anche i punti d'arrivo (la mano sulla bocca era salita sul naso).


## Mano modellata per i primi piani (25/11 sera): dopo «no la mano sulla porta è ancora fatta male comunque»

- La mano a pezzi (`mano()` in `pupazzi.js`) regge da lontano; in primo piano resta una massa informe, da qualunque lato. Per i primi piani c'è
  la mano MODELLATA, `cast/sets/mano_mesh.js`: è la «generic-hand» dei WebXR Input Profiles (licenza MIT, `cast/sets/mani/LICENZA_MIT.md`).
  Il modello originale è `mani/destra.glb` (da `npm pack @webxr-input-profiles/assets`); `mani/converti.py` lo trasforma in `mani/mano_destra.js`
  (vertici saldati, triangoli, pesi delle ossa). Spazio del modello: dita verso -y, dorso verso +x, pollice verso -z.
- Cosa fa il modulo: `cinematica` piega osso per osso (nel modello le ossa non sono in catena, i conti li fa il codice); `afferra(P, { a, b, r })`
  chiude le dita attorno a un bastone finché lo toccano; `avvolgiPollice` porta il pollice dal lato del palmo, di fronte alle dita; poi la
  superficie si liscia (suddivisione di Loop, 2 livelli) e si dipinge: unghie, fianchi delle dita più scuri, pieghe delle nocche.
- Nella scena: `attacca(A)` la mette al polso di un braccio (`T.AL` / `T.AR`) al posto di quella a pezzi e, con le maniche corte, fa anche
  l'avambraccio: una superficie nuova che parte dalla sezione vera del polso e arriva al gomito, quindi nessuna giuntura. `stacca(m)` rimette
  tutto com'era. `presaSu(a, b, { ...presaNocche(u, v), rollio, lungo })` dice dove vanno polso, dita e dorso perché un bastone della scena
  passi nel pugno (si danno al braccio come `mondo`, `ditaM`, `dorsoM`); `nelModello` porta il bastone e l'avambraccio nello spazio della mano.
  La leva della porta d'ingresso è `LEVA_INGRESSO` in `testimone_set.js`.
- Carta A dell'episodio 1 (`cartaA()` in `ep1/film.js`): rifatta DUE volte sulle foto mandate dall'utente (la sua mano sulla maniglia).
  La prima era sbagliata («no broski non va bene guarda bene la mia foto»): braccio teso dall'alto, mano che pendeva dal polso col dorso
  verso la porta, pugno piccolo. Quella giusta ricalca la foto: tu vicino alla porta col gomito basso (`pos z -2.06`, `gomitoM [0.3, -1, 0.5]`),
  quindi avambraccio quasi orizzontale; mano in piano (`rollio: 3`), polso dritto; camera dietro il braccio, in alto e un po' a sinistra
  (`M0 + [-0.12, 0.45, 0.42]`), stretta (`fov 19.5`, il pugno occupa un terzo della carta) e storta di 12°: il braccio entra dall'angolo in
  basso a destra allargandosi, le nocche stanno in cima, la punta della leva esce a sinistra col pollice raccolto sotto, la placca è sopra.
  Del personaggio si vede solo il braccio; un faro in alto a destra con le ombre dà volume. Finito lo scatto il set torna com'era: le altre
  inquadrature dell'ingresso restano identiche pixel per pixel (controllato a 93 s).
- Come si controlla un'immagine rifatta su una foto: ritaglio della foto nelle proporzioni della carta, messo accanto al provino
  (`out/prova_carta/confronto_*.jpg`), e si confrontano uno per uno grandezza, direzione del braccio, posizione del polso e delle nocche,
  dove esce l'oggetto. Le foto dell'utente restano sulla macchina, non nel repository.
- Nocche: `manoMesh` alza la pelle sopra le giunture delle dita (`rilievo`) e le tinge un po' di rosso; il pollice (`avvolgiPollice`) si
  chiude sulla leva o sulle dita che già la stringono e punta in avanti sotto la leva, come in un pugno vero visto da dietro.
- Avambraccio: il moncone del polso del modello si taglia (`YT`) e dal bordo del taglio, cioè dagli stessi vertici della mano, cresce un
  tubo che arriva al gomito (`cuciAvambraccio`): una superficie sola, niente riga al polso. Due superfici accostate lasciavano una riga.
- Laboratori: `prova_mesh/` (la mano da sola: aperta, pugno, presa su un bastone) e `prova_carta/` (la carta con sopra bollo e scritte, tre
  inquadrature per fotogramma). Una presa nuova si guarda prima lì, da sotto e di lato, per vedere pollice e punte delle dita.
- Rifare solo la fine di un episodio: `render.mjs ... --video-only --range <da>:<a>`, partendo da un fotogramma chiave del video già
  fatto (`ffprobe -skip_frame nokey`); poi testa e coda si uniscono senza ricodificare passando da MPEG-TS (`-bsf:v h264_mp4toannexb`) e si
  controlla che i fotogrammi a cavallo del taglio combacino. Otto minuti invece di un'ora.
- Inizio tagliato (25/11, «taglia la parte iniziale dove riassumi ciò che succede»): l'aggancio che riassumeva l'episodio (righe 1 e 2 della
  voce) non c'è più. `ep1/film.json` ha `inizio_fotogramma: 389` (il primo fotogramma della cucina) e `duration` = quel che resta; in
  `film.js` `T0` sposta il tempo (anche in `post`, che decide la vignettatura dal tipo di inquadratura) e tutti i tempi restano quelli della
  voce intera; `mix.py` sposta i suoni, salta quelli finiti prima, taglia quelli a cavallo e fa partire la musica con il video. Il video si
  è tagliato senza ricodificare, perché il primo fotogramma della cucina era già un fotogramma chiave. Ogni fotogramma si campiona mezzo
  fotogramma dopo il suo tempo (`seek` in motion.js): il fotogramma n mostra il tempo (n + 0,5) / 30.
- Per i prossimi episodi: la mano modellata oggi è usata solo nella carta A; le altre scene hanno ancora la mano a pezzi.

## Musica di sottofondo (25/11): «manca solo la musica horror di sottofondo»

- La musica la sceglie l'utente. Se non ne manda una sua, gli si propongono tre brani veri e gratuiti (CC0), montati sotto lo stesso pezzo
  dell'episodio (prove numerate da 38 secondi, con l'etichetta in basso), più l'episodio intero già fatto con quello consigliato.
- I brani stanno in `scripts/bivio/musica/` (licenze in `licenze_musica.json`): `accordi_scuri.mp3` (accordo scuro tenuto, il genere dei
  reel di riferimento), `archi_tensione.mp3` (violoncelli e violini, con un culmine verso la fine), `piano_inquietante.mp3` (pianoforte solo).
  Si cercano su Openverse (solo `cc0,by`) e si scaricano le anteprime da Freesound; la licenza si ricontrolla sulla pagina del brano.
- `ep1/mix.py` mette la musica se trova `ep1/musica.json` (`file`, `da`, `coda`, `incrocio`, `filtri`, `lufs`); senza quel file il mix è
  quello di prima, identico. Le tre proposte dell'episodio 1 sono in `ep1/musica_proposte.json`; `MUSICA='{...}'` ne prova una senza toccare
  niente, `MIX=<file.wav>` scrive il mix altrove.
- Il livello («lufs») si misura senza i bassi sotto 200 Hz, cioè come si sente da un telefono: lì la voce è a -22,9 LUFS e la pioggia intorno
  a -31,5. La musica va a -38 (il pianoforte a -39,5, perché le note staccate si notano di più): circa 15 dB sotto la voce, come nei reel
  di riferimento, e abbastanza da riempire le pause (nelle pause il fondo sale di 6 dB rispetto a prima). Un brano con soli bassi su un
  telefono sparisce: si tagliano i bassi (`highpass`, `bass`) e si misura dopo.
- Un brano più corto dell'episodio ricomincia con una dissolvenza incrociata; uno con grandi sbalzi di volume si livella con un `volume`
  che dipende dal tempo (vedi `2_archi`). Dopo il mix si controllano volume finale (-14 LUFS) e picchi: con il pianoforte la codifica AAC
  ha portato un picco a +0,1 dB, quindi con quel brano va abbassato il limitatore.
- Scelta dell'utente per l'episodio 1 (25/11): «archi di tensione mi piace ma aspetta che ti aggiungo un'audio migliore ma tienilo ugualmente».
  `ep1/musica.json` è una lista: il suo audio (Dropbox `/Shorts/audio horror di dexter.webm`, copiato in `scripts/bivio/musica/utente/`, che è
  fuori dal repository) come musica principale a -37, da 1,8 s (prima è silenzio), livellato a pezzi di 6 secondi e alleggerito nei bassi, e
  gli archi a -40,5 che salgono di 4 dB da 112 a 124 s e restano soli nel finale, dove il suo sfuma. Insieme stanno circa 13 dB sotto la voce.
  Se il suo file manca, mix.py lo salta con un avviso e restano gli archi.
- YouTube: uno Short più lungo di un minuto con un reclamo Content ID attivo viene bloccato in tutto il mondo
  (https://support.google.com/youtube/answer/15424877). L'audio dell'utente è musica di una serie TV: gliel'ho segnalato e ha anche la
  versione con i soli archi (CC0).
- Dropbox: ogni link di download ha un indirizzo diverso (`uc….dl.dropboxusercontent.com`) che va aggiunto alla rete dell'ambiente con una
  richiesta da approvare, prima che il link scada (15 minuti).
