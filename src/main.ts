import "./style.css";
import home from "./cms/home";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div class="card">
    <h1 class="gradient-text">${home.title}</h1>
    <p class="description">${home.description}</p>
    <div class="info-grid">
      <div>
        <span class="label">Author:</span>
        <span class="value">${home.author}</span>
      </div>
      <div>
        <span class="label">Version:</span>
        <span class="value">${home.version}</span>
      </div>
      <div>
        <span class="label">License:</span>
        <span class="license-badge">${home.license}</span>
      </div>
    </div>
  </div>
  <style>
    .card {
      padding: 2.5em 2em;
      background: ${home.cardColor};
      border-radius: 1.25em;
      box-shadow: 0 6px 32px 0 #0009;
      color: #f3f7fa;
      max-width: 420px;
      margin: 4em auto 0 auto;
      text-align: center;
      font-family: 'Inter', Arial, sans-serif;
    }
    .gradient-text {
      background: linear-gradient(90deg, #65dfc9 30%, #6cdbeb 70%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.6em;
      letter-spacing: 2px;
    }
    .description {
      font-size: 1.15rem;
      color: #e4f1fa;
      margin-bottom: 2em;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.75em;
      margin-top: 1em;
    }
    .label {
      font-weight: 600;
      color: #79c2fa;
      margin-right: 0.6em;
    }
    .value {
      color: #ebfaf7;
      font-size: 1rem;
    }
    .license-badge {
      padding: 0.25em 0.7em;
      border-radius: 12px;
      background: #63e6be;
      color: #194848;
      font-weight: bold;
      font-size: 0.9rem;
      letter-spacing: 1px;
      margin-left: 0.45em;
      vertical-align: middle;
      display: inline-block;
      box-shadow: 0 2px 6px rgba(54,222,184,0.26);
    }
  </style>
`;
