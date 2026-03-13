# Tech Stack

## Core
- **Framework**: AWS Amplify Gen2 (full-stack: frontend + backend)
- **Runtime**: Node.js v18+
- **Package Manager**: npm
- **Language**: TypeScript / JavaScript
- **Cloud Provider**: AWS (sandbox account via Workshop Studio)

## Backend (lives in `amplify/`)
- **Auth**: Amazon Cognito (email-based sign-up/login)
- **Database**: Amazon DynamoDB
- **API**: REST or GraphQL via Amplify
- **Functions**: AWS Lambda (serverless)
- **Storage**: Amazon S3
- **Data Source**: Mars Crop Knowledge Base via MCP server

## Frontend (lives in `src/`)
- React (default Amplify Gen2 scaffold)
- Amplify UI components and client libraries

## Common Commands

```bash
# Install dependencies
npm install

# Start backend sandbox (deploys personal cloud sandbox to AWS)
npx ampx sandbox

# Start frontend dev server
npm run dev

# Verify AWS credentials
aws sts get-caller-identity

# Create a new Amplify project from scratch
npm create amplify@latest <project-name>
```

## Notes
- AWS credentials are temporary (Workshop Studio). Re-copy them if you get auth errors.
- `npx ampx sandbox` must be running in a separate terminal for backend changes to deploy.
- The MCP config should live at `.kiro/settings/mcp.json` for the Mars Crop Knowledge Base.
