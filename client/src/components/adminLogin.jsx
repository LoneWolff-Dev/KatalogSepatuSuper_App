import { useState } from "react";
import { loginAdmin, setAdminToken } from "../services/api.js";

// Renders the dedicated store-admin login screen.
function AdminLogin({ onAuthenticated }) {
  const [email, setEmail] = useState("admin@sepatusuper.id");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Submits administrator credentials and enters the protected workspace.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await loginAdmin({ email, password });
      setAdminToken(session.token, rememberMe);
      onAuthenticated();
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Toggles password visibility while keeping the entered value unchanged.
  function togglePasswordVisibility() {
    setPasswordVisible((visible) => !visible);
  }

  return (
    <main className="adminLoginPage">
      <header className="loginMobileHeader">
        <a className="brand-lockup" href="/">
          <span className="brand-mark">
            <img src="/images/figma/icons/brand-mark.svg" alt="" />
          </span>
          <span>SEPATU SUPER</span>
        </a>
        <a href="/" aria-label="Kembali ke katalog">
          <img src="/images/figma/icons/chevron-left.svg" alt="" />
        </a>
      </header>
      <section className="loginPhotoPanel">
        <img
          className="loginPhotoImage"
          src="/images/figma/login-sneaker-lifestyle.png"
          alt=""
        />
        <p className="loginPhotoOverline"><span /> LANGKAH BESAR DIMULAI DI SINI.</p>
        <div className="loginPhotoShade" />
        <div className="loginPhotoCopy">
          <h1>Koleksi siap.<br />Kendali di tanganmu.</h1>
          <span>
            Di balik setiap langkah pelanggan, ada koleksi yang Anda siapkan dengan
            sepenuh hati.
          </span>
          <footer>
            <strong>SEPATU SUPER / EST. 2020</strong>
            <small>EVERYDAY, ELEVATED.</small>
          </footer>
        </div>
      </section>
      <section className="loginFormPanel">
        <p className="loginPortalLabel">
          <img src="/images/figma/icons/shield-check.svg" alt="" />
          Portal khusus admin
        </p>
        <div className="loginFormCard">
          <a className="brand-lockup" href="/">
            <span className="brand-mark">
              <img src="/images/figma/icons/brand-mark.svg" alt="" />
            </span>
            <span>SEPATU SUPER</span>
          </a>
          <h2>Selamat datang kembali.</h2>
          <p>Kelola koleksi, rapikan stok, dan siapkan pasangan berikutnya untuk pelanggan Anda.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="adminEmail">Email</label>
            <input
              id="adminEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <label htmlFor="adminPassword">Password</label>
            <div className="passwordField">
              <input
                id="adminPassword"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={passwordVisible ? "Sembunyikan password" : "Tampilkan password"}
              >
                {passwordVisible ? "Sembunyikan" : "Lihat"}
                <img src="/images/figma/icons/eye-off.svg" alt="" />
              </button>
            </div>
            <div className="loginOptions">
              <label>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Ingat saya
              </label>
              <a href="mailto:admin@sepatusuper.id?subject=Bantuan%20login%20admin">
                Lupa password?
              </a>
            </div>
            {error && <p className="loginError" role="alert">{error}</p>}
            <button type="submit" className="loginSubmitButton" disabled={submitting}>
              {submitting ? "Memeriksa..." : "Masuk Dashboard"}
            </button>
          </form>
          <p className="loginSupport">
            Kesulitan masuk? <a href="mailto:admin@sepatusuper.id">Hubungi tim IT</a>
          </p>
        </div>
        <footer className="loginCopyright">
          © {new Date().getFullYear()} Sepatu Super. Seluruh hak dilindungi.
        </footer>
      </section>
    </main>
  );
}

export default AdminLogin;
