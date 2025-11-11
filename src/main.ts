import "./style.css";

import home from "./cms/home";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <h1>${home.title}</h1>
  <p>${home.description}</p>
  <p>${home.author}</p>
  <p>${home.version}</p>
  <p>${home.license}</p>
`;
