"use client"

import { useState } from "react"
import { Upload, FileText, MessageSquare, FileCheck, Briefcase, DollarSign, Sparkles, TrendingUp, Home } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Card, CardContent } from "@/src/components/ui/card"
import { useToast } from "@/src/hooks/use-toast"
import UploadSection from "@/src/components/upload-section"
import AnalysisSection from "@/src/components/analysis-section"
import ChatSection from "@/src/components/chat-section"
import CoverLetterSection from "@/src/components/cover-letter-section"
import InterviewPrepSection from "@/src/components/interview-prep-section"
import SalaryInsightsSection from "@/src/components/salary-insights-section"

export default function Home() {
  const [resumeUploaded, setResumeUploaded] = useState(false)
  const [resumeMetadata, setResumeMetadata] = useState<any>(null)
  const [detectedDomain, setDetectedDomain] = useState<string>("")
  const [activeTab, setActiveTab] = useState("analysis")
  const { toast } = useToast()

  const features = [
    {
      icon: FileCheck,
      title: "ATS Score Analysis",
      description: "Get ATS compatibility scores by analyzing your resume against the job description with smart optimization insights",
      tab: "analysis"
    },
    {
      icon: MessageSquare,
      title: "Personalized Career Guidance",
      description: "Chat with AI for personalized career guidance and resume tips",
      tab: "chat"
    },
    {
      icon: FileText,
      title: "Cover Letter Craft",
      description: "Auto-generate professional cover letters tailored to each job description to boost your application success",
      tab: "cover-letter"
    },
    {
      icon: Briefcase,
      title: "Interview Prep Hub",
      description: "Practice with AI-curated interview questions and talking points based on your resume and target role",
      tab: "interview"
    },
    {
      icon: DollarSign,
      title: "Salary Insights",
      description: "Explore real-time salary benchmarks for roles that match your skills, experience, and job description — plus get AI tips on how to negotiate effectively",
      tab: "salary"
    },
    {
      icon: TrendingUp,
      title: "Strategic Career Development",
      description: "Identify missing skills and get personalized learning resources to advance your career",
      tab: "analysis"
    }
  ]

  const handleFeatureClick = (tab: string) => {
    if (!resumeUploaded) {
      const uploadSection = document.getElementById('upload-section')
      uploadSection?.scrollIntoView({ behavior: 'smooth' })
      
      setTimeout(() => {
        toast({
          title: "Upload Required",
          description: "Please upload your resume to use this feature",
        })
      }, 600)
    } else {
      setActiveTab(tab)
      const tabsSection = document.getElementById('tabs-section')
      tabsSection?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleBackToHome = () => {
    setResumeUploaded(false)
    setResumeMetadata(null)
    setDetectedDomain("")
    setActiveTab("analysis")
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    toast({
      title: "Back to home",
      description: "Upload a new resume to get started",
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform" onClick={handleBackToHome}>
                <FileCheck className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent cursor-pointer" onClick={handleBackToHome}>
                  CareerCompass AI
                </h1>
                <p className="text-xs text-muted-foreground">Intelligent Career Optimization Platform</p>
              </div>
            </div>
            {resumeMetadata && (
              <div className="hidden md:flex items-center">
                <div className="text-right">
                  <p className="font-semibold text-foreground text-sm">{resumeMetadata.name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {detectedDomain}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {!resumeUploaded && (
        <>
          {/* Hero Section */}
          <section className="container mx-auto px-4 lg:px-8 py-16 md:py-20">
            <div className="max-w-4xl mx-auto text-center space-y-">
              
              <h2 className="text-4xl md:text-6xl font-bold text-foreground text-balance leading-tight">
                Land Your Dream Job with{" "}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  AI-Powered Insights
                </span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
                Works for <strong>all careers</strong> - from tech to healthcare, finance to creative. 
                 Get instant ATS scores, personalized feedback, career guidance - chat with AI coach, practice interviews, research salaries, generate cover letters, and identify skill gaps.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-6">
                <Button
                  size="lg"
                  onClick={() => {
                    const uploadSection = document.getElementById('upload-section')
                    uploadSection?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="text-base font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Resume Now
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section')
                    featuresSection?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  variant="outline"
                  className="text-base font-medium"
                >
                  Explore Features
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Universal Domain Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span>Intelligent Keyword Extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <span>60-90% ATS Accuracy</span>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features-section" className="container mx-auto px-4 lg:px-8 pb-16">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Everything You Need to Succeed
                </h3>
                <p className="text-muted-foreground text-lg">
                  Comprehensive tools for every stage of your job search
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <Card 
                      key={index} 
                      className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group cursor-pointer"
                      onClick={() => handleFeatureClick(feature.tab)}
                    >
                      <CardContent className="p-6">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors group-hover:scale-110 duration-300">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-semibold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                          {feature.title}
                        </h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="container mx-auto px-4 lg:px-8 pb-16">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h3>
                <p className="text-muted-foreground text-lg">
                  Three simple steps to optimize your career
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    1
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Upload Resume</h4>
                  <p className="text-muted-foreground text-sm">
                    Upload your PDF resume and let AI detect your career domain
                  </p>
                </div>
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    2
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Get Analysis</h4>
                  <p className="text-muted-foreground text-sm">
                    Receive ATS score, keyword matches, and improvement suggestions
                  </p>
                </div>
                <div className="text-center group hover:scale-105 transition-transform">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    3
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Take Action</h4>
                  <p className="text-muted-foreground text-sm">
                    Use AI tools to improve resume, prepare interviews, and apply with confidence
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Main Upload/Analysis Section */}
      <section id="upload-section" className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          {!resumeUploaded ? (
            <UploadSection
              onUploadSuccess={(metadata, domain) => {
                setResumeUploaded(true)
                setResumeMetadata(metadata)
                setDetectedDomain(domain)
                // Scroll to tabs after successful upload
                setTimeout(() => {
                  const tabsSection = document.getElementById('tabs-section')
                  tabsSection?.scrollIntoView({ behavior: 'smooth' })
                }, 500)
              }}
            />
          ) : (
            <div id="tabs-section" className="space-y-6">
              {/* Quick Feature Cards - Always Visible After Upload */}
              {/* <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Quick Access
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {features.map((feature, index) => {
                      const Icon = feature.icon
                      return (
                        <Button
                          key={index}
                          variant={activeTab === feature.tab ? "default" : "outline"}
                          className="h-auto flex-col gap-2 py-4"
                          onClick={() => setActiveTab(feature.tab)}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium leading-tight text-center">
                            {feature.title}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card> */}

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-2 bg-muted/50 p-1.5 h-auto rounded-lg my-6" >
                  
                  <TabsTrigger 
                    value="analysis" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Analysis</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="chat" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="cover-letter" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Cover</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="interview" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span className="hidden sm:inline">Interview</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="salary" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Salary</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="upload" 
                    className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <UploadSection
                    onUploadSuccess={(metadata, domain) => {
                      setResumeMetadata(metadata)
                      setDetectedDomain(domain)
                      setActiveTab("analysis")
                    }}
                  />
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <AnalysisSection />
                </TabsContent>

                <TabsContent value="chat" className="space-y-4">
                  <ChatSection domain={detectedDomain} />
                </TabsContent>

                <TabsContent value="cover-letter" className="space-y-4">
                  <CoverLetterSection />
                </TabsContent>

                <TabsContent value="interview" className="space-y-4">
                  <InterviewPrepSection />
                </TabsContent>

                <TabsContent value="salary" className="space-y-4">
                  <SalaryInsightsSection />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      {/* <footer className="border-t bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Resume Analyzer Pro</span>
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">
              Built with AI • Universal Domain Support • Intelligent Keyword Extraction
            </p>
          </div>
        </div>
      </footer> */}
    </main>
  )
}