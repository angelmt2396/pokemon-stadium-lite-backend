const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const renderJson = (value) => escapeHtml(JSON.stringify(value, null, 2));

export const buildDocumentationPage = () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pokemon Stadium Lite Backend Documentation</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --surface: #fffaf2;
        --surface-strong: #f2e4c8;
        --text: #1f1a14;
        --muted: #6d5c48;
        --accent: #b85c38;
        --accent-strong: #8a3f22;
        --border: #dcc8a7;
        --code-bg: #241d17;
        --code-text: #f8f0e3;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top, rgba(184, 92, 56, 0.12), transparent 40%),
          linear-gradient(180deg, #f7f0e4 0%, var(--bg) 100%);
        color: var(--text);
      }

      main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }

      header {
        margin-bottom: 32px;
      }

      h1,
      h2,
      h3 {
        margin: 0;
        line-height: 1.1;
      }

      h1 {
        font-size: clamp(2.5rem, 4vw, 4.25rem);
        letter-spacing: -0.04em;
      }

      h2 {
        font-size: 1.7rem;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 1.1rem;
        margin-bottom: 12px;
      }

      p {
        line-height: 1.6;
        color: var(--muted);
      }

      a {
        color: var(--accent-strong);
      }

      .hero {
        display: grid;
        gap: 20px;
      }

      .hero-copy {
        max-width: 760px;
      }

      .hero-actions {
        margin-top: 14px;
        color: var(--muted);
      }

      .hero-actions a {
        font-weight: 700;
      }

      .grid {
        display: grid;
        gap: 20px;
      }

      .grid.two {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }

      section {
        margin-top: 36px;
      }

      .doc-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 28px;
      }

      .doc-tab {
        appearance: none;
        border: 1px solid var(--border);
        background: rgba(255, 250, 242, 0.86);
        color: var(--accent-strong);
        border-radius: 999px;
        min-height: 44px;
        padding: 0 16px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          background 140ms ease,
          color 140ms ease,
          border-color 140ms ease,
          transform 140ms ease,
          box-shadow 140ms ease;
      }

      .doc-tab:hover {
        transform: translateY(-1px);
      }

      .doc-tab.is-active {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff8ef;
        box-shadow: 0 10px 24px rgba(184, 92, 56, 0.22);
      }

      .doc-panel {
        display: none;
        scroll-margin-top: 24px;
      }

      .doc-panel.is-active {
        display: block;
      }

      .card {
        background: rgba(255, 250, 242, 0.92);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 12px 30px rgba(81, 47, 24, 0.08);
      }

      .endpoint {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        font-weight: 700;
      }

      .method {
        display: inline-block;
        min-width: 52px;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--surface-strong);
        color: var(--accent-strong);
        text-align: center;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        color: var(--muted);
      }

      li + li {
        margin-top: 6px;
      }

      code,
      pre {
        font-family: "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", monospace;
      }

      pre {
        margin: 0;
        overflow-x: auto;
        border-radius: 16px;
        padding: 16px;
        background: var(--code-bg);
        color: var(--code-text);
        line-height: 1.5;
        font-size: 0.9rem;
      }

      .event-list {
        display: grid;
        gap: 12px;
      }

      .event-item {
        padding: 14px 16px;
        border-radius: 16px;
        background: var(--surface);
        border: 1px solid var(--border);
      }

      .event-name {
        font-weight: 700;
        color: var(--text);
      }

      .event-note {
        margin-top: 6px;
        font-size: 0.95rem;
      }

      .footnote {
        margin-top: 24px;
        font-size: 0.95rem;
      }

      @media (max-width: 640px) {
        main {
          padding: 32px 16px 48px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="hero">
        <div class="hero-copy">
          <h1>Pokemon Stadium Lite Backend Documentation</h1>
          <p>
            Single entry point for the backend contract. REST endpoints are exposed with Swagger,
            and Socket.IO events are summarized here with their expected payloads and acknowledgements.
          </p>
        </div>
        <p class="hero-actions">
          Swagger UI: <a href="/docs">/docs</a>
          <br />
          OpenAPI JSON: <a href="/docs/openapi.json">/docs/openapi.json</a>
        </p>
        <nav class="doc-nav" aria-label="Documentation sections">
          <button class="doc-tab is-active" type="button" data-doc-target="rest-api" aria-current="page">REST API</button>
          <button class="doc-tab" type="button" data-doc-target="socket-io">Socket.IO</button>
          <button class="doc-tab" type="button" data-doc-target="acknowledgements">Acknowledgements</button>
          <button class="doc-tab" type="button" data-doc-target="battle-example">Battle Example</button>
        </nav>
      </header>

      <section id="rest-api" class="doc-panel is-active" data-doc-panel>
        <h2>REST API</h2>
        <div class="grid two">
          <article class="card">
            <div class="endpoint"><span class="method">GET</span><span>/health</span></div>
            <p>Lightweight health check for the backend process.</p>
            <pre>${renderJson({
              success: true,
              data: {
                status: 'ok',
                service: 'pokemon-stadium-lite-backend',
              },
            })}</pre>
          </article>

          <article class="card">
            <div class="endpoint"><span class="method">GET</span><span>/api/v1/pokemon</span></div>
            <p>Returns the catalog used for random team assignment and client previews.</p>
            <pre>${renderJson({
              success: true,
              data: [
                {
                  id: 25,
                  name: 'Pikachu',
                  sprite: 'https://example.test/pikachu.gif',
                },
              ],
              meta: {
                total: 1,
              },
            })}</pre>
          </article>

          <article class="card">
            <div class="endpoint"><span class="method">GET</span><span>/api/v1/pokemon/{id}</span></div>
            <p>Returns the detailed stats required to create battle snapshots.</p>
            <pre>${renderJson({
              success: true,
              data: {
                id: 143,
                name: 'Snorlax',
                sprite: 'https://example.test/snorlax.gif',
                type: ['Normal'],
                hp: 160,
                attack: 110,
                defense: 65,
                speed: 30,
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Error envelope</h3>
            <p>Shared shape used by REST failures handled through the centralized error handler.</p>
            <pre>${renderJson({
              success: false,
              message: 'Pokemon provider unavailable',
              details: {
                provider: 'catalog',
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Not found example</h3>
            <p>Standard envelope used for unknown routes.</p>
            <pre>${renderJson({
              success: false,
              message: 'Route not found',
            })}</pre>
          </article>

          <article class="card">
            <h3>Validation error example</h3>
            <p>Returned when the route parameter is invalid before hitting the service layer.</p>
            <pre>${renderJson({
              success: false,
              message: 'id must be a number',
              details: {
                field: 'id',
                reason: 'invalid_type',
              },
            })}</pre>
          </article>
        </div>
      </section>

      <section id="socket-io" class="doc-panel" data-doc-panel>
        <h2>Socket.IO Contracts</h2>
        <div class="grid two">
          <article class="card">
            <h3>Client to Server</h3>
            <div class="event-list">
              <div class="event-item">
                <div class="event-name">join_lobby / search_match</div>
                <div class="event-note">Payload: <code>{ nickname }</code>. Creates or joins the oldest available waiting lobby.</div>
              </div>
              <div class="event-item">
                <div class="event-name">cancel_search</div>
                <div class="event-note">Payload: <code>{ playerId }</code>. Cancels matchmaking only if the player is still waiting alone.</div>
              </div>
              <div class="event-item">
                <div class="event-name">assign_pokemon</div>
                <div class="event-note">Payload: <code>{ lobbyId, playerId }</code>. Assigns random teams once the lobby has two players.</div>
              </div>
              <div class="event-item">
                <div class="event-name">ready</div>
                <div class="event-note">Payload: <code>{ lobbyId, playerId }</code>. Marks player as ready and starts battle automatically when both are ready.</div>
              </div>
              <div class="event-item">
                <div class="event-name">attack</div>
                <div class="event-note">Payload: <code>{ battleId, playerId }</code>. Processes one turn only if it is that player&apos;s turn.</div>
              </div>
              <div class="event-item">
                <div class="event-name">reconnect_player</div>
                <div class="event-note">Payload: <code>{ playerId }</code>. Rebinds the player to a new socket and restores lobby and battle state.</div>
              </div>
            </div>
          </article>

          <article class="card">
            <h3>Server to Client</h3>
            <div class="event-list">
              <div class="event-item">
                <div class="event-name">search_status</div>
                <div class="event-note">Signals <code>searching</code> or <code>idle</code> during matchmaking lifecycle.</div>
              </div>
              <div class="event-item">
                <div class="event-name">match_found</div>
                <div class="event-note">Broadcast when a lobby reaches two players.</div>
              </div>
              <div class="event-item">
                <div class="event-name">lobby_status</div>
                <div class="event-note">Current lobby state with players, ready flags, and assigned team summaries.</div>
              </div>
              <div class="event-item">
                <div class="event-name">battle_start</div>
                <div class="event-note">Initial battle snapshot with active Pokemon and current turn.</div>
              </div>
              <div class="event-item">
                <div class="event-name">turn_result</div>
                <div class="event-note">Turn outcome scoped to a single <code>battleId</code>, including damage and next turn.</div>
              </div>
              <div class="event-item">
                <div class="event-name">battle_end</div>
                <div class="event-note">Winner and terminal battle status.</div>
              </div>
            </div>
          </article>
        </div>

        <div class="grid two" style="margin-top: 20px;">
          <article class="card">
            <h3>Matchmaking request example</h3>
            <pre>${renderJson({
              event: 'search_match',
              payload: {
                nickname: 'Ash',
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Matchmaking ack example</h3>
            <pre>${renderJson({
              ok: true,
              data: {
                playerId: 'player-1',
                lobbyId: 'lobby-1',
                status: 'waiting',
                lobbyStatus: {
                  lobbyId: 'lobby-1',
                  status: 'waiting',
                  players: [
                    {
                      playerId: 'player-1',
                      nickname: 'Ash',
                      ready: false,
                      team: [],
                    },
                  ],
                },
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Lobby status example</h3>
            <pre>${renderJson({
              lobbyId: 'lobby-1',
              status: 'waiting',
              players: [
                {
                  playerId: 'player-1',
                  nickname: 'Ash',
                  ready: false,
                  team: [
                    {
                      pokemonId: 25,
                      name: 'Pikachu',
                    },
                    {
                      pokemonId: 6,
                      name: 'Charizard',
                    },
                    {
                      pokemonId: 143,
                      name: 'Snorlax',
                    },
                  ],
                },
                {
                  playerId: 'player-2',
                  nickname: 'Misty',
                  ready: true,
                  team: [
                    {
                      pokemonId: 7,
                      name: 'Squirtle',
                    },
                    {
                      pokemonId: 9,
                      name: 'Blastoise',
                    },
                    {
                      pokemonId: 95,
                      name: 'Onix',
                    },
                  ],
                },
              ],
            })}</pre>
          </article>

          <article class="card">
            <h3>Reconnect ack example</h3>
            <pre>${renderJson({
              ok: true,
              data: {
                playerId: 'player-2',
                lobbyId: 'lobby-1',
                previousSocketId: 'old-socket-id',
                lobbyStatus: {
                  lobbyId: 'lobby-1',
                  status: 'battling',
                  players: [
                    {
                      playerId: 'player-1',
                      nickname: 'Ash',
                      ready: true,
                      team: [
                        {
                          pokemonId: 25,
                          name: 'Pikachu',
                        },
                      ],
                    },
                    {
                      playerId: 'player-2',
                      nickname: 'Misty',
                      ready: true,
                      team: [
                        {
                          pokemonId: 95,
                          name: 'Onix',
                        },
                      ],
                    },
                  ],
                },
                battleState: {
                  battleId: 'battle-1',
                  lobbyId: 'lobby-1',
                  status: 'battling',
                  currentTurnPlayerId: 'player-2',
                  players: [
                    {
                      playerId: 'player-1',
                      activePokemonIndex: 0,
                      activePokemon: {
                        pokemonId: 25,
                        name: 'Pikachu',
                        hp: 35,
                        currentHp: 18,
                        attack: 55,
                        defense: 40,
                        speed: 90,
                        defeated: false,
                      },
                    },
                    {
                      playerId: 'player-2',
                      activePokemonIndex: 0,
                      activePokemon: {
                        pokemonId: 95,
                        name: 'Onix',
                        hp: 35,
                        currentHp: 35,
                        attack: 45,
                        defense: 160,
                        speed: 70,
                        defeated: false,
                      },
                    },
                  ],
                },
              },
            })}</pre>
          </article>
        </div>
      </section>

      <section id="acknowledgements" class="doc-panel" data-doc-panel>
        <h2>Acknowledgements</h2>
        <div class="grid two">
          <article class="card">
            <h3>Success ack</h3>
            <pre>${renderJson({
              ok: true,
              data: {},
            })}</pre>
          </article>
          <article class="card">
            <h3>Error ack</h3>
            <pre>${renderJson({
              ok: false,
              message: 'Player cannot attack out of turn',
            })}</pre>
          </article>

          <article class="card">
            <h3>Validation ack</h3>
            <pre>${renderJson({
              ok: false,
              message: 'playerId is required',
            })}</pre>
          </article>

          <article class="card">
            <h3>Cancel search ack</h3>
            <pre>${renderJson({
              ok: true,
              data: {
                playerId: 'player-3',
                canceled: true,
                lobbyId: 'lobby-7',
                lobbyStatus: {
                  lobbyId: 'lobby-7',
                  status: 'finished',
                  players: [],
                },
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Assign pokemon ack</h3>
            <pre>${renderJson({
              ok: true,
              data: {
                lobbyId: 'lobby-1',
                playerId: 'player-1',
                team: [
                  {
                    pokemonId: 25,
                    name: 'Pikachu',
                  },
                  {
                    pokemonId: 6,
                    name: 'Charizard',
                  },
                  {
                    pokemonId: 143,
                    name: 'Snorlax',
                  },
                ],
              },
            })}</pre>
          </article>

          <article class="card">
            <h3>Ready ack with battle start</h3>
            <pre>${renderJson({
              ok: true,
              data: {
                lobbyId: 'lobby-1',
                playerId: 'player-2',
                ready: true,
                battleStart: {
                  battleId: 'battle-1',
                  lobbyId: 'lobby-1',
                  status: 'battling',
                  currentTurnPlayerId: 'player-2',
                  players: [
                    {
                      playerId: 'player-1',
                      activePokemonIndex: 0,
                      activePokemon: {
                        pokemonId: 25,
                        name: 'Pikachu',
                        hp: 35,
                        currentHp: 35,
                        attack: 55,
                        defense: 40,
                        speed: 90,
                        defeated: false,
                      },
                    },
                    {
                      playerId: 'player-2',
                      activePokemonIndex: 0,
                      activePokemon: {
                        pokemonId: 95,
                        name: 'Onix',
                        hp: 35,
                        currentHp: 35,
                        attack: 45,
                        defense: 160,
                        speed: 70,
                        defeated: false,
                      },
                    },
                  ],
                },
              },
            })}</pre>
          </article>
        </div>
      </section>

      <section id="battle-example" class="doc-panel" data-doc-panel>
        <h2>Battle Event Example</h2>
        <div class="grid two">
          <article class="card">
            <h3>battle_start</h3>
            <pre>${renderJson({
              battleId: 'battle-1',
              lobbyId: 'lobby-1',
              status: 'battling',
              currentTurnPlayerId: 'player-2',
              players: [
                {
                  playerId: 'player-1',
                  activePokemonIndex: 0,
                  activePokemon: {
                    pokemonId: 25,
                    name: 'Pikachu',
                    hp: 35,
                    currentHp: 35,
                    attack: 55,
                    defense: 40,
                    speed: 90,
                    defeated: false,
                  },
                },
                {
                  playerId: 'player-2',
                  activePokemonIndex: 0,
                  activePokemon: {
                    pokemonId: 95,
                    name: 'Onix',
                    hp: 35,
                    currentHp: 35,
                    attack: 45,
                    defense: 160,
                    speed: 70,
                    defeated: false,
                  },
                },
              ],
            })}</pre>
          </article>

          <article class="card">
            <h3>turn_result</h3>
            <pre>${renderJson({
              battleId: 'battle-1',
              attackerPlayerId: 'player-2',
              defenderPlayerId: 'player-1',
              attackerPokemonId: 95,
              defenderPokemonId: 25,
              damage: 5,
              defenderRemainingHp: 30,
              defenderDefeated: false,
              autoSwitchedPokemon: null,
              nextTurnPlayerId: 'player-1',
              battleStatus: 'battling',
            })}</pre>
          </article>

          <article class="card">
            <h3>turn_result with auto switch</h3>
            <pre>${renderJson({
              battleId: 'battle-1',
              attackerPlayerId: 'player-1',
              defenderPlayerId: 'player-2',
              attackerPokemonId: 6,
              defenderPokemonId: 95,
              damage: 35,
              defenderRemainingHp: 0,
              defenderDefeated: true,
              autoSwitchedPokemon: {
                playerId: 'player-2',
                activePokemonIndex: 1,
                pokemon: {
                  pokemonId: 9,
                  name: 'Blastoise',
                  hp: 79,
                  currentHp: 79,
                  attack: 83,
                  defense: 100,
                  speed: 78,
                  defeated: false,
                },
              },
              nextTurnPlayerId: 'player-2',
              battleStatus: 'battling',
            })}</pre>
          </article>

          <article class="card">
            <h3>battle_end</h3>
            <pre>${renderJson({
              battleId: 'battle-1',
              lobbyId: 'lobby-1',
              winnerPlayerId: 'player-1',
              status: 'finished',
            })}</pre>
          </article>
        </div>

        <div class="card" style="margin-top: 20px;">
          <p class="footnote">
            Full Socket.IO contract with payload examples and business errors is also available in
            <a href="/documentation#socket-io">this page</a> and in the repository file
            <code>docs/socket-contracts.md</code>.
          </p>
          <p class="footnote">
            Input validation is performed before business logic in both REST and Socket.IO handlers.
          </p>
        </div>
      </section>
    </main>
    <script>
      (() => {
        const tabs = Array.from(document.querySelectorAll('[data-doc-target]'));
        const panels = Array.from(document.querySelectorAll('[data-doc-panel]'));

        const activatePanel = (panelId, replaceHash = false) => {
          const nextPanel = panels.find((panel) => panel.id === panelId) ?? panels[0];

          panels.forEach((panel) => {
            panel.classList.toggle('is-active', panel === nextPanel);
          });

          tabs.forEach((tab) => {
            const isActive = tab.dataset.docTarget === nextPanel.id;
            tab.classList.toggle('is-active', isActive);

            if (isActive) {
              tab.setAttribute('aria-current', 'page');
            } else {
              tab.removeAttribute('aria-current');
            }
          });

          const nextHash = '#' + nextPanel.id;

          if (replaceHash) {
            history.replaceState(null, '', nextHash);
          }
        };

        tabs.forEach((tab) => {
          tab.addEventListener('click', () => {
            activatePanel(tab.dataset.docTarget, true);
          });
        });

        const initialPanelId = window.location.hash ? window.location.hash.slice(1) : panels[0]?.id;

        if (initialPanelId) {
          activatePanel(initialPanelId, false);
        }

        window.addEventListener('hashchange', () => {
          const panelId = window.location.hash ? window.location.hash.slice(1) : panels[0]?.id;

          if (panelId) {
            activatePanel(panelId, false);
          }
        });
      })();
    </script>
  </body>
</html>
`;
