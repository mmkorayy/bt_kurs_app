# GEMINI.md

Bu dosya, bu depoda çalışırken Antigravity asistanına rehberlik etmek için oluşturulmuştur.

## Ana Kural ve Referans

Bu projenin (Bookpal) tüm mimari kararları, iş akışları, kodlama kuralları, tasarım prensipleri ve komutları **[CLAUDE.md](./CLAUDE.md)** dosyasında tanımlanmıştır.

Antigravity olarak:
- Projeyle ilgili herhangi bir kural, yönerge veya standart kontrolü yapman gerektiğinde ana referans kaynağın daima `CLAUDE.md` dosyasıdır.
- `CLAUDE.md` içindeki tüm kurallara (özellikle `.env` dosyalarına dokunmama/okumama, Türkçe kullanıcı arayüzü dili, test odaklı geliştirme, Git dalı/PR kuralları ve izin verilen kütüphaneler) birebir uyulmalıdır.

## Kısa Proje Özeti

- **Proje:** Bookpal (birebir danışan gören uzmanlar için danışan ve randevu takip uygulaması).
- **Ön Yüz (`frontend/`):** React 19, TypeScript, Vite, Vitest, düz CSS.
- **Arka Yüz (`backend/`):** Node.js, Express 5, Neon PostgreSQL (`pg`, düz SQL) veya `DATABASE_URL` yoksa bellek içi (in-memory) depolama.
- **Detaylı Bilgi ve Kurallar:** Lütfen [CLAUDE.md](./CLAUDE.md) dosyasını inceleyin.
