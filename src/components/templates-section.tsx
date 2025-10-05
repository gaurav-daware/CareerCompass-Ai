"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Loader2, Layout, CheckCircle2 } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface TemplatesSectionProps {
  domain: string
}

export default function TemplatesSection({ domain }: TemplatesSectionProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/resume_templates`)

      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      toast({
        title: "Failed to load templates",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!templates) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">Failed to load templates</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-6 h-6 text-primary" />
              Recommended Format for {domain}
            </CardTitle>
            <Badge variant="default">Best Match</Badge>
          </div>
          <CardDescription>Optimized resume structure for your field</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">Format Style</h4>
            <p className="text-sm text-muted-foreground">{templates.format}</p>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">Recommended Sections</h4>
            <div className="space-y-2">
              {templates.sections.map((section: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground">{section}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-2">Pro Tips</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{templates.tips}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Keep your resume to 1-2 pages maximum</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Use action verbs and quantify achievements with metrics</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Tailor your resume for each job application</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Use consistent formatting and professional fonts</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Proofread carefully for spelling and grammar errors</p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
