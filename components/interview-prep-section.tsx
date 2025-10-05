"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Briefcase, MessageCircle, Lightbulb, HelpCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_URL = "http://localhost:5000"

// 1. Define the TypeScript interface for the expected API data structure
interface InterviewPrepData {
    technical_questions: string[];
    behavioral_questions: string[];
    key_talking_points: string[];
    questions_to_ask: string[];
}

// 2. Add a robust text cleaning utility
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

    // 2. Remove Markdown headings (#, ##, etc.) and list markers (-, +, 1., etc.)
    cleanedText = cleanedText.replace(/^#+\s*/gm, '');
    cleanedText = cleanedText.replace(/^(\s*[-+\d]+\.?)\s*/gm, '');
    
    // 3. Trim leading/trailing whitespace
    cleanedText = cleanedText.trim();

    return cleanedText;
};


export default function InterviewPrepSection() {
    const [jobRequirement, setJobRequirement] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    // Use the defined interface for state typing
    const [prepData, setPrepData] = useState<InterviewPrepData | null>(null)
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
        setPrepData(null) // Clear previous results

        try {
            // NOTE: Assuming the backend automatically incorporates the resume analysis
            const response = await fetch(`${API_URL}/interview_prep`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ job_requirement: jobRequirement }),
            })

            if (!response.ok) {
                throw new Error("Generation failed")
            }

            const data: InterviewPrepData = await response.json()

            // 3. Apply Cleaning and Validation
            if (!data.technical_questions || !data.behavioral_questions) {
                throw new Error("API returned incomplete data structure.")
            }

            const cleanedData: InterviewPrepData = {
                technical_questions: data.technical_questions.map(cleanText),
                behavioral_questions: data.behavioral_questions.map(cleanText),
                key_talking_points: data.key_talking_points ? data.key_talking_points.map(cleanText) : [],
                questions_to_ask: data.questions_to_ask ? data.questions_to_ask.map(cleanText) : [],
            }
            
            setPrepData(cleanedData)

            toast({
                title: "Interview prep ready",
                description: "Your personalized interview guide is ready",
            })
        } catch (error) {
            console.error("Interview prep error:", error);
            toast({
                title: "Generation failed",
                description: "Could not connect to the API or received bad data. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Interview Preparation</CardTitle>
                    <CardDescription>Get likely interview questions and talking points based on your resume and the job description below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Paste the job description here..."
                        value={jobRequirement}
                        onChange={(e) => setJobRequirement(e.target.value)}
                        rows={6}
                        className="resize-none"
                    />
                    <Button onClick={handleGenerate} disabled={isGenerating || !jobRequirement.trim()} className="w-full">
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Prep Data...
                            </>
                        ) : (
                            <>
                                <Briefcase className="w-4 h-4 mr-2" />
                                Generate Interview Prep
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Render Prep Data Cards */}
            {prepData && (
                <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Technical Questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary" />
                                Technical Questions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {prepData.technical_questions.length > 0 ? (
                                <ul className="space-y-3">
                                    {prepData.technical_questions.map((question, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                                                {idx + 1}
                                            </Badge>
                                            <p className="text-sm text-foreground flex-1">{question}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No specific technical questions generated.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Behavioral Questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-accent" />
                                Behavioral Questions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {prepData.behavioral_questions.length > 0 ? (
                                <ul className="space-y-3">
                                    {prepData.behavioral_questions.map((question, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                                                {idx + 1}
                                            </Badge>
                                            <p className="text-sm text-foreground flex-1">{question}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No specific behavioral questions generated.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Key Talking Points */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-warning" />
                                Key Talking Points
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {prepData.key_talking_points.length > 0 ? (
                                <ul className="space-y-3">
                                    {prepData.key_talking_points.map((point, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0" />
                                            <p className="text-sm text-foreground flex-1">{point}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No specific talking points generated.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Questions to Ask */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-success" />
                                Questions to Ask the Interviewer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {prepData.questions_to_ask.length > 0 ? (
                                <ul className="space-y-3">
                                    {prepData.questions_to_ask.map((question, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-success mt-2 flex-shrink-0" />
                                            <p className="text-sm text-foreground flex-1">{question}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No specific interviewer questions generated.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}