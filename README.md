# Real-Time Communicator

Nowoczesna aplikacja do komunikacji w czasie rzeczywistym, oferująca pokoje rozmów (kanały), wiadomości prywatne, wątki i wiele innych, zbudowana w oparciu o architekturę Monorepo (Nx).

## 🚀 Technologie
- **Frontend**: React, Next.js, TailwindCSS, React Query, Zustand, Socket.io-client
- **Backend**: Fastify, Prisma, PostgreSQL, Socket.io
- **Monorepo**: Nx
- **Narzędzia**: Docker (baza danych)

## 📦 Struktura Projektu
- `apps/frontend` - Aplikacja kliencka
- `apps/backend` - Serwer API
- `libs/database` - Modele Prismy, schematy bazy danych i migracje
- `libs/shared-types` - Współdzielone typy TypeScript pomiędzy frontendem i backendem

## 🛠️ Uruchomienie lokalne

### Wymagania
- Node.js (v20+)
- pnpm (v10+)
- Docker & Docker Compose

### Kroki

1. **Uruchomienie bazy danych (PostgreSQL)**
   ```bash
   docker compose up -d
   ```

2. **Zbudowanie schematu Prismy i migracje**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
   *Podgląd i edycja danych w bazie: `pnpm db:studio`*

3. **Uruchomienie aplikacji (Backend & Frontend)**
   Projekt wykorzystuje Nx. Aby uruchomić poszczególne aplikacje:

   Terminal 1 (Backend):
   ```bash
   npx nx serve backend
   ```

   Terminal 2 (Frontend):
   ```bash
   npx nx serve frontend
   ```

   *Lub oba na raz:*
   ```bash
   npx nx run-many --target=serve --projects=backend,frontend --parallel
   ```

## 📝 Zaimplementowane funkcjonalności
- Autentykacja (zapis/logowanie/wylogowywanie)
- Kanały tekstowe (tworzenie, dołączanie, wiadomości w czasie rzeczywistym)
- Wiadomości prywatne (Direct Messages) pomiędzy użytkownikami
- Wątki (odpowiadanie na konkretną wiadomość) - kanały i DM
- Obsługa załączników (zdjęcia/pliki)
- Reakcje pod wiadomościami (emoji)
- Statusy obecności (socket.io)

## 🔧 Zmienne środowiskowe
Projekt korzysta z jednego pliku `.env` w głównym katalogu, który zawiera m.in.:
```env
DATABASE_URL="postgresql://admin:password123@localhost:5432/slack_db?schema=public"
```

## 📄 Licencja
MIT
