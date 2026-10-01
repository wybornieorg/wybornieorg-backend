# wybornie.org — backend

Kod działający po stronie serwera strony [wybornie.org](https://wybornie.org).
Odpowiada za trzy zadania:

- `collector.js` — pobieranie danych z sejm.gov.pl (przegląd projektów ustaw)
- `database.js` — warstwa danych (Sequelize + SQLite)
- `server.js` — udostępnianie zasobów jako REST API (Koa)

## Wymagania

- Node.js **>= 18** (testowane na Node 26)
- `npm`

## Instalacja

```bash
npm install
```

> **Uwaga:** `npm >= 11` domyślnie blokuje skrypty instalacyjne pakietów.
> `sqlite3` potrzebuje swojego skryptu, żeby pobrać natywne binarium (N-API).
> Plik `.npmrc` w tym repo już dodaje `sqlite3` do listy dozwolonych, więc
> `npm install` działa od razu. Gdyby bindy brakowało:
> `npm rebuild sqlite3`.

## Uruchomienie

```bash
npm start          # sam serwer API (bez pobierania danych)
npm run collect     # serwer + kolektor (COLLECT=1)
npm run dev         # serwer z auto-restartem (node --watch)
```

Zmienne środowiskowe:

| Zmienna     | Domyślnie        | Opis                                              |
| ----------- | ---------------- | ------------------------------------------------- |
| `PORT`      | `3000`           | port HTTP                                         |
| `DB_PATH`   | `./wybornie.sqlite` | ścieżka do bazy danych                        |
| `COLLECT`   | *(wyłączone)*    | `1` włącza cykliczne pobieranie danych z Sejmu    |

Kolektor jest domyślnie **wyłączony** — API startuje natychmiast i serwuje to,
co jest już w bazie. Włącz go jawnie (`npm run collect`), jeśli chcesz
odświeżać dane.

## Baza danych

`wybornie.sqlite` jest trzymana w **git-lfs** (`*.sqlite filter=lfs`).
Rozmiar ok. 81 MB, w środku m.in. ~3300 projektów i ~3200 głosowań z kadencji 3–9.

Tabele: `projects`, `votings`, `mpws` (MamPrawoWiedziec), `nazwas` (nazwy zwyczajowe).

> `mpws` i `nazwas` są w obecnej bazie **puste** — ich źródła (serwis
> mamprawowiedziec.pl oraz tablica Trello z nazwami zwyczajowymi) przestały
> działać. Aplikacja radzi sobie z tym (te sekcje po prostu się nie pokazują).

## API

| Endpoint | Opis |
| --- | --- |
| `GET /dev/status` | status kolektora (czy trwa synchronizacja) |
| `GET /dev/projekty` | wszystkie projekty ustaw |
| `GET /dev/kadencje` | lista kadencji obecnych w bazie |
| `GET /dev/glosowania` | wszystkie głosowania (bez szczegółów posłów) |
| `GET /dev/glosowania/:kadencja` | głosowania z danej kadencji |
| `GET /dev/glosowania/:kadencja/:posiedzenie/:glosowanie` | jedno głosowanie z listą posłów |
| `GET /dev/glosowaniaBulk/:list` | wiele głosowań naraz (`:list` = base64 z JSON‑owej tablicy `["9/61/57", ...]`) |
| `GET /dev/mamprawowiedziec` | artykuły MamPrawoWiedziec |
| `GET /dev/nazwyzwyczajowe` | nazwy zwyczajowe projektów |

Przykład:

```bash
curl http://localhost:3000/dev/glosowania/9/61/57
```

## Kolektor i źródło danych

Kolektor korzysta z **oficjalnego API Sejmu** (`api.sejm.gov.pl`) — patrz
`sejm-api.js`.

Dlaczego nie scraping: po redesignie sejm.gov.pl (2023) strony z wynikami
głosowań są renderowane po stronie klienta, więc danych po prostu **nie ma w
HTML-u**. Stary scraper nie jest w stanie pobrać nowych kadencji.

Zbierany zakres to **jedno decydujące głosowanie na projekt** (`topic`
zawierający „całość projektu”) — taki sam zakres, jaki wcześniej dawała strona
`przeglad_projust`. Dzięki temu w bazie nie lądują tysiące głosowań
proceduralnych.

Które kadencje pobierać, ustawia się w `collector.js`:

```js
const TERMS = [10];   // API obsługuje obecnie kadencje 9 i 10
```

Kolektor:

- ma timeout na żądanie i ponawia próby przy błędach sieciowych,
- **nigdy nie wywala procesu** — błędy są logowane i pomijane,
- jest wywoływany tylko gdy `COLLECT=1`,
- pomija głosowania, które już są w bazie (klucz: kadencja/posiedzenie/głosowanie).

## Znane niedoskonałości (do ewentualnej poprawy)

- `opis` projektu z API wymaga osobnego zapytania na każdy projekt
  (`/processes/{nr}`), więc na razie pole zostaje puste.
- `status` projektu to uproszczone `uchwalono`/`odrzucony` na podstawie pola
  `passed` z API — brak stanu „przed III czytaniem”.
