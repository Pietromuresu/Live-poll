# Live Poll
### Prova tecnica per Dendoo

## Stack 
- Backend: .NET
- Frontend: Razor
- Database: SQLlite

## Funzionamento 


### Flusso di base

#### Host: 
1. Host crea un poll con domanda
2. Riceve una session key da fornire ai partecipanti 
3. Visualizza in tempo reale i risultati e numero di partecipanti connessi 
4. Chiude il sondaggio e vede i risultati definitivi

#### Partecipanti: 
1. Ricevono il codice di autenticazione
2. Arrivano in "/" e immettono nickname e session_key(codice dello step 1)
3. Rispondono alla domanda
4. Vedono la pagina dei risultati con un testo per attendere la chiusura del sondaggio 
5. Alla chiusura del sondaggio vede i risultati delle risposte


## Avvio del programma

dotnet run --urls http://localhost:5080

## Decisioni implementative 

- Modifica e richiesta dei dati con API questo permette di eseguire un polling ed aggiornare i dati in tempo reale 
- Aggiornamento dal vivo
     - Polling VS websocket 
          - In questo aso è stato scelto il polling per velocità di esecuzione (2h di tempo)
- Persistenza  
     - SQLlite per avere un implementazione veloce e averlo in locale 
- Riconoscimento partecipante
     Nel localstorage vengono salvate le credenziali in 
     livepoll.participations	{"session_key":"nickname"}
- Con altre due ore si potrebbe iniziare a creare una gestione multi-tenant dividento anche gli host. Quindi servirebbe la gestione di autenticazione. Si potrebbe anche pensare ad un sistema di password per il partecipante in modo che possa continuare il sondaggio anche da dispositivi diversi. 
- Limiti: 
     1. Possibilità di continuare il poll da altri dispositivi con lo stesso nome utente
     2. per via del problema 1 il numero dei partecipanti potrebbe non essere corretto perchè banalmente se uno cambia dispositivo o nome resta un partecipante "orfano" 
     3. Non preso in considerazione sicurezza del polling implementato. 


## Endpoints
 
POST /api/polls
Body: { question, options: [string] }
Validazione: domanda non vuota; da 2 a 6 opzioni, tutte non vuote (trim).
Genera un session_key di 6 caratteri alfanumerici maiuscoli, univoco
(rigenera in caso di collisione), e lo slug. Salva poll e opzioni insieme.
201 con { slug, sessionKey, question, options: [{ id, text }] }. 400 se non valido.

GET /api/polls
Elenco di tutti i poll, dal più recente:
{ slug, sessionKey, question, createdAt, closedAt, participantCount }.

GET /api/polls/{slug}
{ slug, question, isClosed, options: [{ id, text }] } (opzioni ordinate per id).
404 se non esiste.

DELETE /api/polls/{slug}
Elimina il poll con opzioni e partecipanti. 204, 404 se non esiste.

POST /api/polls/{slug}/close
Valorizza closed_at. 200 con lo stato aggiornato; 409 se già chiuso; 404.

GET /api/polls/{slug}/status
{ isClosed, participantCount, voteCount,
results: [{ optionId, text, count }] } (tutte le opzioni, anche con 0 voti).
404 se non esiste.

GET /api/polls/by-key/{sessionKey}
Ricerca senza distinzione tra maiuscole e minuscole.
{ slug, question, isClosed }. 404 se non esiste.

GET /api/polls/{slug}/participants/{nickname}
200 con { nickname, hasVoted } se esiste; 404 se il nickname è libero.

POST /api/polls/{slug}/participants
Body: { nickname } (trim, non vuoto).
Se il nickname esiste già nel poll: 200 con { nickname, hasVoted }.
Altrimenti lo crea: 201 con { nickname, hasVoted: false }.
404 se il poll non esiste.

POST /api/polls/{slug}/votes
Body: { nickname, optionId }
404 se poll o partecipante non esistono; 409 se il poll è chiuso;
400 se l'opzione non appartiene al poll; 409 se il partecipante ha già votato.
Salva option_id. 200 con gli stessi risultati di /status.

GET /api/polls/{slug}/results?nickname=...
404 se poll o partecipante non esistono; 403 se il partecipante non ha
ancora votato. Altrimenti stessa risposta di /status.

Gli errori restituiscono { error: "messaggio" } con il codice HTTP indicato.