"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"
import { Loader2, FileText, Copy, Check } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = "http://localhost:5000"

/**
 * Converts raw text (which likely contains \n\n for new paragraphs) into
 * HTML paragraphs for structured display in the final output card.
 * This also ensures the text is slightly cleaned before rendering.
 */
const textToHtmlParagraphs = (text: string): { __html: string } => {
  if (!text) return { __html: "" };

  // 1. Clean the text by removing excessive markdown (like bolding, if any managed to sneak through)
  let cleanedText = text.replace(/(\*\*|\*|__|_)/g, '').trim();

  // 2. Split text by double newline, map each part to a <p> tag, and join.
  const paragraphs = cleanedText
    .split(/\r?\n\s*\r?\n/) // Split by two or more newlines (paragraph break)
    .filter(p => p.trim() !== '') // Remove empty strings
    .map(p => {
      // Replace single newlines within a "paragraph" with <br> for line breaks
      const content = p.replace(/\r?\n/g, '<br>');
      return `<p class="mb-4 leading-relaxed">${content}</p>`;
    })
    .join('');

  return { __html: paragraphs };
};


export default function CoverLetterSection() {
  const [jobRequirement, setJobRequirement] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!jobRequirement.trim()) {
      toast({
        title: "Job requirement required",
        description: "Please enter a job description",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setCoverLetter("") // Clear previous letter

    try {
      // NOTE: Assuming your backend automatically includes the resume data for context
      const response = await fetch(`${API_URL}/generate_cover_letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_requirement: jobRequirement,
          // Use "Hiring Team" as default for a cleaner output than "the company"
          company_name: companyName.trim() || "Hiring Team",
        }),
      })

      if (!response.ok) {
        throw new Error("Generation failed")
      }

      const data = await response.json()
      // Ensure the output field is consistent (data.cover_letter)
      if (data.cover_letter) {
        setCoverLetter(data.cover_letter)
      } else {
        throw new Error("Received empty cover letter")
      }

      toast({
        title: "Cover letter generated",
        description: "Your personalized cover letter is ready",
      })
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Please check your network and API connection.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    // FIX: When copying, ensure we copy the clean, un-HTML-formatted text from state
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Copied to clipboard",
      description: "Cover letter copied successfully",
    })
  }

  // Pre-process the cover letter text for HTML rendering
  const coverLetterHtml = textToHtmlParagraphs(coverLetter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Cover Letter</CardTitle>
          <CardDescription>
            Create a personalized cover letter based on your resume and the job requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Company Name (Optional)</label>
            <Input
              placeholder="e.g., Google, Microsoft, Startup Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Job Description</label>
            <Textarea
              placeholder="Paste the job description here..."
              value={jobRequirement}
              onChange={(e) => setJobRequirement(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !jobRequirement.trim()} // Disable if input is empty
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Cover Letter
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Render the generated cover letter */}
      {coverLetter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Cover Letter</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* FIX: Use dangerouslySetInnerHTML with the pre-processed HTML structure */}
            <div 
              className="text-foreground text-sm leading-relaxed" 
              dangerouslySetInnerHTML={coverLetterHtml} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}