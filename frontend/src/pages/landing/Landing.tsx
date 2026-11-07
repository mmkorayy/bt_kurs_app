import { Link } from 'react-router';
import './Landing.css';
import { SignupForm } from './SignupForm';

export function Landing() {
  return (
    <div className="landing">
      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-logo">
                Book<span>pal</span>
              </p>
              <h1>Randevularını ve danışanlarını tek yerde takip et</h1>
              <p className="landing-slogan">Not defteri ve mesaj kovalamak yok.</p>
              <a className="landing-cta" href="#early-access">
                Erken erişim için kaydol
              </a>
            </div>

            <div className="landing-preview" role="img" aria-label="Bookpal uygulama önizlemesi">
              <div aria-hidden="true">
                <div className="landing-preview-bar">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="landing-preview-body">
                  <div className="landing-week">
                    <div>
                      <p className="landing-day-name">Pzt</p>
                      <p className="landing-appt landing-appt-selected">10:00 Elif</p>
                    </div>
                    <div>
                      <p className="landing-day-name">Sal</p>
                      <p className="landing-appt">14:00 Mert</p>
                    </div>
                    <div>
                      <p className="landing-day-name">Çar</p>
                      <p className="landing-appt">11:30 Selin</p>
                      <p className="landing-appt">16:00 Can</p>
                    </div>
                  </div>
                  <div className="landing-client-card">
                    <p className="landing-client-name">Elif</p>
                    <p className="landing-client-meta">Son randevu: Pzt 10:00</p>
                    <p className="landing-client-note">Not: Uyku düzeni üzerine konuştuk.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem-solution">
          <div className="landing-container">
            <h2>Danışan takibi neden bu kadar dağınık?</h2>
            <div className="landing-grid">
              <div className="landing-card">
                <h3>Sorun</h3>
                <ul>
                  <li>Dağınık not defterleri ve dosyalar</li>
                  <li>Mesajlarda randevu kovalamak</li>
                  <li>Unutulan danışan notları</li>
                </ul>
              </div>
              <div className="landing-card">
                <h3>Çözüm</h3>
                <p>
                  Bookpal'da takvimin ve her danışanın geçmişi tek yerde durur. Randevuya bakarken notu da görürsün.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works">
          <div className="landing-container">
            <h2>Nasıl çalışır?</h2>
            <div className="landing-grid">
              <div className="landing-card">
                <span className="landing-step-number">1</span>
                <h3>Müsait saatlerini belirle</h3>
                <p>Çalışabileceğin gün ve saatleri bir kez girersin.</p>
              </div>
              <div className="landing-card">
                <span className="landing-step-number">2</span>
                <h3>Danışanların randevu alsın</h3>
                <p>Danışanların sana uygun saatlerden birini seçer.</p>
              </div>
              <div className="landing-card">
                <span className="landing-step-number">3</span>
                <h3>Notları ve geçmişi tek yerden takip et</h3>
                <p>Her görüşmeden sonra notunu yaz, bir sonraki randevuda hemen bul.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="early-access">
          <div className="landing-container landing-form-wrap">
            <h2>Erken erişim için kaydol</h2>
            <p className="landing-form-intro">
              Bookpal'ı ilk deneyenlerden biri ol. Bilgilerini bırak, hazır olunca haber verelim.
            </p>
            <SignupForm />
          </div>
        </section>
      </main>

      <footer>
        <div className="landing-container landing-footer-inner">
          <p>© 2026 Bookpal</p>
          <p>Randevularını ve danışanlarını tek yerde takip et.</p>
          <nav aria-label="Sayfa bölümleri">
            <a href="#problem-solution">Sorun ve çözüm</a>
            <a href="#how-it-works">Nasıl çalışır</a>
            <a href="#early-access">Erken erişim</a>
            <Link to="/giris">Giriş</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
