# Glofox Auto Klient

Skrypt Tampermonkey dla Glofox, ktory automatycznie wybiera wskazanego klienta
w koszyku (np. "Sigma Sklep Lebork").

## Wymagania

- Przegladarka: Chrome / Edge / Firefox.
- Rozszerzenie Tampermonkey.

## Instalacja Tampermonkey

1. Wejdz na strone rozszerzenia Tampermonkey dla swojej przegladarki.
2. Zainstaluj i wlacz rozszerzenie.
3. Otworz panel Tampermonkey (ikona w pasku narzedzi).

## Instalacja skryptu

1. W Tampermonkey kliknij "Create a new script".
2. Usun domyslna zawartosc edytora.
3. Wklej zawartosc pliku:
   - `Glofox Cart - Auto Client Selector (Stable)-1.0.user.js`
4. Zapisz skrypt (Ctrl+S).
5. Upewnij sie, ze skrypt jest wlaczony na liscie Tampermonkey.

## Uzycie

1. Zaloguj sie do `https://app.glofox.com/`.
2. Przejdz do koszyka.
3. Skrypt otworzy modal wyboru klienta, wyszuka klienta i wybierze go
   automatycznie, jesli jeszcze nie jest wybrany.

## Konfiguracja

W pliku skryptu mozesz dostosowac:

- `CLIENT_NAME` - pelna nazwa klienta do wybrania.
- `CLIENT_QUERY` - tekst wpisywany do wyszukiwarki w modalu.
- Selektory UI, jesli Glofox je zmieni (np. `SELECT_CLIENT_BUTTON_SELECTOR`,
  `MODAL_SELECTOR`, `INPUT_SELECTOR`).

## Lista zmiennych konfigurowalnych

- `CLIENT_NAME` - pelna nazwa klienta (np. `"Sigma Sklep Lebork"`).
- `CLIENT_QUERY` - fraza wyszukiwania wpisywana w polu.
- `CART_HASH` - fragment adresu koszyka (domyslnie `"/cart"`).
- `SELECT_CLIENT_BUTTON_SELECTOR` - selektor przycisku wyboru klienta.
- `MODAL_SELECTOR` - selektor modala wyboru klienta.
- `INPUT_SELECTOR` - selektor pola wyszukiwania.
- `RESULT_ITEM_SELECTOR` - selektor wynikow na liscie.
- `RESULT_NAME_SELECTOR` - selektor nazwy klienta w liscie.
- `SELECTED_CLIENT_NAME_SELECTOR` - selektor aktualnie wybranego klienta.

## Przyklad konfiguracji

```js
const CLIENT_NAME = "Sigma Sklep Lebork";
const CLIENT_QUERY = "sigma sklep lebork";
```

## Rozwiazywanie problemow

- Jesli klient nie jest wybierany, upewnij sie, ze:
  - Skrypt jest wlaczony w Tampermonkey.
  - Jestes na stronie koszyka w Glofox.
  - `CLIENT_NAME` i `CLIENT_QUERY` pasuja do nazwy klienta.
- W przypadku zmian w interfejsie Glofox moze byc potrzebna aktualizacja
  selektorow w skrypcie.
