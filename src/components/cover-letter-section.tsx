"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"
import { Loader2, FileText, Copy, Check } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ===============================================
// GLOBAL KEYS for UX Improvement (MUST BE SHARED)
// ===============================================
const JD_KEY = "global_job_description";
const COMPANY_KEY = "global_company_name";


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
  // 1. Initialize state lazily from Local Storage (Read from global keys)
  const [jobRequirement, setJobRequirement] = useState(() => {
    if (typeof window !== 'undefined') { return localStorage.getItem(JD_KEY) || ""; }
    return "";
  });
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== 'undefined') { return localStorage.getItem(COMPANY_KEY) || ""; }
    return "";
  });
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // 2. Handler to synchronize JD input with state and Local Storage
  const handleJobRequirementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJobRequirement(value);
    if (typeof window !== 'undefined') {
        localStorage.setItem(JD_KEY, value); // Write to global key
    }
  };

  // 3. Handler to synchronize Company Name input with state and Local Storage
  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyName(value);
    if (typeof window !== 'undefined') {
        localStorage.setItem(COMPANY_KEY, value); // Write to global key
    }
  };


  const handleGenerate = async () => {
    // Use current state (which is synchronized with local storage)
    const currentJD = jobRequirement.trim();
    const currentCompany = companyName.trim();

    if (!currentJD) {
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
      const response = await fetch(`${API_URL}/generate_cover_letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_requirement: currentJD,
          // Use Company Name from synced state, default to "Hiring Team" if empty
          company_name: currentCompany || "Hiring Team",
        }),
      })

      if (!response.ok) {
        throw new Error("Generation failed")
      }

      const data = await response.json()
      
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
    // Copy the clean, un-HTML-formatted text from state
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
            Create a personalized cover letter based on your resume and the job requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Company Name (Optional)</label>
            <Input
              placeholder="e.g., Google, Microsoft, Startup Inc."
              value={companyName} // Uses synced state
              onChange={handleCompanyChange} // Uses sync handler
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Job Description</label>
            <Textarea
              placeholder="Paste the job description here..."
              value={jobRequirement} // Uses synced state
              onChange={handleJobRequirementChange} // Uses sync handler
              rows={6}
              className="resize-none"
            />
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !jobRequirement.trim()} // Checks synced state
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
            {/* Renders the HTML paragraphs */}
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