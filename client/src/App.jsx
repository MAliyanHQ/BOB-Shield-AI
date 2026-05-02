import { useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [scanData, setScanData] = useState(null)
  const [repairPlan, setRepairPlan] = useState(null)
  const [beforeAfter, setBeforeAfter] = useState(null)
  const [error, setError] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const analyzeRepository = async (e) => {
    e.preventDefault()
    
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    setLoading(true)
    setAnalyzing(true)
    setError(null)
    setScanData(null)
    setRepairPlan(null)
    setBeforeAfter(null)

    try {
      const analyzeRes = await fetch('http://localhost:5000/api/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() })
      })

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json()
        throw new Error(errorData.error || 'Failed to analyze repository')
      }

      const analyzeData = await analyzeRes.json()
      setScanData(analyzeData)
      setSessionId(analyzeData.sessionId)

      const [repairRes, beforeAfterRes] = await Promise.all([
        fetch(`http://localhost:5000/api/repair-plan/${analyzeData.sessionId}`),
        fetch(`http://localhost:5000/api/before-after/${analyzeData.sessionId}`)
      ])

      const repairData = await repairRes.json()
      const beforeAfterData = await beforeAfterRes.json()
      
      setRepairPlan(repairData)
      setBeforeAfter(beforeAfterData)
      setAnalyzing(false)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message)
      setAnalyzing(false)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgGradient = (score) => {
    if (score >= 90) return 'from-emerald-500 to-teal-500'
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-yellow-500 to-orange-400'
    if (score >= 40) return 'from-orange-500 to-red-500'
    return 'from-red-600 to-pink-600'
  }

  const getStatusBadge = (status) => {
    const badges = {
      'Excellent': 'bg-gradient-to-r from-emerald-500 to-teal-500',
      'Deployment Ready': 'bg-gradient-to-r from-green-500 to-emerald-500',
      'Improving': 'bg-gradient-to-r from-yellow-500 to-orange-400',
      'Needs Rescue': 'bg-gradient-to-r from-orange-500 to-red-500',
      'Critical': 'bg-gradient-to-r from-red-600 to-pink-600'
    }
    return badges[status] || badges['Critical']
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      'Critical': 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
      'High': 'bg-gradient-to-r from-orange-500 to-red-400 text-white',
      'Medium': 'bg-gradient-to-r from-yellow-500 to-orange-400 text-white',
      'Low': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    }
    return badges[priority] || badges['Low']
  }

  const exportReport = () => {
    try {
      if (!scanData) {
        alert('No analysis data available to export')
        return
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      let yPos = margin

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace = 20) => {
        if (yPos > pageHeight - requiredSpace - margin) {
          doc.addPage()
          yPos = margin
          return true
        }
        return false
      }

      // Helper function to draw a box
      const drawBox = (x, y, width, height, fillColor) => {
        doc.setFillColor(...fillColor)
        doc.rect(x, y, width, height, 'F')
      }

      // Title Section with background
      drawBox(0, 0, pageWidth, 50, [59, 130, 246])
      doc.setFontSize(28)
      doc.setTextColor(255, 255, 255)
      doc.setFont(undefined, 'bold')
      doc.text('BobShield AI', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont(undefined, 'normal')
      doc.text('Code Health Analysis Report', pageWidth / 2, 32, { align: 'center' })
      
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 42, { align: 'center' })
      
      yPos = 60

      // Repository Info Box
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, contentWidth, 15, 'F')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont(undefined, 'bold')
      doc.text('Repository:', margin + 5, yPos + 6)
      doc.setFont(undefined, 'normal')
      const repoText = repoUrl.length > 60 ? repoUrl.substring(0, 57) + '...' : repoUrl
      doc.text(repoText, margin + 5, yPos + 11)
      yPos += 25

      // Score Section with colored box
      const scoreColor = scanData.score >= 80 ? [34, 197, 94] : scanData.score >= 60 ? [234, 179, 8] : [239, 68, 68]
      drawBox(margin, yPos, 60, 35, scoreColor)
      
      doc.setFontSize(32)
      doc.setTextColor(255, 255, 255)
      doc.setFont(undefined, 'bold')
      doc.text(`${scanData.score}`, margin + 30, yPos + 20, { align: 'center' })
      doc.setFontSize(10)
      doc.text('/100', margin + 30, yPos + 28, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Overall Health Score', margin + 70, yPos + 12)
      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(`Status: ${scanData.status}`, margin + 70, yPos + 22)
      
      yPos += 45

      // Statistics Section
      checkNewPage(60)
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Project Statistics', margin, yPos)
      yPos += 10

      // Stats in a grid
      const stats = [
        { label: 'Total Files', value: scanData.stats?.totalFiles || 0 },
        { label: 'Lines of Code', value: (scanData.stats?.linesOfCode || 0).toLocaleString() },
        { label: 'Security Issues', value: scanData.issues?.hardcodedSecrets?.length || 0 },
        { label: 'Missing Tests', value: scanData.issues?.missingTests ? 'Yes' : 'No' },
        { label: 'Error Handling', value: scanData.issues?.weakErrorHandling?.length || 0 },
        { label: 'Duplicates', value: scanData.issues?.duplicateFunctions?.length || 0 }
      ]

      stats.forEach((stat, idx) => {
        const col = idx % 2
        const row = Math.floor(idx / 2)
        const x = margin + (col * (contentWidth / 2))
        const y = yPos + (row * 15)
        
        doc.setFillColor(250, 250, 250)
        doc.rect(x, y, contentWidth / 2 - 5, 12, 'F')
        
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.setFont(undefined, 'normal')
        doc.text(stat.label, x + 3, y + 5)
        
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text(String(stat.value), x + 3, y + 10)
      })
      
      yPos += 50

      // Technical Debt Section
      if (scanData.technicalDebt) {
        checkNewPage(50)
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text('Technical Debt Analysis', margin, yPos)
        yPos += 10

        // AI-Assisted note
        if (scanData.technicalDebt.aiAssisted) {
          doc.setFillColor(219, 234, 254)
          doc.rect(margin, yPos, contentWidth, 12, 'F')
          doc.setFontSize(8)
          doc.setTextColor(30, 64, 175)
          doc.setFont(undefined, 'italic')
          doc.text('AI-Assisted Estimates: 60-80% faster than traditional methods', margin + 3, yPos + 8)
          yPos += 17
        }

        const debtStats = [
          { label: 'Estimated Cost', value: `$${(scanData.technicalDebt.totalCost || 0).toLocaleString()}` },
          { label: 'Estimated Time', value: `${scanData.technicalDebt.totalHours || 0}h` },
          { label: 'Potential ROI', value: `${typeof scanData.technicalDebt.roi === 'object' ? (scanData.technicalDebt.roi?.percentage || 0) : (scanData.technicalDebt.roi || 0)}%` }
        ]

        debtStats.forEach((stat, idx) => {
          const x = margin + (idx * (contentWidth / 3))
          doc.setFillColor(243, 244, 246)
          doc.rect(x, yPos, contentWidth / 3 - 5, 20, 'F')
          
          doc.setFontSize(8)
          doc.setTextColor(100, 100, 100)
          doc.setFont(undefined, 'normal')
          doc.text(stat.label, x + 3, yPos + 6)
          
          doc.setFontSize(14)
          doc.setTextColor(147, 51, 234)
          doc.setFont(undefined, 'bold')
          doc.text(stat.value, x + 3, yPos + 15)
        })
        
        yPos += 30
      }

      // Critical Issues
      checkNewPage(40)
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('Critical Issues', margin, yPos)
      yPos += 10

      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      let hasIssues = false

      const issues = []
      if (scanData.issues?.hardcodedSecrets?.length > 0) {
        issues.push({ text: `${scanData.issues.hardcodedSecrets.length} hardcoded secrets found`, color: [239, 68, 68], priority: 'CRITICAL' })
      }
      if (scanData.issues?.missingTests) {
        issues.push({ text: 'No test coverage detected', color: [251, 146, 60], priority: 'HIGH' })
      }
      if (scanData.issues?.weakErrorHandling?.length > 0) {
        issues.push({ text: `${scanData.issues.weakErrorHandling.length} files with weak error handling`, color: [251, 146, 60], priority: 'HIGH' })
      }
      if (scanData.issues?.missingReadme) {
        issues.push({ text: 'Missing README.md', color: [234, 179, 8], priority: 'MEDIUM' })
      }

      if (issues.length === 0) {
        doc.setFillColor(220, 252, 231)
        doc.rect(margin, yPos, contentWidth, 12, 'F')
        doc.setTextColor(22, 163, 74)
        doc.text('✓ No critical issues found!', margin + 5, yPos + 8)
        yPos += 17
      } else {
        issues.forEach(issue => {
          checkNewPage(15)
          doc.setFillColor(254, 242, 242)
          doc.rect(margin, yPos, contentWidth, 12, 'F')
          
          doc.setFillColor(...issue.color)
          doc.rect(margin, yPos, 3, 12, 'F')
          
          doc.setFontSize(7)
          doc.setTextColor(...issue.color)
          doc.setFont(undefined, 'bold')
          doc.text(issue.priority, margin + 6, yPos + 5)
          
          doc.setFontSize(9)
          doc.setTextColor(60, 60, 60)
          doc.setFont(undefined, 'normal')
          doc.text(issue.text, margin + 6, yPos + 9)
          yPos += 15
        })
      }

      yPos += 10

      // Top Recommendations
      if (repairPlan?.tasks && repairPlan.tasks.length > 0) {
        checkNewPage(40)
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold')
        doc.text('Top Recommendations', margin, yPos)
        yPos += 10

        doc.setFontSize(9)
        repairPlan.tasks.slice(0, 5).forEach((task, idx) => {
          checkNewPage(20)
          
          doc.setFillColor(249, 250, 251)
          doc.rect(margin, yPos, contentWidth, 15, 'F')
          
          const priorityColor = task.priority === 'Critical' ? [239, 68, 68] :
                               task.priority === 'High' ? [251, 146, 60] : [234, 179, 8]
          doc.setFillColor(...priorityColor)
          doc.rect(margin, yPos, 3, 15, 'F')
          
          doc.setTextColor(60, 60, 60)
          doc.setFont(undefined, 'bold')
          doc.text(`${idx + 1}.`, margin + 6, yPos + 6)
          
          doc.setFont(undefined, 'normal')
          const taskText = task.taskTitle.length > 70 ? task.taskTitle.substring(0, 67) + '...' : task.taskTitle
          doc.text(taskText, margin + 12, yPos + 6)
          
          doc.setFontSize(7)
          doc.setTextColor(100, 100, 100)
          doc.text(`Priority: ${task.priority}`, margin + 12, yPos + 11)
          
          yPos += 18
        })
      }

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFillColor(59, 130, 246)
        doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text(
          `Page ${i} of ${pageCount} | BobShield AI - Code Health Analysis`,
          pageWidth / 2,
          pageHeight - 7,
          { align: 'center' }
        )
      }

      // Save PDF
      doc.save(`bobshield-report-${Date.now()}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      alert(`Failed to generate PDF report: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 py-12 relative">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-7xl animate-float">🛡️</div>
              <div>
                <h1 className="text-5xl font-bold mb-2 tracking-tight">BobShield AI</h1>
                <p className="text-xl text-blue-100">Professional Code Health Scanner</p>
              </div>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
              <div className="text-sm text-blue-200 mb-1">Powered by</div>
              <div className="text-3xl font-bold">IBM Bob</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 relative">
        {/* Repository Input Section */}
        <div className="glass-effect rounded-3xl shadow-2xl p-8 mb-8 card-hover">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Analyze Your Repository
            </h2>
            <p className="text-gray-600 text-lg">Enter a public GitHub repository URL for instant code health analysis</p>
          </div>

          <form onSubmit={analyzeRepository} className="max-w-4xl mx-auto">
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all bg-white shadow-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1 active:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Analyze
                  </span>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-6 max-w-4xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <svg className="w-7 h-7 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 font-semibold">{error}</p>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="mt-6 max-w-4xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-5">
                <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <div>
                  <p className="text-blue-900 font-bold text-xl">Analyzing your repository...</p>
                  <p className="text-blue-700">Cloning, scanning files, and detecting issues</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {scanData && !analyzing && (
          <>
            {/* Score Card */}
            <div className="glass-effect rounded-3xl shadow-2xl p-8 mb-8 card-hover">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Code Health Score</h2>
                  <p className="text-gray-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {scanData.repoUrl}
                  </p>
                </div>
                <button
                  onClick={exportReport}
                  className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl hover:from-gray-800 hover:to-black transition-all flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Report
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Display */}
                <div className="text-center lg:col-span-1">
                  <div className={`inline-block p-8 rounded-3xl bg-gradient-to-br ${getScoreBgGradient(scanData.score)} shadow-2xl transform hover:scale-105 transition-transform`}>
                    <p className="text-white text-sm font-semibold mb-2 uppercase tracking-wider">Overall Score</p>
                    <div className="text-8xl font-black text-white mb-4">
                      {scanData.score}
                    </div>
                    <span className={`inline-block px-6 py-2 rounded-full text-sm font-bold text-white ${getStatusBadge(scanData.status)} shadow-lg`}>
                      {scanData.status}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Deployment Readiness</span>
                      <span className="text-2xl font-black text-gray-800">{scanData.deploymentReadiness}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                      <div 
                        className={`h-6 rounded-full transition-all duration-1000 bg-gradient-to-r ${getScoreBgGradient(scanData.score)} shadow-lg`}
                        style={{ width: scanData.deploymentReadiness }}
                      ></div>
                    </div>
                  </div>

                  {scanData.deductions && scanData.deductions.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                      <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        Score Deductions
                      </p>
                      <div className="space-y-2">
                        {scanData.deductions.map((deduction, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white rounded-lg px-4 py-3 shadow-sm">
                            <span className="text-gray-700 font-medium">{deduction.reason}</span>
                            <span className="text-red-600 font-bold text-lg">-{deduction.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanData.topPriorityFixes && scanData.topPriorityFixes.length > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        Top Priority Fixes
                      </h3>
                      <ul className="space-y-3">
                        {scanData.topPriorityFixes.map((fix, index) => (
                          <li key={index} className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                            <span className="text-red-500 text-2xl">•</span>
                            <span className="font-semibold text-gray-800">{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-effect rounded-t-3xl shadow-lg overflow-hidden">
              <div className="flex gap-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'issues', label: 'Issues', icon: '🔍' },
                  { id: 'repair', label: 'Repair Plan', icon: '🔧' },
                  { id: 'comparison', label: 'Before/After', icon: '📈' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl transform scale-105'
                        : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <span className="text-xl mr-2">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="glass-effect rounded-b-3xl shadow-2xl p-8 mb-8 custom-scrollbar" style={{maxHeight: '800px', overflowY: 'auto'}}>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Project Overview</h2>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { title: 'Security', icon: '🔒', count: scanData.issues.hardcodedSecrets?.length || 0, color: 'from-red-500 to-pink-500', label: 'Secrets found' },
                      { title: 'Documentation', icon: '📝', count: [scanData.issues.missingReadme, scanData.issues.missingEnvExample, scanData.issues.missingDeployment, scanData.issues.missingGitignore, scanData.issues.missingLicense].filter(Boolean).length, color: 'from-orange-500 to-yellow-500', label: 'Missing docs' },
                      { title: 'Quality', icon: '🧪', count: (scanData.issues.missingTests ? 1 : 0) + (scanData.issues.duplicateFunctions?.length || 0), color: 'from-yellow-500 to-green-500', label: 'Quality issues' },
                      { title: 'Reliability', icon: '⚡', count: scanData.issues.weakErrorHandling?.length || 0, color: 'from-blue-500 to-cyan-500', label: 'Error handling' }
                    ].map((stat, idx) => (
                      <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-xl card-hover`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-4xl">{stat.icon}</span>
                          <span className="text-5xl font-black">{stat.count}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{stat.title}</h3>
                        <p className="text-white/80 text-sm">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Project Stats */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <span className="text-3xl">📊</span>
                      Project Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="text-center">
                        <p className="text-gray-600 mb-2 font-semibold">Total Files</p>
                        <p className="text-5xl font-black text-gray-800">{scanData.stats?.totalFiles || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 mb-2 font-semibold">Lines of Code</p>
                        <p className="text-5xl font-black text-gray-800">{scanData.stats?.linesOfCode?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-3 font-semibold text-center">File Types</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {scanData.stats?.languages && Object.entries(scanData.stats.languages).slice(0, 5).map(([ext, count]) => (
                            <span key={ext} className="px-4 py-2 bg-white text-gray-700 rounded-full text-sm font-bold border-2 border-gray-300 shadow-sm">
                              {ext}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technical Debt Section */}
                  {scanData.technicalDebt && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200">
                      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="text-3xl">💰</span>
                        Technical Debt Analysis
                      </h3>
                      
                      {/* AI-Assisted Note */}
                      {scanData.technicalDebt.aiAssisted && (
                        <div className="mb-6 p-4 bg-blue-100 border-2 border-blue-300 rounded-xl flex items-start gap-3">
                          <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-sm text-blue-800">
                            <strong className="font-bold">AI-Assisted Estimates:</strong> {scanData.technicalDebt.note}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                          <p className="text-gray-600 mb-2 font-semibold text-sm">Estimated Cost</p>
                          <p className="text-4xl font-black text-purple-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(scanData.technicalDebt.totalCost || 0)}
                          </p>
                          <p className="text-gray-500 text-sm mt-2">To fix all issues</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                          <p className="text-gray-600 mb-2 font-semibold text-sm">Estimated Time</p>
                          <p className="text-4xl font-black text-purple-600">
                            {scanData.technicalDebt.totalHours || 0}h
                          </p>
                          <p className="text-gray-500 text-sm mt-2">Developer hours needed</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
                          <p className="text-gray-600 mb-2 font-semibold text-sm">Potential ROI</p>
                          <p className="text-4xl font-black text-purple-600">
                            {typeof scanData.technicalDebt.roi === 'object' ?
                              (scanData.technicalDebt.roi?.value || scanData.technicalDebt.roi?.percentage || 0) :
                              (scanData.technicalDebt.roi || 0)}%
                          </p>
                          <p className="text-gray-500 text-sm mt-2">Return on investment</p>
                        </div>
                      </div>
                      {scanData.technicalDebt.breakdown && (
                        <div className="mt-6 bg-white rounded-xl p-6 border-2 border-purple-200">
                          <h4 className="font-bold text-gray-800 mb-4">Cost Breakdown</h4>
                          <div className="space-y-3">
                            {Object.entries(scanData.technicalDebt.breakdown).map(([category, data]) => (
                              <div key={category} className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium capitalize">{category}</span>
                                <div className="text-right">
                                  <span className="text-purple-600 font-bold">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(data.cost || 0)}
                                  </span>
                                  <span className="text-gray-500 text-sm ml-2">({data.hours || 0}h)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Issues Tab */}
              {activeTab === 'issues' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Detailed Issues</h2>
                  
                  {scanData.issues.hardcodedSecrets?.length > 0 && (
                    <div className="border-2 border-red-300 rounded-2xl p-6 bg-gradient-to-br from-red-50 to-pink-50">
                      <h3 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
                        🔒 Hardcoded Secrets ({scanData.issues.hardcodedSecrets.length})
                      </h3>
                      <div className="space-y-3">
                        {scanData.issues.hardcodedSecrets.map((item, index) => (
                          <div key={index} className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-sm">
                            <p className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {item.file}
                            </p>
                            <div className="space-y-2">
                              {item.secrets.map((secret, idx) => (
                                <div key={idx} className="text-sm text-gray-700 font-mono bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                                  {secret}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanData.issues.weakErrorHandling?.length > 0 && (
                    <div className="border-2 border-orange-300 rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-yellow-50">
                      <h3 className="text-2xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                        ⚠️ Weak Error Handling ({scanData.issues.weakErrorHandling.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scanData.issues.weakErrorHandling.map((file, index) => (
                          <div key={index} className="bg-white rounded-xl p-4 border-2 border-orange-200 shadow-sm">
                            <p className="text-sm text-gray-700 font-mono font-semibold">{file}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanData.issues.todoFixme?.length > 0 && (
                    <div className="border-2 border-yellow-300 rounded-2xl p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
                      <h3 className="text-2xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                        📝 TODO/FIXME ({scanData.issues.todoFixme.reduce((sum, t) => sum + t.comments.length, 0)})
                      </h3>
                      <div className="space-y-3">
                        {scanData.issues.todoFixme.map((item, index) => (
                          <div key={index} className="bg-white rounded-xl p-5 border-2 border-yellow-200 shadow-sm">
                            <p className="font-bold text-gray-800 mb-3">{item.file}</p>
                            <div className="space-y-2">
                              {item.comments.map((comment, idx) => (
                                <div key={idx} className="text-sm text-gray-700 font-mono bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                                  {comment}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanData.issues.duplicateFunctions?.length > 0 && (
                    <div className="border-2 border-purple-300 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-pink-50">
                      <h3 className="text-2xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                        🔄 Duplicate Functions ({scanData.issues.duplicateFunctions.length})
                      </h3>
                      <div className="space-y-4">
                        {scanData.issues.duplicateFunctions.map((item, index) => {
                          // Handle both old (files array) and new (locations array) data structures
                          const locations = item.locations || (item.files ? item.files.map(f => ({ file: f, snippet: 'Code snippet not available', line: '?' })) : []);
                          
                          return (
                            <div key={index} className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-sm">
                              <p className="font-bold text-gray-800 mb-3 text-lg">Function: <span className="text-purple-600">{item.name}</span></p>
                              <p className="text-sm text-gray-600 mb-3">Found in {locations.length} location{locations.length !== 1 ? 's' : ''}:</p>
                              <div className="space-y-3">
                                {locations.map((loc, idx) => (
                                  <div key={idx} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <p className="text-sm font-semibold text-gray-700">{loc.file}</p>
                                      {loc.line && <span className="text-xs text-gray-500 ml-auto">Line {loc.line}</span>}
                                    </div>
                                    {loc.snippet && (
                                      <pre className="text-xs text-gray-700 font-mono bg-white p-3 rounded border border-purple-100 overflow-x-auto whitespace-pre-wrap">
                                        {loc.snippet}
                                      </pre>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-2 border-blue-300 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
                    <h3 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                      📄 Missing Files
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { check: scanData.issues.missingReadme, label: 'README.md' },
                        { check: scanData.issues.missingEnvExample, label: '.env.example' },
                        { check: scanData.issues.missingDeployment, label: 'DEPLOYMENT.md' },
                        { check: scanData.issues.missingGitignore, label: '.gitignore' },
                        { check: scanData.issues.missingLicense, label: 'LICENSE' },
                        { check: scanData.issues.missingTests, label: 'Test files' }
                      ].filter(item => item.check).map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
                          <p className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                            <span className="text-red-500 text-xl">❌</span>
                            {item.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Repair Plan Tab */}
              {activeTab === 'repair' && repairPlan && (
                <div className="space-y-6">
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-3">🤖 IBM Bob Repair Plan</h2>
                    <p className="text-gray-600 text-lg">Copy these prompts and paste them into IBM Bob to automatically fix your code issues.</p>
                  </div>

                  {repairPlan.tasks.map((task, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 card-hover shadow-lg">
                      <div className="mb-5">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">{task.taskTitle}</h3>
                        <div className="flex flex-wrap gap-3 mb-4">
                          <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-md ${getPriorityBadge(task.priority)}`}>
                            {task.priority} Priority
                          </span>
                          <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-md">
                            {task.category}
                          </span>
                          {task.impact && (
                            <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
                              {task.impact}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-lg">{task.issue}</p>
                      </div>

                      <div className="bg-gray-900 rounded-2xl p-5 mb-5 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-bold text-gray-300 flex items-center gap-2 uppercase tracking-wide">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            Bob Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(task.exactBobPrompt, index)}
                            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          >
                            {copiedIndex === index ? (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono max-h-80 overflow-y-auto code-scrollbar p-4 bg-gray-800 rounded-xl">
                          {task.exactBobPrompt}
                        </pre>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5">
                        <p className="text-gray-700 font-semibold">
                          <span className="text-green-700 font-bold text-lg">✓ Expected Output:</span> {task.expectedOutput}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Before/After Tab */}
              {activeTab === 'comparison' && beforeAfter && (
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">📈 Before vs After Comparison</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Before */}
                    <div className="border-2 border-red-300 rounded-2xl p-8 bg-gradient-to-br from-red-50 to-pink-50 shadow-xl">
                      <h3 className="text-2xl font-bold text-red-800 mb-6 flex items-center gap-3">
                        <span className="text-4xl">📉</span>
                        Before Repair
                      </h3>
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="text-gray-600 mb-2 font-semibold">Score</p>
                          <p className={`text-7xl font-black ${getScoreColor(beforeAfter.before.score)}`}>
                            {beforeAfter.before.score}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 mb-2 font-semibold">Status</p>
                          <span className={`inline-block px-6 py-3 rounded-full text-sm font-bold text-white ${getStatusBadge(beforeAfter.before.status)} shadow-lg`}>
                            {beforeAfter.before.status}
                          </span>
                        </div>
                        <div className="pt-6 border-t-2 border-red-200">
                          <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Issues Found:</p>
                          <div className="space-y-3">
                            {[
                              { label: '🔒 Security', value: beforeAfter.before.issues.security },
                              { label: '🧪 Quality', value: beforeAfter.before.issues.quality },
                              { label: '📝 Documentation', value: beforeAfter.before.issues.documentation },
                              { label: '⚡ Reliability', value: beforeAfter.before.issues.reliability }
                            ].map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white rounded-xl px-5 py-3 shadow-sm">
                                <span className="text-gray-700 font-semibold">{item.label}</span>
                                <span className="text-red-600 font-black text-xl">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* After */}
                    <div className="border-2 border-green-300 rounded-2xl p-8 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
                      <h3 className="text-2xl font-bold text-green-800 mb-6 flex items-center gap-3">
                        <span className="text-4xl">📈</span>
                        After Repair
                      </h3>
                      <div className="space-y-6">
                        <div className="text-center">
                          <p className="text-gray-600 mb-2 font-semibold">Score</p>
                          <p className={`text-7xl font-black ${getScoreColor(beforeAfter.after.score)}`}>
                            {beforeAfter.after.score}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 mb-2 font-semibold">Status</p>
                          <span className={`inline-block px-6 py-3 rounded-full text-sm font-bold text-white ${getStatusBadge(beforeAfter.after.status)} shadow-lg`}>
                            {beforeAfter.after.status}
                          </span>
                        </div>
                        <div className="pt-6 border-t-2 border-green-200">
                          <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Issues Resolved:</p>
                          <div className="space-y-3">
                            {[
                              { label: '🔒 Security', value: beforeAfter.after.issues.security },
                              { label: '🧪 Quality', value: beforeAfter.after.issues.quality },
                              { label: '📝 Documentation', value: beforeAfter.after.issues.documentation },
                              { label: '⚡ Reliability', value: beforeAfter.after.issues.reliability }
                            ].map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white rounded-xl px-5 py-3 shadow-sm">
                                <span className="text-gray-700 font-semibold">{item.label}</span>
                                <span className="text-green-600 font-black text-xl">{item.value} ✓</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-2xl p-8 shadow-xl">
                    <p className="text-3xl font-black text-green-700 mb-3">
                      ✨ Potential Improvement: +{beforeAfter.improvement} points
                    </p>
                    <p className="text-gray-700 text-lg font-semibold">
                      Apply the repair plan above to achieve these improvements
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white py-12 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <p className="text-gray-300 text-lg mb-2">
              Powered by <span className="font-bold text-blue-400">BobShield AI</span> • Making code deployment-ready with <span className="font-bold text-purple-400">IBM Bob</span>
            </p>
            <p className="text-gray-500">
              Professional Code Health Scanner & Automated Repair Assistant
            </p>
          </div>
          <div className="text-gray-600 text-sm">
            © 2024 BobShield AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

// Made with Bob
