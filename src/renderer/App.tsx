const App = () => {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Piles</p>
        <h1>Spatial file organization without filesystem churn.</h1>
        <p className="lede">
          Wave 1 is scaffolded. Shared contracts now live in code, and the app
          shell is ready for folder access, persistence, and canvas work.
        </p>
      </section>

      <section className="status-grid" aria-label="Implementation status">
        <article className="status-card">
          <h2>Current state</h2>
          <p>Electron, React, TypeScript, and preload isolation are wired.</p>
        </article>
        <article className="status-card">
          <h2>Frozen contracts</h2>
          <p>
            Canonical shared types and the preload API live in
            <code> src/shared </code>.
          </p>
        </article>
        <article className="status-card">
          <h2>Next tasks</h2>
          <p>Filesystem, persistence, and preload IPC implementation.</p>
        </article>
      </section>
    </main>
  );
};

export default App;
