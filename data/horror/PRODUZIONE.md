# Il Bivio — come si produce un episodio (tutto gratis, su questa macchina)

Stato al 22/11: storia 01 scritta; episodio 1 in produzione. Niente Higgsfield.

## Immagini: FLUX.1-schnell in locale (OpenVINO int4, solo CPU)
- `pip install openvino-genai` (porta openvino e openvino-tokenizers), poi il modello `OpenVINO/FLUX.1-schnell-int4-ov` da Hugging Face (8,7 GB; licenza Apache 2.0, uso commerciale consentito).
- `scripts/bivio/flux_locale.py lavori.json`: carica i pezzi del modello uno alla volta (prima T5 e CLIP, poi il transformer), altrimenti 15 GB di RAM non bastano. Variabile `FLUX_DIR` = cartella del modello.
- Tempi misurati (4 vCPU Xeon, 15 GB): 576×1024, 4 passi, circa 3 minuti a immagine; RAM massima 14 GB. Non lanciare altro di pesante insieme (Whisper, montaggi): rischio di blocco per memoria.
- Qualità: da film, buio e nebbia vengono molto bene. Il testo leggibile non va chiesto al modello: si aggiunge in montaggio.

## Voce
- `scripts/bivio/voce.py cartella_episodio`: narratore Kokoro `im_nicola` (in `scripts/guida_short.py` c'è lo scaricamento del modello), urlo reso più acuto, forte e asciutto, voce del bosco piano e ovattata, tempi parola per parola con Whisper + testo esatto del copione.
- `episodio.json`: una riga per inquadratura (voce, immagine, movimento, schermo del telefono, scelta finale).

## Suoni
- Registrazioni vere CC0 da Freesound, cercate con l'API di Openverse (`api.openverse.org`, file su `cdn.freesound.org`; scaricare con curl senza user agent da browser). Licenze da annotare per ogni file.
- Musica: la sceglie l'utente; in attesa, solo ambiente scuro CC0.

## Montaggio (da fare per l'episodio 1)
1. Profondità di ogni immagine (Depth-Anything piccolo, ONNX) e movimento di camera 2,5D: avanzare, arretrare, panoramica, camera a mano.
2. Strati sopra: nebbia che scorre, fiato bianco dalle cavità, grana, vignettatura, sfarfallio; per la prima inquadratura le palpebre che si aprono.
3. Schermi del telefono disegnati col codice (ora 03:17, batteria 3%, messaggio).
4. Sottotitoli parola per parola, titolo della serie nei primi 2 secondi, scheda finale A/B.
5. Mix: voce + suoni reali + ambiente; silenzio totale dopo il grido (a Valsorda non c'è eco).
