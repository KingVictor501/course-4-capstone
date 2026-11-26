# Weekly Digest

A worker that does one recurring job for one person: every week it turns a barbershop's
appointments into one review for the owner, and proposes which clients should leave a deposit
before their next booking. Writing a deposit flag waits for a person's yes.

Everything here runs on made-up data. The person (Ben, the owner of Fade Factory), the shop, the
clients and every appointment are fictional.

- **What it does and why:** [docs/scoping.md](docs/scoping.md)
- **Live address:** added once it's deployed.

## Run it on your computer

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own values (never commit `.env.local`).
3. `npm run db:migrate` to create the tables in your database.
4. `npm run dev`, then open http://localhost:3000

## Checks

- `npm test` runs the automated tests.
- `npm run typecheck` checks the TypeScript.
