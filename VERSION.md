# Versione progetto

## v0.9.0-rc.1

**Data:** 29 agosto 2026  
**Canale:** Release Candidate  
**Stato:** collaudo operativo finale prima della `v1.0.0`

---

## Obiettivo della release

Questa versione rappresenta il primo pacchetto funzionalmente completo del portale e del gestionale operativo del **2° Campo di Formazione Residenziale CRI Puglia – “La Rotta della Formazione”**.

La release è destinata ai test finali con dati simulati prima dell’importazione dei dati reali del Campo.

---

## Funzionalità incluse

### Portale pubblico

- Home e informazioni generali;
- corsi;
- programma;
- logistica;
- segreteria;
- dove siamo;
- contatti;
- bando;
- FAQ.

### Area Riservata Operativa

- autenticazione Supabase;
- ruoli Admin, Segreteria, Sola lettura e Cucina;
- assegnazione postazioni tramite Realtime Presence;
- Panoramica;
- Persone;
- Accredito;
- Turni;
- Alloggi;
- Pasti;
- Mezzi;
- Situazione Campo;
- Coordinamento;
- Import Master;
- strumenti Amministrazione.

### Anagrafica e persone

- tipologie multiple;
- qualifiche;
- aree di servizio;
- corsi;
- contatti;
- ICE;
- pernottamento;
- badge e gadget;
- QR personale;
- esigenze alimentari;
- movimenti Entrata/Uscita.

### Accredito

- verifica dati importati;
- riepilogo dati essenziali;
- visualizzazione alloggio;
- visualizzazione allergie/intolleranze;
- badge/gadget/QR;
- stato Accredito persistente separato dalla presenza;
- conferma accredito con registrazione automatica dell’ingresso;
- successiva gestione Entrata/Uscita indipendente.

### QR

- QR personale;
- Entrata/Uscita tramite scansione;
- utilizzo in Cucina;
- stampa singola;
- stampa massiva;
- formato etichetta verticale;
- storico stampe.

### Turni

- creazione e gestione turni;
- disponibilità;
- assegnazione;
- conferma;
- rinuncia;
- assenza;
- aggiornamento rapido degli stati.

### Alloggi

- tende;
- posti letto;
- posti ordinari ed emergenza;
- assegnazioni;
- destinazioni alloggio;
- gestione Faculty.

### Pasti / Cucina

- servizi Colazione, Pranzo e Cena;
- ticket individuali;
- pasti automatici per periodo di permanenza;
- eccezioni puntuali;
- esigenze alimentari;
- dashboard giornaliera Cucina;
- consumo ticket da QR;
- tre postazioni Cucina simultanee.

### Mezzi

- anagrafica mezzi;
- attivazioni;
- autisti principali e secondari;
- entrata/uscita mezzi;
- sincronizzazione operativa.

### Import Master

- file Excel unico;
- controllo preventivo;
- anagrafiche;
- corsi;
- turni;
- pasti;
- mezzi;
- alloggi;
- qualifiche;
- aree;
- esigenze alimentari;
- audit delle righe importate.

### Coordinamento

- situazione giornaliera;
- criticità operative;
- priorità e stato criticità;
- passaggi consegne;
- nota ufficiale della giornata;
- report giornaliero stampabile.

### Amministrazione

- Centro di amministrazione a sezioni;
- checklist preparazione Campo;
- apertura/chiusura giornata operativa;
- collaudo Realtime;
- backup JSON;
- diagnostica gestionale;
- reset completo pre-Campo.

---

## Modifiche rilevanti più recenti

- introdotto stato **Accreditato** persistente e separato da **Presente/Fuori**;
- nuovo flusso Accredito V2;
- conferma accredito con salvataggio + QR + ingresso automatico + chiusura popup;
- Entrata/Uscita mantenute come operazioni successive indipendenti;
- visualizzazione immediata di alloggio ed esigenze alimentari durante l’accredito;
- corretto collegamento del modulo **Import Master** dalla Panoramica;
- importazione delle esigenze alimentari dal Master;
- introdotto reset pre-Campo completo dei dati di test;
- QR adesivo ridisegnato in formato verticale;
- consolidata la stabilità dell’interfaccia evitando observer DOM globali ricorsivi.

---

## Stato del collaudo

Da completare prima della `v1.0.0`:

- [ ] Import Master completo con 0 errori;
- [ ] verifica dati nel popup Accredito;
- [ ] conferma accredito con chiusura automatica popup;
- [ ] verifica permanenza dello stato Accreditato dopo un’uscita;
- [ ] Entrata/Uscita manuale dalla pagina Persone;
- [ ] Entrata/Uscita tramite QR;
- [ ] stampa QR singola e massiva su stampante reale;
- [ ] verifica alloggi e posti letto;
- [ ] verifica ticket e postazioni Cucina;
- [ ] verifica Turni;
- [ ] verifica Mezzi;
- [ ] collaudo Realtime multi-postazione;
- [ ] Diagnostica gestionale senza errori;
- [ ] Backup operativo finale;
- [ ] Reset test e importazione Master definitivo.

---

## Criterio per v1.0.0

La versione potrà essere promossa a **v1.0.0 – Stable** quando il flusso completo sarà stato collaudato su più postazioni e saranno terminati i test con dati simulati.

La `v1.0.0` sarà quindi la versione destinata all’utilizzo operativo reale durante il Campo.

---

## Versioning

Il progetto segue una convenzione compatibile con Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

Esempi:

- `0.9.0-rc.1` → Release Candidate pre-produzione;
- `1.0.0` → prima release operativa stabile;
- `1.0.1` → correzione bug senza variazioni strutturali;
- `1.1.0` → nuove funzionalità compatibili;
- `2.0.0` → revisione architetturale o modifica incompatibile importante.
