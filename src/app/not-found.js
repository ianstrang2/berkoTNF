export default function NotFound() {
  return (
    <div className="container text-center py-5">
      <h1 className="display-4">404 - Page Not Found</h1>
      <p className="lead">Sorry, we couldn't find the page you're looking for.</p>
      <a href="/" className="btn btn-primary mt-3">
        Return Home
      </a>
    </div>
  );
}
