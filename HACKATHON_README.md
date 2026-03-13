# 🍅 Mars Tomato Hackathon — Getting Started Guide

Welcome, hackers! Your mission: build an application that helps manage a **tomato plantation on Mars**. You'll use AWS cloud services as your backend, an AI-powered Knowledge Base (via MCP) to get crop data, and Kiro as your AI coding assistant.

---

## 📦 What You've Been Given

| Resource | Scope |
|---|---|
| AWS Sandbox Account (via Workshop Studio) | 1 per team |
| Kiro Access Code | 1 per person |

---

## 🛠️ Prerequisites — Install These First

### 1. Node.js (v18 or later)

- Download from [https://nodejs.org](https://nodejs.org) (use the LTS version)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. Git

- Download from [https://git-scm.com](https://git-scm.com)
- Verify:
  ```bash
  git --version
  ```

### 3. AWS CLI

- **macOS:** `brew install awscli` (or download from [AWS CLI Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **Windows:** Download the MSI installer from the link above
- **Linux:** `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install`
- Verify:
  ```bash
  aws --version
  ```

### 4. Kiro IDE (skip it if you have already installed it)

- Download from [https://kiro.dev/downloads](https://kiro.dev/downloads)
- Choose the installer for your operating system (macOS / Windows / Linux)
- Install and launch Kiro

---

## 🔐 Step 1 — Get Your AWS Credentials from Workshop Studio

Each team has **one shared AWS sandbox account** provisioned through AWS Workshop Studio.

### Access Workshop Studio

1. Go to the Workshop Studio URL provided by the organizers
2. Sign in with the credentials or event code given to your team
3. Once logged in, click **"Open AWS Console"** to access your sandbox account

### Get CLI Credentials

To use AWS from your terminal (needed for Amplify), you need to copy the temporary credentials:

1. In Workshop Studio, look for the **"Get AWS CLI credentials"** section (or click on your account details)
2. You'll see three values: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN`
3. Copy the **export commands** (Option 1 for macOS/Linux, Option 2 for Windows) and paste them into your terminal:

**macOS / Linux:**
```bash
export AWS_ACCESS_KEY_ID="<value-from-workshop-studio>"
export AWS_SECRET_ACCESS_KEY="<value-from-workshop-studio>"
export AWS_SESSION_TOKEN="<value-from-workshop-studio>"
export AWS_DEFAULT_REGION="us-east-1"
```

**Windows (PowerShell):**
```powershell
$env:AWS_ACCESS_KEY_ID="<value-from-workshop-studio>"
$env:AWS_SECRET_ACCESS_KEY="<value-from-workshop-studio>"
$env:AWS_SESSION_TOKEN="<value-from-workshop-studio>"
$env:AWS_DEFAULT_REGION="us-east-1"
```

> ⚠️ **These credentials are temporary and will expire.** If you get authentication errors later, go back to Workshop Studio and copy fresh credentials.

Verify it works:
```bash
aws sts get-caller-identity
```

You should see your account ID in the output.

---

## 🤖 Step 2 — Set Up Kiro IDE

Kiro is an AI-powered IDE that can write code, run commands, read files, and help you build your app.

### Authenticate

1. Launch Kiro IDE
2. When prompted, sign in and enter your personal Kiro access code, this code has been provided to you in the team envelop

### Open your project

Once you've created your project (see Step 3), open the project folder in Kiro via **File → Open Folder**.

### Enable Strands SDK and Amplify Powers

Kiro has built-in "Powers" that give the AI deeper knowledge of specific frameworks. Enable these two for the hackathon:

1. Open the **Powers** panel in Kiro (click the Powers icon in the sidebar or use the Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P` → search "Powers")
2. Enable **Strands SDK** — gives Kiro knowledge of the Strands Agents SDK for building AI agents
3. Enable **Amplify** — gives Kiro knowledge of AWS Amplify Gen2 patterns, schema syntax, and best practices

> ⚠️ Make sure both powers show as **enabled** before you start prompting Kiro. This significantly improves the quality of generated code for Amplify and Strands.

### Useful Kiro features

| Feature | How |
|---|---|
| AI Chat | Use the built-in chat panel to ask questions, generate code, and debug |
| Code Intelligence | Kiro provides autocomplete, go-to-definition, and diagnostics out of the box |
| Terminal | Use the integrated terminal (`Ctrl+`` / `Cmd+``) to run commands |
| Planner | Use `Shift + Tab` in the chat to break down tasks into steps |

> 💡 **Tip:** You can ask Kiro to write code, explain AWS concepts, debug errors, and even run terminal commands for you. Treat it as your AI teammate!

---

## 🚀 Step 3 — Create Your Project with AWS Amplify Gen2

Amplify Gen2 lets you build a full-stack app (frontend + backend) and deploy it to AWS with minimal configuration.

### Create a new Amplify project

```bash
npm create amplify@latest mars-tomato-app
cd mars-tomato-app
```

Follow the prompts (defaults are fine).

### Install dependencies

```bash
npm install
```

### Understand the project structure

```
mars-tomato-app/
├── amplify/           # ← Your backend lives here
│   ├── auth/          #   Authentication setup
│   ├── data/          #   Database / API schema
│   └── backend.ts     #   Backend entry point
├── src/               # ← Your frontend lives here
├── package.json
└── ...
```

### Start the local dev environment

Open **two terminals**:

**Terminal 1 — Backend sandbox:**
```bash
npx ampx sandbox
```
This deploys a personal cloud sandbox of your backend to AWS. Keep it running.

**Terminal 2 — Frontend dev server:**
```bash
npm run dev
```

Your app is now running locally and connected to real AWS services!

---

## 🌱 Step 4 — Connect to the Mars Crop Knowledge Base (MCP)

The organizers provide an **MCP server** that gives you access to crop data for your Mars tomato plantation (soil conditions, growth cycles, water needs, etc.).

### Configure the MCP server in Kiro

The MCP configuration file is already included in this repository at `.kiro/settings/mcp.json`. No manual setup needed!

When you open this project folder in Kiro IDE, it will automatically detect and load the MCP server configuration.

> 💡 If you create a new project from scratch (e.g., with `npm create amplify`), copy the `.kiro` folder from this repository into your new project root.

### Using the Knowledge Base

Once configured, restart Kiro IDE (or reload the window). You can then ask Kiro questions like:

- *"What are the optimal soil conditions for Mars tomatoes?"*
- *"Query the knowledge base for water requirements per growth stage"*

Kiro will automatically use the MCP tools to fetch data from the Knowledge Base and incorporate it into your app.

---

## 📐 Step 5 — Define Your Backend (Data Model)

Edit `amplify/data/resource.ts` to define your API. Here's a minimal starting point:

```typescript
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  CropLog: a
    .model({
      plantId: a.string().required(),
      temperature: a.float(),
      humidity: a.float(),
      waterLevel: a.float(),
      notes: a.string(),
      timestamp: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 7,
    },
  },
});
```

After saving, `npx ampx sandbox` (running in Terminal 1) will automatically pick up changes and deploy them.

---

## 💬 Suggested Kiro Prompts — Building Your Architecture

Not sure how to set up the technical pieces? Use these prompts in Kiro's chat to scaffold your AWS infrastructure. Copy-paste them or adapt them to your needs!

### 🗄️ Database & Data Modeling

> *"Define a DynamoDB-backed data model in Amplify Gen2 with three related models in `amplify/data/resource.ts`. Include different field types (string, float, datetime) and a one-to-many relationship."*

> *"Add a many-to-many relationship between two of my existing models in the Amplify Gen2 data schema."*

### 🔐 Authentication & Authorization

> *"Set up Amplify Auth with email-based sign-up and login in my project."*

> *"Add owner-based authorization to my data models so users can only access their own records."*

> *"Change the authorization on [model name] so it's publicly readable but only authenticated users can create or update records."*

### ⚡ Serverless Functions (Lambda)

> *"Create a Lambda function in Amplify Gen2 and expose it as a custom mutation in my GraphQL schema."*

> *"Add a scheduled Lambda function in Amplify Gen2 that runs every 15 minutes."*

> *"Wire a Lambda function as a resolver for a custom query in my Amplify data schema."*

### 🌐 API Layer

> *"Add a custom query and a custom mutation to my Amplify Gen2 GraphQL schema backed by Lambda resolvers."*

> *"Generate a REST API endpoint in my Amplify project that triggers a Lambda function."*

### 📁 Storage (S3)

> *"Add an S3 storage bucket to my Amplify Gen2 project with per-user file scoping."*

> *"Create a React component that uploads files to my Amplify S3 bucket and lists the uploaded files."*

### 🔄 Real-Time & Subscriptions

> *"Enable real-time subscriptions on my Amplify Gen2 data models so the frontend updates automatically when data changes."*

### 🎨 Frontend Integration

> *"Configure the Amplify client library in my React app and connect it to my Gen2 backend."*

> *"Add the Amplify Authenticator UI component to wrap my app with a login/signup flow."*

### 🌱 Using the Knowledge Base (MCP)

> *"List all the tools available from the Mars crop knowledge base MCP server and describe what each one does."*

> *"Query the knowledge base and return the available crop data."*

### 🐛 Debugging & Help

> *"I'm getting this error when running `npx ampx sandbox`: [paste error]. Fix it."*

> *"Review my Amplify Gen2 authorization rules and suggest improvements for my use case."*

> 💡 **Pro tip:** After each prompt, review what Kiro generates, test it, and then build on top of it with the next prompt. Iterating in small steps is the fastest way to make progress!

---

## 🧪 Quick Sanity Check

By this point you should have:

- [x] AWS credentials from Workshop Studio configured and `aws sts get-caller-identity` works
- [x] Kiro IDE installed, authenticated, and project opened
- [x] Amplify project created and `npx ampx sandbox` running
- [x] Frontend dev server running (`npm run dev`)
- [x] MCP server configured for the Mars Crop Knowledge Base

---

## 💡 Tips for Success

1. **Ask Kiro first.** Don't know how to do something in AWS? Ask Kiro. It can explain concepts, write code, and run commands.
2. **Use the Planner.** Press `Shift + Tab` in Kiro's chat to break down your idea into steps before coding.
3. **Start simple.** Get a basic CRUD app working first, then add features.
4. **Check the Amplify docs.** [https://docs.amplify.aws/gen2/](https://docs.amplify.aws/gen2/)
5. **Use the Knowledge Base.** The crop data from the MCP server is there to make your solution realistic — use it!
6. **Commit often.** Use `git init && git add -A && git commit -m "initial"` early, then commit after each working feature.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---|---|
| `aws configure` — command not found | AWS CLI not installed. See Prerequisites. |
| `npx ampx sandbox` fails | Make sure `aws sts get-caller-identity` works first. Your Workshop Studio credentials may have expired — copy fresh ones. |
| Kiro doesn't see MCP tools | Restart Kiro IDE (or reload window) after editing `.kiro/settings/mcp.json`. |
| `npm create amplify` fails | Make sure Node.js v18+ is installed: `node --version`. |
| Port already in use | Another process is using the port. Kill it or change the port in your dev config. |
| AWS auth errors after a while | Workshop Studio credentials are temporary. Go back and copy new ones. |

---

## 📚 Useful Links

- [AWS Amplify Gen2 Docs](https://docs.amplify.aws/gen2/)
- [Kiro IDE Downloads](https://kiro.dev/downloads)
- [AWS Free Tier Info](https://aws.amazon.com/free/)
- [Node.js Downloads](https://nodejs.org)

---

Good luck, and may your Martian tomatoes thrive! 🍅🚀
