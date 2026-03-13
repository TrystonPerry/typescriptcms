<template>
  <main class="page-shell home">
    <section class="panel hero">
      <p class="eyebrow">TypeSafe Content</p>
      <h1>TypeScript CMS Admin</h1>
      <p>
        Connect GitHub, select a repository, choose your CMS folder, and edit
        `.config.json` specs on <span class="monospace">/editor</span>.
      </p>
      <router-link class="btn btn-primary" to="/editor">Open Admin</router-link>
    </section>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.hero {
  width: min(780px, 100%);
  padding: 2.5rem;
}

.hero h1 {
  margin-top: 0.35rem;
  margin-bottom: 0.8rem;
  font-size: clamp(2rem, 4vw, 3rem);
}

.hero p {
  line-height: 1.55;
  color: var(--subtle);
}

.eyebrow {
  margin: 0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9d5f2b;
}

.btn {
  display: inline-block;
  margin-top: 1rem;
  text-decoration: none;
}
</style>
