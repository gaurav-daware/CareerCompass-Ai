"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Textarea } from "@/src/components/ui/textarea"
import { Badge } from "@/src/components/ui/badge"
import { Progress } from "@/src/components/ui/progress"
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Target, PieChart, Lightbulb, Info } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ===============================================
// GLOBAL KEYS for UX Improvement (MUST BE SHARED)
// ===============================================
const JD_KEY = "global_job_description"; // Shared JD key
const ANALYSIS_RESULT_KEY = "ats_analysis_result" // Key unique to this component's output

// ===============================================
// MARKDOWN CLEANING UTILITY
// ===============================================
/**
 * Cleans up common Markdown formatting (bold, italics, lists, headings)
 * to ensure plain, readable text inside the UI.
 * @param {string} text - The raw text string from the API.
 * @returns {string} The cleaned text string.
 */
const cleanResponseFormatting = (text: string): string => {
  if (!text) return '';
  
  // 1. Remove all bold/italic markers (** and *)
  let cleanedText = text.replace(/(\*\*|\*)/g, '');

  // 2. Remove Markdown headings (#, ##, etc.) at the start of a line
  cleanedText = cleanedText.replace(/^#+\s*/gm, '');

  // 3. Remove Markdown list markers (-, +, 1., etc.) at the start of a line
  cleanedText = cleanedText.replace(/^(\s*[-+\d]+\.?)\s*/gm, '');

  // 4. Clean up any excessive newlines, reducing triple+ to double
  cleanedText = cleanedText.replace(/(\r?\n){3,}/g, '\n\n');

  // 5. Trim leading/trailing whitespace
  cleanedText = cleanedText.trim();

  return cleanedText;
};


// Define a type for safety (from previous iteration)
interface AnalysisResult {
  score: number;
  summary: string;
  ats_status: { level: string, label: string, color: string };
  score_breakdown: { skill_match: number, semantic_similarity: number, keyword_density_bonus: number };
  keyword_analysis: {
    matching_keywords: string[];
    missing_keywords: string[];
    keyword_density: { [key: string]: number };
    total_job_keywords: number;
    total_matched: number;
    match_percentage: number;
  };
  recommendations: string[];
  skill_gaps: { skill_gaps: { skill: string, importance: string, resources: string[] }[] };
}


export default function AnalysisSection() {
  // --- JOB REQUIREMENT STATE: Initialize to empty, relies on useEffect to pull from shared storage ---
  // The local state acts as the visual representation of the global JD_KEY content.
  const [jobRequirement, setJobRequirement] = useState("");
  
  // --- ANALYSIS RESULT STATE: Still loads previous result from its key ---
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(() => {
    if (typeof window !== 'undefined') {
      const storedResult = localStorage.getItem(ANALYSIS_RESULT_KEY)
      try {
        return storedResult ? JSON.parse(storedResult) : null
      } catch (e) {
        console.error("Could not parse stored analysis result:", e)
        return null
      }
    }
    return null
  })
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { toast } = useToast()

  const wordCount = jobRequirement.trim().split(/\s+/).filter(w => w).length
  
  // ===============================================
  // LOCAL STORAGE EFFECTS (IMPROVED FOR SHARING)
  // ===============================================

  // 1. Effect to load global JD state on mount.
  // This runs once when the component mounts or when the user navigates back to this tab.
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedJD = localStorage.getItem(JD_KEY) || "";
        setJobRequirement(storedJD);
    }
  }, []); // Run only once on mount to pull shared JD

  // 2. Effect to save analysis result whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (analysisResult) {
        localStorage.setItem(ANALYSIS_RESULT_KEY, JSON.stringify(analysisResult))
      } else {
        localStorage.removeItem(ANALYSIS_RESULT_KEY)
      }
    }
  }, [analysisResult])

  // 3. Handler to update local state AND local storage for JD persistence
  const handleJobRequirementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobRequirement(value);
    if (typeof window !== 'undefined') {
        localStorage.setItem(JD_KEY, value); // Write to the global key
    }
  };


  const handleAnalyze = async () => {
    // Read the latest value directly from local state/storage
    const currentJD = jobRequirement.trim();

    // Validate word count
    if (wordCount < 50) {
      toast({
        title: "Job description too short",
        description: `Please provide at least 50 words for accurate analysis. Current: ${wordCount} words.`,
        variant: "destructive",
      })
      return
    }

    if (!currentJD) {
      toast({
        title: "Job requirement required",
        description: "Please enter a job description",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null) // Clear previous result at start of new analysis

    try {
      const response = await fetch(`${API_URL}/rate_resumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_requirement: currentJD }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAnalysisResult(null); 
        // Use the error message if provided by the backend
        throw new Error(data.error || "Analysis failed")
      }

      const result = data.results && data.results[0] ? data.results[0] : null;

      if (!result) {
        setAnalysisResult(null);
        throw new Error("Analysis completed, but results were empty or malformed.");
      }
      
      setAnalysisResult(result)

      // Use the fresh result data for the toast
      toast({
        title: "Analysis complete",
        description: `ATS Score: ${result.score}%`,
      })
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message || "Please try again",
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

  // Calculate max count for Keyword Density bar (for relative progress)
  const keywordDensityEntries = analysisResult?.keyword_analysis?.keyword_density 
    ? Object.entries(analysisResult.keyword_analysis.keyword_density)
      .slice(0, 8)
    : [];
  
  const maxCount = keywordDensityEntries.length > 0 
    ? Math.max(...keywordDensityEntries.map(([_, count]) => count as number)) 
    : 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            ATS Resume Analysis
          </CardTitle>
          <CardDescription>
            Paste a complete job description to see how well your resume matches. Your last entry is saved globally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Paste the FULL job description here... 

Example for a Web Developer role: 
'We are seeking a Full Stack Web Developer with 3+ years experience in React, Node.js, and MongoDB. The ideal candidate will have strong JavaScript skills, experience building RESTful APIs, and knowledge of modern web development practices. Requirements: Bachelor's degree in Computer Science, proficiency in HTML/CSS, Git version control...' 

Works for: Software Engineering, Healthcare, Finance, Marketing, Legal, Education, Creative, and ANY other field!" 
              value={jobRequirement}
              onChange={handleJobRequirementChange} // Use new handler
              rows={10}
              className="resize-none"
            />
            
            {/* Word Counter */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {wordCount} words
                </span>
              </div>
              <Badge 
                variant={wordCount >= 50 ? "default" : "secondary"}
                className={wordCount >= 50 ? "bg-green-600" : "bg-orange-500"}
              >
                {wordCount >= 50 ? "✓ Ready to analyze" : `Need ${50 - wordCount} more words`}
              </Badge>
            </div>

            {/* Helper Info */}
            {wordCount < 50 && wordCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800 dark:text-orange-200">
                  <p className="font-medium mb-1">Job description is too short</p>
                  <p className="text-xs">For accurate keyword extraction and matching, please paste the complete job posting including requirements, responsibilities, and qualifications.</p>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || wordCount < 50} 
            className="w-full" 
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Analyze Resume Match
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
                    {/* APPLY CLEANING HERE for Summary */}
                    {cleanResponseFormatting(analysisResult.summary)}
                  </p>
                </div>
              </div>

              {/* Score Breakdown (omitted for brevity, no changes needed here) */}
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

              {/* Match Statistics (omitted for brevity, no changes needed here) */}
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

          {/* Keyword Analysis (omitted for brevity, no changes needed here) */}
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

          {/* Keyword Density (omitted for brevity, minor change in rendering) */}
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
                  {keywordDensityEntries
                    .map(([keyword, count], idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm font-medium min-w-[120px]">{keyword}</span>
                          <Progress 
                            value={((count as number) / maxCount) * 100} 
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
                {analysisResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>
                    {/* APPLY CLEANING HERE for Recommendations */}
                    <p className="text-sm text-foreground leading-relaxed">{cleanResponseFormatting(rec)}</p>
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
                        {/* APPLY CLEANING HERE for Skill Gap Name */}
                        <h4 className="font-semibold text-foreground">{cleanResponseFormatting(gap.skill)}</h4>
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
                                {/* APPLY CLEANING HERE for Resources */}
                                <span>{cleanResponseFormatting(resource)}</span>
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