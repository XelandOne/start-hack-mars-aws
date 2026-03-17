# Tech Stack

## Core
- **Runtime**: Node.js v18+
- **Package Manager**: npm
- **Language**: TypeScript / JavaScript
- **Cloud Provider**: AWS (sandbox account via Workshop Studio)

## Frontend
- React
- AWS Amplify Gen2 is an easy way to deploy the frontend. If Amplify supports other services the team needs (auth, data, storage, functions), those can be used too.

## Backend
- Teams are free to choose their own backend approach (Amplify backend, AWS CDK, AWS SDK, Console, etc.)
- Common AWS services: DynamoDB, Lambda, Cognito, S3, API Gateway
- Data Source: Mars Crop Knowledge Base via MCP server

## Common Commands

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Start Amplify backend sandbox (if using Amplify for backend)
npx ampx sandbox

# Verify AWS credentials
aws sts get-caller-identity

# Create a new Amplify project
npm create amplify@latest <project-name>
```

## Notes
- AWS credentials are temporary (Workshop Studio). Re-copy them if you get auth errors.
- The MCP config should live at `.kiro/settings/mcp.json` for the Mars Crop Knowledge Base.
