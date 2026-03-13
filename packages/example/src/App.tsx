import { useState } from "react";
import { useCmsContent } from "./cms";
import { useCmsPage } from "./cms/pages";
import type { ComponentRegistry } from "./cms/components";
import PageHero from "./components/PageHero";
import SplitSection from "./components/SplitSection";
import CtaSection from "./components/CtaSection";

const components: Record<keyof ComponentRegistry, React.ComponentType<any>> = {
  PageHero,
  SplitSection,
  CtaSection,
};

export default function App() {
  const [view, setView] = useState<"home" | "about">("home");

  return (
    <>
      <nav className="nav">
        <button onClick={() => setView("home")} data-active={view === "home"}>
          Home (useCmsContent)
        </button>
        <button onClick={() => setView("about")} data-active={view === "about"}>
          About (useCmsPage)
        </button>
      </nav>

      {view === "home" ? <HomeView /> : <AboutView />}
    </>
  );
}

function HomeView() {
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

function AboutView() {
  const page = useCmsPage("about");

  return (
    <main>
      {page.sections.map((section, i) => {
        const Component = components[section.component];
        return <Component key={i} {...section.props} />;
      })}
    </main>
  );
}
