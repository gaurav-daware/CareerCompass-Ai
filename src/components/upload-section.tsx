"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { useToast } from "@/src/hooks/use-toast"
import { Alert, AlertDescription } from "@/src/components/ui/alert"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface UploadSectionProps {
  onUploadSuccess: (metadata: any, domain: string) => void
}

export default function UploadSection({ onUploadSuccess }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (!uploadedFile) return

    setIsAnalyzing(true)
    setError(null)
    const formData = new FormData()
    formData.append("file", uploadedFile)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Analysis failed" }))
        throw new Error(errorData.error || "Analysis failed")
      }

      const data = await response.json()

      toast({
        title: "Resume analyzed successfully",
        description: `Detected domain: ${data.detected_domain}`,
      })

      onUploadSuccess(data.metadata, data.detected_domain)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to backend"
      setError(errorMessage)

      toast({
        title: "Analysis failed",
        description: errorMessage,
        variant: "destructive",
      })

      console.error("[v0] Analysis error:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setError(null)

    // Simulate a brief upload delay for better UX
    setTimeout(() => {
      setUploadedFile(file)
      setIsUploading(false)
      toast({
        title: "File uploaded",
        description: "Click 'Analyze Resume' to start AI analysis",
      })
    }, 500)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Upload Your Resume</CardTitle>
        <CardDescription className="text-base">
          Upload your PDF resume to get started with AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}. Make sure the Flask backend is running on port 5000.</AlertDescription>
          </Alert>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/50"
          }`}
        >
          {!uploadedFile && (
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
          )}

          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="text-lg font-medium text-foreground">Uploading...</p>
              </>
            ) : uploadedFile ? (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-foreground">File uploaded successfully</p>
                  <div className="flex items-center gap-2 justify-center px-4 py-2 bg-muted rounded-lg">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{uploadedFile.name}</span>
                    <span className="text-sm text-muted-foreground">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button onClick={handleAnalyze} disabled={isAnalyzing} size="lg">
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Resume"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setUploadedFile(null)
                      setError(null)
                    }}
                    disabled={isAnalyzing}
                  >
                    Change File
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-foreground">Drop your resume here or click to browse</p>
                  <p className="text-sm text-muted-foreground">PDF files up to 10MB</p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
