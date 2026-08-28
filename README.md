# Campo Scuola CRI Puglia 2026

Portale pubblico e gestionale operativo per il **2° Campo di Formazione Residenziale CRI Puglia – “La Rotta della Formazione”**.

**Versione attuale:** `v0.9.0-rc.1`  
**Stato:** Release Candidate – collaudo operativo finale  
**Periodo attività:** 16–30 settembre 2026  
**Sede:** Base Logistica Addestrativa del Comando Militare Esercito “Puglia”, Fesca – Bari-Palese

> Il progetto è progettato per supportare segreteria, accreditamento, logistica, turni, alloggi, pasti, mezzi, coordinamento e attività di cucina attraverso una base dati condivisa e sincronizzata in tempo reale.

---

## Struttura del progetto

Il repository comprende due aree principali:

### Portale pubblico

Informazioni per partecipanti, volontari e personale coinvolto nel Campo:

- presentazione del Campo;
- corsi e attività formative;
- programma;
- logistica e pernottamento;
- segreteria;
- informazioni per raggiungere la sede;
- contatti;
- bando e FAQ.

### Area Riservata Operativa

Gestionale multi-postazione dedicato al personale autorizzato.

Moduli principali:

- **Panoramica** – indicatori generali del Campo;
- **Persone** – anagrafica unica e scheda individuale;
- **Accredito** – verifica dati, badge, gadget, QR, alloggio e conferma accredito;
- **Turni** – disponibilità, assegnazioni e stati rapidi;
- **Alloggi** – tende, posti letto e assegnazioni;
- **Pasti** – ticket individuali e previsioni cucina;
- **Mezzi** – mezzi, attivazioni, autisti e movimenti;
- **Situazione** – quadro sintetico della situazione del Campo;
- **Coordinamento** – criticità, passaggi consegne e note operative;
- **Import Master** – importazione completa dei dati da Excel;
- **Amministrazione** – diagnostica, backup, collaudo Realtime, preparazione Campo e reset pre-Campo.

---

## Flusso Accredito

L’accredito iniziale è separato dalla semplice presenza al Campo.

Flusso previsto:

1. ricerca della persona nella pagina **Accredito**;
2. apertura del popup **Apri accredito**;
3. controllo immediato dei dati principali;
4. visualizzazione di alloggio, tenda/posto letto ed eventuali allergie o intolleranze;
5. verifica dei dati provenienti dal Master/Excel;
6. eventuale apertura della scheda completa;
7. gestione numero badge, badge consegnato, gadget e QR;
8. **Conferma accredito**;
9. salvataggio automatico dei dati;
10. registrazione automatica dell’entrata;
11. chiusura del popup e passaggio alla persona successiva.

Una persona già accreditata mantiene lo stato di **Accreditato** anche quando successivamente esce dal Campo.

Le normali **Entrate/Uscite** possono quindi essere gestite separatamente dalla pagina **Persone**, manualmente o tramite QR.

---

## QR personale

Ogni persona può disporre di un QR personale utilizzato per:

- identificazione rapida;
- registrazione entrata/uscita;
- gestione ticket pasto dalla postazione Cucina;
- stampa di etichette adesive verticali per badge;
- stampa singola o massiva.

Il sistema mantiene anche lo storico operativo delle stampe QR.

---

## Import Master Excel

Il gestionale supporta un file Master `.xlsx` con le seguenti schede:

- `01_PERSONE`
- `02_CORSI`
- `03_TURNI`
- `04_PASTI`
- `05_MEZZI`

La scheda `01_PERSONE` è quella principale. Le altre possono rimanere vuote quando non necessarie, ma devono essere presenti nel file.

Il sistema esegue prima una **verifica completa senza scrivere dati** e consente l’importazione solo quando la struttura è valida.

Il Master può gestire, tra gli altri:

- anagrafiche;
- tipologie persona;
- corsi e ruoli;
- qualifiche;
- aree di servizio;
- pernottamento;
- tende e posti letto;
- esigenze alimentari;
- ticket pasto;
- turni;
- mezzi e autisti.

---

## Cucina

Account e postazioni dedicate:

- Cucina 1
- Cucina 2
- Cucina 3

La postazione Cucina può:

- cercare una persona;
- scansionare il QR personale;
- vedere eventuali esigenze alimentari;
- controllare i ticket previsti;
- registrare l’utilizzo di colazione, pranzo e cena;
- consultare i conteggi giornalieri.

L’accesso è limitato ai soli dati necessari all’attività di cucina.

---

## Ruoli applicativi

Ruoli previsti:

| Ruolo | Funzione |
|---|---|
| `admin` | configurazione, supervisione, diagnostica, backup e strumenti amministrativi |
| `segreteria` | gestione operativa completa del Campo |
| `sola_lettura` | consultazione senza operazioni di modifica |
| `cucina` | gestione pasti tramite interfaccia dedicata |

Le postazioni operative sono assegnate tramite Supabase Realtime Presence per ridurre il rischio che due operatori occupino contemporaneamente la stessa postazione.

---

## Architettura

Frontend:

- HTML5;
- CSS;
- JavaScript vanilla;
- GitHub Pages.

Backend:

- Supabase;
- PostgreSQL;
- Supabase Auth;
- Row Level Security;
- RPC PostgreSQL;
- Supabase Realtime.

Il frontend utilizza esclusivamente credenziali pubblicabili compatibili con RLS. **Non devono essere inserite nel repository chiavi `service_role`, password o altri segreti amministrativi.**

---

## Database e script SQL

Gli script di configurazione e migrazione sono contenuti nella cartella:

```text
supabase/
```

Tra gli script principali sono presenti configurazioni per:

- Realtime;
- import Master;
- turni;
- giornata operativa;
- coordinamento;
- stampa QR;
- reset amministrativo/pre-Campo;
- accredito definitivo.

Gli script devono essere eseguiti nel **SQL Editor di Supabase** seguendo l’ordine previsto durante l’installazione o l’aggiornamento del progetto.

---

## Reset pre-Campo

L’area Amministrazione comprende la funzione **Svuota gestionale**, pensata per eliminare tutti i dati generati durante i collaudi prima dell’avvio reale.

Il reset elimina i dati operativi e di test, compresi:

- persone;
- accrediti e movimenti;
- turni;
- pasti;
- alloggi assegnati;
- mezzi e movimenti;
- importazioni;
- storico stampe QR;
- giornate operative;
- criticità;
- passaggi consegne;
- log dei test.

Vengono mantenute le configurazioni strutturali necessarie al funzionamento del gestionale.

> Operazione irreversibile: eseguire sempre un backup prima di un reset in ambiente reale.

---

## Backup e diagnostica

L’account Admin dispone di strumenti per:

- esportare un backup operativo JSON;
- eseguire diagnostica dei principali moduli e delle tabelle;
- collaudare Supabase Realtime;
- verificare la preparazione del Campo attraverso una checklist;
- gestire apertura e chiusura della giornata operativa.

---

## Esecuzione locale

Il progetto è un sito statico. Per evitare problemi legati a `file://`, utilizzare un web server locale.

Esempio con Python:

```bash
python -m http.server 8080
```

Poi aprire:

```text
http://localhost:8080/
```

---

## Deploy

Il deploy avviene tramite **GitHub Pages** dal branch `main`.

Portale:

```text
https://gecriwebsites.github.io/campo-scuola-cri-puglia/
```

Dopo un aggiornamento possono essere necessari alcuni minuti prima della propagazione. Durante i collaudi del frontend può essere utile eseguire un hard refresh del browser (`Ctrl+F5`).

---

## Stato del progetto

La release corrente è una **Release Candidate**.

Prima della `v1.0.0` devono essere completati:

- collaudo completo del flusso Accredito;
- prova Entrata/Uscita manuale e QR;
- importazione Master completa senza errori;
- prova stampa QR sulla stampante definitiva;
- verifica Cucina multi-postazione;
- diagnostica finale;
- backup pre-apertura.

Vedere [`VERSION.md`](VERSION.md) per i dettagli della release corrente.

---

## Manutenzione

Per preservare la stabilità operativa:

- preferire modifiche piccole e isolate;
- evitare observer DOM globali o ricorsivi;
- mantenere separate le logiche di Accredito e Presenza;
- verificare sempre il comportamento multi-postazione;
- eseguire backup prima di modifiche al database;
- non introdurre credenziali sensibili nel frontend.

---

## Progetto

**Campo Scuola CRI Puglia 2026**  
Portale informativo e gestionale operativo realizzato per il supporto alle attività del 2° Campo di Formazione Residenziale CRI Puglia.
