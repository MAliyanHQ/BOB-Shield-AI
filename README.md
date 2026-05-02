# 🛡️ BobShield AI - Professional Code Health Scanner

**Transform Broken Code into Deployment-Ready Software**

BobShield AI is an enterprise-grade code health scanner that analyzes GitHub repositories, identifies critical issues, and generates IBM Bob-ready repair prompts to automatically fix them. Built for professional developers who demand quality and efficiency.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## ✨ Key Features

### 🔍 Comprehensive Code Analysis
- **Security Scanning**: Detects hardcoded secrets, API keys, passwords, and credentials
- **Quality Assessment**: Identifies duplicate code with code snippets, missing tests, and code smells
- **Documentation Check**: Validates presence of README, deployment guides, and configuration files
- **Error Handling**: Analyzes async operations and promise handling
- **Multi-Language Support**: Scans JavaScript, TypeScript, Python, and more
- **File Type Detection**: Automatically identifies and categorizes file types in your project

### 🤖 IBM Bob Integration
- **Ready-to-Use Prompts**: Copy-paste prompts directly into IBM Bob
- **Prioritized Tasks**: Issues ranked by severity (Critical, High, Medium, Low)
- **Detailed Instructions**: Step-by-step repair guidance for each issue
- **Expected Outcomes**: Clear success criteria for each fix
- **Code Context**: Includes actual code snippets for duplicate functions

### 📊 Professional Dashboard
- **Real-Time Analysis**: Instant GitHub repository scanning
- **Interactive UI**: Modern, responsive design with glass morphism effects
- **Score Visualization**: 0-100 health score with deployment readiness
- **Before/After Comparison**: Visualize potential improvements
- **Export Reports**: Download professional PDF reports with enhanced formatting
- **Technical Debt Analysis**: AI-assisted cost and time estimates

### 🎯 Smart Scoring System
- **100-Point Scale**: Comprehensive scoring algorithm
- **Weighted Deductions**: Issues weighted by severity
- **Status Levels**: Excellent (90+), Deployment Ready (80+), Improving (60+), Needs Rescue (40+), Critical (<40)
- **Detailed Breakdown**: See exactly what impacts your score

### 💰 Technical Debt Calculator
- **AI-Assisted Estimates**: Realistic time and cost projections (60-80% faster than traditional methods)
- **Cost Breakdown**: Detailed breakdown by issue category
- **ROI Analysis**: Calculate return on investment for fixing issues
- **Priority-Based**: Estimates weighted by issue severity

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Git** installed on your system
- Public GitHub repository to analyze

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/bobshield-ai.git
cd bobshield-ai
```
> Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username

2. **Install dependencies for both frontend and backend**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### Running the Application

**You need TWO terminal windows open simultaneously:**

#### Terminal 1 - Backend Server
```bash
cd server
npm start
```
✅ Backend runs on `http://localhost:5000`

#### Terminal 2 - Frontend Application
```bash
cd client
npm run dev
```
✅ Frontend runs on `http://localhost:3000`

#### Access the Application
Open your browser and navigate to: **`http://localhost:3000`**

> **Note:** Both servers must be running at the same time for the application to work properly.

---

### Production Build (Optional)

```bash
# Build frontend for production
cd client
npm run build

# Preview production build
npm run preview
```

## 📖 How to Use

### 1. Analyze a Repository

1. Open BobShield AI in your browser
2. Enter a public GitHub repository URL (e.g., `https://github.com/username/repo`)
3. Click "Analyze Repository"
4. Wait for the analysis to complete (typically 10-30 seconds)

### 2. Review Results

Navigate through the tabs to explore:

- **Overview**: High-level statistics and issue summary
- **Detailed Issues**: In-depth analysis of each problem
- **Repair Plan**: IBM Bob prompts for automated fixes
- **Before/After**: Potential improvement visualization

### 3. Fix Issues with IBM Bob

1. Go to the "Repair Plan" tab
2. Click "Copy Prompt" for any issue
3. Paste the prompt into IBM Bob
4. Let Bob automatically implement the fixes
5. Re-analyze to see improvements!

### 4. Export Reports

Click the "Export PDF Report" button to download a professionally formatted PDF containing:
- Complete analysis results with visual hierarchy
- Color-coded issue severity indicators
- Technical debt analysis with AI-assisted estimates
- Repair plan tasks with priority badges
- Score breakdown and statistics
- Professional branding and layout

## 🏗️ Project Structure

```
bobshield-ai/
├── client/                      # React frontend
│   ├── src/
│   │   ├── App.jsx             # Main application component
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Tailwind CSS styles
│   ├── package.json
│   └── vite.config.js
├── server/                      # Node.js backend
│   ├── index.js                # Express server & scanner logic
│   ├── temp-repos/             # Temporary cloned repositories
│   └── package.json
├── sample-projects/             # Sample projects for testing
│   └── broken-task-manager/
└── README.md
```

## 🔍 What BobShield Detects

### 🔒 Security Issues
- Hardcoded API keys and secrets
- Exposed passwords and tokens
- JWT secrets in code
- Database URLs with credentials
- AWS secrets and private keys

### 📝 Documentation Issues
- Missing README.md
- Missing .env.example
- Missing DEPLOYMENT.md
- Missing .gitignore
- Missing LICENSE file

### 🧪 Code Quality Issues
- TODO and FIXME comments
- Duplicate function definitions (with code snippets)
- Missing test files
- Long functions (>50 lines)
- Excessive console statements
- Code smells and anti-patterns

### ⚡ Reliability Issues
- Weak error handling
- Missing try-catch blocks
- Unhandled async operations
- Missing error boundaries (React)

## 📊 Scoring Algorithm

BobShield uses a sophisticated 100-point scoring system:

| Issue Type | Deduction | Max Impact |
|------------|-----------|------------|
| Hardcoded Secrets | 5 per file | -20 points |
| Missing Tests | -15 points | -15 points |
| Missing README | -10 points | -10 points |
| Missing .env.example | -8 points | -8 points |
| Missing Deployment Guide | -7 points | -7 points |
| Weak Error Handling | 2 per file | -12 points |
| Duplicate Functions | 3 per duplicate | -10 points |
| Missing .gitignore | -5 points | -5 points |
| Missing LICENSE | -5 points | -5 points |
| TODO/FIXME Comments | 0.5 per comment | -8 points |
| Console Statements | -3 points | -3 points |
| Long Functions | 1 per function | -5 points |

### Status Levels

- **90-100**: 🟢 Excellent - Production ready with best practices
- **80-89**: 🟢 Deployment Ready - Safe to deploy
- **60-79**: 🟡 Improving - Needs some work
- **40-59**: 🟠 Needs Rescue - Significant issues
- **0-39**: 🔴 Critical - Major problems

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Modern JavaScript** - ES6+ features

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **simple-git** - Git operations
- **UUID** - Session management
- **File System API** - Repository scanning

### Analysis Engine
- **Custom Scanner** - Pattern-based code analysis
- **Regex Patterns** - Security vulnerability detection
- **AST Analysis** - Code structure examination
- **Duplicate Detection** - Function-level code comparison with snippets

### PDF Generation
- **jsPDF** - Professional PDF report generation
- **Custom Layout Engine** - Enhanced formatting and visual hierarchy

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
NODE_ENV=development
```

### Customizing Ignore Patterns

Edit `server/index.js` to modify ignored directories:

```javascript
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  // Add your patterns here
];
```

## 📡 API Endpoints

### POST `/api/analyze-repo`
Analyze a GitHub repository

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "score": 75,
  "status": "Improving",
  "issues": { ... },
  "stats": { ... }
}
```

### GET `/api/repair-plan/:sessionId`
Get repair plan for a session

**Response:**
```json
{
  "tasks": [
    {
      "taskTitle": "Remove Hardcoded Secrets",
      "priority": "Critical",
      "exactBobPrompt": "...",
      "expectedOutput": "..."
    }
  ]
}
```

### GET `/api/before-after/:sessionId`
Get before/after comparison

**Response:**
```json
{
  "before": { "score": 45, "status": "Needs Rescue" },
  "after": { "score": 100, "status": "Excellent" },
  "improvement": 55
}
```

### GET `/api/sessions`
List all analysis sessions

### DELETE `/api/cleanup`
Clean up all temporary repositories

## 🧪 Testing

### Test with Sample Project

The included `broken-task-manager` contains intentional issues:

```bash
# Analyze the sample project
# Use URL: file:///path/to/bobshield-ai/sample-projects/broken-task-manager
```

Issues in sample project:
- ❌ No README.md
- ❌ No test files
- ❌ Hardcoded API keys
- ❌ Weak error handling
- ❌ Duplicate functions
- ❌ TODO comments

### Running Tests

```bash
# Backend tests (when implemented)
cd server
npm test

# Frontend tests (when implemented)
cd client
npm test
```

## 🚀 Deployment

### Deploy Backend (Heroku)

```bash
cd server
heroku create bobshield-api
git push heroku main
```

### Deploy Frontend (Vercel)

```bash
cd client
vercel --prod
```

### Deploy with Docker

```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

## 📝 Roadmap

### Completed ✅
- [x] GitHub repository cloning and analysis
- [x] Comprehensive code scanning (security, quality, documentation)
- [x] IBM Bob repair plan generation
- [x] Professional PDF export with enhanced formatting
- [x] Technical debt calculation with AI-assisted estimates
- [x] Duplicate function detection with code snippets
- [x] Modern UI with glass morphism design
- [x] Session management and history

### Planned 🚀
- [ ] Support for private repositories (OAuth)
- [ ] Real-time analysis progress updates with WebSocket
- [ ] Historical analysis tracking and trends
- [ ] Team collaboration features
- [ ] CI/CD integration (GitHub Actions, GitLab CI)
- [ ] Custom rule configuration
- [ ] Multi-repository comparison
- [ ] Scheduled automatic scans
- [ ] Slack/Discord notifications
- [ ] Advanced code metrics (cyclomatic complexity, maintainability index)
- [ ] MCP (Model Context Protocol) integration
- [ ] AI-powered code suggestions beyond IBM Bob

## 🐛 Known Issues

- Large repositories (>1000 files) may take longer to analyze
- Binary files are skipped during analysis
- Temporary repositories stored in `server/temp-repos/` (cleaned up automatically)
- PDF export may have layout issues with very long file paths

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for integration with **IBM Bob** AI assistant
- Inspired by the need for automated code quality improvement
- Thanks to the open-source community for amazing tools

## 📞 Support

For questions, issues, or contributions:
- Open an issue on your GitHub repository
- Submit a pull request with improvements
- Share your feedback and suggestions

## 💡 Tips for Best Results

1. **Clean Repository**: Ensure your repository is up-to-date before analysis
2. **Public Access**: Repository must be publicly accessible
3. **Regular Scans**: Run analysis after major changes to track improvements
4. **Use IBM Bob**: Copy repair prompts directly to IBM Bob for automated fixes
5. **Export Reports**: Save PDF reports for documentation and team reviews
6. **Technical Debt**: Use AI-assisted estimates for realistic project planning

## 🌟 Star History

If you find BobShield AI helpful, please consider giving it a star! ⭐

---

**Made with ❤️ for developers who want deployment-ready code**

*BobShield AI - From Broken Code to Production Excellence*