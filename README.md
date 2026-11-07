# Bookpal

Danışan ve randevu takibi (öğrenme projesi). Giriş yapıp günlük, haftalık ve aylık randevuları ve danışanları görürsün.

## Çalıştırma

Terminalde sırayla (npm yoksa aşağıdaki komutlar `node` ile çalışır):

**1. Ön yüzü derle** (ön yüz kodu değişince tekrar):

```bash
cd frontend
node node_modules/vite/bin/vite.js build
```

**2. Sunucuyu başlat:**

```bash
cd ../backend
node --env-file-if-exists=.env --import tsx src/server.ts
```

**3. Tarayıcıda aç:** http://localhost:3000

Durdurmak için terminalde `Ctrl+C`. Sunucu kodu değişince Ctrl+C ile durdurup 2. adımı tekrar çalıştır.

## Kullanılan teknolojiler

- **Diller:** TypeScript (ön yüz ve backend), SQL (veritabanı tabloları), CSS ve HTML.
- **Ön yüz (`frontend/`):** React 19 (ekranlar), Vite (derleme), react-router (sayfalar arası geçiş), Vitest + Testing Library (testler), düz CSS.
- **Backend (`backend/`):** Node.js 24 ve Express 5 (web sunucusu), `pg` (PostgreSQL ile konuşur, düz SQL, ORM yok), Swagger UI (`/docs` API belgeleri), Node'un kendi test aracı + tsx (testler).
- **Veritabanı:** Neon (ücretsiz bulut PostgreSQL). `DATABASE_URL` boşsa veriler bellekte tutulur.
- **Yayın:** Render (ücretsiz web servisi, geçici test sitesi). GitHub'daki `main` dalından derlenir.
- **Araçlar:** Git ve GitHub, Claude Code (superpowers eklentisi).
- Backend, derlenmiş ön yüzü de sunar: tek sunucu tüm siteyi verir.

## Demo giriş

| Kullanıcı | E-posta | Parola |
|---|---|---|
| Elif | `elif@bookpal.demo` | `demo-elif-123` |
| Mert | `mert@bookpal.demo` | `demo-mert-123` |

## Canlı test sitesi

https://bookpal.onrender.com (Render'ın ücretsiz planı, geçici test için; yukarıdaki demo girişle açılır). 15 dakika kimse girmezse uyur, ilk açılış yaklaşık 1 dakika sürür. Kurulum adımları: `docs/render-deploy-guide.md`.

## Veritabanı

- `backend/.env` yoksa veriler bellekte tutulur (sunucu kapanınca silinir).
- `backend/.env` içinde `DATABASE_URL` varsa veriler Neon'da kalıcı olur. Şablon: `backend/.env.example`. İlk kurulumda tabloları kur: `cd backend && node --env-file-if-exists=.env --import tsx scripts/migrate.ts`.
- Bağlantıyı denemek için: `node --env-file-if-exists=.env --import tsx scripts/db-check.ts` (`backend/` içinde).

## Testler

```bash
cd frontend && node node_modules/vitest/vitest.mjs run
cd backend && node --import tsx --test "src/**/*.test.ts"
```

API belgeleri sunucu çalışırken: http://localhost:3000/docs
