# wybornie.org - backend
To repozytorium zawiera kod działający po stronie serwera strony wybornie.org.
Odpowiada za trzy zadania:
- collector.js - pobieranie danych z http://sejm.gov.pl (http://sejm.gov.pl/Sejm8.nsf/page.xsp/przeglad_projust)
- database.js - przechowywanie danych
- server.js - udostępnianie zasobów w sieci w formie REST API

## API:
**Uwaga**: serwer został przeniesiony na Heroku - używany jest plan darmowy, więc może być, że trzeba będzie czekać około 20 sekund, aż serwer się obudzi przed pierwszym zapytaniem.

publiczny dostęp: https://sejmor.herokuapp.com/dev/

### dostępne zasoby:

- [glosowania/](https://sejmor.herokuapp.com/dev/glosowania/)
zwraca wszystkie dostępne głosowania, wraz z odpowiadającymi im projektami ustaw (jedno głosowanie może rozpatrywać kilka projektów ustaw jednocześnie), bez szczegółowych informacji (brak listy posłów z ich głosami)
- [projekty/](https://sejmor.herokuapp.com/dev/projekty/)
zwraca wszystkie dostępne projekty ustaw
- [glosowania/:kadencja](https://sejmor.herokuapp.com/dev/glosowania/8)
zwraca wszystkie dostępne głosowania z danej kadencji
- [glosowania/:kadencja/:posiedzenie:glosowanie](https://sejmor.herokuapp.com/dev/glosowania/8/62/13)

przykładowe zapytanie https://sejmor.herokuapp.com/dev/glosowania/8/62/13
