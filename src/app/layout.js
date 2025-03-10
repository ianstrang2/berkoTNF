import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import BootstrapLoader from "./bootstrap"; 

export const metadata = {
  title: "Berko TNF Stats",
  description: "The Home of Thursday Night Football",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body>
        <BootstrapLoader />
        <nav className="navbar navbar-expand-lg p-3">
          <div className="container-fluid">
            <a className="navbar-brand neon-text" href="/">BERKO TNF</a>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <a className="nav-link neon-text" href="/">HOME</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link neon-text" href="/admin">ADMIN</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        <main className="container my-4" style={{ paddingBottom: '80px' }}>
          {children}
        </main>

        <footer>
          <div className="container">
            © {new Date().getFullYear()} BERKO TNF - ALL RIGHTS RESERVED
          </div>
        </footer>
      </body>
    </html>
  );
}
