# wybornie.org - backend
To repozytorium zawiera kod działający po stronie serwera strony wybornie.org.
Odpowiada za trzy zadania:
- collector.js - pobieranie danych z sejm.gov.pl
- database.js - przechowywanie danych
- server.js - udostępnianie zasobów w sieci w formie REST API

REST:
http://wybornie.org:3000/dev/projekty
http://wybornie.org:3000/dev/projekty/:nrDruku np. http://wybornie.org:3000/dev/projekty/1677

TODO:
- [ ] powtarzanie sprawdzania/pobierania danych z sejm.gov.pl codziennie
- [ ] selekcja pozytywna - konta dla kandydatów na posłów, by umożliwić zapoznanie się z poglądami ludzi poza parlamentem
- [ ] pobieranie kadencji 7
- [x] link do druku PDF
