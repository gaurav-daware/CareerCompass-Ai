"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Textarea } from "@/src/components/ui/textarea"
import { Badge } from "@/src/components/ui/badge"
import { Progress } from "@/src/components/ui/progress"
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Target, PieChart, Lightbulb } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function AnalysisSection() {
  const [jobRequirement, setJobRequirement] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (!jobRequirement.trim()) {
      toast({
        title: "Job requirement required",
        description: "Please enter a job description",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch(`${API_URL}/rate_resumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_requirement: jobRequirement }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const data = await response.json()
      setAnalysisResult(data.results[0])

      toast({
        title: "Analysis complete",
        description: `ATS Score: ${data.results[0].score}%`,
      })
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400"
    if (score >= 50) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const getProgressColor = (score: number) => {
    if (score >= 85) return "bg-green-600"
    if (score >= 70) return "bg-yellow-600"
    if (score >= 50) return "bg-orange-600"
    return "bg-red-600"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            ATS Resume Analysis
          </CardTitle>
          <CardDescription>
            Paste a job description to see how well your resume matches using intelligent keyword extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste the job description here... (Works for ALL domains: Tech, Healthcare, Finance, Marketing, Legal, Creative, etc.)"
            value={jobRequirement}
            onChange={(e) => setJobRequirement(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full" size="lg">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Analyze Resume
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <>
          {/* Main Score Card */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>ATS Match Score</CardTitle>
                <Badge 
                  variant={analysisResult.ats_status.level === "high" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {analysisResult.ats_status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className={`text-7xl font-bold ${getScoreColor(analysisResult.score)}`}>
                  {analysisResult.score}%
                </div>
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Overall Match</span>
                      <span className="font-medium">{analysisResult.score}%</span>
                    </div>
                    <Progress 
                      value={analysisResult.score} 
                      className="h-3"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysisResult.summary}
                  </p>
                </div>
              </div>

              {/* Score Breakdown */}
              {analysisResult.score_breakdown && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm">Score Breakdown</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Keyword Match (60%)</span>
                        <span className="font-medium">{analysisResult.score_breakdown.skill_match}%</span>
                      </div>
                      <Progress 
                        value={analysisResult.score_breakdown.skill_match} 
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Content Match (30%)</span>
                        <span className="font-medium">{analysisResult.score_breakdown.semantic_similarity}%</span>
                      </div>
                      <Progress 
                        value={analysisResult.score_breakdown.semantic_similarity} 
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Density Bonus (10%)</span>
                        <span className="font-medium">{analysisResult.score_breakdown.keyword_density_bonus}%</span>
                      </div>
                      <Progress 
                        value={analysisResult.score_breakdown.keyword_density_bonus * 10} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Match Statistics */}
              {analysisResult.keyword_analysis && (
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {analysisResult.keyword_analysis.total_matched || analysisResult.keyword_analysis.matching_keywords?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Keywords Matched</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {analysisResult.keyword_analysis.total_job_keywords || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Total Required</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {analysisResult.keyword_analysis.match_percentage || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Match Rate</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {analysisResult.keyword_analysis.missing_keywords?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Missing Skills</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keyword Analysis */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-200 dark:border-green-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Matching Keywords
                  <Badge variant="outline" className="ml-auto">
                    {analysisResult.keyword_analysis.matching_keywords?.length || 0}
                  </Badge>
                </CardTitle>
                <CardDescription>Keywords found in your resume</CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.keyword_analysis.matching_keywords?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keyword_analysis.matching_keywords.map((keyword: string, idx: number) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No matching keywords found</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Missing Keywords
                  <Badge variant="outline" className="ml-auto">
                    {analysisResult.keyword_analysis.missing_keywords?.length || 0}
                  </Badge>
                </CardTitle>
                <CardDescription>Keywords to add to your resume</CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.keyword_analysis.missing_keywords?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keyword_analysis.missing_keywords.map((keyword: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">All required keywords are present!</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Keyword Density */}
          {analysisResult.keyword_analysis.keyword_density && 
           Object.keys(analysisResult.keyword_analysis.keyword_density).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Keyword Frequency
                </CardTitle>
                <CardDescription>How often matched keywords appear in your resume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analysisResult.keyword_analysis.keyword_density)
                    .slice(0, 8)
                    .map(([keyword, count], idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium min-w-[120px]">{keyword}</span>
                          <Progress 
                            value={(count as number) * 10} 
                            className="h-2 flex-1"
                          />
                        </div>
                        <Badge variant="secondary" className="min-w-[40px] justify-center">
                          {count as number}x
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                AI Recommendations
              </CardTitle>
              <CardDescription>Actionable steps to improve your resume score</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {analysisResult.recommendations?.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          {analysisResult.skill_gaps?.skill_gaps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Skill Gap Analysis
                </CardTitle>
                <CardDescription>Skills to develop for this role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.skill_gaps.skill_gaps.map((gap: any, idx: number) => (
                    <div key={idx} className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{gap.skill}</h4>
                        <Badge
                          variant={
                            gap.importance === "high"
                              ? "destructive"
                              : gap.importance === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {gap.importance} priority
                        </Badge>
                      </div>
                      {gap.resources && gap.resources.length > 0 && (
                        <div className="text-sm text-muted-foreground bg-muted/30 rounded p-3">
                          <p className="font-medium mb-2 text-foreground">📚 Learning resources:</p>
                          <ul className="space-y-1.5">
                            {gap.resources.map((resource: string, ridx: number) => (
                              <li key={ridx} className="flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span>
                                <span>{resource}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}