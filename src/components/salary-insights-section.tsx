"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Loader2, DollarSign, TrendingUp, Info } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = "http://localhost:5000"

// Define the TypeScript interface for the API data structure
interface SalaryInsights {
  estimated_range: string;
  factors: string[];
  negotiation_tips: string[];
}

/**
 * Cleans up common Markdown formatting (bold, italics, lists, headings)
 * from a single text string.
 * @param {string} text - The raw text string from the API.
 * @returns {string} The cleaned text string.
 */
const cleanText = (text: string): string => {
  if (!text) return '';
  
  // 1. Remove all bold/italic markers (**, *, _)
  let cleanedText = text.replace(/(\*\*|\*|__|_)/g, '');

  // 2. Remove Markdown headings (#, ##, etc.) at the start of a line
  cleanedText = cleanedText.replace(/^#+\s*/gm, '');

  // 3. Remove Markdown list markers (-, +, 1., etc.) at the start of a line
  cleanedText = cleanedText.replace(/^(\s*[-+\d]+\.?)\s*/gm, '');

  // 4. Remove blockquotes (>)
  cleanedText = cleanedText.replace(/^>\s*/gm, '');

  // 5. Trim leading/trailing whitespace
  cleanedText = cleanedText.trim();

  return cleanedText;
};


export default function SalaryInsightsSection() {
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState<SalaryInsights | null>(null)
  const { toast } = useToast()

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setInsights(null); // Reset insights before fetching

    try {
      const response = await fetch(`${API_URL}/salary_insights`)

      if (!response.ok) {
        throw new Error("Failed to fetch salary insights")
      }

      const data: SalaryInsights = await response.json()

      // Basic validation
      if (!data.estimated_range || !data.factors || !data.negotiation_tips) {
          throw new Error("API returned incomplete data structure.")
      }
      
      // FIX: Clean up text fields before setting state
      const cleanedData: SalaryInsights = {
          estimated_range: cleanText(data.estimated_range),
          // Map and clean each item in the array fields
          factors: data.factors.map(cleanText),
          negotiation_tips: data.negotiation_tips.map(cleanText),
      }

      setInsights(cleanedData)
    } catch (error) {
      console.error("Salary fetch error:", error);
      toast({
        title: "Failed to load salary insights",
        description: "Could not connect to the API or received bad data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading Salary Intelligence...
          </CardTitle>
          <CardDescription>Calculating range, factors, and negotiation strategy based on your profile.</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
            <span className="text-sm text-muted-foreground">This may take a moment as we query market data.</span>
        </CardContent>
      </Card>
    )
  }

  if (!insights || !insights.estimated_range) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <DollarSign className="w-6 h-6" />
            Insights Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">We were unable to generate salary insights for your profile at this time.</p>
          <p className="text-xs mt-2 text-muted-foreground">Please ensure your resume contains sufficient experience and location details.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estimated Salary Range */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Estimated Salary Range
          </CardTitle>
          <CardDescription>Based on your experience and location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary mb-4">{insights.estimated_range}</div>
          <Badge variant="outline" className="bg-primary/10">
            <Info className="w-3 h-3 mr-1" />
            Approximate based on market data
          </Badge>
        </CardContent>
      </Card>
      
      {/* Factors Affecting Salary */}
      {insights.factors && insights.factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Key Factors Affecting Your Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {/* Data is already cleaned */}
              {insights.factors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground">{factor}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Negotiation Tips */}
      {insights.negotiation_tips && insights.negotiation_tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Negotiation Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {/* Data is already cleaned */}
              {insights.negotiation_tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 bg-muted">
                    {idx + 1}
                  </Badge>
                  <p className="text-sm text-foreground flex-1">{tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}