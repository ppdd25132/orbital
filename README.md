# Orbital

All your accounts. One inbox. AI-drafted responses.

Orbital is a communication hub for professionals managing multiple clients across multiple email and Slack accounts. AI reads your full conversation history and drafts context-aware replies — you review, edit, and send.

## Quick Start (Local)

```bash
git clone https://github.com/YOUR_USERNAME/orbital.git
cd orbital
npm install
cp .env.example .env
# Add your Anthropic API key to .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (5 minutes)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Add environment variable: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com/)
5. Click **Deploy**

Your site is live.

## What Works Today

- **Onboarding flow** — connect accounts, create clients, map accounts to clients
- **Demo mode** — preloaded with realistic fractional CFO scenarios
- **Unified inbox** — all threads across all accounts in one view
- **Client filtering** — filter by client, status, or search
- **AI-drafted responses** — Claude reads the full conversation history and drafts replies
- **Manual compose** — write new messages from any connected account
- **Send-from routing** — always sends from the correct identity
- **Keyboard shortcuts** — j/k navigate, s star, e archive, c compose, ? help
- **Persistent state** — survives page refreshes via localStorage
- **Settings** — toggle auto-draft, keyboard shortcuts, show/hide archived

## What's Simulated

The "Connect Gmail" and "Connect Slack" buttons simulate OAuth. Real integrations require a backend with:

- Google Cloud project with Gmail API + OAuth credentials
- Slack app with appropriate OAuth scopes
- Database for token storage and message sync
- Background workers for continuous sync

The AI drafting is real — it calls the Claude API through a server-side proxy route.

## Project Structure

```
orbital/
├── app/
│   ├── api/draft/route.js   # Server-side Claude API proxy
│   ├── globals.css           # Tailwind + animations
│   ├── layout.js             # Root layout
│   └── page.js               # Entry point
├── components/
│   └── Orbital.jsx           # Main application component
├── .env.example              # Environment variables template
├── package.json
├── tailwind.config.js
└── next.config.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key for AI draft generation |

## License

MIT
