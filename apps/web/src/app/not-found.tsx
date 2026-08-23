import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-page">
      <p className="eyebrow">404 / Not found</p>
      <h1>This review frame does not exist.</h1>
      <Link className="primary-button" href="/projects">
        Return to projects
      </Link>
    </main>
  );
}
