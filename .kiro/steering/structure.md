# Project Structure

This repo is currently a starter/template. Once the Amplify project is scaffolded, the expected structure is:

```
mars-tomato-app/
├── amplify/              # Backend definitions (deployed to AWS)
│   ├── auth/             # Cognito authentication config
│   ├── data/             # DynamoDB / API schema definitions
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
- Backend logic goes in `amplify/` — Lambda functions, data models, auth config.
- Frontend code goes in `src/`.
- Keep Amplify resource definitions (auth, data, functions, storage) in their own subdirectories under `amplify/`.
- The MCP Knowledge Base is read-only reference data — don't try to write to it.
