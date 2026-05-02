# 🚀 Getting Started with BobShield AI

Welcome to BobShield AI! This guide will help you get up and running in minutes.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [First Run](#first-run)
4. [Analyzing Your First Repository](#analyzing-your-first-repository)
5. [Understanding Results](#understanding-results)
6. [Using IBM Bob for Repairs](#using-ibm-bob-for-repairs)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** (version 18.0.0 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **npm** (comes with Node.js)
  - Verify installation: `npm --version`

- **Git**
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 500MB free space
- **Internet Connection**: Required for cloning repositories

## Installation

### Step 1: Clone BobShield AI

```bash
# Clone the repository
git clone https://github.com/yourusername/bobshield-ai.git

# Navigate to the project directory
cd bobshield-ai
```

### Step 2: Install Backend Dependencies

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# This will install:
# - express (web framework)
# - cors (cross-origin resource sharing)
# - simple-git (git operations)
# - uuid (session management)
# - dotenv (environment variables)
```

### Step 3: Install Frontend Dependencies

```bash
# Navigate to client directory (from project root)
cd ../client

# Install dependencies
npm install

# This will install:
# - react & react-dom (UI library)
# - vite (build tool)
# - tailwindcss (styling)
# - and development dependencies
```

### Step 4: Verify Installation

```bash
# Check if all dependencies are installed
cd ../server
npm list --depth=0

cd ../client
npm list --depth=0
```

## First Run

### Starting the Backend Server

Open a terminal window and run:

```bash
# From the project root
cd server

# Start the server
npm start
```

You should see:
```
🛡️  BobShield AI Backend running on http://localhost:5000
📊 Ready to analyze GitHub repositories
```

**Keep this terminal window open!**

### Starting the Frontend

Open a **new** terminal window and run:

```bash
# From the project root
cd client

# Start the development server
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Opening the Application

1. Open your web browser
2. Navigate to `http://localhost:5173`
3. You should see the BobShield AI dashboard

## Analyzing Your First Repository

### Using the Sample Project

BobShield AI comes with a sample broken project for testing:

1. In the dashboard, enter this URL:
   ```
   https://github.com/yourusername/bobshield-ai
   ```

2. Click **"Analyze Repository"**

3. Wait 10-30 seconds for analysis to complete

### Analyzing Your Own Repository

1. **Ensure your repository is public** (private repos require authentication)

2. Copy your GitHub repository URL:
   ```
   https://github.com/your-username/your-repo
   ```

3. Paste it into the BobShield AI input field

4. Click **"Analyze Repository"**

5. Watch the progress indicator

### What Happens During Analysis?

1. **Cloning**: Repository is cloned to a temporary directory
2. **Scanning**: All files are scanned for issues
3. **Analysis**: Issues are categorized and scored
4. **Report Generation**: Results are compiled and displayed

## Understanding Results

### The Dashboard Tabs

#### 1. Overview Tab
- **Score Card**: Your overall code health score (0-100)
- **Status Badge**: Current deployment readiness
- **Issue Categories**: Security, Documentation, Quality, Reliability
- **Project Statistics**: File count, lines of code, languages

#### 2. Detailed Issues Tab
- **Security Issues**: Hardcoded secrets, exposed credentials
- **Error Handling**: Missing try-catch blocks
- **Code Quality**: TODO comments, duplicate functions
- **Missing Files**: README, tests, configuration files

#### 3. Repair Plan Tab
- **Prioritized Tasks**: Sorted by severity
- **Bob Prompts**: Ready-to-copy prompts for IBM Bob
- **Expected Outcomes**: What each fix will achieve

#### 4. Before/After Tab
- **Current State**: Your repository's current score
- **Potential State**: Score after all fixes
- **Improvement**: Points you can gain

### Score Interpretation

| Score Range | Status | Meaning |
|-------------|--------|---------|
| 90-100 | 🟢 Excellent | Production-ready with best practices |
| 80-89 | 🟢 Deployment Ready | Safe to deploy |
| 60-79 | 🟡 Improving | Needs some improvements |
| 40-59 | 🟠 Needs Rescue | Significant issues present |
| 0-39 | 🔴 Critical | Major problems, not deployment-ready |

## Using IBM Bob for Repairs

### Step-by-Step Process

#### 1. Navigate to Repair Plan Tab
Click on the "🔧 Repair Plan" tab in the dashboard.

#### 2. Choose a Task
Tasks are sorted by priority:
- **Critical**: Security issues (fix immediately)
- **High**: Quality and reliability issues
- **Medium**: Code quality improvements
- **Low**: Nice-to-have improvements

#### 3. Copy the Prompt
Click the **"Copy Prompt"** button for any task.

#### 4. Open IBM Bob
Open your IBM Bob interface (VS Code extension, web interface, etc.)

#### 5. Paste and Execute
1. Paste the copied prompt into IBM Bob
2. Press Enter or click Send
3. Wait for Bob to analyze and implement fixes
4. Review Bob's changes

#### 6. Verify Changes
```bash
# Check what Bob changed
git status
git diff

# Review the changes carefully
```

#### 7. Test the Fixes
```bash
# Run your tests
npm test

# Start your application
npm start

# Verify everything works
```

#### 8. Re-analyze
Go back to BobShield AI and analyze again to see your improved score!

### Example Workflow

```
1. Initial Score: 45 (Needs Rescue)
   ↓
2. Copy "Remove Hardcoded Secrets" prompt
   ↓
3. Paste into IBM Bob
   ↓
4. Bob creates .env.example and updates code
   ↓
5. Re-analyze repository
   ↓
6. New Score: 60 (Improving) ✨
   ↓
7. Repeat with next priority task
```

## Troubleshooting

### Common Issues

#### Backend Won't Start

**Problem**: Port 5000 is already in use

**Solution**:
```bash
# Option 1: Kill the process using port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Option 2: Change the port
# Edit server/index.js
const PORT = process.env.PORT || 5001;
```

#### Frontend Won't Start

**Problem**: Port 5173 is already in use

**Solution**:
```bash
# Vite will automatically try the next available port
# Or specify a different port in vite.config.js
```

#### Repository Clone Fails

**Problem**: "Failed to clone repository"

**Possible Causes & Solutions**:

1. **Repository is private**
   - Make sure the repository is public
   - Or implement OAuth authentication (future feature)

2. **Invalid URL**
   - Ensure URL format: `https://github.com/username/repo`
   - No trailing slashes or extra parameters

3. **Network issues**
   - Check your internet connection
   - Try again in a few moments

4. **Repository too large**
   - Very large repos (>1GB) may timeout
   - Consider analyzing a smaller repository first

#### Analysis Takes Too Long

**Problem**: Analysis stuck or very slow

**Solutions**:
1. Check if repository is very large (>1000 files)
2. Ensure you have enough disk space
3. Restart both backend and frontend
4. Clear temporary repositories:
   ```bash
   # From server directory
   rm -rf temp-repos/*
   ```

#### "Session not found" Error

**Problem**: Session expired or invalid

**Solution**:
- Re-analyze the repository
- Sessions are temporary and cleared after 10 analyses

### Getting Help

If you encounter issues not covered here:

1. **Check the logs**:
   - Backend logs in the terminal running `npm start`
   - Frontend logs in browser console (F12)

2. **Search existing issues**:
   - Visit [GitHub Issues](https://github.com/yourusername/bobshield-ai/issues)

3. **Create a new issue**:
   - Include error messages
   - Describe steps to reproduce
   - Mention your OS and Node.js version

## Next Steps

### Explore Advanced Features

1. **Export Reports**
   - Click "Export Report" to download JSON analysis
   - Use for documentation or tracking progress

2. **Analyze Multiple Repositories**
   - Compare different projects
   - Track improvements over time

3. **Customize Analysis**
   - Edit `server/index.js` to add custom rules
   - Modify ignore patterns for your needs

### Best Practices

1. **Regular Scanning**
   - Analyze your repository weekly
   - Catch issues early in development

2. **Prioritize Fixes**
   - Always fix Critical issues first
   - Then High, Medium, and Low

3. **Verify Changes**
   - Always test after applying Bob's fixes
   - Review code changes before committing

4. **Track Progress**
   - Keep a log of your scores
   - Celebrate improvements!

### Learn More

- Read the full [README.md](README.md) for detailed documentation
- Check out the [API documentation](#) for integration
- Join our [community discussions](#)

## 🎉 Congratulations!

You're now ready to use BobShield AI to improve your code quality!

Remember:
- 🔒 Security first
- 📝 Document everything
- 🧪 Test thoroughly
- ⚡ Handle errors gracefully

Happy coding! 🚀

---

**Need help?** Open an issue on [GitHub](https://github.com/yourusername/bobshield-ai/issues)