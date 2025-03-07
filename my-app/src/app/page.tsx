'use client';

export default function Home() {
  return (
    <div className="container py-5">
      <main className="row justify-content-center">
        <div className="col-12 col-md-8 text-center">
          <img
            src="/next.svg"
            alt="Next.js logo"
            width="180"
            height="38"
            className="img-fluid"
          />
          
          <div className="mt-4">
            <ol className="list-group list-group-numbered">
              <li className="list-group-item border-0">
                Get started by editing{" "}
                <code className="bg-light px-2 py-1 rounded">
                  src/app/page.tsx
                </code>
              </li>
              <li className="list-group-item border-0">
                Save and see your changes instantly.
              </li>
            </ol>
          </div>

          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
            <a
              className="btn btn-dark"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/vercel.svg"
                alt="Vercel logomark"
                width="20"
                height="20"
                className="me-2"
              />
              Deploy now
            </a>
            <a
              className="btn btn-outline-dark"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our docs
            </a>
          </div>
        </div>
      </main>

      <footer className="row justify-content-center mt-5">
        <div className="col-12 text-center">
          <div className="d-flex justify-content-center gap-4 flex-wrap">
            <a
              className="text-decoration-none text-dark d-flex align-items-center"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/file.svg"
                alt="File icon"
                width="16"
                height="16"
                className="me-2"
              />
              Learn
            </a>
            <a
              className="text-decoration-none text-dark d-flex align-items-center"
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/window.svg"
                alt="Window icon"
                width="16"
                height="16"
                className="me-2"
              />
              Examples
            </a>
            <a
              className="text-decoration-none text-dark d-flex align-items-center"
              href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/globe.svg"
                alt="Globe icon"
                width="16"
                height="16"
                className="me-2"
              />
              Go to nextjs.org →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
