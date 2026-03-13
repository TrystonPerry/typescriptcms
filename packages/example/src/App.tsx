import { useCmsContent } from "./cms";

export default function App() {
  const home = useCmsContent("home");

  return (
    <main className="canvas">
      <article className="card" style={{ background: String(home.cardColor) }}>
        <h1>{String(home.title)}</h1>
        <p>{String(home.description)}</p>
        <dl>
          <div>
            <dt>Author</dt>
            <dd>{String(home.author)}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{String(home.version)}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{String(home.license)}</dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
