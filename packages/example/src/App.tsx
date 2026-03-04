import { useEffect, useState } from "react";

import homeContent from "./cms/home";
import { applyPreviewOverlay } from "./preview";

type HomeContent = typeof homeContent;

export default function App() {
  const [home, setHome] = useState<HomeContent>(homeContent);

  useEffect(() => {
    let cancelled = false;

    void applyPreviewOverlay({
      base: homeContent,
      configPath: "src/cms/home.config.json",
    }).then((next) => {
      if (!cancelled) {
        setHome(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
