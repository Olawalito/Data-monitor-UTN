# Local MTN Monitor

Datrack is a small, local-only dashboard for Unified TrustNet's IT team. It reads data balances and bundle expiry dates for approved company MTN Nigeria SIMs through MTN's Plans v2 API.

## Security boundary

The server binds only to `127.0.0.1`. It cannot be opened from another computer, even on the same network. MTN credentials, account password hashes, sessions, and the approved SIM list remain on the installed computer. Do not change `HOST` to a public or LAN address.

There are exactly two local accounts:

- `admin` (or the administrator username chosen during setup): can add, refresh, and remove approved SIMs.
- `reader` (or the read-only username chosen during setup): can view balances, with phone numbers masked, but cannot change anything.

## Install and configure

Requirements: Node.js 20 or newer, npm, and an MTN developer application subscribed to Customer Plans v2 and OAuth v1.

```sh
npm install
npm install --prefix server
npm install --prefix datrack
npm run setup
```

The setup command asks locally for the two passwords and MTN consumer credentials. Secret input is not echoed. It stores password hashes—not plaintext passwords—in `server/.env`, applies owner-only file permissions, and creates the versioned local data store. Re-running setup refuses to replace the private configuration unless the operator explicitly confirms.

## Run

```sh
npm run build
npm start
```

Open `http://127.0.0.1:3000`. Stop the monitor with `Ctrl+C` in its terminal. Run all automated checks with `npm test`.

The server refreshes approved balances every 15 minutes while it is running. An administrator can also refresh one line or all lines immediately.

## Optional live MTN check

To test one approved company MTN SIM without adding it to the dashboard:

```sh
npm run smoke -- 08031234567
```

The command prints only a redacted number and normalized plan result. It never prints credentials or MTN response bodies.

## Backup and recovery

Runtime data is in `server/data/sims.json`; the application maintains `server/data/sims.json.bak` before each update. Both are intentionally untracked by Git. If the main file becomes corrupt, restart Datrack and it restores the validated backup. If both files are invalid or missing, the server stops rather than silently discarding data. Restore a trusted backup or rerun setup only when starting a new installation.

For an offline backup, stop the server and copy both JSON files to encrypted company storage. Do not place them in the repository.

## Renew MTN credentials

When MTN rotates the app credentials, stop Datrack and run `npm run setup`. Confirm replacement, enter new strong local account passwords, and paste the new consumer key and secret. Restart and use the optional smoke command with an approved MTN SIM. Never paste credentials into source files, issues, chat, or terminal commands.

## Troubleshooting

- `Missing required configuration`: run `npm run setup`.
- `No valid SIM data file or backup`: restore the runtime JSON backup or perform setup for a genuinely new installation.
- A row marked **Stale** retains the last successful balance because MTN is temporarily unavailable.
- **Needs attention** means no successful balance is available yet; an administrator can retry.
- `MTN_AUTH_FAILED`: verify the app subscriptions and rotate/copy the MTN credentials again.
