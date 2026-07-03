# ⚡ Real-Time Communicator

Kompleksowa i nowoczesna aplikacja do natychmiastowej komunikacji zespołowej. Projekt ten to zaawansowane rozwiązanie typu *real-time*, oferujące pełnoprawne pokoje rozmów (kanały), prywatne konwersacje, zagnieżdżone wątki, system reakcji oraz przesyłanie plików. 

Całość została zaprojektowana z naciskiem na wysoką wydajność, bezpieczeństwo i wzorową organizację kodu przy wykorzystaniu architektury **Monorepo**.

---

## 🏗 Architektura Systemu

Aplikacja została zbudowana jako **Monorepo** zarządzane przez [Nx](https://nx.dev/), co pozwala na współdzielenie kodu, typów oraz konfiguracji pomiędzy różnymi częściami systemu, a także optymalizuje proces budowania i testowania (dzięki buforowaniu zapytań lokalnych i w chmurze).

Struktura dzieli się na logiczne moduły:
- 💻 **`apps/frontend`** – Aplikacja kliencka budowana w oparciu o React i Next.js.
- ⚙️ **`apps/backend`** – Wysokowydajny serwer API zbudowany na platformie Fastify.
- 🗄️ **`libs/database`** – Scentralizowane zarządzanie warstwą danych (schematy Prisma, migracje, seedy).
- 🧩 **`libs/shared-types`** – Współdzielone interfejsy i typy TypeScript, gwarantujące pełne bezpieczeństwo typowania (End-to-End Type Safety) pomiędzy klientem a serwerem.

---

## 🚀 Wykorzystane Technologie

### 🌐 Frontend (Client-Side)
- **[Next.js](https://nextjs.org/) & [React 19](https://react.dev/)**: Renderowanie interfejsu użytkownika z wykorzystaniem najnowszych wzorców Reacta.
- **[TanStack Query (React Query)](https://tanstack.com/query/latest)**: Zaawansowane zarządzanie asynchronicznym stanem serwera, cachowanie zapytań, refetching i optymistyczne aktualizacje interfejsu (Optimistic UI).
- **[Zustand](https://zustand-demo.pmnd.rs/)**: Lekki, niesamowicie szybki i pozbawiony zbędnego boilerplate'u menedżer globalnego stanu UI (np. trzymanie stanu połączenia WebSocket).
- **[Tailwind CSS](https://tailwindcss.com/)**: Nowoczesne, narzędziowe podejście do stylowania aplikacji, pozwalające na błyskawiczne budowanie responsywnych interfejsów (w tym pełne wsparcie dla Dark Mode).
- **[React Markdown](https://github.com/remarkjs/react-markdown)**: Wsparcie dla formatowania Rich Text w wiadomościach z ochroną przed atakami XSS (rehype-sanitize).

### 🛠 Backend (Server-Side)
- **[Fastify](https://fastify.dev/)**: Jeden z najszybszych frameworków webowych dla Node.js. Użyty do obsługi REST API z naciskiem na niskie opóźnienia i wysoką przepustowość.
- **[Prisma ORM](https://www.prisma.io/)**: Nowoczesny ORM dla Node.js, oferujący w pełni typowane zapytania do bazy danych, co całkowicie eliminuje błędy związane z niedopasowaniem typów.
- **[PostgreSQL](https://www.postgresql.org/)**: Potężna, relacyjna baza danych wykorzystywana jako główne źródło prawdy (Single Source of Truth).
- **Autentykacja**: Zabezpieczenie endpointów przy użyciu JSON Web Tokens (JWT) trzymanych w bezpiecznych ciasteczkach (httpOnly cookies) oraz szyfrowanie haseł algorytmem Argon2.

### ⚡ Silnik Real-Time (WebSockets)
- **[Socket.IO](https://socket.io/)**: Sercem aplikacji jest dwukierunkowa, oparta na zdarzeniach komunikacja pomiędzy klientem a serwerem. 
  - Architektura oparta o *Pokoje (Rooms)*: Klienci nasłuchują tylko tych zdarzeń, które ich dotyczą (np. aktywny kanał lub prywatna konwersacja), co drastycznie oszczędza transfer i zasoby.
  - Zdarzenia na żywo (Event-driven): Natychmiastowe wypychanie (push) nowych wiadomości, odpowiedzi w wątkach, dodawania/usuwania reakcji emoji bez konieczności odświeżania strony (Long Polling / WebSockets).

---

## ✨ Zaimplementowane Funkcjonalności

- 🔐 **Bezpieczna Autentykacja**: Rejestracja, logowanie i zarządzanie sesją użytkownika.
- 💬 **Kanały Tekstowe**: Tworzenie przestrzeni do pracy zespołowej i błyskawiczna komunikacja.
- 👤 **Wiadomości Prywatne (DMs)**: Bezpośrednie konwersacje jeden-na-jeden z systemem dedykowanych powiadomień na żywo.
- 🧵 **Zagnieżdżone Wątki**: Odpowiadanie na konkretne wiadomości z bocznego panelu (Thread Sidebar), pozwalające na utrzymanie porządku na głównym czacie.
- 📎 **Załączniki i Pliki**: Możliwość wgrywania obrazów i plików, podgląd wbudowany prosto w oknie czatu.
- 😊 **Reakcje Emoji**: Dodawanie i usuwanie reakcji pod postami innych użytkowników (zliczanie i wyświetlanie unikalnych kliknięć).
- 🟢 **Statusy Obecności**: (Wkrótce) Śledzenie kto jest aktualnie online dzięki połączeniom WebSocket.

---

## 🛠 Uruchomienie lokalne

### Wymagania
- Node.js (v20+)
- pnpm (v10+)
- Docker & Docker Compose

### Kroki instalacji i uruchomienia

1. **Uruchomienie infrastruktury (baza danych PostgreSQL)**
   Wymagany jest włączony Docker. Aplikacja automatycznie skonfiguruje kontener bazy danych:
   ```bash
   docker compose up -d
   ```

2. **Zbudowanie schematu Prismy i migracje**
   Zsynchronizuj strukturę bazy danych i wygeneruj w pełni typowanego klienta Prisma:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
   *(Opcjonalnie) Uruchom graficzny panel bazy danych:* `pnpm db:studio`

3. **Uruchomienie aplikacji (Backend & Frontend)**
   Projekt wykorzystuje Nx, co pozwala na wygodne zarządzanie wieloma środowiskami.

   Uruchom serwer API:
   ```bash
   npx nx serve backend
   ```

   Uruchom aplikację kliencką (w nowym oknie terminala):
   ```bash
   npx nx serve frontend
   ```

   **Skrót (uruchomienie obu naraz):**
   ```bash
   npx nx run-many --target=serve --projects=backend,frontend --parallel
   ```

---

## 🔧 Zmienne Środowiskowe

Kluczowa konfiguracja znajduje się w pliku `.env` w głównym katalogu projektu:
```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/slack_db?schema=public"
```

## 🧪 Testowanie i CI/CD
Aplikacja jest przystosowana do Continuous Integration (CI). Posiada zdefiniowane procedury sprawdzające (ESLint), testy jednostkowe (Jest) oraz testy End-to-End (E2E) dla całych środowisk pisane w **Playwright**, które automatycznie weryfikują działanie serwerów w kontrolowanych warunkach (GitHub Actions).
