import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px" }}>
      <h1>ESA Housekeeping</h1>
      <p>
        <Link href="/housekeeping">Open the housekeeping board</Link>
      </p>
      <form method="post" action="/api/logout">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
