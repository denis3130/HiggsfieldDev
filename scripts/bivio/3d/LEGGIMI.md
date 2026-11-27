# Il Bivio in 3D cartone, fatto col codice

Ogni episodio è un film three.js che è una funzione pura del tempo (`window.seek(t)` disegna il fotogramma t), costruito con la skill
motion-reel e renderizzato fotogramma per fotogramma in Chromium (anche senza scheda video: SwiftShader, circa 2 s a fotogramma 1080×1920).

**Regola sui modelli (25/11 sera, per tutte le sessioni, anche quelle aperte prima):** i modelli si fanno come la mano della carta A
dell'episodio 1, quella che l'utente ha approvato («ora si che sembra una vera mano… devi fare i modelli in quel modo»). I passi sono più
sotto, in «Come si fa un modello».

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
  **Dove si taglia per le pause** (corretto il 25/11 notte, dopo «nella voce ia a volte si ripete con qualche lettera»): in mezzo al silenzio
  vero tra le due righe, cercato sull'audio (`taglio()`), non a metà tra i tempi delle parole. Con una voce letta tutta di seguito (Luc) i
  tempi di Whisper sbagliano di qualche centesimo e il taglio finiva dentro l'attacco della parola dopo: se ne sentiva la prima lettera,
  poi la pausa, poi la parola intera («s… Sotto», «s… Spegni», «o… Oppure», «s… Scrivilo»; più leggeri altri quattro). Non era Luc: il suo
  audio originale è pulito. I tempi delle parole e la durata non cambiano, quindi il video non si rifà: basta rifare `vo.wav` e il mix. Lo
  script stampa i tagli e segna con (!) quelli dove un silenzio non c'è. `prepara_voce.py` non riscrive più un `film.json` che c'è già.
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
  Una mano si legge se si vedono nocche e pollice: tre quarti dal lato del pollice, mai da dietro lungo il braccio. (Valeva per la mano a
  pezzi. Con la mano modellata l'inquadratura delle foto dell'utente, da dietro e dall'alto lungo il braccio, funziona ed è quella approvata.)
- Dopo ogni modifica a mani o braccia: provini di TUTTE le scene con le mani (bocca, telefono, distintivo, fazzoletto, dito sulle labbra, baule, carte),
  ingranditi, e confronto con il render di prima. Cambiando la forma della mano si spostano anche i punti d'arrivo (la mano sulla bocca era salita sul naso).


## Mano modellata (25/11 sera): dopo «no la mano sulla porta è ancora fatta male comunque»; approvata: «ora si che sembra una vera mano»

- La mano a pezzi (`mano()` in `pupazzi.js`) in primo piano resta una massa informe, da qualunque lato: l'utente l'ha bocciata due volte.
  Al suo posto c'è la mano MODELLATA, `cast/sets/mano_mesh.js`: è la «generic-hand» dei WebXR Input Profiles (licenza MIT, `cast/sets/mani/LICENZA_MIT.md`).
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

## Come si fa un modello (regola dal 25/11 sera): «devi fare i modelli in quel modo»

Vista la carta A rifatta sulla sua foto, l'utente ha detto: «molto bravo la mano ora si che sembra una vera mano, annotati da qualche parte
che per le sessioni precedenti e future, devi fare i modelli in quel modo». Vale per tutte le sessioni de Il Bivio. «In quel modo» è questo:

1. Si parte da una forma modellata vera, non da pezzi incollati. Sfere, capsule e scatole accostate, viste da vicino, restano una massa
   informe. Il modello di partenza deve avere una licenza libera (MIT, CC0, CC BY) e la licenza si salva accanto al file, come
   `cast/sets/mani/LICENZA_MIT.md`. Niente servizi a pagamento.
2. Si trasforma in dati (`mani/converti.py`: vertici saldati, triangoli, pesi delle ossa) e si piega con le ossa (`cinematica`), non
   spostando pezzi.
3. Tocca davvero quello che tiene: le dita si chiudono finché arrivano sull'oggetto della scena (`afferra`, `avvolgiPollice`), con le misure
   vere dell'oggetto (`LEVA_INGRESSO` per la maniglia). Niente pose a occhio che passano attraverso l'oggetto o gli restano staccate.
4. Una superficie sola: le parti vicine (l'avambraccio) crescono dal bordo del modello, dagli stessi vertici (`cuciAvambraccio`).
5. Poi si liscia (suddivisione di Loop) e si dipinge sui vertici: unghie, nocche, pieghe, fianchi più scuri. Colori piatti con sfumature
   morbide, come il resto del cast: forma vera, mai l'effetto plastica.
6. Si guarda da sola nel laboratorio (`prova_mesh/`: sei punti di vista su fondo neutro), anche da sotto e di lato, prima di metterla in scena.
7. Luce con le ombre, da sopra e di lato: con la luce alle spalle il modello resta piatto e scuro.
8. Prima di mandarla all'utente: accanto a una foto vera, ritagliata nelle stesse proporzioni, e confronto punto per punto (grandezza,
   direzioni, dove stanno polso e nocche, dove esce l'oggetto); poi ingrandita in tutte le scene in cui si vede. Se la foto l'ha mandata
   lui, l'immagine si rifà com'è nella foto. Le sue foto restano sulla macchina, mai nel repository.

Cosa ne ho dedotto io (non sono parole sue, da correggere se dice altro):
- «I modelli» sono prima di tutto le mani; lo stesso metodo vale per ogni parte del corpo o oggetto che si vede da vicino.
- Teste, facce disegnate e capelli (già approvati) restano come sono; corpo, vestiti e scarpe li ha poi chiesti lui (sezione qui sotto).
- Fatto la sera stessa (vedi «Corpo, vestiti e scarpe modellati»): la mano modellata sta su tutti e due i polsi in tutte le scene, con le
  pose della mano a pezzi tradotte (`posaDaPupazzo`) e gli oggetti (distintivo, telefono) appoggiati alle dita vere.

## Corpo, vestiti e scarpe modellati (25/11 sera): «ok migliora scarpe e vestiti corpo dei pg come con la mano»

Dopo la mano, l'utente ha chiesto lo stesso per corpo, vestiti e scarpe. Teste, facce e capelli restano quelli di prima (non li ha nominati).
- **Da dove vengono i modelli.** Corpo umano, vestiti e scarpe sono di MakeHuman, licenza CC0 (`cast/sets/corpi/LICENZE.md`: fonti, autori,
  come riscaricare). Il corpo (maglia «hm08», forme, scheletro) sta nel pacchetto Python `anny`; i vestiti in dotazione a MakeHuman nel
  pacchetto npm `makehuman-data`. GitHub da qui non si raggiunge (solo il repository del progetto), i registri npm e PyPI sì.
- **Il convertitore** (`cast/sets/corpi/converti_corpo.py <mpfb2> <vestiti> <uscita> [personaggio]`, con `mh.py`, `maglia.py`, `pittura.py`):
  dà la forma al corpo (uomo giovane per il testimone, più anziano e pesante per l'ispettore, donna giovane per Elena), adatta i vestiti al
  corpo (ogni vertice di un vestito è legato a tre vertici del corpo: ne segue la forma e ne eredita i pesi delle ossa), toglie la pelle
  sotto i vestiti (ma ne lascia un giro oltre i bordi, un filo più in dentro: niente buchi al colletto e all'orlo delle maniche), toglie
  testa e mani, riduce le 163 ossa di MakeHuman a 38, liscia (Catmull-Clark) e scrive `<personaggio>.json` + `.bin`. I personaggi e i loro
  vestiti sono in `PERSONAGGI` in cima al file. Rifatta due volte, la conversione dà file identici byte per byte.
- **Elena** (la donna del parcheggio) è fatta allo stesso modo: corpo di donna, lo stesso completo adattato al suo corpo e dipinto come
  cappotto rosso su maglia scura, scarpe nere. La **borsa a tracolla** è un modello suo (`tracolla()` nel convertitore, niente di scaricato):
  corpo morbido e patta (due gabbie lisciate), appesa al fianco destro un po' indietro, e la cinghia che passa sulla spalla sinistra. La
  cinghia corre come una cinghia tesa: nel suo piano fa il giro più corto attorno al busto (l'involucro convesso del cappotto tagliato da
  quel piano), appoggiata alla stoffa coi due bordi; si muove col cappotto (stessi pesi delle ossa), la borsa col bacino.
- **Spalle a tappe** (`catena_spalla()` nel convertitore, `TAPPE` in `corpo_mesh.js`). Tra il busto, che sta fermo, e il braccio, che gira
  del tutto, i pesi di MakeHuman sfumano in linea retta: col braccio portato in avanti di 60-70 gradi (una telefonata) la stoffa a metà
  strada rientrava e si accartocciava, e la spalla sembrava una palla staccata dal busto. Ora la sfumatura passa per tre ossa intermedie
  (`spalla25`, `spalla`, `spalla75`) che fanno un quarto, metà e tre quarti della rotazione del braccio attorno alla spalla: ogni punto gira
  della sua frazione lungo l'arco. `stringi` (1,8) concentra il movimento verso il braccio: vicino al collo la stoffa non viene più
  trascinata. In più: `ammorbidisci()` liscia i pesi attorno alle spalle lungo la maglia del vestito; `maniche` (0,55 per il testimone)
  avvicina la manica al braccio (larga, a braccio alzato sembrava gonfia), tenendola almeno 4 mm sopra la pelle.
- **Quale pelle sta sotto la stoffa.** Oltre ai vertici che il vestito dice di nascondere si tolgono quelli che hanno stoffa lungo la loro
  normale entro 3,5 cm (semiretta contro i triangoli del vestito: il punto di stoffa più vicino non basta, con una manica aderente sta di
  lato). Della pelle nascosta resta sempre il giro di vertici che tocca quella visibile: sul braccio la maglia del corpo è rada e una
  distanza fissa (2 cm) lasciava un buco tra la pelle e l'orlo della manica.
- **Il cappotto dell'ispettore** (serve alla storia: «un uomo con un cappotto scuro») è la giacca del completo allungata (`cappotto()`):
  dall'orlo della giacca, dagli stessi vertici, scende una falda fino al ginocchio; lo spacco dietro continua, l'incavo davanti si chiude.
  La falda si DISEGNA con le gambe dritte e poi si riporta nella posa di riposo (gambe larghe) col contrario del movimento delle ossa: se la
  si disegna a gambe larghe viene una campana. Il completo non si liscia (`'vestito': 0`): lisciando, la camicia buca i risvolti.
- **I colori** (`pittura.py`, `dipingi()` nel convertitore): le texture originali sono foto; si ridipingono coi colori piatti del
  personaggio tenendo del disegno solo cuciture, tasche, lacci e suole. La maglietta è a tinta unita con colletto e orli più scuri disegnati
  lungo i bordi veri della maglia; la cravatta è dipinta dove l'originale ha le righe; falda del cappotto e pezzi a tinta unita usano un
  quadratino di colore messo in un angolo libero della texture (`tinta()`). Le pieghe dei jeans e della maglietta sono la mappa delle normali originale.
- **Sul pupazzo** (`cast/sets/corpo_mesh.js`, `vesti()`): il pupazzo di `pupazzi.js`/`adulti.js` resta, invisibile, e fa da ossa: stesse pose e
  stessi comandi delle scene. `uomo({ corpo: 'testimone' })` in `adulti.js` lo veste; `testimone({ modellato: false })` ridà quello vecchio.
  Le gambe del pupazzo prendono le misure del corpo modellato; braccia, busto e testa restano i suoi (il braccio modellato viene allungato
  del 18%). Ogni osso ha un telaio a riposo (dai giunti di MakeHuman) e uno in posa (dal pupazzo); la pelle è la somma pesata. Braccio e
  avambraccio hanno due ossa ciascuno: in alto non torcono, in basso seguono gomito e mano (così la manica non si attorciglia). Busto e
  collo si piegano a tratti attorno ai due perni del pupazzo. Le normali si calcolano sui punti, non sui vertici: le cuciture degli uv non si vedono.
- **Collo e testa**: il collo modellato entra nella testa disegnata. Quel che della testa modellata sporgerebbe (mento, mascella) viene tirato
  dentro la forma della testa (`raggioTesta` in `pupazzi.js`) e i triangoli che finiscono dentro si tolgono.
- **Mani e polsi**: su tutti e due i polsi c'è la mano modellata (`manoMesh({ taglio: true })`); tra il bordo della mano e il bordo
  dell'avambraccio c'è un raccordo di pelle che parte dai vertici dell'una e arriva sui lati dell'altro (`fasce` in `vesti()`), con le
  normali dei due bordi: nessuna riga al polso, nemmeno quando si piega. Le pose della mano a pezzi (`rilassata`, `presa`, `pugno`…) sono
  tradotte da `posaDaPupazzo` in `mano_mesh.js`. La carta A resta fatta con `attacca()` (mano e avambraccio suoi), identica a quella approvata.
- **Oggetti in mano** (`presaPiatta`, `appoggiaSulleDita`, `oggettoInMano` in `corpo_mesh.js`): distintivo e telefono si appoggiano alle
  dita dal lato del palmo e il pollice si chiude sulla faccia davanti; un po' inclinati, perché il palmo non è piatto. Con le posizioni
  pensate per la mano a pezzi le dita li attraversavano. Finché l'oggetto si vede (`g.visible`) la mano prende la sua presa, qualunque posa
  chieda la scena: per questo le scene accendono o spengono l'oggetto PRIMA di `pose()`. Il telefono (`telefono()` in `adulti.js`) ha tre
  prese: dritto (per guardarlo), di traverso (per filmare), all'orecchio (posa della mano `orecchio`, per la telefonata). Il fazzoletto
  dell'ispettore è stoffa appallottolata (`stoffaInPugno()`), non una palla liscia.
- **La telefonata a terra** (episodio 1): chi telefona ha per forza il braccio portato in avanti (il polso sta a un palmo dalla spalla: il
  gomito non può scendere lungo il fianco). Vista di tre quarti da quel lato, la spalla resta il punto debole del modello; nella scena lui è
  girato verso la camera (`yaw` in `tuTerra`), così il braccio si vede di fronte e la posa si legge subito.
- **Laboratori**: `prova_corpo/` (testimone), `prova_ispettore/` e `prova_elena/` (stesso `film.js`: sono cartelle con i collegamenti a
  `prova_corpo` e un `film.json` con `"chi"`): da 0 a 10 s le pose da sei punti, da 10 a 20 collo e mani, da 20 a 30 polso e spalla, da 30
  a 40 vestiti in chiaro e oggetti in mano, dal secondo 40 le pose prese dalle scene viste da vicino (la telefonata, con varie posizioni
  del gomito). `cast4/` + `scheda_corpi.py`: la scheda prima/dopo mandata all'utente.
- **Tempi**: con i corpi modellati un fotogramma costa circa 1,7 s con 3 processi (prima la metà). L'episodio intero (4019 fotogrammi) si
  rende in due metà insieme, `--range 0:67` e `--range 67:133.963333` con 2 processi ciascuna (un comando in background non può durare più
  di due ore), poi si uniscono con ffmpeg (`-f concat`, `-c copy`).
- **Confronto con foto vere**: `cerca.py` (nella cartella di lavoro `foto_rif/`) scarica da Openverse foto CC0 di scarpe, maglietta e jeans;
  messe accanto ai provini: suola, lacci e punta delle scarpe, lunghezza delle maniche, dove arriva l'orlo della maglietta, pieghe.
- **Errori da non rifare**: tagliare il collo coi pesi della testa (sotto il mento resta un buco: i pesi della testa scendono fin lì);
  lisciare il completo; disegnare la falda nella posa di riposo; usare per gli oggetti le posizioni della mano a pezzi; un quadratino di
  tinta messo a caso nella texture (finiva su una manica); aggiungere un commento in mezzo a una riga con più istruzioni (tutto quel che
  segue diventa commento: è successo in `film.js` e nel convertitore, dove ha spento un pezzo di `cappotto()` senza dare errore); guardare
  le pose solo in piccolo: la spalla accartocciata della telefonata si vedeva soltanto a grandezza piena.

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

## «Il gioco dei sette» nel formato del video A (26/11): prova di stile e personaggi
Storia dell'utente in `data/horror/storie/14_il_gioco_dei_sette.md`; formato da copiare in `data/horror/VIDEO_A.md`.
- `gioco7-prova/`: il gancio dell'episodio 1 (13 s). `sets/look.js` = l'aspetto del video A fatto col codice (texture disegnate su tela:
  legno, damasco, carta da parati, carta dei segnaposti; materiali fisici con riflessi; candele con fiamma, alone e luce che tremola;
  pulviscolo e fascio di luna). `sets/sala.js` = la sala da pranzo (otto posti, le mani modellate dei sette con le maniche, segnaposto
  di Clara listato a lutto, rosa secca, sedie, finestra con la luna). `sets/villa.js` = la villa di notte (cipressi, luna, nebbia, la
  finestra accesa con le sagome degli invitati). `film.js` = sottotitoli del video A (Figtree, parola chiave nel riquadro coi pallini),
  firma «@STACAPPELLA», camera quasi ferma con gli scatti veloci sulle parole (inOutQuint, scia del movimento solo negli scatti: 8 campioni).
  Senza voce i tempi delle parole si calcolano dal testo al ritmo di Luc. `mix.py` = i suoni veri (CC0, licenze in `audio/sfx/licenze.json`).
- Render (cartella di lavoro fuori dal repository con `node_modules`, e collegamenti a `gioco7-prova`, `gioco7-scheda` e `cast`):
  `node <skill>/scripts/render.mjs --film gioco7-prova --format 9x16 --video-only --fps 30 --workers 3` (circa 28 minuti per 13 s:
  gli scatti con la scia costano 8 volte). Un pezzo si rifà con `--range a:b` e si rimonta con ffmpeg.
- Personaggi nell'aspetto del video A: `gioco7-prova/personaggi/converti_teste.py <mpfb2> dati` fa i busti dei sette dal corpo MakeHuman
  CON la testa (forme per età, sesso, peso, origine, viso; testa ingrandita 1,18–1,25; occhi più grandi), e dipinge la pelle nello spazio
  uv guardando dove sta ogni texel sulla testa (lentiggini, macchie, labbra, sopracciglia, barba, rughe e pori nel rilievo, capelli dipinti
  sotto l'attaccatura). `sets/personaggi.js` aggiunge occhi veri, maglia con colletto, occhiali di Victor e i capelli.
- Capelli (26/11, dopo «sembrano pezzi staccati»): `personaggi/capelli.py` li fa come UNA forma sola per pettinatura, mai pezzi incollati.
  Volume = strato sul cuoio capelluto che a filo dell'attaccatura scende a zero (nasce dalla pelle) + capelli che cadono (dal raggio della
  testa «appeso», più stretti verso il viso, punte irregolari, il caschetto rientra in fondo) + chignon, uniti con l'unione morbida (smin);
  superficie con marching cubes (scikit-image), lisciatura di Taubin, poche ciocche larghe scavate lungo il verso della pettinatura
  (indietro, di traverso dalla riga, giù dove cadono). La distanza dalla pelle si prende dal piano tangente dei 6 punti più vicini:
  dal punto più vicino esce una perlina per vertice. Pettinature in `PETTINATURE` di `converti_teste.py`. `gioco7-scheda/` li mostra uno per uno. I dati generati (`personaggi/dati/`) non stanno
  nel repository: si rifanno col comando sopra (mpfb2 = `pip download anny==0.6.2 --no-deps`, vedi `cast/sets/corpi/LICENZE.md`).

## «Il gioco dei sette», episodio 1 «L'ottavo invitato» (26/11): il film completo
- `gioco7-ep1/`: il film (`film.js`, 146,6 s), le inquadrature della scaletta (`data/horror/il_gioco_dei_sette/ep1/scaletta.md`) sui tempi
  veri della voce di Luc (`assets/parole.json`, allineata con `allinea.py`; l'audio di Luc sta solo nella cartella di lavoro). Ogni avvenimento
  (la busta, la serratura, la grata, il televisore, Victor che si alza, il buio, le luci, il biglietto, Sophie) è legato a una parola.
- **I sette a corpo intero**: `gioco7-prova/personaggi/corpi_sette.py` fa il corpo con la STESSA forma delle teste approvate
  (`converti_teste.forma_di`), i vestiti e le scarpe di MakeHuman (in dotazione, CC0: completo per Leon, Victor, Elena, Adrian; giacca per
  Marcus; maglia e gonna per Nora; maglietta e jeans per Sophie) ridipinti coi colori dei personaggi, la pelle tolta sotto la stoffa e i pesi
  delle ossa ridotte (`ossa7.py`). Anche il busto (testa) ora ha i pesi (`<nome>_ossa.bin`). `sets/corpi7.js` li mette in posa con lo
  skinning: bacino, schiena, collo, IK a due ossa per braccia e gambe, il palmo della mano, gli occhi (al massimo 28° di lato e 14° in su/giù,
  se no l'iride sparisce sotto la palpebra: per guardare la camera si gira la TESTA). Sui polsi c'è la mano modellata approvata
  (`mano_mesh.js`), orientata come la mano del corpo, che si chiude dentro la manica. `sets/tavola7.js` = i posti a tavola e la posa da seduto.
- Set nuovi: `sala7.js` (portone con la serratura, grata, televisore a tubo, applique, candele che si spengono col fumo), `casa.js` (casa di
  Leon: busta, cartoncino a macchina, foto di Clara e ritaglio di giornale, chiavi; il verbale della questura), `extra7.js` (l'uomo
  mascherato, la foto della fornace coi sette in piedi, il corridoio della carta B, l'effetto televisore). Le immagini fisse (uomo mascherato,
  foto, carte) si fanno all'avvio: l'avvio è lungo, per i fermi immagine si usa la copia di `render.mjs` con l'attesa a 15 minuti
  (`lavoro3d/rr/render.mjs`).
- Suoni veri CC0 dell'episodio in `gioco7-ep1/audio_ep1/` (licenze in `licenze.json`); il mix è `mix_ep1.py` (la voce del televisore filtrata,
  musica circa 20 dB sotto la voce, -14 LUFS).
- Finale con tre carte (27/11): A azzurra, B rossa, C dorata con solo «Scegli tu» (fumetto col cuore); Luc dice la C dopo la B
  («Altrimenti la C: se il commento con più cuori supera le opzioni, sarà la scelta definitiva.»). Una frase nuova si genera da sola con Luc
  (0,3 crediti), si allinea con Whisper e si monta nella voce intera nel silenzio tra due frasi; in `parole.json`/`copione.json` diventa una
  riga nuova e le righe dopo scalano di uno (in `film.js` anche `EV` e `CHIAVI`, in `mix_ep1.py` le righe dei suoni). Poi si renderizza
  solo il pezzo cambiato (`--range 127.9:154.18`, un'ora) e lo si attacca al video già fatto tagliato al fotogramma (`trim=end_frame=3837`),
  e si rifà il mix: `mix_ep1.py <video> <uscita> <voce.wav>`. Le parole nuove si concordano con l'utente PRIMA di generarle.
