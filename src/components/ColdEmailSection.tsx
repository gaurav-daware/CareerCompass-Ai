"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs"
import { Loader2, Mail, Copy, Check, RefreshCw, Sparkles } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"
import { Badge } from "@/src/components/ui/badge"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ===============================================
// SHARED GLOBAL KEYS (synchronized with Cover Letter)
// ===============================================
const JD_KEY = "global_job_description"
const COMPANY_KEY = "global_company_name"

// New keys for email component
const RECIPIENT_NAME_KEY = "global_recipient_name"
const RECIPIENT_TITLE_KEY = "global_recipient_title"
const EMAIL_TYPE_KEY = "global_email_type"

interface EmailResult {
  subject_line: string
  email_body: string
  alternative_subjects: string[]
}

const EMAIL_TYPES = [
  { 
    id: 'direct', 
    label: 'Direct Application', 
    icon: Mail,
    description: 'Apply directly for a specific role'
  },
  { 
    id: 'networking', 
    label: 'Networking', 
    icon: Sparkles,
    description: 'Request informational interview or advice'
  },
  { 
    id: 'referral', 
    label: 'Referral Request', 
    icon: RefreshCw,
    description: 'Ask for introduction or referral'
  },
  { 
    id: 'followup', 
    label: 'Follow-up', 
    icon: Mail,
    description: 'Follow up after application or interview'
  }
]

const textToHtmlParagraphs = (text: string): { __html: string } => {
  if (!text) return { __html: "" }
  
  let cleanedText = text.replace(/(\*\*|\*|__|_)/g, '').trim()
  
  const paragraphs = cleanedText
    .split(/\r?\n\s*\r?\n/)
    .filter(p => p.trim() !== '')
    .map(p => {
      const content = p.replace(/\r?\n/g, '<br>')
      return `<p class="mb-3 leading-relaxed">${content}</p>`
    })
    .join('')

  return { __html: paragraphs }
}

export default function ColdEmailSection() {
  // Synchronized state with localStorage
  const [jobRequirement, setJobRequirement] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(JD_KEY) || ""
    return ""
  })
  
  const [companyName, setCompanyName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(COMPANY_KEY) || ""
    return ""
  })
  
  const [recipientName, setRecipientName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(RECIPIENT_NAME_KEY) || ""
    return ""
  })
  
  const [recipientTitle, setRecipientTitle] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(RECIPIENT_TITLE_KEY) || ""
    return ""
  })
  
  const [emailType, setEmailType] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(EMAIL_TYPE_KEY) || "direct"
    return "direct"
  })
  
  const [additionalContext, setAdditionalContext] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null)
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const { toast } = useToast()

  // Sync handlers
  const handleJobRequirementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setJobRequirement(value)
    if (typeof window !== 'undefined') localStorage.setItem(JD_KEY, value)
  }

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCompanyName(value)
    if (typeof window !== 'undefined') localStorage.setItem(COMPANY_KEY, value)
  }

  const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecipientName(value)
    if (typeof window !== 'undefined') localStorage.setItem(RECIPIENT_NAME_KEY, value)
  }

  const handleRecipientTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRecipientTitle(value)
    if (typeof window !== 'undefined') localStorage.setItem(RECIPIENT_TITLE_KEY, value)
  }

  const handleEmailTypeChange = (value: string) => {
    setEmailType(value)
    if (typeof window !== 'undefined') localStorage.setItem(EMAIL_TYPE_KEY, value)
  }

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter the company name",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setEmailResult(null)

    try {
      const response = await fetch(`${API_URL}/generate_cold_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_type: emailType,
          company_name: companyName,
          recipient_name: recipientName || "Hiring Manager",
          recipient_title: recipientTitle || "",
          job_requirement: jobRequirement || "",
          additional_context: additionalContext || ""
        }),
      })

      if (!response.ok) throw new Error("Generation failed")

      const data = await response.json()
      
      if (data.subject_line && data.email_body) {
        setEmailResult(data)
        toast({
          title: "Email generated",
          description: "Your cold email is ready",
        })
      } else {
        throw new Error("Incomplete email data")
      }
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

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
    toast({
      title: "Copied to clipboard",
      description: `${section} copied successfully`,
    })
  }

  const emailBodyHtml = emailResult ? textToHtmlParagraphs(emailResult.email_body) : { __html: "" }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Cold Email</CardTitle>
          <CardDescription>
            Create personalized cold emails for networking, job applications, and follow-ups
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Type Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Email Type</label>
            <Tabs value={emailType} onValueChange={handleEmailTypeChange}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 bg-muted/50 p-1">
                {EMAIL_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <TabsTrigger 
                      key={type.id} 
                      value={type.id}
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-card"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{type.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              
              {EMAIL_TYPES.map((type) => (
                <TabsContent key={type.id} value={type.id} className="mt-3">
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Recipient Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Recipient Name <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                placeholder="e.g., John Smith"
                value={recipientName}
                onChange={handleRecipientNameChange}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Recipient Title <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Input
                placeholder="e.g., Senior Recruiter, Engineering Manager"
                value={recipientTitle}
                onChange={handleRecipientTitleChange}
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Google, Microsoft, Startup Inc."
              value={companyName}
              onChange={handleCompanyChange}
            />
          </div>

          {/* Job Description (Optional) */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Job Description <span className="text-muted-foreground">(Optional)</span>
            </label>
            <Textarea
              placeholder="Paste the job description for context..."
              value={jobRequirement}
              onChange={handleJobRequirementChange}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Including the job description helps personalize the email
            </p>
          </div>

          {/* Additional Context */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Additional Context <span className="text-muted-foreground">(Optional)</span>
            </label>
            <Textarea
              placeholder="Any specific points to mention? (e.g., 'Met at TechConf 2024', 'Referred by Jane Doe', 'Interested in AI team')"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !companyName.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Generate Cold Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Email Result */}
      {emailResult && (
        <div className="space-y-4">
          {/* Subject Line */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Subject Line</CardTitle>
                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCopy(emailResult.subject_line, "Subject line")}
                >
                  {copiedSection === "Subject line" ? (
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
              <p className="text-foreground font-medium">{emailResult.subject_line}</p>
              
              {emailResult.alternative_subjects && emailResult.alternative_subjects.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Alternative Subject Lines:</p>
                  <div className="space-y-2">
                    {emailResult.alternative_subjects.map((subject, index) => (
                      <div key={index} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <p className="text-sm text-foreground flex-1">{subject}</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleCopy(subject, `Alternative subject ${index + 1}`)}
                        >
                          {copiedSection === `Alternative subject ${index + 1}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Body */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Body</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCopy(emailResult.email_body, "Email body")}
                >
                  {copiedSection === "Email body" ? (
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
              <div 
                className="text-foreground text-sm leading-relaxed whitespace-pre-wrap" 
                dangerouslySetInnerHTML={emailBodyHtml} 
              />
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fullEmail = `Subject: ${emailResult.subject_line}\n\n${emailResult.email_body}`
                      handleCopy(fullEmail, "Complete email")
                    }}
                  >
                    {copiedSection === "Complete email" ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      "Copy Complete Email"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Email Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Personalize further by mentioning specific company achievements or recent news</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Send emails on Tuesday-Thursday mornings for best response rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Keep your email under 150 words for higher engagement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Follow up after 5-7 business days if you don't hear back</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}