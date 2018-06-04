# wybornie.org - backend
To repozytorium zawiera kod działający po stronie serwera strony wybornie.org.
Odpowiada za trzy zadania:
- collector.js - pobieranie danych z sejm.gov.pl
- database.js - przechowywanie danych
- server.js - udostępnianie zasobów w sieci w formie REST API

## API:
publiczny dostęp: http://89.69.164.147:3000/dev/

### dostępne zasoby:

- [glosowania/](http://89.69.164.147:3000/dev/glosowania/)
zwraca wszystkie dostępne głosowania, wraz z odpowiadającymi im projektami ustaw (jedno głosowanie może rozpatrywać kilka projektów ustaw jednocześnie), bez szczegółowych informacji (brak listy posłów z ich głosami)
- [projekty/](http://89.69.164.147:3000/dev/projekty/)
zwraca wszystkie dostępne projekty ustaw
- [glosowania/:kadencja](http://89.69.164.147:3000/dev/glosowania/8)
zwraca wszystkie dostępne głosowania z danej kadencji
- [glosowania/:kadencja/:posiedzenie:glosowanie](http://89.69.164.147:3000/dev/glosowania/8/62/13)

przykładowe zapytanie http://89.69.164.147:3000/dev/glosowania/8/62/13
