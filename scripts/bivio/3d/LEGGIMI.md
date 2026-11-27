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
  testa e mani, riduce le 163 ossa di MakeHuman a 39, liscia (Catmull-Clark) e scrive `<personaggio>.json` + `.bin`. I personaggi e i loro
  vestiti sono in `PERSONAGGI` in cima al file. Rifatta due volte, la conversione dà file identici byte per byte.
- **Elena** (la donna del parcheggio) è fatta allo stesso modo: corpo di donna, lo stesso completo adattato al suo corpo e dipinto come
  cappotto rosso su maglia scura, scarpe nere. La **borsa a tracolla** è un modello suo (`tracolla()` nel convertitore, niente di scaricato):
  corpo morbido e patta (due gabbie lisciate), appesa al fianco destro un po' indietro, e la cinghia che passa sulla spalla sinistra. La
  cinghia corre come una cinghia tesa: nel suo piano fa il giro più corto attorno al busto (l'involucro convesso del cappotto tagliato da
  quel piano), appoggiata alla stoffa coi due bordi; si muove col cappotto (stessi pesi delle ossa). La borsa ha un osso suo (`borsa`,
  perno dove la cinghia la regge): di solito segue il bacino, ma una scena può spostarla e girarla con `borsa: { gira: [x, y, z], sposta:
  [x, y, z] }` nella posa di Elena (misure nel riferimento del corpo): serve quando lei cade e la borsa finisce a terra accanto a lei
  invece di restarle incollata al fianco. Gli ultimi 35 cm di cinghia sfumano dall'osso della borsa al cappotto.
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
  prese: dritto (per guardarlo), di traverso (per filmare), all'orecchio (posa della mano `orecchio`, per la telefonata). Due opzioni di
  `presaPiatta` fanno la differenza tra una mano che tiene e una mensola: `aggancia` (gradi) chiude le punte delle dita attorno al bordo
  lontano dell'oggetto (il telefono che filma: prima le dita restavano dritte oltre il bordo), facendolo scorrere finché il bordo sta un
  raggio di dito prima dell'ultima nocca; `bordo` chiude il pollice lungo il bordo lungo invece che sulla faccia (il telefono all'orecchio:
  la faccia sta contro la guancia). Il fazzoletto dell'ispettore è stoffa appallottolata (`stoffaInPugno()`), non una palla liscia.
- **La telefonata a terra** (episodio 1, rifatta il 26/11): seduto a terra con la schiena al muro e le ginocchia su, il telefono lungo la
  mano e la guancia (non di traverso sulla tempia: sembrava grattarsi la testa), l'altra mano appoggiata sul ginocchio (`proprio`, vedi
  sotto). Il polso sta a un palmo dalla spalla, quindi il gomito è l'unica cosa che si sceglie: `gomito: [0.8, -1, -0.1]`, basso e lungo
  il fianco. Portato davanti al petto (`[0.3, -1, 0.4]`) gonfia la manica come un palloncino; alzato di lato sembra un'ala. Nella scena
  lui è girato verso la camera (`yaw` in `tuTerra`), così il braccio si vede di fronte e la posa si legge subito.
- **Laboratori**: `prova_corpo/` (testimone), `prova_ispettore/` e `prova_elena/` (stesso `film.js`: sono cartelle con i collegamenti a
  `prova_corpo` e un `film.json` con `"chi"`): da 0 a 10 s le pose da sei punti, da 10 a 20 collo e mani, da 20 a 30 polso e spalla, da 30
  a 40 vestiti in chiaro e oggetti in mano, dal secondo 40 le pose prese dalle scene viste da vicino (la telefonata, con varie posizioni
  del gomito, la borsa, la mano sulla bocca, il telefono che filma). `prova_auto/`: l'auto da sei punti (chiusa, aperta, coda, muso,
  dall'alto). `cast4/` + `scheda_corpi.py`: la scheda prima/dopo mandata all'utente.
- **Tempi**: con i corpi modellati un fotogramma costa circa 1,7 s con 3 processi (prima la metà). L'episodio intero (4019 fotogrammi) si
  rende in due metà insieme, `--range 0:67` e `--range 67:133.963333` con 2 processi ciascuna (un comando in background non può durare più
  di due ore), poi si uniscono con ffmpeg (`-f concat`, `-c copy`). Ogni metà si rende da una copia congelata della cartella
  (`cp -rL ep1 ep1_r`, 60 MB): così si può continuare a ritoccare l'altra metà senza che un processo ricarichi un file cambiato a metà.
- **Confronto con foto vere**: `cerca.py` (nella cartella di lavoro `foto_rif/`) scarica da Openverse foto CC0 di scarpe, maglietta e jeans;
  messe accanto ai provini: suola, lacci e punta delle scarpe, lunghezza delle maniche, dove arriva l'orlo della maglietta, pieghe.
- **Errori da non rifare**: tagliare il collo coi pesi della testa (sotto il mento resta un buco: i pesi della testa scendono fin lì);
  lisciare il completo; disegnare la falda nella posa di riposo; usare per gli oggetti le posizioni della mano a pezzi; un quadratino di
  tinta messo a caso nella texture (finiva su una manica); aggiungere un commento in mezzo a una riga con più istruzioni (tutto quel che
  segue diventa commento: è successo in `film.js` e nel convertitore, dove ha spento un pezzo di `cappotto()` senza dare errore); guardare
  le pose solo in piccolo: la spalla accartocciata della telefonata si vedeva soltanto a grandezza piena.

## Appunti dell'utente sul video definitivo (26/11): cinque schermate, «cosa capisci dalle immagini»

Visto il video consegnato, l'utente ha mandato cinque schermate e ha chiesto cosa ci capivo; alla mia lista ha risposto «tutto giusto
manca solo che le braccia quando chiude il bagagliaio sono incrociate non sembrano naturali». Quindi: prima gli si dice cosa si è capito,
poi si agisce. Cosa non andava e com'è stato rifatto:
- **L'auto era fatta di scatole** (ruota a spigoli, luci incollate, il bagagliaio un rettangolo nero senza fondo, il cofano una tavola
  staccata). Ora è un modello vero, tutto col codice (`cast/sets/auto_mesh.js`, niente di scaricato): la carrozzeria è una superficie sola,
  74 sezioni lungo l'auto, ognuna il contorno di «scocca più abitacolo», con una colonna di punti che corre proprio sul bordo del cofano;
  il cofano è ritagliato dagli stessi punti, ha il suo spessore e gira sulla cerniera (`cofano(k)`, apertura massima `APRE` = 1 rad: a
  1,25 dalla finestra si vedeva di taglio); il vano ha pareti e fondo (`PAV`); le gomme sono tornite, i cerchi dipinti; vetri, fari,
  passaruota, portiere e targa sono dipinti in una texture calcolata punto per punto dalla posizione vera. `suCofano(k, dietro, lato,
  sopra)` dà un punto sulla pelle del cofano: serve per metterci le mani. Nel set l'auto è girata di un quarto di giro: da coordinate
  dell'auto a mondo `(x, y, z) → (AUTO.x + z, y, AUTO.z − x)` (`daAuto`, `versoAuto` in `ep1/film.js`).
- **Elena a terra era rigida come un manichino, con la borsa incollata al fianco.** Ora cade molle (`GIACE` in `ep1/film.js`: busto
  ruotato, testa abbandonata, un ginocchio piegato, un braccio sopra la testa e uno davanti, mani `rilassata`) e la borsa finisce a terra
  (`BORSA_FIANCO`, `BORSA_SUPINA`). `zuffa()` sfuma dalla posa in piedi a `GIACE` mentre cade.
- **L'ispettore la caricava stando piegato in due con le braccia a penzoloni.** Ora la trascina per le caviglie camminando all'indietro
  (`rec1`), la cala nel bagagliaio tenendola per la spalla e il ginocchio (`rec2`) e lei resta rannicchiata sul fianco (`nelBaule`), ben
  visibile finché il cofano non è chiuso (prima spariva quasi subito).
- **Le mani sul cofano erano aperte e appoggiate, e le braccia incrociate.** Le braccia erano scambiate: con `yaw` = π/2 il braccio
  `armR` (sinistro anatomico) sta dalla parte di −z nel mondo. Ora ogni mano va al bordo del cofano dal suo lato (`manoCofano`, `verso3`:
  parte dal fianco, arriva sul bordo, le dita seguono la pelle del cofano) e scende col cofano.
- **Ancore**: in `esterno_set.js` Elena si mette in posa per prima; le braccia di Riva possono puntare a un punto del suo corpo con
  `{ su: 'cavigliaD' | 'cavigliaS' | 'ginocchioD' | 'ginocchioS' | 'polsoD' | 'polsoS' | 'spallaD' | 'spallaS' | 'testa', delta }`.
  In `uomo.pose` un braccio può puntare al proprio ginocchio con `{ proprio: 'ginocchioD' | 'ginocchioS', delta }`. Così le mani restano
  sul corpo anche quando la posa cambia.
- **La mano sulla bocca era piatta e rigida davanti al mento.** Ora è a coppa (`MANO_BOCCA`): palmo sulle labbra, dita piegate sulla
  guancia, pollice dall'altra parte, polso in linea col braccio, gomito alzato di lato.
- **La telefonata a terra**: vedi sopra («La telefonata a terra»).
- **Nel controllo ingrandito prima di rifare il render** ho trovato e sistemato altre due cose che non aveva segnato: il dito sulle labbra
  dell'ispettore arrivava in mezzo agli occhi (abbassato di 3 cm: la punta sotto il naso, il dito sulle labbra) e la mano che tiene il
  telefono mentre filma aveva le dita dritte oltre il bordo (`aggancia`).
- **Viste di controllo**: `ep1_dbg/` e `ep1_dbg2/` sono cartelle con i collegamenti a `ep1` e un `film.json` con `"viste"`: la stessa
  scena resa da quattro lati in una griglia, schiarita. Per confrontare varianti di una posa nella scena vera: una cartella di prova con
  un `film.json` che porta i valori (`M.CFG`), letti da `film.js` con un valore di riserva; scelta la variante, si scrive il valore e si
  toglie l'aggancio. Dopo ogni ritocco si rifanno i 67 fotogrammi di controllo e si confrontano pixel per pixel con quelli di prima:
  devono cambiare solo le scene toccate.
- **Foto di riferimento**: per bagagliaio, mano sulla bocca e telefonata Openverse non ha dato quasi niente (e limita le richieste):
  queste pose sono state controllate su viste da più lati, non accanto a una foto.

## Prova «più creepy» (26/11): «ed i video li renderei più creepy non so se sai che intendo»

Gli ho detto cosa ho capito (vedi `data/horror/FORMATO_STORIA.md`, «Più creepy») e gli ho mandato una prova di 13 secondi sulla scena dello
spioncino («So che è lì dentro… Sono qui per proteggerla»), per farmi dire se la direzione è giusta prima di rifare altro. Il video
consegnato non cambia: la prova è una copia a parte.
- **Come si rifà**: `ep1_creepy/` è una cartella con i collegamenti a `ep1` (come `ep1_dbg`), il suo `film.json` e una copia di `film.js`
  ritoccata: `cp ep1/film.js ep1_creepy/ && patch -p0 < ep1_creepy/creepy.patch` (dalla cartella `3d`). Render: `--range 105.5:118.6`.
- **Cosa cambia nella scena** (`pov2`): pianerottolo quasi al buio con la plafoniera alle sue spalle, quindi lui è in controluce; non batte
  mai le palpebre; occhi sbarrati anche quando sorride (`open` alto: di suo il sorriso li stringe e viene una faccia simpatica); testa bassa
  e occhi in su; il sorriso cresce in quasi due secondi e la testa si inclina; si avvicina piano e si china verso lo spioncino. La
  plafoniera trema; finita la battuta la luce delle scale si spegne mezzo secondo (è a tempo: niente di soprannaturale; si sente lo scatto
  dell'interruttore, lo stesso suono vero usato in cucina) e quando torna nello spioncino c'è il suo occhio, coi tre graffi di fianco, che
  cerca a destra e a sinistra e poi si ferma. Le carte arrivano un secondo dopo, così «Cosa fai?» cade sull'occhio.
- **Nel set** (`pianerottoloSet` in `cast/sets/testimone_set.js`, tutto facoltativo: senza questi comandi rende come prima, controllato
  pixel per pixel): `buio` (0..1), `luce` (0..1, la plafoniera che la scena fa tremare o spegnere), `miraViso` e `miraX` (la camera punta
  al suo viso dovunque sia: da vicinissimo un punto fisso lo faceva uscire dal cerchio dello spioncino).
- **Sopra l'immagine** (`creepy()` nella copia): bordi dello spioncino più neri, un velo freddo verdastro, grana.
- In attesa del suo giudizio. Se è la direzione giusta: stessa mano per le altre scene col cattivo (alza la testa, conta i piani, il dito
  sulle labbra, il distintivo) e per i prossimi episodi.

## Tagliare una frase dalla voce (26/11): «taglia senza spendere»

L'utente ha fatto togliere «Sotto l'unico lampione,» dall'episodio 1 (frase che non regge e dettaglio trascurabile: vedi
`data/horror/FORMATO_STORIA.md`). Si fa col montaggio, senza rigenerare la voce e senza rifare tutto il render:
1. `python3 taglia_frase.py <film> <riga> <prima parola> <ultima parola>` (con `--prova` stampa soltanto). Toglie le parole da `audio/vo.wav`
   tagliando nel silenzio vero, prima della prima parola e prima di quella che segue; il pezzo tolto dura un numero intero di fotogrammi e
   comincia su un fotogramma del video; la pausa prima della parola che segue resta quella di prima. Aggiorna `assets/parole.json` (parole
   tolte, tempi spostati, maiuscola alla parola che ora apre la frase), `assets/bocca.json` e la durata in `film.json`; tiene le copie
   `*.prima_del_taglio`. Per l'episodio 1: da 23,4667 a 25,3 s della voce, 55 fotogrammi (da 315 a 369 del video), tutti e due i punti a -80 dB.
2. I confini delle scene sono agganciati alle parole, quindi dopo il taglio il film è lo stesso spostato di 55 fotogrammi. Si rifanno solo le
   scene toccate, da un confine di scena all'altro (qui «finestra» e «alto»: `--range 8.7:14.466667`, 173 fotogrammi, tre minuti), e si
   attaccano ai fotogrammi già resi: `trim=end_frame=261` del video di prima, il pezzo nuovo, `trim=start_frame=489` del video di prima,
   `concat`, `libx264 -crf 14`. Le giunte cadono su stacchi di scena, quindi non si vedono.
3. In `ep1/musica.json` si spostano dello stesso tempo i momenti agganciati al film (gli archi: 55, 94 e 112 s); il livellamento dell'audio
   dell'utente segue il suo file e non si tocca. Poi `mix.py`.
4. Controlli fatti: i fotogrammi dopo il taglio sono quelli di prima spostati (PSNR 48-55 dB, cioè solo la ricodifica; il fotogramma con lo
   stesso numero invece è diverso, 18 dB); Whisper sulla voce nuova sente «Scosti la tenda. Un uomo con un cappotto scuro…» senza resti;
   lo scarto tra voce e video è lo stesso (+2,9 ms) dall'inizio alla fine.
- Nel copione (`data/horror/il_testimone/ep1/episodio.json`) la riga 5 tiene in «voce» il testo registrato, che serve a `voce_esterna.py`
  per i tempi, con accanto «tolto» e «nel_video». Se si rifà la voce da capo: `voce_esterna.py`, `prepara_voce.py`, poi `taglia_frase.py`.
- Limite: funziona se prima e dopo le parole da togliere c'è un silenzio (qui 800 e 186 ms). Dentro una frase detta tutta d'un fiato lo
  script si ferma e lo dice, invece di tagliare dentro una parola.

## Il collo del protagonista (26/11): «quanto ci metti a modificare per migliorare il collo del protagonista?»

Cosa non andava (detto a lui prima di toccare niente): troppo grosso (di fronte largo quanto la mascella, a cono verso le spalle; di profilo
un tubo spesso quasi quanto la testa), senza stacco sotto la mascella, e alla base, davanti, uno scalino sopra il colletto. Il collo di
MakeHuman ha misure vere (11,3 cm a metà), ma sotto una testa disegnata piccola e con poche ombre sembra enorme.
- **Più snello** (`collo_snello()` nel convertitore, parametri `collo` del personaggio): stringe il collo attorno al suo asse, dal giunto
  del collo a quello della testa: `largo` 0,84 di lato, `profondo` 0,81 davanti-dietro (l'asse sta verso la nuca, quindi rientra soprattutto
  la gola). Sfuma verso le spalle coi pesi delle ossa del collo: `spalle` 0,3 = alla base di lato si stringe poco (il collo si allarga
  verso le spalle, com'è vero; con 0,55 tra collo e colletto si apriva uno spiraglio), `gola` 0,92 = davanti-dietro si stringe anche
  alla base (toglie lo scalino). A metà collo: da 11,3 a 9,7 cm. Si fa PRIMA di adattare i vestiti, così il colletto segue; statura e
  giunti non cambiano. Solo il testimone ha `collo`: i dati di ispettore ed Elena restano identici byte per byte.
- **Pelle sotto il colletto** (`sotto_collo` 0,6): attorno al collo la pelle continua sei centimetri sotto la maglietta invece di due.
  Col collo più snello, dallo spiraglio del colletto si vedeva il bordo dove la pelle finiva (una punta che spuntava di tre quarti).
- **Ombra sotto la mascella** (`ombraMento` in `vesti()`, 0,2 per il testimone in `adulti.js`): colori dei vertici sulla pelle, più scuri
  dove il collo entra nella testa, sfumati in sei-sette centimetri, più leggeri sulla nuca. Senza, mento e collo hanno la stessa tinta
  piatta. La pelle ha quindi un materiale suo (clone con `vertexColors`); i raccordi dei polsi usano quello liscio (`pelle.liscio`).
- **Controlli**: laboratorio `prova_corpo` al secondo 10 (testa e collo da quattro lati) e ai secondi 50-52 (collo e colletto da vicino,
  testa girata e in giù, testa in su e inclinata: col collo vecchio, lì, sotto il mento c'erano bordi seghettati), braccia alzate (la pelle
  in più non buca la maglietta), poi le scene vere ingrandite. Niente foto vera accanto: Openverse rifiutava le richieste (429); ho
  controllato le proporzioni sui numeri (collo circa il 62% della larghezza della testa) e da tutti i lati.
- **Video**: si rifanno solo le scene in cui si vede lui (`scene_ep1`: cucina, finestra, tu1, tu2, palazzo, spegni, terra, ascolta, corridoio,
  viso, passo, piede, video, carte: 2138 fotogrammi su 3964) e si attaccano alle altre, che non cambiano. L'elenco delle scene coi
  fotogrammi si legge dalla pagina del film (`window.TEMPI`).
- **Trappola trovata nel montaggio finale**: `mix.py` univa video e audio con `-shortest`; con il video copiato com'è, l'ordine dei
  fotogrammi B faceva perdere gli ultimi (fino a tre). Tolto: video e audio finiscono a 3 millesimi l'uno dall'altro.

## Episodio 2 de «Il testimone» (26/11): «La mano tesa», il ramo B (scappi dal balcone)

L'episodio 1 l'ha pubblicato l'utente sul canale nuovo; il 26/11: «ok hanno scelto l'opzione B continua pure». Testo in
`data/horror/storie/13_il_testimone.md`, copione in `data/horror/il_testimone/ep2/episodio.json` (con `pausa` = secondi di silenzio dopo
ogni riga: li legge `prepara_voce.py`). Il testo l'ha approvato il 26/11 sera («vai») e solo allora si è generata la voce di Luc (una
richiesta sola, 118 secondi, 4,35 crediti: preventivo controllato prima). Le scene erano già costruite sui tempi provvisori
(`prepara_voce.py <cartella voce> ep2 --finta`); con la voce vera si sono rifatti `parole.json`, la durata (131,06 s), `bocca.json` e si
sono ricontrollate tutte le inquadrature (vedi «Sui tempi veri» qui sotto).

- **Il set** (`cast/sets/balcone.js`, acceso con `fuoriSet({ balcone: true })`; senza opzioni `fuoriSet()` resta quello dell'episodio 1,
  controllato pixel per pixel su 8 fotogrammi col codice di prima). Su ogni piano due balconi affiancati divisi da un pannello di vetro
  retinato; al quarto piano il tuo (portafinestra vera a due ante, quella di destra si apre verso l'interno: `porta` 0..1; tenda in due
  teli: `tendaScosta`; soggiorno dietro; le piante) e quello dell'appartamento vuoto (tapparella giù, cartello AFFITTASI, pianta secca,
  foglie). Tutta la facciata ha vani veri con le tapparelle a stecche. Misure in `BAL` (corrimano: asse a 1,00 m, raggio 2,1 cm, a
  z = 1,03; il divisorio a x = 6,0; soletta fino a z = 1,13: fuori dalla ringhiera restano 8-10 cm di bordo).
- **Luci di casa** (`casa: { corridoio, soggiorno }`): il lampadario del soggiorno (`LS`, con le ombre: la sagoma di chi passa cade sul
  velo della tenda), la luce che esce dalla portafinestra e corre lungo il balcone (`LD`, `luceBalcone`: fa l'ombra di chi sta sul
  balcone sul vetro del divisorio), una lama bassa radente (`LB`, `luceBassa`: passa sotto il divisorio e allunga a terra l'ombra delle
  scarpe). Le pareti del soggiorno fermano la luce (`shadowSide` doppio), se no esce dai muri.
- **Vetro e tenda che lasciano passare le sagome.** La faccia del divisorio verso il balcone vuoto e il velo della tenda hanno le
  normali girate verso la luce di casa (materiale a una faccia sola: three.js non le rigira): prendono luce e ombre che arrivano
  dall'altra parte, come un vetro smerigliato. Niente trucchi disegnati: è l'ombra vera del personaggio.
- **Pioggia**: gocce nello spazio davanti al palazzo (`pioggia3`), sgocciolio dal bordo delle solette, perle d'acqua sul corrimano del tuo
  piano. Sopra resta, leggera, la pioggia disegnata dell'episodio 1 (`pioggia`).
- **Mani sul corrimano** (`cast/sets/prese.js` + `braccia()` in `adulti.js`): un braccio può dire `sbarra: { a, b, r }` (a = estremo dal
  lato del pollice, b = dal lato del mignolo) invece di polso e direzioni. Le dita si chiudono sulla sbarra finché la toccano (`stretta`,
  calcolata una volta per raggio); il **rollio attorno alla sbarra lo sceglie il codice**, quello che lascia il polso in linea con
  l'avambraccio (prima, scelto a occhio, il polso veniva spezzato). In `ep2/film.js`: `CR(x, lato)` = un punto del corrimano davanti;
  `lato` = +1 se il pollice sta dalla parte delle x che crescono (chi guarda fuori: destra +1, sinistra −1; chi sta fuori dalla
  ringhiera e guarda il palazzo: il contrario).
- **Errore da non rifare**: con `yaw = π` la destra del personaggio (`AL`) è dalla parte delle x che CRESCONO. Messe al contrario, le
  braccia si incrociano davanti al corpo e le spalle si gonfiano (è lo stesso errore del bagagliaio dell'episodio 1).
- **Il cappotto dell'ispettore** si deforma male col braccio teso in avanti o di lato all'altezza della spalla (spalla a palla, torace
  gonfio). La mano tesa è quindi col gomito piegato e il braccio basso (`rivaSporge`, variante scelta tra quattro in `prova_balcone/`);
  il corpo si vede poco: in soggettiva sporgono testa e braccio da dietro il divisorio.
- **Camera sul viso** (`mira: { chi: 'tu' | 'riva', da: [x, y, z] }` in `esterno_set.js`): punta alla testa dovunque sia e, con `da`, sta
  a quella distanza dal viso. Evitare il profilo pieno: `da` va messo dalla parte verso cui guarda.
- **Pianerottolo**: `pianerottoloSet({ vano11: true })` ha il vano vero della porta dell'interno 11, che si socchiude con la catenella
  (`porta11`); nell'episodio 1 quella porta è DI FRONTE alla tua: per questo nel testo «porta di fronte», non «accanto».
- **Inquadrature** (`ep2/film.js`, 33): scelta votata → corridoio e viso → spioncino (va alla porta di fronte, suona, la vicina
  socchiude, lui aspetta e si volta verso di te; la luce delle scale si spegne e quando torna è più vicino) → telefono (il 112 tra le
  chiamate) → esci (l'anta resta socchiusa e dondola) → il vuoto dalla ringhiera con le tue mani, il baule dell'auto grigia → ti
  sporgi oltre il divisorio, il balcone vuoto → le mani sul corrimano, la mano che scivola, tu fuori dalla ringhiera visto dall'alto →
  i due piedi oltre il divisorio, uno dopo l'altro in un'inquadratura sola (`passoFuori`), dentro → rannicchiato dietro le sbarre → i due balconi da lontano e la
  luce che si accende → lui dietro il velo della tenda → il tuo viso → lui alla finestra della cucina → la sua ombra sul velo, l'anta
  che si apre e metà del suo viso → le scarpe sotto il divisorio con la loro ombra sul vetro → la mano sulla bocca → dita sul corrimano
  e la faccia che spunta → primo piano → i due da sotto → la mano tesa → la tua mano che stringe la tasca → le dita che chiamano → carte.
- **Laboratorio**: `prova_balcone/` (da 0 a 14 s il set da quattordici punti, con e senza luce; da 20 s le pose a tre viste).
  Fogli di provini: `provini.py ep2 t1,t2,… out/ep2/foglio.jpg 9`; i tempi delle scene con `tempi.cjs` (legge `window.TEMPI`).
- **Suoni nuovi** (CC0, in `scripts/bivio/sfx`, licenze in `licenze_suoni.json`): campanello, chiavi, serratura, chiavi nella porta,
  catenella, passi sulle piastrelle, ringhiera, finestra, vento. Scelti dal titolo e dalla forma d'onda (`analizza_suono.py` nella
  cartella di lavoro): i volumi si ricontrollano col mix vero. `ep2/mix.py` li aggancia alle stesse parole del film; la musica
  (`ep2/musica.json`) per ora è quella dell'episodio 1.
- **Il telefono** (corretto il 26/11 rileggendo il testo): quando esci lo infili in tasca (`IN_TASCA`, il telefono sparisce quando arriva alla tasca);
  da rannicchiato una mano resta sulla tasca (`SU_TASCA`: agganciata al ginocchio con `proprio: 'ginocchioS'` e tirata indietro lungo la
  coscia; con un punto fisso nel busto la mano finiva dentro la gamba) e l'altra sul ginocchio. Lui il telefono non lo vede: così la
  scelta B («gli dici che ti è già caduto di sotto») regge. Il primo piano «tasca» mostra la tua mano che la stringe.
- **Sedersi coi piedi a terra** (`gambaA` in `ep2/film.js`): mentre il bacino scende lungo il muro, anca e ginocchio si ricavano da dove
  sta il piede (due ossa, il ginocchio in avanti); il punto d'arrivo è quello della posa seduta, così non c'è scatto. Sfumando `sit` da 0
  a 1 i piedi affondavano nel pavimento e a metà strada un ginocchio restava sollevato per aria.
- **Sagome dietro la portafinestra**: da una camera dritta di fronte, a cinque metri, la testa di chi sta in fondo alla stanza finisce
  esattamente dietro i due montanti centrali e la figura sembra senza testa (ci ho perso mezz'ora a cercare un errore che non c'era).
  Queste inquadrature si fanno di sbieco, guardando attraverso un vetro. E la luce del corridoio (`LC`) sta dietro la porta, dentro il
  corridoio: davanti alla porta accendeva la testa di chi stava sulla soglia fino a farla sparire contro il muro.
- **Luci spente**: `balcone.js` rende invisibili le luci a intensità zero (le loro ombre si calcolerebbero lo stesso: a luci di casa
  spente il render va quasi il doppio più veloce).
- **Errore rifatto, e ritrovato solo guardando i provini**: un commento aggiunto in mezzo a una riga con più istruzioni si è mangiato
  `LC.intensity = …` e la luce del corridoio è rimasta spenta. In fondo a una riga un commento solo se dopo non c'è altro codice; il
  controllo: nessuna riga con `//` seguito da un'altra istruzione (lo script di ricerca è nella storia della sessione del 26/11).
- **Bozza a bassa cadenza**: `render.mjs --film <copia congelata> --fps 10 --video-only --noblur` rende tutto l'episodio in una ventina
  di minuti; poi con ffmpeg (`fps=…,scale=270:480,tile=12x1`) si tagliano strisce di una scena per guardare i movimenti.
- **La voce vera** (26/11 sera). Preventivo, generazione in un colpo solo (le righe separate da un a capo), poi `voce_esterna.py`. Su
  una voce di due minuti il riconoscimento delle parole può saltare un tratto intero (qui le righe 11-13 e la parola «tasca»): la voce è
  giusta, mancano solo i tempi. `ripara_tempi.py <cartella voce> <riga da> <riga a>` riascolta soltanto quel tratto col testo delle
  righe come suggerimento e rimette i tempi; quelle che ancora non sente le distribuisce dentro i tratti in cui c'è davvero voce. Dopo
  `prepara_voce.py`, il controllo è riascoltare la voce GIÀ montata e confrontarla col copione parola per parola
  (`controlla_voce.py <vo.wav> <episodio.json>`): 258 parole su 258.
- **Sui tempi veri** si è riguardato tutto su fogli di provini (due o tre fotogrammi per scena) e poi a grandezza piena. Trovato e corretto:
  - *L'uscita sul balcone.* Il varco dell'anta aperta è largo 60 cm. Con l'anta a metà e lui che passava spostato di lato, mezzo
    braccio finiva dentro lo stipite: da davanti si vedevano la manica, poi il muro, poi un avambraccio staccato. Sembrava un difetto
    del braccio e non lo era (nel laboratorio del corpo la stessa posa era intera). Ora l'anta si apre fin quasi ad angolo retto
    (`porta` 0,85), lui passa al centro (x = 4,78), il telo di destra della tenda si raccoglie tutto contro lo stipite mentre passa
    (`tendaLarga`, nuovo: `tendaScosta` da solo lo raccoglie solo in basso). Quando un pezzo di corpo sparisce, prima di toccare il
    personaggio si guarda la scena da più lati (`ep2_dbg/`: i collegamenti a `ep2` più un `film.json` con `"viste"`).
  - *Il telefono in tasca.* Il gomito va indietro (`gomito: [0.3, 0, -1]`), non di lato; e dal petto alla tasca la mano gira al largo
    del busto lungo una curva (`versoTasca`: Bézier con `FUORI_TASCA` come punto di controllo): in linea retta lo attraversava. Il
    telefono resta visibile finché non è alla tasca, poi il braccio torna giù con una dissolvenza (`GIU_S`), senza scatto. Le pose
    sono nel laboratorio del corpo (`prova_corpo`, dal secondo 54).
  - *Guardare oltre il divisorio.* La mano sinistra resta sul corrimano dalla sua parte: portata oltre il bordo, vista dal balcone
    vuoto sembrava un avambraccio che usciva dal pannello; e il corpo sta 10 cm più indietro (la manica bucava il pannello).
  - *Teste e sottotitoli.* I sottotitoli occupano il quinto in alto dell'immagine: in cinque inquadrature una testa ci finiva sotto
    («Ci sei.» era scritto sulla sua faccia). Si alza il punto guardato (`look`) finché gli occhi stanno sotto un terzo dell'altezza.
  - *I due piedi* erano due inquadrature da un secondo l'una: ora è una sola (prima il destro oltre il montante, poi il sinistro).
  - *Cose agganciate alla fine di una frase* che cadevano dopo il taglio: il telefono che si abbassa, lo schermo delle chiamate, la
    luce del soggiorno (ora si accende appena lui ha finito «Come un ospite.» e l'immagine si tiene mezzo secondo).
- **Il mix con la voce vera** (`ep2/mix.py`): non potendolo ascoltare, i livelli si misurano. `GREZZO=1` scrive il mix senza
  portarlo a -14 LUFS e `SENZA_VOCE=1` lascia fuori la voce: così si confronta, tratto per tratto, il volume percepito (LUFS) dei suoni
  con quello della voce (`lufs_tratti.py <file> <guadagno dB> a:b …`, `livelli.py <suoni.wav> <vo.wav> <guadagno voce dB>`). I suoni stanno tra 6 e 12 dB sotto la voce; nel
  tratto della faccia che spunta, il più carico, 5,6 (abbassati il battito del cuore, a 0,42-0,62 come nell'episodio 1, il crescendo
  e i passi sul balcone). Cercando i picchi è saltato fuori un «tic» secco a 1:09: era nella registrazione della pioggia
  (`pioggia_notte.mp3` ha colpi secchi nei primi 57 secondi, uno fortissimo a 49 s). Se ne usa solo la parte pulita, da 58 s in
  poi, in due pezzi incrociati. Vale anche per i prossimi episodi.
- **Scatti da un fotogramma** (trovati guardando il render a strisce, 30 fotogrammi al secondo: sui provini fermi non si vedono).
  Tre cause, tutte dello stesso tipo, una posa che cambia a soglia invece che a poco a poco:
  - un braccio che passa da una descrizione a un'altra (`armR: giu > 0.7 ? SU_TASCA : undefined`; la mano dell'ispettore dal
    corrimano alla mano tesa): ora un braccio può dire `k` (0..1, quanto del gesto è fatto) e `da` (la posa da cui parte; senza, il
    braccio a riposo). Polso, gomito, mano e dita sfumano (`braccia()`/`sfuma()`/`mixMano()` in `adulti.js`); vale anche per le prese
    sul corrimano (`sbarra`) e per i punti del proprio corpo (`proprio`);
  - le dita che cambiano posa di colpo (`mano: pr > 0.5 ? … : 'piatta'`): stessa cosa, `da` + `k`, e le dita si chiudono in sei decimi;
  - una camminata scritta `va > 0.01 && va < 0.99 ? passi(...) : {}`: all'ultimo fotogramma le gambe saltano da metà passo a unite
    (sulle scarpe dell'ispettore che «si fermano» si vedeva benissimo). `cammina(va, fase, amp)` in `ep2/film.js` fa crescere e
    spegnere l'ampiezza: i piedi si riuniscono da soli. Nelle altre scene il vecchio modo è rimasto dove le gambe non si vedono.
  `scatti.py <video> <secondo d'inizio>` li cerca: un fotogramma molto diverso dal precedente mentre prima e dopo cambia poco
  (i tagli di scena li elenca a parte). Va passato su ogni pezzo del render prima di unire.
- **Rifare una scena dentro un render finito, senza ricomprimere**: `render.mjs --range a:b` rende i fotogrammi da `round(a·30)` a
  `round(b·30) - 1`, e ogni fotogramma n è preso al tempo (n + 0,5)/30: una scena che comincia a t0 parte dal primo n con
  (n + 0,5)/30 ≥ t0. x264 mette un fotogramma chiave sui cambi di scena netti (non su quelli tra due immagini buie: controllare con
  `ffprobe -show_entries frame=key_frame,pts_time`); se sia l'inizio sia la fine cadono su un fotogramma chiave, il pezzo si taglia con
  `ffmpeg -c copy -f segment -segment_frames N1,N2 -reset_timestamps 1` e si riunisce con `-f concat -c copy` (conteggio dei
  fotogrammi e passo costante controllati). Se manca il fotogramma chiave, si rifà dal fotogramma chiave prima.
- **Render definitivo**: 3932 fotogrammi in quattro pezzi insieme (`--range 0:33`, `33:66`, `66:99`, `99:131.06`, un processo
  ciascuno, da una copia congelata `ep2_r`), poi uniti con ffmpeg. Le scene sul balcone con le luci di casa accese sono le più lente.

## Episodio 2, terza versione (27/11): «Interno 11», approvata con «ok»

La prima versione («La mano tesa») l'utente l'ha bocciata nella storia (la fuga votata si annullava); dopo «impara dai migliori registi»
si è riscritto tutto con le regole della sezione 5 di `data/horror/FORMATO_STORIA.md`. Copione in `data/horror/il_testimone/ep2/episodio.json`
(quello bocciato in `episodio_v1_bocciato.json`), film in `ep2/film.js` (39 inquadrature, 128,87 s), mix in `ep2/mix.py`.

- **La voce, senza rifare quella che c'era**: sei righe vengono dalla registrazione della prima versione, le altre da una richiesta nuova
  (2,7 crediti). `cuci_voce.py <cartella d'uscita> <montaggio_voce.json>` prende ogni riga dalla sua registrazione e taglia nel silenzio
  vero; può anche sostituire una parola sola con la stessa parola di un'altra registrazione (qui Luc aveva detto «baicone»: preso
  «balcone» da quella vecchia). Il punto debole per tagliare si cerca solo PRIMA dell'inizio della parola: dentro la parola c'è un'altra
  consonante (il primo taglio aveva lasciato «bai… balcone»). Poi i soliti `prepara_voce.py`, `bocca.py`, `controlla_voce.py` (212/212).
- **Set nuovi**: `vuoto.js` (l'appartamento vuoto da dentro: mobili sotto le lenzuola, la portafinestra col vetro che si rompe, la
  martellina, la porta sull'altra scala; acceso da `fuoriSet({ balcone: true, vuoto: true })`), `scala.js` (la tromba vista dall'alto,
  come in «La donna che visse due volte»), `portico.js` (il portico in strada sotto la pioggia), `ada_set.js` (il soggiorno della signora
  Ada, col pendolo) e `ada()` in `adulti.js`; `ingressoSet({ entra: true })` (la porta di casa che si apre da fuori, lui in controluce).
  Laboratori: `prova_vuoto/`, `prova_ada/` (dalla vista 8 la scheda del personaggio), `prova_set2/`.
- **Trovato sui fogli di provini e corretto** (tutto a grandezza piena prima del render):
  - *La porta che si apre da fuori.* Il muro di fondo del corridoio era un piano intero: aperta l'anta, dietro c'era il muro e lui
    spariva. Con `entra` il muro ha il vano vero. Il bagliore dello spioncino (`alOcchio`, `occhio`) e la luce che filtra da sotto
    (`lPorta`, striscia, pozza) sono della porta chiusa: a porta aperta si spengono, e resta il controluce (lui fermo sulla soglia).
  - *Il vaso preso con due mani* (`presaVaso(p, yaw, k)`): i lati sono quelli di chi lo tiene, non della scena. Con i lati fissi nel
    mondo, girato verso il palazzo, le braccia si incrociavano e le dita entravano nella terracotta. Il palmo sta sulla parete subito
    sotto il bordo, le dita avanti attorno alla pancia. Il vaso ora ha il fondo (visto da sotto era aperto).
  - *Accovacciarsi.* `bacino: { sposta }` NON esiste nel pupazzo (veniva ignorato in silenzio): si piegava in vita a gambe dritte e
    non arrivava al vaso. Per accovacciarsi: `sit` + `sedile` (l'altezza del bacino, 0,24) + `gambe` (in più aL 0,2 e gL 0,75: i piedi
    tornano sotto) + `lean` per arrivare avanti.
  - *La mano dal buco nel vetro.* Il buco sta all'altezza della martellina (`BUCO.v` 0,46), così l'avambraccio entra dritto e la mano
    la stringe di traverso: `sbarra` dal perno (lato del pollice) alla punta. La martellina gira attorno all'asse z e la mano la segue;
    l'anta si apre di poco con la mano ancora sopra (`martellina(g, an)` in `ep2/film.js` la calcola nel mondo, girata con l'anta).
  - *La bocca della paura.* Aperta con `smile` a zero sembra un sorriso (gli angoli stanno più su del centro): per la paura `smile`
    negativo (da -0,35 a -0,5) e un po' di `round`. Vale per tutti (`PAURA` in `ep2/film.js`).
  - *La pioggia disegnata* (`pioggia`) stava in tutte le scene del set di fuori, anche dentro le stanze: ora 0 al chiuso.
  - *Il «fotogramma marrone vuoto»* del passo era il vaso: dopo il vetro vola dentro e resta per terra, e la camera era lì accanto.
  - *Il tuo soggiorno* era buio dove stava lui: il lampadario illumina solo verso la portafinestra. `casa.riempi` accende una luce in
    più senza ombre e con raggio corto (2,3 m: non passa dai muri e non tocca il balcone).
  - *La luce del telefono* stava appena sopra la mano e bruciava la maglia: ora sta più su, verso la faccia.
  - *La corsa*: il ginocchio si piega quando la gamba torna avanti (`corsaVera`; la vecchia `corsa` lo piegava mentre il piede è a
    terra), le braccia piegate vanno al contrario delle gambe, il corpo si alza a metà falcata. Il percorso nella corsia libera (prima
    passava dentro l'auto rossa). `nebbia` oltre 1 (fino a 1,6) perché il palazzo sparisca davvero nella pioggia.
  - *Le teste sotto i sottotitoli* (respiri, telefono, telefonata) e la camera dietro la nuca nel viso che si gela: rifatte.
- **Suoni nuovi** (CC0, licenze in `scripts/bivio/sfx/licenze_suoni.json`): vetro, vetro_schegge, scricchiolio, maniglia,
  maniglia_finestra, corsa_scale, corsa_strada. Nel mix: la musica scende quasi a zero nei tre silenzi (l'ombra sotto la porta, lo
  scavalco, il viso che si gela: `SILENZI`); la pioggia di fuori sale e scende con dove sta la camera (`inviluppo`); il colpo del tuono
  cade insieme al vetro; il pendolo della signora Ada si sente già dentro il telefono e poi, vero, nella sua stanza. Livelli misurati
  contro la voce con `livelli.py` (i passi bagnati e la porta che cigola erano troppo forti: abbassati).
- **Render**: `--range` vuole i SECONDI, non i fotogrammi (passati i fotogrammi, tre pezzi si sono fermati subito e il primo ha reso tutto
  il film). Un processo solo usa già quasi quattro core (SwiftShader): i pezzi in parallelo servono a poco su questa macchina. Tutto il
  film in 68 minuti (le scene finali, dalla signora Ada, sono le più lente).
- **Dopo il render** `scatti.py` ha trovato un salto nella telefonata: il respiro scritto `sin(t * lerp(2.6, 5.5, pa))`. Col tempo
  assoluto (96 s) cambiare la frequenza fa correre la fase: il petto vibrava. La fase va scritta come integrale della frequenza
  (`2.6 * t + 2.9 * max(0, t - t1)`; nel respiro che rallenta `4.5 * u - 0.95 * u * k`, con u = t - inizio della scena). Rifatte le due
  scene da un fotogramma chiave all'altro e incastrate senza ricomprimere (vedi sopra).
- **Il picco dopo l'AAC**: il mix in WAV era limitato a -3,3 dB, ma nel video il colpo del tuono col vetro arrivava a 0 dB (l'AAC gonfia
  i transitori secchi). Limite a 0,68 e il vetro un po' più basso e senza le frequenze sopra 9 kHz: picco vero -0,1 dB, -14,8 LUFS.
  Si controlla sempre sul file finale (`ebur128=peak=true`), non sul WAV.
- **Il dito sulle labbra** (27/11, dopo la consegna: «mi rifai il video spostando il dito dell'ispettore sulle labbra? fallo più basso»).
  Con `DITO.a.y` 0,385 la punta toccava il naso; a 0,362 si fermava sulla riga della bocca (il dito sotto le labbra); a 0,373 il dito
  attraversa le labbra e la punta sta tra bocca e naso. Provato in `prova_ada/` (viste 9-16: quattro altezze) e poi sul fotogramma del
  film con la sua camera; rifatto il finale dal fotogramma chiave 3273 (109,1 s) alla fine e incastrato senza ricomprimere.
- **Il sorriso inquietante** (27/11 sera: «aggiungili un sorriso inquietante»). Cinque prove in `prova_ada/` (viste 17-21) con la camera
  del film: largo a labbra chiuse (sembra contento, non fa paura), a denti stretti, col mento giù e gli occhi in su (guardava sopra la
  camera). Scelto: denti stretti attorno al dito, occhi spalancati fissi in camera (`open` 1,25: con `smile` alto gli occhi si
  socchiudono come in un sorriso vero), sopracciglia appena abbassate (`angry` 0,22), mento giù (`headPitch` 0,12) e testa inclinata
  (`headRoll` 0,1): `SORRISO(k)` in `ep2/film.js`. Si allarga mentre si raddrizza e alza la mano, così il passaggio dalle labbra chiuse
  ai denti (a `grin` 0,1 e 0,3 il disegno della bocca cambia) cade dentro il movimento. Col mento giù la bocca scende di circa 1,5 cm:
  la mano va abbassata della stessa misura (`DITO.a` 0,357), se no la punta torna sul naso.

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
