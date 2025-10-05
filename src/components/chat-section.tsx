"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { Loader2, Send, Bot, User, Sparkles, RefreshCw } from "lucide-react"
import { useToast } from "@/src/hooks/use-toast"

const API_URL = "http://localhost:5000"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface FeatureQuestion {
  title: string;
  question: string;
}

interface ChatSectionProps {
  domain: string
}

const initialSuggestedQuestions: FeatureQuestion[] = [
  { title: "Key Skills", question: "What are the key skills I should focus on to advance my career?" },
  { title: "Senior Role", question: "How can I transition from my current position to a senior role?" },
  { title: "Certifications", question: "What certifications would be most valuable to boost my resume in my field?" },
  { title: "Salary Negotiate", question: "What strategies should I use to negotiate a better salary?" },
  { title: "Interview Qs", question: "What are common interview questions and ideal answers in my field?" },
  { title: "LinkedIn Profile", question: "How can I improve my LinkedIn profile to attract recruiters?" }
]


/**
 * Cleans up common Markdown formatting (bold, italics, lists, headings)
 * to ensure plain, readable text inside the chat bubbles.
 * @param {string} text - The raw text string from the API.
 * @returns {string} The cleaned text string.
 */
const cleanResponseFormatting = (text: string): string => {
  if (!text) return '';
  
  // 1. Remove all bold/italic markers (** and *)
  let cleanedText = text.replace(/(\*\*|\*)/g, '');

  // 2. Remove Markdown headings (#, ##, etc.) at the start of a line
  cleanedText = cleanedText.replace(/^#+\s*/gm, '');

  // 3. Remove Markdown list markers (-, +, 1., etc.) at the start of a line
  // This handles unordered lists (- or *) and ordered lists (1. 2. etc.)
  cleanedText = cleanedText.replace(/^(\s*[-+\d]+\.?)\s*/gm, '');

  // 4. Clean up any excessive newlines, reducing triple+ to double
  cleanedText = cleanedText.replace(/(\r?\n){3,}/g, '\n\n');

  // 5. Trim leading/trailing whitespace
  cleanedText = cleanedText.trim();

  return cleanedText;
};


export default function ChatSection({ domain }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Effect to add initial welcome message and scroll
  useEffect(() => {
    // Add personalized welcome message only once
    if (messages.length === 0) {
      // The initial message is defined here without Markdown to begin with.
      const welcomeMessage = {
        role: "assistant" as const,
        content: `Hello! I see you're interested in the ${domain} field. I'm your AI Career Advisor. Ask me anything about skill development, salary negotiation, interview prep, or your career roadmap. Let's start!`,
      };
      setMessages([welcomeMessage]);
    }
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [messages, domain])

  // Use useCallback to memoize the sending function
  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: textToSend }])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/career_roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSend, domain }), 
      })

      if (!response.ok) {
        throw new Error("Failed to get response from AI backend")
      }

      const data = await response.json()
      
      // APPLY THE ROBUST CLEANING UTILITY HERE
      const cleanedResponse = cleanResponseFormatting(data.response);
      
      setMessages((prev) => [...prev, { role: "assistant", content: cleanedResponse }])
    } catch (error) {
      console.error(error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the AI model. Please check the API server.",
        variant: "destructive",
      })
      // Remove the user message if request failed to allow resending
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
      // Focus back on input after sending
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, domain, toast])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    toast({
      title: "Chat cleared",
      description: "Conversation history has been reset. Advisor will greet you again.",
    })
  }

  const handleQuickQuestion = (question: string) => {
    handleSend(question)
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                AI Career Advisor
              </CardTitle>
              
            </div>
            {/* Clear Chat Button (Always show if history exists) */}
            {messages.length > 1 && (
              <Button
                variant="outline" 
                size="sm"
                onClick={handleClearChat}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                New Chat
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Chat Card (using min-h for flexible sizing) */}
      <Card className="flex flex-col min-h-[500px] max-h-[80vh]">
        <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto space-y-4 pr-2" 
          >
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm whitespace-pre-wrap" 
                  }`}
                >
                  <p className="text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-5 h-5 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Advising...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t pt-4 mt-auto">
            
            {/* Quick Question Badges (Visible after initial message) */}
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {initialSuggestedQuestions.slice(0, 4).map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-xs font-normal"
                    onClick={() => handleQuickQuestion(item.question)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {item.title}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask about your career roadmap, skills, or job search..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 pr-12" 
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
          </div>
        </CardContent>
      </Card>
    </div>
  )
}