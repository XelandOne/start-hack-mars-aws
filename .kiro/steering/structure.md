# Project Structure

This repo is currently a starter/template. Once the project is scaffolded, a typical structure looks like:

```
mars-tomato-app/
├── amplify/              # Backend definitions (if using Amplify for backend services)
│   ├── auth/             # Authentication setup
│   ├── data/             # Database / API schema
│   └── backend.ts        # Backend entry point
├── src/                  # Frontend application code (React)
├── .kiro/
│   ├── settings/
│   │   └── mcp.json      # MCP server config (Mars Crop Knowledge Base)
│   └── steering/         # Steering rules for AI assistant
├── package.json
├── HACKATHON_README.md   # Hackathon getting-started guide
└── README.md
```

## Conventions
- Frontend code goes in `src/`.
- Backend approach is up to the team — Amplify, CDK, SDK, Console, etc.
- The MCP Knowledge Base is read-only reference data — don't try to write to it.
