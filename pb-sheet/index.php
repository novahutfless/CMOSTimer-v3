<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CMOSTimer Public PB Sheet</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="app">
    <section class="hero">
      <h1>CMOSTimer Public PB Sheet</h1>
      <p>Lookup public PB data by username.</p>
    </section>

    <section class="lookup">
      <form id="lookup-form" novalidate>
        <label for="username">Username</label>
        <div class="row">
          <input id="username" name="username" type="text" autocomplete="username" placeholder="Enter username" required />
          <button type="submit">Search</button>
        </div>
      </form>
      <p id="status" class="status" aria-live="polite"></p>
    </section>

    <section id="results" class="results" hidden>
      <header class="results-header">
        <h2 id="sheet-title"></h2>
        <p id="sheet-user"></p>
      </header>
      <div id="session-list" class="session-list"></div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
