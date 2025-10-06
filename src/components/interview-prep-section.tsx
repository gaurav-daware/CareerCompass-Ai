"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Textarea } from "@/src/components/ui/textarea"
import { Badge } from "@/src/components/ui/badge"
import { Loader2, Briefcase, MessageCircle, Lightbulb, HelpCircle } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ===============================================
// GLOBAL KEYS for UX Improvement (MUST BE SHARED)
// ===============================================
const JD_KEY = "global_job_description"; // Shared JD key for all sections
const INTERVIEW_PREP_KEY = "interview_prep_result"; // Key unique to this component's output

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
    // --- JOB REQUIREMENT STATE: Reads from global storage on mount ---
    const [jobRequirement, setJobRequirement] = useState("");
    
    const [isGenerating, setIsGenerating] = useState(false)
    // --- PREP DATA STATE: Loads previous result from its key ---
    const [prepData, setPrepData] = useState<InterviewPrepData | null>(() => {
        if (typeof window !== 'undefined') {
            const storedResult = localStorage.getItem(INTERVIEW_PREP_KEY);
            try {
                return storedResult ? JSON.parse(storedResult) : null;
            } catch (e) {
                console.error("Could not parse stored interview prep data:", e);
                return null;
            }
        }
        return null;
    });
    const { toast } = useToast()

    // ===============================================
    // LOCAL STORAGE EFFECTS (IMPROVED FOR SHARING)
    // ===============================================
    
    // 1. Effect to load global JD state on mount.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedJD = localStorage.getItem(JD_KEY) || "";
            setJobRequirement(storedJD);
        }
    }, []); // Run only once on mount to pull shared JD

    // 2. Effect to save generated prep data whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (prepData) {
                localStorage.setItem(INTERVIEW_PREP_KEY, JSON.stringify(prepData));
            } else {
                localStorage.removeItem(INTERVIEW_PREP_KEY);
            }
        }
    }, [prepData]);

    // 3. Handler to update local state AND local storage for JD persistence
    const handleJobRequirementChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setJobRequirement(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem(JD_KEY, value); // Write to the global key
        }
    };


    const handleGenerate = async () => {
        const currentJD = jobRequirement.trim();

        if (!currentJD) {
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
            const response = await fetch(`${API_URL}/interview_prep`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Use the synchronized jobRequirement state
                body: JSON.stringify({ job_requirement: currentJD }),
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
            
            setPrepData(cleanedData) // This saves via useEffect

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

    // Utility component to render a list card
    const renderListCard = (
        title: string, 
        data: string[] | undefined, 
        Icon: any, 
        iconColor: string = 'text-primary', 
        useBullet: boolean = false
    ) => (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {data && data.length > 0 ? (
                    <ul className="space-y-3">
                        {data.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                {useBullet ? (
                                    <div className={`w-2 h-2 rounded-full ${iconColor.replace('text-', 'bg-')} mt-2 flex-shrink-0`} />
                                ) : (
                                    <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                                        {idx + 1}
                                    </Badge>
                                )}
                                <p className="text-sm text-foreground flex-1">{item}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-sm">No specific {title.toLowerCase()} generated.</p>
                )}
            </CardContent>
        </Card>
    );

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
                        onChange={handleJobRequirementChange} // Use synchronization handler
                        rows={6}
                        className="resize-none"
                    />
                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !jobRequirement.trim()} 
                        className="w-full"
                    >
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
                    {renderListCard(
                        "Technical Questions", 
                        prepData.technical_questions, 
                        Briefcase, 
                        'text-primary'
                    )}

                    {/* Behavioral Questions */}
                    {renderListCard(
                        "Behavioral Questions", 
                        prepData.behavioral_questions, 
                        MessageCircle, 
                        'text-accent-foreground'
                    )}

                    {/* Key Talking Points */}
                    {renderListCard(
                        "Key Talking Points", 
                        prepData.key_talking_points, 
                        Lightbulb, 
                        'text-yellow-600',
                        true // Use bullet points
                    )}

                    {/* Questions to Ask */}
                    {renderListCard(
                        "Questions to Ask the Interviewer", 
                        prepData.questions_to_ask, 
                        HelpCircle, 
                        'text-green-600',
                        true // Use bullet points
                    )}
                </div>
            )}
        </div>
    )
}