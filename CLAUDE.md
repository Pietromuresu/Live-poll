# CLAUDE.md

## Il progetto
Sistema di votazione dal vivo, stile Mentimeter.

- L'host, dalla pagina `/admin`, crea un poll con una domanda e 2-6 opzioni di risposta.
  Il sistema genera un codice di sessione (`session_key`) da condividere con i partecipanti.
- Il partecipante arriva sulla pagina principale `/`, inserisce il codice di sessione e un
  nickname (univoco all'interno del poll), risponde alla domanda e invia il voto.
  Fino all'invio può cambiare scelta; dopo l'invio il voto è definitivo.
- Il partecipante vede i risultati solo dopo aver votato.
- L'host vede in tempo reale il numero di partecipanti e i risultati, e può chiudere la
  votazione rendendo definitivo il risultato.
- Tutto avviene senza ricaricare la pagina: aggiornamenti in tempo reale tramite polling.
- Esiste un solo host e non c'è autenticazione: `/admin` mostra e gestisce tutti i poll
  presenti nel database, da qualsiasi browser.
- Il partecipante salva nel localStorage del browser i dati per riprendere la sessione.

## Stack
- Backend: ASP.NET Core Razor Pages (.NET).
- Frontend: pagine Razor con CSS e JavaScript puri. Niente Bootstrap, jQuery o framework JS.
- Database: SQLite con Entity Framework Core, file in `App_Data/`.
- Nessun servizio esterno: tutto gira in locale nel processo dell'applicazione.

## Schema del database
Tabelle e colonne in snake_case.

- `polls`: `id`, `session_key` (6 caratteri, unique), `slug` (unique), `question`,
  `created_at`, `closed_at` (nullable; null = poll aperto).
  Lo slug è la domanda normalizzata + `-` + `session_key`; generato alla creazione, non cambia mai.
- `options`: `id`, `poll_id` (FK → polls), `text`. Ordine di visualizzazione = ordine per `id`.
- `participants`: `id`, `poll_id` (FK → polls), `nickname`,
  `option_id` (FK → options, nullable; null = non ha ancora votato).
  Unique su (`poll_id`, `nickname`).

I risultati non sono salvati: si calcolano contando i partecipanti per `option_id`.

## Regole di dominio
- Poll e opzioni si creano in un'unica chiamata. Dopo il salvataggio non si modificano:
  l'unica modifica ammessa è la chiusura (valorizzare `closed_at`).
- Un partecipante che rientra con un nickname già presente nel poll è considerato la
  stessa persona e riprende la sua partecipazione.
- Il voto è unico e definitivo. Non si vota su un poll chiuso.

## API REST
Il poll è sempre identificato dallo `slug`.

| Azione | Endpoint |
|---|---|
| Crea poll con opzioni | `POST /api/polls` |
| Elenco poll | `GET /api/polls` |
| Domanda e opzioni | `GET /api/polls/{slug}` |
| Elimina poll | `DELETE /api/polls/{slug}` |
| Chiudi poll | `POST /api/polls/{slug}/close` |
| Stato per l'host (polling) | `GET /api/polls/{slug}/status` |
| Trova poll dal codice | `GET /api/polls/by-key/{session_key}` |
| Verifica nickname | `GET /api/polls/{slug}/participants/{nickname}` |
| Entra (crea se non esiste) | `POST /api/polls/{slug}/participants` |
| Vota | `POST /api/polls/{slug}/votes` |
| Risultati partecipante (polling) | `GET /api/polls/{slug}/results?nickname=...` |

## Comandi
- Build: `dotnet build`
- Avvio: `dotnet run`
- Nuova migrazione: `dotnet ef migrations add <Nome>` (dotnet-ef è un tool locale).
  Le migrazioni vengono applicate all'avvio da `Database.Migrate()`. Non usare `EnsureCreated`.

## Regole di lavoro
- Il progetto procede a piccoli step concordati. Fai solo ciò che lo step richiede.
- Non aggiungere entità, colonne, vincoli, dipendenze o funzionalità non richieste.
  Se pensi che servano, proponile alla fine invece di implementarle.
- Le scelte di design vengono prese insieme: in caso di dubbio chiedi, non decidere da solo.
- Alla fine di ogni step: `dotnet build` senza errori e un breve riepilogo dei file
  creati, modificati ed eliminati.