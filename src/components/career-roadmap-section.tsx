"use client"

import { useState, useEffect } from 'react';
import { MapPin, Target, BookOpen, Award, TrendingUp, Clock, CheckCircle, Circle, ArrowRight, Lightbulb, Users, Briefcase, Download, Loader2, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Badge } from "@/src/components/ui/badge";
import { useToast } from "@/src/hooks/use-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ROADMAP_KEY = "career_roadmap_result";
const TARGET_ROLE_KEY = "career_roadmap_target_role";
const CURRENT_EXP_KEY = "career_roadmap_current_exp";

interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  description: string;
  skills: string[];
  resources: string[];
  milestones: string[];
  status?: 'completed' | 'current' | 'upcoming';
}

interface CareerRoadmap {
  current_position: string;
  target_position: string;
  total_duration: string;
  difficulty_level: string;
  phases: RoadmapPhase[];
  certifications: string[];
  networking_tips: string[];
  portfolio_projects: string[];
}

export default function CareerRoadmapSection() {
  const [targetRole, setTargetRole] = useState('');
  const [currentExperience, setCurrentExperience] = useState('');
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRoadmap = localStorage.getItem(ROADMAP_KEY);
      const storedTargetRole = localStorage.getItem(TARGET_ROLE_KEY);
      const storedCurrentExp = localStorage.getItem(CURRENT_EXP_KEY);

      if (storedRoadmap) {
        try {
          setRoadmap(JSON.parse(storedRoadmap));
        } catch (e) {
          console.error("Could not parse stored roadmap:", e);
        }
      }
      if (storedTargetRole) setTargetRole(storedTargetRole);
      if (storedCurrentExp) setCurrentExperience(storedCurrentExp);
    }
  }, []);

  // Save to localStorage when roadmap changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (roadmap) {
        localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmap));
      }
    }
  }, [roadmap]);

  // Save inputs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TARGET_ROLE_KEY, targetRole);
      localStorage.setItem(CURRENT_EXP_KEY, currentExperience);
    }
  }, [targetRole, currentExperience]);

  const generateRoadmap = async () => {
    if (!targetRole.trim()) {
      setError('Please enter a target role or career path');
      toast({
        title: "Missing Information",
        description: "Please enter a target role to generate your roadmap",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/generate_career_roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: targetRole,
          current_experience: currentExperience
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }

      if (data.phases && Array.isArray(data.phases)) {
        data.phases = data.phases.map((phase: RoadmapPhase, index: number) => ({
          ...phase,
          status: index === 0 ? 'current' : 'upcoming'
        }));
        setRoadmap(data);
        toast({
          title: "Roadmap Generated!",
          description: `Created ${data.phases.length}-phase roadmap for ${targetRole}`,
        });
      } else {
        throw new Error('Invalid roadmap data structure');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate roadmap';
      setError(errorMsg);
      toast({
        title: "Generation Failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadRoadmapAsPDF = () => {
    if (!roadmap) return;

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Career Roadmap - ${roadmap.target_position}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
          }
          h1 {
            color: #4F46E5;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          h2 {
            color: #4F46E5;
            margin-top: 30px;
            border-left: 4px solid #4F46E5;
            padding-left: 15px;
          }
          h3 {
            color: #6366F1;
            margin-top: 20px;
          }
          .header-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .header-section h1 {
            color: white;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            margin: 0 0 20px 0;
          }
          .overview {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .overview-item {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4F46E5;
          }
          .overview-label {
            font-size: 12px;
            color: #6B7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .overview-value {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }
          .badge-beginner { background: #D1FAE5; color: #065F46; }
          .badge-intermediate { background: #FEF3C7; color: #92400E; }
          .badge-advanced { background: #FEE2E2; color: #991B1B; }
          .phase {
            background: #F9FAFB;
            border: 2px solid #E5E7EB;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .phase-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
          }
          .phase-number {
            background: #4F46E5;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
          }
          .phase-title {
            flex: 1;
          }
          .phase-duration {
            background: #EEF2FF;
            color: #4F46E5;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }
          .phase-description {
            color: #4B5563;
            margin-bottom: 20px;
            line-height: 1.8;
          }
          .phase-sections {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .phase-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
          }
          .phase-section h4 {
            color: #4F46E5;
            font-size: 14px;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .phase-section ul {
            margin: 0;
            padding-left: 20px;
          }
          .phase-section li {
            margin-bottom: 8px;
            color: #4B5563;
            font-size: 13px;
          }
          .resources-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 30px;
          }
          .resource-card {
            background: #F9FAFB;
            border: 2px solid #E5E7EB;
            border-radius: 10px;
            padding: 20px;
            page-break-inside: avoid;
          }
          .resource-card h3 {
            color: #4F46E5;
            margin: 0 0 15px 0;
            font-size: 16px;
          }
          .resource-card ul {
            margin: 0;
            padding-left: 20px;
          }
          .resource-card li {
            margin-bottom: 10px;
            color: #4B5563;
            font-size: 13px;
          }
          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
            color: #6B7280;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .phase, .resource-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header-section">
          <h1>🗺️ Career Roadmap: ${roadmap.target_position}</h1>
          <p style="margin: 0; opacity: 0.9;">Generated by CareerCompass AI</p>
        </div>

        <div class="overview">
          <div class="overview-item">
            <div class="overview-label">Current Position</div>
            <div class="overview-value">${roadmap.current_position}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">Target Position</div>
            <div class="overview-value">${roadmap.target_position}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">Total Duration</div>
            <div class="overview-value">${roadmap.total_duration}</div>
          </div>
          <div class="overview-item">
            <div class="overview-label">Difficulty Level</div>
            <div class="overview-value">
              <span class="badge badge-${roadmap.difficulty_level.toLowerCase()}">${roadmap.difficulty_level}</span>
            </div>
          </div>
        </div>

        <h2>📍 Learning Path (${roadmap.phases.length} Phases)</h2>
        ${roadmap.phases.map(phase => `
          <div class="phase">
            <div class="phase-header">
              <div class="phase-number">${phase.phase}</div>
              <div class="phase-title">
                <h3 style="margin: 0; color: #111827;">${phase.title}</h3>
              </div>
              <div class="phase-duration">⏱️ ${phase.duration}</div>
            </div>
            <p class="phase-description">${phase.description}</p>
            <div class="phase-sections">
              <div class="phase-section">
                <h4>💡 Skills to Learn</h4>
                <ul>
                  ${phase.skills.map(skill => `<li>${skill}</li>`).join('')}
                </ul>
              </div>
              <div class="phase-section">
                <h4>📚 Resources</h4>
                <ul>
                  ${phase.resources.map(resource => `<li>${resource}</li>`).join('')}
                </ul>
              </div>
              <div class="phase-section">
                <h4>✅ Milestones</h4>
                <ul>
                  ${phase.milestones.map(milestone => `<li>${milestone}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        `).join('')}

        <h2>🎯 Additional Resources</h2>
        <div class="resources-grid">
          <div class="resource-card">
            <h3>🏆 Recommended Certifications</h3>
            <ul>
              ${roadmap.certifications.map(cert => `<li>${cert}</li>`).join('')}
            </ul>
          </div>
          <div class="resource-card">
            <h3>👥 Networking Tips</h3>
            <ul>
              ${roadmap.networking_tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
          <div class="resource-card">
            <h3>💼 Portfolio Projects</h3>
            <ul>
              ${roadmap.portfolio_projects.map(project => `<li>${project}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>CareerCompass AI - Your Intelligent Career Optimization Platform</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Career_Roadmap_${roadmap.target_position.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Roadmap Downloaded!",
      description: "Open the HTML file in any browser and use Print > Save as PDF",
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'current':
        return <Circle className="w-6 h-6 text-primary fill-primary" />;
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getDifficultyColor = (level: string) => {
    const lower = level.toLowerCase();
    if (lower.includes('beginner')) return 'default';
    if (lower.includes('intermediate')) return 'secondary';
    if (lower.includes('advanced')) return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Career Roadmap Generator
          </CardTitle>
          <CardDescription>
            Get a personalized, step-by-step roadmap with learning resources, milestones, and expert guidance for your career transition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">
                Target Role / Career Path *
              </Label>
              <Input
                id="targetRole"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Machine Learning Engineer, Product Manager"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentExp">
                Current Experience (Optional)
              </Label>
              <Input
                id="currentExp"
                type="text"
                value={currentExperience}
                onChange={(e) => setCurrentExperience(e.target.value)}
                placeholder="e.g., 2 years as Frontend Developer"
                className="w-full"
              />
            </div>
          </div>

          <Button
            onClick={generateRoadmap}
            disabled={loading || !targetRole.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Your Roadmap...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Career Roadmap
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roadmap Display */}
      {roadmap && (
        <>
          {/* Overview Card */}
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Career Transition Overview
                </CardTitle>
                <Button
                  onClick={downloadRoadmapAsPDF}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Roadmap
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Position</p>
                    <p className="font-semibold text-sm">{roadmap.current_position}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Target className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Target Position</p>
                    <p className="font-semibold text-sm">{roadmap.target_position}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Duration</p>
                    <p className="font-semibold text-sm">{roadmap.total_duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Difficulty Level</p>
                    <Badge variant={getDifficultyColor(roadmap.difficulty_level)} className="mt-1">
                      {roadmap.difficulty_level}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phases Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Learning Path ({roadmap.phases.length} Phases)
              </CardTitle>
              <CardDescription>
                Follow this structured path to achieve your career goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {roadmap.phases.map((phase, index) => (
                  <div key={phase.phase} className="relative">
                    {/* Connector Line */}
                    {index < roadmap.phases.length - 1 && (
                      <div className="absolute left-3 top-14 bottom-0 w-0.5 bg-border -mb-6" />
                    )}

                    <div className="flex gap-4">
                      {/* Status Icon */}
                      <div className="relative z-10 flex-shrink-0 pt-1">
                        {getStatusIcon(phase.status)}
                      </div>

                      {/* Phase Content */}
                      <Card className="flex-1 border-2 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10">
                                  Phase {phase.phase}
                                </Badge>
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="w-3 h-3" />
                                  {phase.duration}
                                </Badge>
                              </div>
                              <CardTitle className="text-xl">{phase.title}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {phase.description}
                          </p>

                          <div className="grid md:grid-cols-3 gap-4 pt-2">
                            {/* Skills */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Lightbulb className="w-4 h-4 text-yellow-600" />
                                Skills to Learn
                              </h4>
                              <ul className="space-y-1.5">
                                {phase.skills.map((skill, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 mt-1 text-primary flex-shrink-0" />
                                    <span>{skill}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Resources */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                Resources
                              </h4>
                              <ul className="space-y-1.5">
                                {phase.resources.map((resource, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 mt-1 text-primary flex-shrink-0" />
                                    <span>{resource}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Milestones */}
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Milestones
                              </h4>
                              <ul className="space-y-1.5">
                                {phase.milestones.map((milestone, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ArrowRight className="w-3 h-3 mt-1 text-primary flex-shrink-0" />
                                    <span>{milestone}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Certifications */}
            <Card className="border-2 border-yellow-200 dark:border-yellow-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Recommended Certifications
                  <Badge variant="outline" className="ml-auto">
                    {roadmap.certifications.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {roadmap.certifications.map((cert, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{cert}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Networking */}
            <Card className="border-2 border-blue-200 dark:border-blue-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-blue-600" />
                  Networking Tips
                  <Badge variant="outline" className="ml-auto">
                    {roadmap.networking_tips.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {roadmap.networking_tips.map((tip, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Portfolio Projects */}
            <Card className="border-2 border-green-200 dark:border-green-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  Portfolio Projects
                  <Badge variant="outline" className="ml-auto">
                    {roadmap.portfolio_projects.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {roadmap.portfolio_projects.map((project, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{project}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}