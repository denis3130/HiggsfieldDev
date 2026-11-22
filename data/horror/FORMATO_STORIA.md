# IL BIVIO — bibbia della serie (formato obbligatorio per ogni storia)

Serie horror/thriller interattiva per Short di YouTube, in italiano. Ogni storia = 8 episodi da 50–60 secondi.
Alla fine di ogni episodio il pubblico sceglie A o B nei commenti; l'episodio dopo segue la scelta più votata.
Obiettivo: qualità da cinema. Chi scorre deve fermarsi nei primi 2 secondi e voler vedere l'episodio dopo.

## 1. Voce
- Una sola voce: il narratore. Seconda persona singolare, presente («Apri gli occhi. È notte.»).
- Anche le battute e le urla del protagonista le dice il narratore, dentro la narrazione; le urla in MAIUSCOLO
  (es. «Gridi con tutte le tue forze: SONO QUI! SONO QUI, AIUTO!»). Le frasi degli altri le riferisce lui tra «».
- Frasi brevi, italiano parlato, concreto. Niente spiegoni: una rivelazione per episodio.
- Lettura lenta (2,4 parole al secondo): ogni episodio pubblicato ha 100–125 parole in tutto, bivio compreso.

## 2. Immagini: si deve vedere ogni cosa
- Ogni battuta del narratore ha la sua inquadratura, e l'inquadratura mostra esattamente quello che la voce dice
  (se dice «la gamba fasciata ti brucia» si vede la gamba fasciata; se dice «l'erba bagnata ti fa scivolare» si vede lo scarpone che scivola sull'erba bagnata).
- 11–15 inquadrature per episodio, una ogni 3–5 secondi. Al massimo 2 inquadrature senza voce (solo suono), per dare respiro.
- Linguaggio da film: soggettiva (POV), dettagli ravvicinati, campi lunghi, lenti avanzamenti, luce motivata (torcia, luna, lanterna, schermo). Scrivi sempre cosa si vede, da dove, come si muove la camera e che luce c'è.
- Il protagonista è chi guarda: si vede in soggettiva (mani, gambe, ombra) o di spalle/in silhouette. Mai il volto.
- Scheda visiva: vestiti e oggetti del protagonista, luoghi, colori e motivi ricorrenti descritti una volta e ripetuti identici, così le immagini restano coerenti.
- Le immagini le genera un modello open-source in locale e poi vengono animate col codice (movimenti di camera, nebbia, pioggia, luci che tremano, grana). Preferisci ambienti, oggetti, dettagli, sagome; evita folle, volti in primo piano e mani complicate.
- Testo leggibile (messaggi sul telefono, biglietti, cartelli, scritte): non farlo generare al modello. Scrivilo nella colonna «Si vede» come TESTO A SCHERMO: «…»: lo aggiungiamo in montaggio su schermo o foglio vuoto.

## 3. Suono
- Per ogni inquadratura i suoni reali che servono (passi sulle foglie, colpi alla porta, vibrazione, respiro, pioggia…): useremo registrazioni vere da librerie libere.
- Indica l'ambiente di fondo e i momenti di silenzio totale. La musica la sceglie l'utente.

## 4. Struttura
- Ep. 1: nessun ramo. Ep. 2–7: due aperture (se ha vinto A / se ha vinto B) e poi una parte comune uguale per tutti (struttura a rombo: la storia resta una sola). Ep. 7 finisce con la scelta finale. Ep. 8: due finali completi (Finale A e Finale B), senza altre scelte.
- Ogni apertura comincia con «Avete scelto A: …» (o B) in poche parole: fa anche da riassunto per chi arriva adesso.
- Parole: Ep. 1 = 100–125. Ep. 2–7: apertura 30–40 + parte comune 70–85 (bivio compreso). Ep. 8: ogni finale 100–125.
- Ogni episodio: gancio nei primi 2 secondi → una scoperta → la minaccia cresce → colpo finale + bivio.
- Il bivio è un vero dilemma: due scelte entrambe difendibili, da 50 e 50, su cui la gente litiga nei commenti. Etichette di massimo 5 parole. Ogni scelta cambia davvero l'apertura dell'episodio dopo.
- Chiusura degli Ep. 1–7: «Cosa fai? A: … B: … Scrivilo nei commenti.»
- Una scelta può portare a una morte: l'episodio dopo la mostra in poche righe, poi «riavvolge» e riparte dall'altra scelta. Massimo una volta per storia.
- Colpo di scena finale preparato da almeno 3 indizi visibili negli episodi precedenti. I due finali devono essere entrambi soddisfacenti e l'ultima immagine deve richiamare la prima.
- Ambientazione italiana (luoghi credibili, anche inventati).
- Adatto a YouTube senza limiti di età: paura suggerita, niente sangue esplicito, violenza grafica, autolesionismo, sesso, marchi, persone reali o personaggi protetti.

## 5. Struttura del file (markdown)
# <Titolo>
**Logline** · **Ambientazione** · **La verità** (cosa succede davvero, regole del mistero, colpo di scena) · **Indizi** (dove sono seminati) · **Perché funziona**
## Scheda visiva
## Mappa dei bivi
## Episodio N — <titolo>
**Titolo YouTube:** … #horror #storiehorror #shorts
Ep. 2–7: **Apertura se ha vinto A**, **Apertura se ha vinto B**, **Parte comune**. Ep. 8: **Finale A**, **Finale B**.
Ogni parte è una tabella: `| # | Voce | Si vede | Suono |`
**Bivio:** A: … / B: … · **Immagine A / Immagine B** (le due metà della scheda di scelta)
**Parole:** apertura A n · apertura B n · comune n
Solo per l'Episodio 1 aggiungi **Prompt immagini (inglese)**: un prompt per inquadratura, con lo stesso suffisso di stile per tutte.
