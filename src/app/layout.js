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
      <body className="antialiased bg-light">
        <BootstrapLoader /> {/* 👈 Load Bootstrap JS only on client */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark p-3">
          <div className="container-fluid">
            <a className="navbar-brand" href="/">Berko TNF</a>
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
                  <a className="nav-link active" href="/">Home</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="/admin">Admin</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        <main className="container my-4">
          {children}
        </main>
      </body>
    </html>
  );
}
