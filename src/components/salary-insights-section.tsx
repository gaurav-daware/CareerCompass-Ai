"use client"

import { useState, useMemo } from "react" 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Loader2, DollarSign, TrendingUp, Info, RefreshCw } from "lucide-react" 
import { useToast } from "@/src/hooks/use-toast"
import { useQuery } from "@tanstack/react-query" 


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Interface to define the data structure
interface SalaryInsights {
    estimated_range: string;
    factors: string[];
    negotiation_tips: string[];
}

interface SalarySectionProps {
    detectedDomain?: string; // Prop passed from the parent component
}

/**
 * Cleans up common Markdown formatting (bold, italics, lists, headings)
 */
const cleanText = (text: string): string => {
    if (!text) return '';
    
    let cleanedText = text.replace(/(\*\*|\*|__|_)/g, '');
    cleanedText = cleanedText.replace(/^#+\s*/gm, '');
    cleanedText = cleanedText.replace(/^(\s*[-+\d]+\.?)\s*/gm, '');
    cleanedText = cleanedText.replace(/^>\s*/gm, '');

    return cleanedText.trim();
};

// ===============================================
// CUSTOM TANSTACK QUERY HOOK
// ===============================================

function useSalaryInsights() {
    // This hook fetches data and handles caching/loading automatically.
    return useQuery<SalaryInsights>({
        queryKey: ["salaryInsights"],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/salary_insights`)
            
            if (!res.ok) {
                const errorData = await res.json();
                // Throw an Error object for useQuery to catch
                throw new Error(errorData.error || "Failed to fetch salary insights");
            }
            return res.json()
        },
        // Stale time controls how long the cached data is considered 'fresh'.
        // This relies on the QueryClientProvider default options (5 minutes).
        staleTime: Infinity, // Use Infinity to rely only on refetchOnMount/WindowFocus and manual refetch.
        refetchOnMount: true,
    })
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export default function SalaryInsightsSection({ detectedDomain }: SalarySectionProps) {
    // Fetch data using the custom hook
    const { data, isLoading, isError, error, refetch, isFetching } = useSalaryInsights()
    const { toast } = useToast()
    
    // Use useMemo to safely clean and structure the data ONLY when 'data' changes
    const cleanedInsights = useMemo(() => {
        // If data is null or incomplete, return null
        if (!data || !data.estimated_range) {
            return null;
        }

        // Apply cleaning logic
        return {
            estimated_range: cleanText(data.estimated_range),
            factors: data.factors.map(cleanText),
            negotiation_tips: data.negotiation_tips.map(cleanText),
        } as SalaryInsights;
        
    }, [data]);
    
    // Manual Refresh handler using TanStack Query's refetch mechanism
    const handleManualRefresh = () => {
        refetch();
        toast({
            title: "Refreshing insights...",
            description: "Fetching the latest salary data.",
        });
    }


    // --- Render Logic ---

    // Show loading state if initial fetch is running or a manual refetch is pending
    if (isLoading || isFetching) {
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

    // Show Error/Unavailable State
    if (isError || !cleanedInsights) {
        const errorMessage = (error as Error)?.message || "Ensure your resume is uploaded and the API is running.";

        return (
            <div className="space-y-6">
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <DollarSign className="w-6 h-6" />
                            Insights Unavailable
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-6">
                        <p className="text-muted-foreground">We were unable to generate salary insights for your profile at this time.</p>
                        <p className="text-xs mt-2 text-muted-foreground">{errorMessage}</p>
                        <Button onClick={handleManualRefresh} className="mt-4" disabled={isFetching}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Try Refresh
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Helper to render lists
    const renderList = (data: string[], Icon: any, color: string) => (
        <ul className="space-y-3">
            {data.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                    <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${color}`} />
                    <p className="text-sm text-foreground flex-1">{item}</p>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="space-y-6">
            {/* Manual Refresh Button */}
            <Card className="p-4">
                <Button 
                    onClick={handleManualRefresh}
                    disabled={isFetching} 
                    className="w-full"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> 
                    Refresh Salary Insights {detectedDomain ? `for ${detectedDomain}` : ''}
                </Button>
            </Card>

            {/* Estimated Salary Range */}
            <Card className="border-2 border-green-200 dark:border-green-900/50">
                <CardHeader className="bg-green-50 dark:bg-green-950/50">
                    <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {cleanedInsights.estimated_range}
                    </CardTitle>
                    <CardDescription className="text-sm text-green-800 dark:text-green-300">
                        Estimated Market Range for your Profile
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    
                    {/* Negotiation Tips */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                            <TrendingUp className="w-5 h-5" />
                            Negotiation Tips
                        </h3>
                        {renderList(cleanedInsights.negotiation_tips, Info, 'text-purple-600')}
                    </div>

                    {/* Salary Factors */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                            <Info className="w-5 h-5" />
                            Key Compensation Factors
                        </h3>
                        {renderList(cleanedInsights.factors, Info, 'text-orange-600')}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}