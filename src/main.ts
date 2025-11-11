import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter.ts";

import home from "./cms/home.ts";

home.license;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>${home.title}</h1>
  <p>${home.description}</p>
  <p>${home.author}</p>
  <p>${home.version}</p>
  <p>${home.license}</p>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);
