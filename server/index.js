import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create temp directory for cloned repos
const TEMP_DIR = path.join(__dirname, 'temp-repos');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Store analysis sessions
const sessions = new Map();

// Scanner utility functions
const IGNORE_PATTERNS = [
  'node_modules', 
  '.git', 
  'dist', 
  'build', 
  'coverage',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.next',
  '.nuxt',
  'out',
  '.cache',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  'env'
];

function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      
      if (shouldIgnore(fullPath)) {
        return;
      }

      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      } catch (err) {
        // Skip files we can't access
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }

  return arrayOfFiles;
}

function detectHardcodedSecrets(content) {
  const secretPatterns = [
    { pattern: /API_KEY\s*=\s*["'][^"']+["']/gi, type: 'API Key' },
    { pattern: /SECRET\s*=\s*["'][^"']+["']/gi, type: 'Secret' },
    { pattern: /TOKEN\s*=\s*["'][^"']+["']/gi, type: 'Token' },
    { pattern: /PASSWORD\s*=\s*["'][^"']+["']/gi, type: 'Password' },
    { pattern: /JWT_SECRET\s*=\s*["'][^"']+["']/gi, type: 'JWT Secret' },
    { pattern: /PRIVATE_KEY\s*=\s*["'][^"']+["']/gi, type: 'Private Key' },
    { pattern: /AWS_SECRET\s*=\s*["'][^"']+["']/gi, type: 'AWS Secret' },
    { pattern: /DATABASE_URL\s*=\s*["'].*:\/\/.*:.*@.*["']/gi, type: 'Database URL with credentials' },
  ];

  const matches = [];
  secretPatterns.forEach(({ pattern, type }) => {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found.map(match => ({ match, type })));
    }
  });

  return matches;
}

function detectTodoFixme(content) {
  const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX|BUG).*$/gim;
  return content.match(todoPattern) || [];
}

function detectDuplicateFunctions(files, projectPath) {
  const functionNames = {};
  const duplicates = [];

  files.forEach(file => {
    if (!file.endsWith('.js') && !file.endsWith('.ts') && !file.endsWith('.jsx') && !file.endsWith('.tsx')) return;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const functionPattern = /(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s*)?\(|export\s+(?:async\s+)?function\s+(\w+))/g;
      let match;

      while ((match = functionPattern.exec(content)) !== null) {
        const funcName = match[1] || match[2] || match[3];
        if (funcName && funcName.length > 3) { // Ignore very short names
          // Find the line number where this function is defined
          const lineIndex = content.substring(0, match.index).split('\n').length - 1;
          
          // Extract a snippet (function signature + first few lines)
          const snippetLines = lines.slice(lineIndex, Math.min(lineIndex + 5, lines.length));
          const snippet = snippetLines.join('\n').substring(0, 200) + (snippetLines.join('\n').length > 200 ? '...' : '');

          // Convert to relative path
          const relativePath = path.relative(projectPath, file);

          if (functionNames[funcName]) {
            const existing = duplicates.find(d => d.name === funcName);
            if (existing) {
              const fileEntry = { file: relativePath, snippet, line: lineIndex + 1 };
              if (!existing.locations.find(loc => loc.file === relativePath)) {
                existing.locations.push(fileEntry);
              }
            } else {
              duplicates.push({
                name: funcName,
                locations: [
                  functionNames[funcName],
                  { file: relativePath, snippet, line: lineIndex + 1 }
                ]
              });
            }
          } else {
            functionNames[funcName] = { file: relativePath, snippet, line: lineIndex + 1 };
          }
        }
      }
    } catch (err) {
      // Skip files that can't be read
    }
  });

  return duplicates;
}

function detectWeakErrorHandling(files) {
  const weakFiles = [];

  files.forEach(file => {
    if (!file.endsWith('.js') && !file.endsWith('.ts') && !file.endsWith('.jsx') && !file.endsWith('.tsx')) return;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check if file has async functions or promises but no try-catch
      const hasAsync = /async\s+function|async\s*\(|async\s+\w+\s*=>/.test(content);
      const hasPromise = /\.then\(|\.catch\(|Promise\./.test(content);
      const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/.test(content);
      const hasErrorBoundary = /componentDidCatch|ErrorBoundary/.test(content);

      if ((hasAsync || hasPromise) && !hasTryCatch && !hasErrorBoundary) {
        weakFiles.push(file);
      }
    } catch (err) {
      // Skip files that can't be read
    }
  });

  return weakFiles;
}

function detectCodeSmells(files) {
  const smells = {
    longFunctions: [],
    deepNesting: [],
    magicNumbers: [],
    consoleStatements: []
  };

  files.forEach(file => {
    if (!file.endsWith('.js') && !file.endsWith('.ts') && !file.endsWith('.jsx') && !file.endsWith('.tsx')) return;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Detect console.log statements (should use proper logging)
      const consoleMatches = content.match(/console\.(log|warn|error|debug)/g);
      if (consoleMatches && consoleMatches.length > 3) {
        smells.consoleStatements.push({
          file,
          count: consoleMatches.length
        });
      }

      // Detect long functions (>50 lines)
      const functionStarts = [];
      lines.forEach((line, idx) => {
        if (/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/.test(line)) {
          functionStarts.push(idx);
        }
      });

      // Simple heuristic for function length
      for (let i = 0; i < functionStarts.length; i++) {
        const start = functionStarts[i];
        const end = functionStarts[i + 1] || lines.length;
        if (end - start > 50) {
          smells.longFunctions.push({
            file,
            line: start + 1,
            length: end - start
          });
        }
      }

    } catch (err) {
      // Skip files that can't be read
    }
  });

  return smells;
}

function generateInsights(issues, score, stats) {
  const insights = [];

  // Pattern Analysis
  if (issues.weakErrorHandling.length > 5) {
    insights.push({
      type: 'pattern',
      severity: 'high',
      icon: '⚠️',
      title: 'Inconsistent Error Handling Pattern',
      message: `Found ${issues.weakErrorHandling.length} files with weak error handling. This pattern suggests a systemic issue.`,
      recommendation: 'Implement a centralized error handling strategy using try-catch blocks and error boundaries.',
      impact: 'Reduces debugging time by 40% and prevents production crashes',
      actionable: true,
      estimatedTime: '2-3 days'
    });
  }

  // Security Analysis
  if (issues.hardcodedSecrets.length > 0) {
    insights.push({
      type: 'security',
      severity: 'critical',
      icon: '🔒',
      title: 'Security Vulnerability Detected',
      message: `Found ${issues.hardcodedSecrets.length} hardcoded secret(s). This is a critical security risk.`,
      recommendation: 'Immediately move all secrets to environment variables and rotate exposed credentials.',
      impact: 'Prevents potential security breaches and data leaks',
      actionable: true,
      estimatedTime: '1 day'
    });
  }

  // Code Quality Insights
  if (issues.duplicateFunctions.length > 3) {
    insights.push({
      type: 'quality',
      severity: 'medium',
      icon: '🔄',
      title: 'High Code Duplication',
      message: `Found ${issues.duplicateFunctions.length} duplicate functions. This increases maintenance burden.`,
      recommendation: 'Refactor duplicate code into reusable utility functions or shared modules.',
      impact: 'Reduces codebase size by ~15% and improves maintainability',
      actionable: true,
      estimatedTime: '3-4 days'
    });
  }

  // Documentation Insights
  const missingDocs = [
    issues.missingReadme,
    issues.missingEnvExample,
    issues.missingDeployment,
    issues.missingLicense
  ].filter(Boolean).length;

  if (missingDocs >= 3) {
    insights.push({
      type: 'documentation',
      severity: 'high',
      icon: '📝',
      title: 'Poor Documentation Coverage',
      message: `Missing ${missingDocs} critical documentation files. This hinders onboarding and collaboration.`,
      recommendation: 'Create comprehensive documentation including README, deployment guide, and environment setup.',
      impact: 'Reduces onboarding time by 60% and improves team collaboration',
      actionable: true,
      estimatedTime: '2 days'
    });
  }

  // Testing Insights
  if (issues.missingTests) {
    insights.push({
      type: 'testing',
      severity: 'high',
      icon: '🧪',
      title: 'No Test Coverage',
      message: 'No test files detected. This significantly increases risk of bugs in production.',
      recommendation: 'Implement comprehensive test suite with at least 70% code coverage.',
      impact: 'Reduces production bugs by 80% and increases deployment confidence',
      actionable: true,
      estimatedTime: '1-2 weeks'
    });
  }

  // Positive Insights
  if (score >= 80) {
    insights.push({
      type: 'positive',
      severity: 'info',
      icon: '✨',
      title: 'Excellent Code Quality',
      message: 'Your codebase demonstrates strong engineering practices and is deployment-ready.',
      recommendation: 'Maintain current standards and consider sharing your practices with the team.',
      impact: 'Sets a benchmark for other projects',
      actionable: false
    });
  }

  // Complexity Insights
  if (stats.linesOfCode > 10000 && issues.duplicateFunctions.length > 5) {
    insights.push({
      type: 'complexity',
      severity: 'medium',
      icon: '📊',
      title: 'Growing Complexity',
      message: 'Large codebase with increasing duplication suggests architectural review needed.',
      recommendation: 'Consider modularizing the codebase and implementing design patterns.',
      impact: 'Improves long-term maintainability and scalability',
      actionable: true,
      estimatedTime: '1-2 weeks'
    });
  }

  return insights;
}

function calculateTechnicalDebt(issues, stats) {
  const hourlyRate = 75; // Reduced rate considering AI assistance
  let totalHours = 0;
  const breakdown = {};

  // Security issues (high priority) - AI can help but needs review
  if (issues.hardcodedSecrets.length > 0) {
    const hours = issues.hardcodedSecrets.length * 0.5; // 30 min per secret with AI
    totalHours += hours;
    breakdown.security = {
      hours,
      cost: hours * hourlyRate,
      priority: 'Critical'
    };
  }

  // Missing tests - AI can generate but needs customization
  if (issues.missingTests) {
    const hours = Math.min(Math.ceil(stats.linesOfCode / 500), 20); // Max 20h, AI speeds this up 5x
    totalHours += hours;
    breakdown.testing = {
      hours,
      cost: hours * hourlyRate,
      priority: 'High'
    };
  }

  // Weak error handling - Quick with AI assistance
  if (issues.weakErrorHandling.length > 0) {
    const hours = issues.weakErrorHandling.length * 0.5; // 30 min per file with AI
    totalHours += hours;
    breakdown.errorHandling = {
      hours,
      cost: hours * hourlyRate,
      priority: 'High'
    };
  }

  // Documentation - AI excels at this
  const missingDocs = [
    issues.missingReadme,
    issues.missingEnvExample,
    issues.missingDeployment
  ].filter(Boolean).length;

  if (missingDocs > 0) {
    const hours = missingDocs * 0.5; // 30 min per doc with AI
    totalHours += hours;
    breakdown.documentation = {
      hours,
      cost: hours * hourlyRate,
      priority: 'Medium'
    };
  }

  // Duplicate functions - AI can refactor quickly
  if (issues.duplicateFunctions.length > 0) {
    const hours = issues.duplicateFunctions.length * 0.75; // 45 min per duplicate with AI
    totalHours += hours;
    breakdown.duplication = {
      hours,
      cost: hours * hourlyRate,
      priority: 'Medium'
    };
  }

  const totalCost = totalHours * hourlyRate;
  const futureTimeSaved = totalHours * 3; // Fixing now saves 3x time later (bugs, maintenance, onboarding)
  const roi = (futureTimeSaved * hourlyRate) - totalCost;

  return {
    totalHours: Math.ceil(totalHours * 10) / 10, // Round to 1 decimal
    totalCost: Math.ceil(totalCost),
    breakdown,
    roi: Math.round((roi / totalCost) * 100) || 0,
    roiDetails: {
      timeToFix: totalHours < 8 ? `${Math.ceil(totalHours)}h` : `${Math.ceil(totalHours / 8)} days`,
      futureTimeSaved: `${Math.ceil(futureTimeSaved)}h/year saved`,
      netBenefit: Math.ceil(roi),
      percentage: Math.round((roi / totalCost) * 100) || 0
    },
    aiAssisted: true,
    note: 'Estimates include AI-assisted development (60-80% faster than traditional methods)'
  };
}

function generateRecommendations(score, issues, insights) {
  const recommendations = [];

  if (score < 40) {
    recommendations.push({
      priority: 'Immediate',
      title: 'Critical Quality Issues',
      actions: [
        'Address all security vulnerabilities immediately',
        'Implement basic error handling',
        'Create essential documentation (README, .env.example)',
        'Set up basic test framework'
      ],
      timeline: '1-2 weeks',
      impact: 'Brings code to minimum acceptable quality'
    });
  } else if (score < 60) {
    recommendations.push({
      priority: 'High',
      title: 'Quality Improvement Sprint',
      actions: [
        'Fix remaining security issues',
        'Increase test coverage to 50%',
        'Complete documentation',
        'Refactor duplicate code'
      ],
      timeline: '2-3 weeks',
      impact: 'Makes code deployment-ready'
    });
  } else if (score < 80) {
    recommendations.push({
      priority: 'Medium',
      title: 'Excellence Push',
      actions: [
        'Achieve 70%+ test coverage',
        'Implement comprehensive error handling',
        'Add deployment automation',
        'Create contribution guidelines'
      ],
      timeline: '3-4 weeks',
      impact: 'Achieves production-grade quality'
    });
  } else {
    recommendations.push({
      priority: 'Maintenance',
      title: 'Maintain Excellence',
      actions: [
        'Regular code reviews',
        'Keep dependencies updated',
        'Monitor and improve test coverage',
        'Document architectural decisions'
      ],
      timeline: 'Ongoing',
      impact: 'Sustains high quality standards'
    });
  }

  return recommendations;
}

function compareWithBenchmarks(score, stats) {
  // Industry benchmarks (based on research)
  const benchmarks = {
    startup: { average: 65, top10: 85 },
    enterprise: { average: 75, top10: 90 },
    openSource: { average: 70, top10: 88 }
  };

  // Determine project type based on characteristics
  let projectType = 'startup';
  if (stats.linesOfCode > 50000) projectType = 'enterprise';
  if (stats.languages['.md'] > 5) projectType = 'openSource';

  const benchmark = benchmarks[projectType];
  const percentile = score >= benchmark.top10 ? 'Top 10%' :
                     score >= benchmark.average ? 'Above Average' :
                     score >= benchmark.average * 0.8 ? 'Average' : 'Below Average';

  return {
    projectType,
    yourScore: score,
    industryAverage: benchmark.average,
    top10Threshold: benchmark.top10,
    percentile,
    comparison: score - benchmark.average,
    message: score >= benchmark.top10 
      ? '🏆 Exceptional! Your code quality is in the top 10%'
      : score >= benchmark.average
      ? '✅ Good! Above industry average'
      : '⚠️ Needs improvement to reach industry standards'
  };
}

function scanProject(projectPath) {
  const issues = {
    missingReadme: false,
    missingTests: false,
    missingEnvExample: false,
    missingDeployment: false,
    missingGitignore: false,
    missingLicense: false,
    hardcodedSecrets: [],
    todoFixme: [],
    duplicateFunctions: [],
    weakErrorHandling: [],
    codeSmells: {},
    fileCount: 0,
    languages: {},
    linesOfCode: 0
  };

  // Check for required files
  const hasReadme = fs.existsSync(path.join(projectPath, 'README.md'));
  const hasEnvExample = fs.existsSync(path.join(projectPath, '.env.example'));
  const hasDeployment = fs.existsSync(path.join(projectPath, 'DEPLOYMENT.md'));
  const hasGitignore = fs.existsSync(path.join(projectPath, '.gitignore'));
  const hasLicense = fs.existsSync(path.join(projectPath, 'LICENSE')) || 
                     fs.existsSync(path.join(projectPath, 'LICENSE.md'));

  issues.missingReadme = !hasReadme;
  issues.missingEnvExample = !hasEnvExample;
  issues.missingDeployment = !hasDeployment;
  issues.missingGitignore = !hasGitignore;
  issues.missingLicense = !hasLicense;

  // Get all files
  const allFiles = getAllFiles(projectPath);
  issues.fileCount = allFiles.length;

  // Check for test files
  const hasTests = allFiles.some(file => 
    file.includes('.test.') || 
    file.includes('.spec.') || 
    file.includes('__tests__') ||
    file.includes('test/') ||
    file.includes('tests/')
  );
  issues.missingTests = !hasTests;

  // Language summary and LOC
  allFiles.forEach(file => {
    const ext = path.extname(file);
    if (ext) {
      issues.languages[ext] = (issues.languages[ext] || 0) + 1;
    }

    // Count lines of code
    try {
      const content = fs.readFileSync(file, 'utf-8');
      issues.linesOfCode += content.split('\n').length;
    } catch (err) {
      // Skip binary files
    }
  });

  // Scan file contents
  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Detect hardcoded secrets
      const secrets = detectHardcodedSecrets(content);
      if (secrets.length > 0) {
        issues.hardcodedSecrets.push({
          file: path.relative(projectPath, file),
          secrets: secrets.map(s => s.match)
        });
      }

      // Detect TODO/FIXME
      const todos = detectTodoFixme(content);
      if (todos.length > 0) {
        issues.todoFixme.push({
          file: path.relative(projectPath, file),
          comments: todos
        });
      }
    } catch (err) {
      // Skip binary or unreadable files
    }
  });

  // Detect duplicate functions
  issues.duplicateFunctions = detectDuplicateFunctions(allFiles, projectPath);

  // Detect weak error handling
  const weakFiles = detectWeakErrorHandling(allFiles);
  issues.weakErrorHandling = weakFiles.map(file => path.relative(projectPath, file));

  // Detect code smells
  issues.codeSmells = detectCodeSmells(allFiles);

  return issues;
}

function calculateScore(issues) {
  let score = 100;
  const deductions = [];

  if (issues.hardcodedSecrets.length > 0) {
    const deduction = Math.min(20, issues.hardcodedSecrets.length * 5);
    score -= deduction;
    deductions.push({ reason: 'Hardcoded secrets', points: deduction });
  }
  
  if (issues.missingTests) {
    score -= 15;
    deductions.push({ reason: 'Missing tests', points: 15 });
  }
  
  if (issues.missingReadme) {
    score -= 10;
    deductions.push({ reason: 'Missing README', points: 10 });
  }
  
  if (issues.missingEnvExample) {
    score -= 8;
    deductions.push({ reason: 'Missing .env.example', points: 8 });
  }
  
  if (issues.missingDeployment) {
    score -= 7;
    deductions.push({ reason: 'Missing deployment guide', points: 7 });
  }
  
  if (issues.missingGitignore) {
    score -= 5;
    deductions.push({ reason: 'Missing .gitignore', points: 5 });
  }
  
  if (issues.missingLicense) {
    score -= 5;
    deductions.push({ reason: 'Missing LICENSE', points: 5 });
  }
  
  if (issues.todoFixme.length > 0) {
    const deduction = Math.min(8, Math.ceil(issues.todoFixme.length / 2));
    score -= deduction;
    deductions.push({ reason: 'TODO/FIXME comments', points: deduction });
  }
  
  if (issues.weakErrorHandling.length > 0) {
    const deduction = Math.min(12, issues.weakErrorHandling.length * 2);
    score -= deduction;
    deductions.push({ reason: 'Weak error handling', points: deduction });
  }
  
  if (issues.duplicateFunctions.length > 0) {
    const deduction = Math.min(10, issues.duplicateFunctions.length * 3);
    score -= deduction;
    deductions.push({ reason: 'Duplicate functions', points: deduction });
  }

  if (issues.codeSmells.consoleStatements?.length > 0) {
    score -= 3;
    deductions.push({ reason: 'Excessive console statements', points: 3 });
  }

  if (issues.codeSmells.longFunctions?.length > 0) {
    const deduction = Math.min(5, issues.codeSmells.longFunctions.length);
    score -= deduction;
    deductions.push({ reason: 'Long functions', points: deduction });
  }

  return { score: Math.max(0, score), deductions };
}

function getStatus(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Deployment Ready';
  if (score >= 60) return 'Improving';
  if (score >= 40) return 'Needs Rescue';
  return 'Critical';
}

function generateRepairPlan(issues) {
  const tasks = [];

  if (issues.hardcodedSecrets.length > 0) {
    tasks.push({
      taskTitle: 'Remove Hardcoded Secrets',
      priority: 'Critical',
      category: 'Security',
      issue: `Found ${issues.hardcodedSecrets.length} file(s) with hardcoded secrets`,
      impact: 'High - Security vulnerability',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to fix critical security issues in my code.

Task: Remove all hardcoded secrets and move them to environment variables.

Files with issues:
${issues.hardcodedSecrets.map(s => `- ${s.file}: ${s.secrets.join(', ')}`).join('\n')}

Steps:
1. Create a .env.example file with placeholder values for all secrets
2. Replace all hardcoded secrets with process.env variables
3. Add .env to .gitignore if not already present
4. Update README with clear instructions on setting up environment variables
5. Add validation to ensure required environment variables are set

Please implement these changes now.`,
      expectedOutput: 'Environment variables configured, .env.example created, secrets removed from code, validation added'
    });
  }

  if (issues.missingTests) {
    tasks.push({
      taskTitle: 'Add Comprehensive Test Coverage',
      priority: 'High',
      category: 'Quality',
      issue: 'No test files found in the project',
      impact: 'High - No quality assurance',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to add comprehensive test coverage to my project.

Task: Create a complete testing setup with unit and integration tests.

Steps:
1. Set up a modern testing framework (Jest for Node.js, Vitest for Vite projects)
2. Create test files for all core functions and API endpoints
3. Add test scripts to package.json (test, test:watch, test:coverage)
4. Write meaningful test cases covering happy paths and edge cases
5. Aim for at least 70% code coverage
6. Add GitHub Actions workflow for running tests on CI/CD

Please implement these changes now.`,
      expectedOutput: 'Testing framework configured, comprehensive test files created, tests passing, CI/CD setup'
    });
  }

  if (issues.missingReadme) {
    tasks.push({
      taskTitle: 'Create Professional README Documentation',
      priority: 'High',
      category: 'Documentation',
      issue: 'Missing README.md file',
      impact: 'Medium - Poor project discoverability',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to create comprehensive, professional documentation.

Task: Create a detailed README.md file that makes the project easy to understand and use.

Include:
1. Project title with logo/banner (if applicable)
2. Badges (build status, coverage, version, license)
3. Clear project description and purpose
4. Key features list with emojis
5. Tech stack with versions
6. Prerequisites and system requirements
7. Step-by-step installation instructions
8. Usage examples with code snippets
9. API documentation (if applicable)
10. Configuration options
11. Contributing guidelines
12. License information
13. Contact/support information

Please create this README.md now with professional formatting.`,
      expectedOutput: 'Professional README.md created with all sections, well-formatted and comprehensive'
    });
  }

  if (issues.missingEnvExample) {
    tasks.push({
      taskTitle: 'Add Environment Configuration Template',
      priority: 'High',
      category: 'Configuration',
      issue: 'Missing .env.example file',
      impact: 'Medium - Difficult setup for new developers',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to create environment configuration documentation.

Task: Create a comprehensive .env.example file with all required environment variables.

Steps:
1. Scan the codebase to identify all environment variables used
2. Create .env.example with placeholder values for each variable
3. Add detailed comments explaining each variable's purpose
4. Group related variables together
5. Include example values where appropriate
6. Update README with environment setup instructions
7. Add validation script to check for required variables

Please implement these changes now.`,
      expectedOutput: '.env.example created with all variables documented, README updated, validation added'
    });
  }

  if (issues.missingDeployment) {
    tasks.push({
      taskTitle: 'Create Deployment Guide',
      priority: 'Medium',
      category: 'Documentation',
      issue: 'Missing DEPLOYMENT.md file',
      impact: 'Medium - Deployment complexity',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to create comprehensive deployment documentation.

Task: Create a detailed DEPLOYMENT.md file covering all deployment scenarios.

Include:
1. Prerequisites for deployment (Node version, dependencies, etc.)
2. Environment setup for production
3. Step-by-step deployment instructions for multiple platforms:
   - Vercel
   - Netlify
   - AWS (EC2, Lambda, ECS)
   - Heroku
   - Docker deployment
4. Database migration steps (if applicable)
5. Environment variables configuration
6. SSL/HTTPS setup
7. Monitoring and logging setup
8. Common deployment issues and troubleshooting
9. Rollback procedures
10. Performance optimization tips

Please create this DEPLOYMENT.md now.`,
      expectedOutput: 'Comprehensive DEPLOYMENT.md created with multi-platform deployment instructions'
    });
  }

  if (issues.weakErrorHandling.length > 0) {
    tasks.push({
      taskTitle: 'Implement Robust Error Handling',
      priority: 'High',
      category: 'Reliability',
      issue: `Found ${issues.weakErrorHandling.length} file(s) with weak error handling`,
      impact: 'High - Application stability at risk',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to implement comprehensive error handling.

Task: Add proper error handling and logging throughout the application.

Files with issues:
${issues.weakErrorHandling.map(f => `- ${f}`).join('\n')}

Steps:
1. Wrap all async operations in try-catch blocks
2. Add meaningful, user-friendly error messages
3. Implement proper error logging (consider Winston or Pino)
4. Return appropriate HTTP status codes for API endpoints
5. Add error boundaries for React components (if applicable)
6. Create custom error classes for different error types
7. Add error monitoring (consider Sentry integration)
8. Implement graceful degradation where possible

Please implement these changes now.`,
      expectedOutput: 'Robust error handling implemented, logging configured, error boundaries added, monitoring setup'
    });
  }

  if (issues.duplicateFunctions.length > 0) {
    tasks.push({
      taskTitle: 'Refactor Duplicate Code',
      priority: 'Medium',
      category: 'Code Quality',
      issue: `Found ${issues.duplicateFunctions.length} duplicate function(s)`,
      impact: 'Medium - Code maintainability',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to refactor duplicate code and improve code reusability.

Task: Remove duplicate functions and create reusable utilities.

Duplicate functions found:
${issues.duplicateFunctions.map(d => `- ${d.name} in ${d.locations.map(loc => loc.file).join(' and ')}`).join('\n')}

Steps:
1. Analyze each duplicate function to find the best implementation
2. Create a shared utilities directory (e.g., /utils or /lib)
3. Move common functions to appropriate utility files
4. Add proper JSDoc comments to utility functions
5. Replace all duplicates with imports from the shared location
6. Ensure all tests still pass after refactoring
7. Update imports across the codebase

Please implement these changes now.`,
      expectedOutput: 'Duplicate functions removed, reusable utilities created, code refactored, tests passing'
    });
  }

  if (issues.todoFixme.length > 0) {
    const totalComments = issues.todoFixme.reduce((sum, t) => sum + t.comments.length, 0);
    tasks.push({
      taskTitle: 'Resolve TODO and FIXME Comments',
      priority: 'Low',
      category: 'Code Quality',
      issue: `Found ${totalComments} TODO/FIXME comment(s) in ${issues.todoFixme.length} file(s)`,
      impact: 'Low - Technical debt',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to resolve all pending TODO and FIXME comments.

Task: Address all TODO and FIXME comments in the code.

Files with comments:
${issues.todoFixme.map(t => `- ${t.file}: ${t.comments.length} comment(s)`).join('\n')}

Steps:
1. Review each TODO/FIXME comment carefully
2. Implement the required functionality or fix
3. Remove the comment once resolved
4. If not immediately fixable, create a GitHub issue with details
5. Replace the comment with a reference to the GitHub issue
6. Prioritize comments marked as FIXME or BUG

Please implement these changes now.`,
      expectedOutput: 'All TODO/FIXME comments resolved or tracked in GitHub issues'
    });
  }

  if (issues.missingGitignore) {
    tasks.push({
      taskTitle: 'Add .gitignore File',
      priority: 'Medium',
      category: 'Configuration',
      issue: 'Missing .gitignore file',
      impact: 'Medium - Risk of committing sensitive files',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to create a comprehensive .gitignore file.

Task: Create a .gitignore file appropriate for this project's tech stack.

Steps:
1. Identify the project's tech stack and frameworks
2. Create .gitignore with appropriate patterns for:
   - Node.js (node_modules, .env, etc.)
   - Build outputs (dist, build, out, etc.)
   - IDE files (.vscode, .idea, etc.)
   - OS files (.DS_Store, Thumbs.db, etc.)
   - Log files (*.log)
   - Temporary files
3. Add comments explaining each section
4. Ensure .env and other sensitive files are included

Please create this .gitignore now.`,
      expectedOutput: 'Comprehensive .gitignore file created for the project'
    });
  }

  if (issues.missingLicense) {
    tasks.push({
      taskTitle: 'Add License File',
      priority: 'Low',
      category: 'Legal',
      issue: 'Missing LICENSE file',
      impact: 'Low - Legal clarity',
      exactBobPrompt: `You are Bob, a highly skilled software engineer. I need you to add a license file to the project.

Task: Add an appropriate open-source license.

Steps:
1. Ask the user which license they prefer (MIT, Apache 2.0, GPL, etc.)
2. If no preference, recommend MIT for maximum permissiveness
3. Create LICENSE file with the full license text
4. Update package.json with the license field
5. Add license badge to README.md

Please implement these changes now. If unsure about license choice, use MIT.`,
      expectedOutput: 'LICENSE file added, package.json updated, README badge added'
    });
  }

  return tasks;
}

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clone and analyze GitHub repository
app.post('/api/analyze-repo', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Validate GitHub URL
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubUrlPattern.test(repoUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const sessionId = uuidv4();
    const repoPath = path.join(TEMP_DIR, sessionId);

    // Clone repository
    console.log(`Cloning repository: ${repoUrl}`);
    const git = simpleGit();
    
    try {
      await git.clone(repoUrl, repoPath, ['--depth', '1']);
    } catch (cloneError) {
      console.error('Clone error:', cloneError);
      return res.status(400).json({ 
        error: 'Failed to clone repository. Please check the URL and ensure the repository is public.' 
      });
    }

    // Scan the cloned repository
    console.log(`Scanning repository at: ${repoPath}`);
    const issues = scanProject(repoPath);
    const { score, deductions } = calculateScore(issues);
    const status = getStatus(score);

    // Generate advanced insights
    const stats = {
      totalFiles: issues.fileCount,
      linesOfCode: issues.linesOfCode,
      languages: issues.languages
    };
    
    const insights = generateInsights(issues, score, stats);
    const technicalDebt = calculateTechnicalDebt(issues, stats);
    const recommendations = generateRecommendations(score, issues, insights);
    const benchmarks = compareWithBenchmarks(score, stats);

    // Store session data
    const sessionData = {
      sessionId,
      repoUrl,
      repoPath,
      timestamp: new Date().toISOString(),
      score,
      status,
      issues,
      deductions,
      insights,
      technicalDebt,
      recommendations,
      benchmarks
    };

    sessions.set(sessionId, sessionData);

    // Clean up old sessions (keep last 10)
    if (sessions.size > 10) {
      const oldestKey = sessions.keys().next().value;
      const oldSession = sessions.get(oldestKey);
      try {
        fs.rmSync(oldSession.repoPath, { recursive: true, force: true });
      } catch (err) {
        console.error('Error cleaning up old session:', err);
      }
      sessions.delete(oldestKey);
    }

    const response = {
      sessionId,
      repoUrl,
      score,
      status,
      deploymentReadiness: `${score}%`,
      issues,
      deductions,
      insights,
      technicalDebt,
      recommendations,
      benchmarks,
      topPriorityFixes: [
        issues.hardcodedSecrets.length > 0 && 'Remove hardcoded secrets',
        issues.missingTests && 'Add test coverage',
        issues.weakErrorHandling.length > 0 && 'Improve error handling',
        issues.missingReadme && 'Create README documentation'
      ].filter(Boolean),
      stats: {
        totalFiles: issues.fileCount,
        linesOfCode: issues.linesOfCode,
        languages: issues.languages
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze repository: ' + error.message });
  }
});

// Get repair plan for a session
app.get('/api/repair-plan/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const repairPlan = generateRepairPlan(session.issues);

    res.json({ 
      sessionId,
      repoUrl: session.repoUrl,
      tasks: repairPlan 
    });
  } catch (error) {
    console.error('Repair plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get before/after comparison
app.get('/api/before-after/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const before = {
      score: session.score,
      status: session.status,
      issues: {
        security: session.issues.hardcodedSecrets.length,
        quality: session.issues.missingTests ? 1 : 0,
        documentation: [
          session.issues.missingReadme, 
          session.issues.missingEnvExample, 
          session.issues.missingDeployment
        ].filter(Boolean).length,
        reliability: session.issues.weakErrorHandling.length
      }
    };

    // Calculate potential "after" score
    const potentialScore = 100;
    const after = {
      score: potentialScore,
      status: 'Excellent',
      issues: {
        security: 0,
        quality: 0,
        documentation: 0,
        reliability: 0
      }
    };

    res.json({ 
      sessionId,
      repoUrl: session.repoUrl,
      before, 
      after,
      improvement: potentialScore - session.score
    });
  } catch (error) {
    console.error('Before/after error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session details
app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      repoUrl: session.repoUrl,
      timestamp: session.timestamp,
      score: session.score,
      status: session.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all sessions
app.get('/api/sessions', (req, res) => {
  try {
    const sessionList = Array.from(sessions.values()).map(s => ({
      sessionId: s.sessionId,
      repoUrl: s.repoUrl,
      timestamp: s.timestamp,
      score: s.score,
      status: s.status
    }));

    res.json({ sessions: sessionList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup endpoint (for development)
app.delete('/api/cleanup', (req, res) => {
  try {
    sessions.forEach((session) => {
      try {
        fs.rmSync(session.repoPath, { recursive: true, force: true });
      } catch (err) {
        console.error('Error cleaning up session:', err);
      }
    });
    sessions.clear();
    res.json({ message: 'All sessions cleaned up' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  BobShield AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 Ready to analyze GitHub repositories`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, cleaning up...');
  sessions.forEach((session) => {
    try {
      fs.rmSync(session.repoPath, { recursive: true, force: true });
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  });
  process.exit(0);
});

// Made with Bob
