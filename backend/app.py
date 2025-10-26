from flask import render_template
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import spacy
import re
from PyPDF2 import PdfReader
import os
import uuid
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
from difflib import SequenceMatcher

import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("FATAL: GEMINI_API_KEY not found. Please set it in your .env file.")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('models/gemini-2.5-flash')

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global State
current_resume = None
cleaned_resume_text = None
detected_domain = "General Career Field"
memory = ConversationBufferWindowMemory(k=7, memory_key="chat_history")
conversation_chain = None

# ==================== IMPROVED KEYWORD EXTRACTION ====================

def normalize_skill(skill):
    """Improved normalization with common technical term handling"""
    skill_lower = skill.lower().strip()
    
    # Remove file extensions
    skill_lower = re.sub(r'\.(js|py|tsx|jsx|ts)$', '', skill_lower)
    
    # Handle common variations (helps matching)
    replacements = {
        'javascript': 'js',
        'typescript': 'ts',
        'reactjs': 'react',
        'react.js': 'react',
        'nodejs': 'node',
        'node.js': 'node',
        'mongodb': 'mongo',
        'postgresql': 'postgres',
        'sql server': 'sqlserver',
        'c++': 'cpp',
        'c#': 'csharp',
    }
    
    for old, new in replacements.items():
        skill_lower = skill_lower.replace(old, new)
    
    # Light lemmatization (preserve technical terms)
    doc = nlp(skill_lower)
    tokens = [token.lemma_ if not token.text.isupper() else token.text 
              for token in doc if not token.is_stop and not token.is_punct]
    
    return ' '.join(tokens) if tokens else skill_lower

def fuzzy_match_keywords(resume_skills_norm, job_keywords_norm, threshold=0.85):
    """Use fuzzy matching to catch similar keywords"""
    matches = {}
    unmatched_job_keywords = set(job_keywords_norm.keys())
    
    for resume_skill_norm, resume_skill_original in resume_skills_norm.items():
        best_match = None
        best_score = 0
        
        for job_keyword_norm in unmatched_job_keywords:
            similarity = SequenceMatcher(None, resume_skill_norm, job_keyword_norm).ratio()
            
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = job_keyword_norm
        
        if best_match:
            matches[best_match] = job_keywords_norm[best_match]
            unmatched_job_keywords.discard(best_match)
    
    return matches

def extract_keywords_from_text(text, max_keywords=30):
    """Extract keywords directly from text using NLP - UNIVERSAL for ALL domains"""
    keywords = set()
    
    # 1. Extract using SpaCy NER and noun chunks
    doc = nlp(text[:5000])
    
    for ent in doc.ents:
        if ent.label_ in ['ORG', 'PRODUCT', 'GPE', 'WORK_OF_ART', 'LAW', 'EVENT', 'FAC']:
            if len(ent.text.strip()) > 2:
                keywords.add(ent.text.strip())
    
    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.strip()
        word_count = len(chunk_text.split())
        if 1 <= word_count <= 4 and len(chunk_text) > 2:
            if not chunk_text.lower() in ['the company', 'the position', 'the role', 'the team', 'our team']:
                keywords.add(chunk_text)
    
    # 2. Universal patterns
    universal_patterns = [
        r'(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)',
        r'\b([A-Z]{2,}(?:\s+[A-Z]{2,})?)\s+(?:certified|certification|certificate)\b',
        r'\b(?:certified|certification)\s+([A-Z][A-Za-z\s&]+?)(?:\b)',
        r'\b([A-Z][A-Za-z0-9+#.]{2,}(?:\.[A-Za-z]+)?)\b(?=\s+(?:software|tool|platform|suite|system))',
        r'(?:proficient|experienced|skilled|expert|knowledge)\s+(?:in|with|at)\s+([A-Z][A-Za-z\s&+#.-]+?)(?:\.|,|;|\n|and|$)',
        r'\b([A-Z]{3,5})\b(?=\s+(?:format|file|standard|protocol))',
    ]
    
    for pattern in universal_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                match = ' '.join(filter(None, match))
            if len(match.strip()) > 2:
                keywords.add(match.strip())
    
    # 3. Degree requirements
    degree_pattern = r'\b(Associate\'?s?|Bachelor\'?s?|Master\'?s?|PhD|Doctorate|B\.?A\.?|B\.?S\.?|M\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|J\.?D\.?|M\.?D\.?|DDS|PharmD)\s*(?:degree\s+)?(?:in\s+)?([A-Z][A-Za-z\s]+?)(?:\.|,|;|\n|or|and|$)'
    matches = re.findall(degree_pattern, text, re.IGNORECASE)
    for match in matches:
        if isinstance(match, tuple):
            degree_text = ' '.join(filter(None, match)).strip()
        else:
            degree_text = match.strip()
        if len(degree_text) > 3:
            keywords.add(degree_text)
    
    # 4. Capitalized multi-word terms
    cap_phrase_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b'
    cap_matches = re.findall(cap_phrase_pattern, text)
    for match in cap_matches:
        if len(match) > 5 and match.lower() not in ['the company', 'the position']:
            keywords.add(match)
    
    # 5. Acronyms
    acronym_pattern = r'\b([A-Z]{2,6})\b'
    acronyms = re.findall(acronym_pattern, text)
    for acronym in acronyms:
        if acronym not in ['AND', 'OR', 'THE', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'WERE', 'YOU', 'ALL']:
            keywords.add(acronym)
    
    # 6. Clean and filter
    cleaned_keywords = set()
    for kw in keywords:
        cleaned = re.sub(r'[^\w\s+#.-]', ' ', kw).strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        if (cleaned and 
            len(cleaned) > 2 and 
            not cleaned.isdigit() and
            not cleaned.lower() in ['the', 'and', 'or', 'for', 'with', 'this', 'that', 'from', 'have', 'been', 'will']):
            cleaned_keywords.add(cleaned)
    
    return list(cleaned_keywords)[:max_keywords]

def extract_required_skills_hybrid(job_requirement):
    """Hybrid approach: Extract from text + AI enhancement"""
    extracted_skills = extract_keywords_from_text(job_requirement, max_keywords=25)
    
    try:
        prompt = f"""
        From this job description, identify ONLY 5-8 critical requirements that are NOT already in this list: {extracted_skills}
        
        Job Description: {job_requirement[:1200]}
        
        Focus on:
        - Specific technical skills or tools
        - Required certifications
        - Years of experience requirements
        - Education requirements
        - Domain-specific knowledge
        
        Return ONLY a JSON array of strings: ["skill1", "skill2", ...]
        Keep each skill concise (under 6 words).
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        ai_skills = json.loads(cleaned)
        
        combined_skills = list(set(extracted_skills + [s for s in ai_skills if len(s) < 50]))[:30]
        return {"hard_skills": combined_skills, "soft_skills": []}
    except Exception as e:
        print(f"AI enhancement error: {e}")
        return {"hard_skills": extracted_skills, "soft_skills": []}

def extract_resume_skills_hybrid(resume_text, domain):
    """Extract skills from resume using hybrid approach"""
    extracted_skills = extract_keywords_from_text(resume_text, max_keywords=50)
    
    try:
        prompt = f"""
        From this {domain} resume, identify 8-12 additional important skills/qualifications NOT in: {extracted_skills[:20]}
        
        Resume: {resume_text[:1500]}
        
        Return comma-separated skills only. Focus on:
        - Technical skills and tools used
        - Certifications mentioned
        - Years of experience
        - Programming languages
        
        Keep each skill under 6 words.
        """
        response = gemini_model.generate_content(prompt)
        ai_skills = [s.strip() for s in response.text.replace('\n', ',').split(',') if s.strip() and len(s.strip()) < 50]
        
        combined = list(set(extracted_skills + ai_skills))[:60]
        return combined
    except Exception as e:
        print(f"Resume AI enhancement error: {e}")
        return extracted_skills

def calculate_improved_ats_score(resume_text, job_requirement, domain):
    """Improved ATS scoring with validation and fuzzy matching"""
    
    # Validate input length
    word_count = len(job_requirement.strip().split())
    if word_count < 10:
        return {
            "score": 0,
            "error": f"Job description too short ({word_count} words). Please provide at least 50 words for accurate analysis.",
            "skill_match_score": 0,
            "semantic_score": 0,
            "density_bonus": 0,
            "matching_keywords": [],
            "missing_keywords": [],
            "keyword_density": {},
            "total_job_keywords": 0,
            "total_resume_skills": 0
        }
    
    # Extract keywords
    required_skills_dict = extract_required_skills_hybrid(job_requirement)
    required_skills = required_skills_dict.get('hard_skills', [])
    resume_skills = extract_resume_skills_hybrid(resume_text, domain)
    
    if len(required_skills) == 0:
        return {
            "score": 0,
            "error": "Could not extract meaningful keywords from job description. Please provide more detailed requirements.",
            "skill_match_score": 0,
            "semantic_score": 0,
            "density_bonus": 0,
            "matching_keywords": [],
            "missing_keywords": [],
            "keyword_density": {},
            "total_job_keywords": 0,
            "total_resume_skills": len(resume_skills)
        }
    
    # Normalize skills
    job_keywords_normalized = {normalize_skill(k): k for k in required_skills}
    resume_skills_normalized = {normalize_skill(s): s for s in resume_skills}
    
    # Exact matches
    exact_matches = set(job_keywords_normalized.keys()) & set(resume_skills_normalized.keys())
    matching_keywords = [job_keywords_normalized[norm] for norm in exact_matches]
    
    # Fuzzy matches for remaining
    remaining_job_keywords = {k: v for k, v in job_keywords_normalized.items() 
                             if k not in exact_matches}
    fuzzy_matches = fuzzy_match_keywords(resume_skills_normalized, remaining_job_keywords, threshold=0.85)
    matching_keywords.extend(fuzzy_matches.values())
    
    # Missing keywords
    all_matched_normalized = exact_matches | set(fuzzy_matches.keys())
    missing_keywords = [job_keywords_normalized[norm] for norm 
                       in (set(job_keywords_normalized.keys()) - all_matched_normalized)]
    
    # Skill match score
    skill_match_ratio = len(matching_keywords) / max(1, len(required_skills))
    skill_match_score = skill_match_ratio * 100
    
    # Semantic similarity
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=500,
            min_df=1,
            token_pattern=r'(?u)\b\w+\b'
        )
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_requirement])
        
        if tfidf_matrix.shape[0] >= 2:
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            semantic_score = cosine_sim[0][0] * 100
        else:
            semantic_score = 0
    except:
        semantic_score = 0
    
    # Keyword density
    keyword_density = {}
    resume_lower = resume_text.lower()
    for kw in matching_keywords:
        count = resume_lower.count(kw.lower())
        keyword_density[kw] = count
    
    avg_density = sum(keyword_density.values()) / max(1, len(keyword_density))
    density_bonus = min(10, avg_density * 2)
    
    # Final score
    final_score = (skill_match_score * 0.60) + (semantic_score * 0.30) + density_bonus
    final_score = min(100, max(0, final_score))
    
    return {
        "score": round(final_score, 2),
        "skill_match_score": round(skill_match_score, 2),
        "semantic_score": round(semantic_score, 2),
        "density_bonus": round(density_bonus, 2),
        "matching_keywords": matching_keywords[:20],
        "missing_keywords": missing_keywords[:15],
        "keyword_density": dict(sorted(keyword_density.items(), 
                                      key=lambda x: x[1], reverse=True)[:10]),
        "total_job_keywords": len(required_skills),
        "total_resume_skills": len(resume_skills),
        "all_job_keywords": required_skills,
        "all_resume_skills": resume_skills[:30]
    }

# ==================== ORIGINAL FEATURES ====================

def extract_resume_metadata(text):
    """Extract structured metadata from resume using AI."""
    try:
        prompt = f"""
        Extract the following information from this resume. Return as valid JSON only:
        {{
            "name": "candidate name or 'Not Found'",
            "email": "email or 'Not Found'",
            "phone": "phone or 'Not Found'",
            "location": "city, country or 'Not Found'",
            "years_experience": "estimated years or 'Not Found'",
            "education_level": "highest degree or 'Not Found'",
            "current_role": "current/most recent job title or 'Not Found'"
        }}
        
        Resume: {text[:1000]}
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)
    except:
        return {"name": "Not Found", "email": "Not Found", "phone": "Not Found", 
                "location": "Not Found", "years_experience": "Not Found", 
                "education_level": "Not Found", "current_role": "Not Found"}

def generate_cover_letter(resume_text, job_requirement, domain, company_name="the company"):
    """AI-generated cover letter based on resume and job."""
    try:
        prompt = f"""
        Write a professional, compelling cover letter (250-300 words) for this candidate applying to {company_name} in the {domain} field.
        
        Resume Summary: {resume_text[:1000]}
        Job Requirements: {job_requirement[:800]}
        
        The cover letter should:
        1. Open with enthusiasm about the specific role
        2. Highlight 2-3 key relevant qualifications from the resume
        3. Demonstrate understanding of the company/role needs
        4. Close with a strong call to action
        
        Use a professional but warm tone. Do not use placeholder brackets.
        """
        response = gemini_model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Error generating cover letter: {str(e)}"
    
def generate_subject_lines(company_name, email_type, recipient_name=""):
    """Generate 3-4 subject line suggestions based on email type"""
    try:
        prompt = f"""Generate 4 compelling email subject lines for a {email_type} email to {company_name}.
        Recipient: {recipient_name or 'Hiring Manager'}
        
        Requirements:
        - Keep each under 60 characters
        - Make them specific and actionable
        - Avoid generic phrases like "Seeking Opportunities"
        - Include company name or role-specific details
        
        Return ONLY a JSON array: ["Subject 1", "Subject 2", "Subject 3", "Subject 4"]
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        subjects = json.loads(cleaned)
        return subjects[:4] if isinstance(subjects, list) else []
    except:
        # Fallback subject lines
        fallbacks = {
            'direct': [
                f"Application for Role at {company_name}",
                f"Experienced Professional Interested in {company_name}",
                f"Adding Value to {company_name}'s Team"
            ],
            'networking': [
                f"Learning from {company_name}'s Success",
                f"Coffee Chat with {company_name} Team?",
                f"Seeking Advice from {company_name} Professional"
            ],
            'referral': [
                f"Introduction Request - {company_name}",
                f"Referred Connection at {company_name}",
                f"Mutual Interest in {company_name}"
            ],
            'followup': [
                f"Following Up - {company_name} Application",
                f"Checking In: {company_name} Opportunity",
                f"Continued Interest in {company_name}"
            ]
        }
        return fallbacks.get(email_type, [f"Regarding {company_name}"])

def generate_cold_email(
    resume_text, 
    email_type, 
    company_name,
    recipient_name="Hiring Manager",
    recipient_title="",
    job_requirement="",
    additional_context=""
):
    """Generate personalized cold emails with structured output"""
    
    # Build recipient display
    recipient_display = f"{recipient_name}"
    if recipient_title:
        recipient_display += f" ({recipient_title})"
    
    # Build context
    context_parts = []
    if job_requirement:
        context_parts.append(f"Job Context: {job_requirement[:400]}")
    if additional_context:
        context_parts.append(f"Additional Info: {additional_context[:200]}")
    context_str = "\n".join(context_parts) if context_parts else "General outreach"
    
    prompts = {
        'direct': f"""Write a concise cold email (100-120 words) for a direct job application.

Recipient: {recipient_display}
Company: {company_name}
Resume Summary: {resume_text[:800]}
{context_str}

Structure:
- Compelling subject line that mentions role or key skill
- Brief intro (1-2 sentences) - why this company/role
- Highlight 2-3 most relevant qualifications with specifics
- Clear call-to-action (request interview/discussion)
- Professional closing with contact info

Return as valid JSON:
{{
    "subject_line": "Primary subject line",
    "email_body": "Full email with greeting, body, closing, signature",
    "alternative_subjects": ["Alt 1", "Alt 2", "Alt 3"]
}}

Tone: Professional, confident, specific. Avoid generic phrases.""",
        
        'networking': f"""Write a warm networking cold email (80-100 words).

Recipient: {recipient_display}
Company: {company_name}
Background: {resume_text[:600]}
{context_str}

Structure:
- Subject line focused on learning/advice (NOT job request)
- Personalized opening showing genuine interest in their work
- Brief relevant background mention (1-2 sentences max)
- Specific ask: 15-minute coffee chat or informational interview
- Make it easy to say yes
- Gracious closing

Return as valid JSON:
{{
    "subject_line": "Primary subject line",
    "email_body": "Full email text",
    "alternative_subjects": ["Alt 1", "Alt 2", "Alt 3"]
}}

Tone: Humble, curious, respectful. Show research about them/company.""",
        
        'referral': f"""Write a polite referral request email (90-110 words).

Recipient: {recipient_display}
Company: {company_name}
Background: {resume_text[:700]}
{context_str}

Structure:
- Subject mentioning mutual connection or shared background
- Opening: How you found them (LinkedIn, mutual connection, etc.)
- Brief relevant background (2-3 sentences)
- Specific request: referral or introduction to hiring team
- Make it LOW effort for them (offer to send resume, etc.)
- Appreciative closing

Return as valid JSON:
{{
    "subject_line": "Primary subject line",
    "email_body": "Full email text",
    "alternative_subjects": ["Alt 1", "Alt 2", "Alt 3"]
}}

Tone: Polite, appreciative, clear. Make the ask very specific.""",
        
        'followup': f"""Write a professional follow-up email (60-80 words).

Recipient: {recipient_display}
Company: {company_name}
Previous Context: {additional_context or 'Previously applied/interviewed'}
Background: {resume_text[:500]}

Structure:
- Subject referencing previous interaction
- Brief reminder of previous contact (when and what)
- Restate interest in role/company
- Provide update or new relevant info (if any)
- Polite ask for status update or next steps
- Professional closing

Return as valid JSON:
{{
    "subject_line": "Primary subject line",
    "email_body": "Full email text",
    "alternative_subjects": ["Alt 1", "Alt 2", "Alt 3"]
}}

Tone: Polite, patient, professionally persistent. Not desperate."""
    }
    
    try:
        prompt = prompts.get(email_type, prompts['direct'])
        response = gemini_model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
        
        email_data = json.loads(cleaned_response)
        
        # Validate and ensure all fields exist
        if not email_data.get('subject_line'):
            email_data['subject_line'] = f"Regarding Opportunity at {company_name}"
        
        if not email_data.get('email_body'):
            raise ValueError("No email body generated")
        
        if not email_data.get('alternative_subjects'):
            email_data['alternative_subjects'] = generate_subject_lines(
                company_name, email_type, recipient_name
            )
        
        return email_data
        
    except Exception as e:
        # Fallback response
        return {
            'subject_line': f"Regarding {company_name} Opportunity",
            'email_body': f"Error generating email: {str(e)}",
            'alternative_subjects': generate_subject_lines(company_name, email_type)
        }
    
def get_interview_prep(resume_text, job_requirement, domain):
    """Generate likely interview questions and talking points."""
    try:
        prompt = f"""
        Based on this resume and job requirements in {domain}, generate:
        
        Resume: {resume_text[:1000]}
        Job Requirements: {job_requirement[:600]}
        
        Return as valid JSON:
        {{
            "technical_questions": ["question1", "question2", "question3"],
            "behavioral_questions": ["question1", "question2"],
            "key_talking_points": ["point1", "point2", "point3"],
            "questions_to_ask": ["question1", "question2"]
        }}
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)
    except Exception as e:
        return {
            "technical_questions": ["Unable to generate"],
            "behavioral_questions": ["Unable to generate"],
            "key_talking_points": ["Unable to generate"],
            "questions_to_ask": ["Unable to generate"]
        }

def get_salary_insights(domain, years_experience, location="Global"):
    """Provide salary range insights based on domain and experience."""
    try:
        prompt = f"""
        Provide salary insights for {domain} with {years_experience} experience in {location}.
        
        Return as valid JSON:
        {{
            "estimated_range": "salary range in INR",
            "factors": ["factor1", "factor2", "factor3"],
            "negotiation_tips": ["tip1", "tip2"]
        }}
        
        Be realistic and mention this is approximate based on market data.
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)
    except:
        return {
            "estimated_range": "Varies significantly",
            "factors": ["Experience level", "Location", "Company size"],
            "negotiation_tips": ["Research market rates", "Highlight unique skills"]
        }

def initialize_conversation_chain(resume_text, domain):
    global conversation_chain, memory
    memory.clear()
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=GEMINI_API_KEY,
        temperature=0.6
    )
    
    template = f"""
    You are an expert career advisor specializing in **{{domain}}**.
    Resume Context: {{resume_text}}
    
    RULES:
    1. Refuse inappropriate/offensive queries politely: "I assist with professional career questions only."
    2. Use chat_history for context (last 7 turns).
    3. For salary questions, provide ranges and factors, not exact figures.
    4. **PRIMARY FOCUS:** Provide detailed, actionable advice specific to the **{{domain}}** field.
    5. **CAREER SWITCHING:** If the user asks about switching careers (e.g., to Machine Learning) or moving to a different domain, provide a **high-level, strategic roadmap (3-4 steps)** on how they can transition (e.g., "Identify skill gaps," "Build a portfolio," "Certifications required"). Acknowledge that while you lack deep expertise in the new field, the strategic steps are universal.
    6. Be encouraging but honest about skill gaps.
    
    {{chat_history}}
    Human: {{input}}
    AI:"""
    
    PROMPT = PromptTemplate(
        input_variables=["chat_history", "input"],
        partial_variables={"resume_text": resume_text[:4000], "domain": domain},
        template=template
    )
    
    conversation_chain = ConversationChain(llm=llm, prompt=PROMPT, verbose=False, memory=memory)

def detect_resume_domain(text):
    try:
        prompt = f"""
        Identify the specific career domain from this resume.
        Examples: 'Software Engineering', 'Data Science', 'Marketing', 'Finance', 'Healthcare', 'Legal'
        
        Resume: {text[:1500]}
        
        Respond with ONLY the domain name.
        """
        response = gemini_model.generate_content(prompt)
        domain = re.sub(r'[^a-zA-Z0-9\s/&-]', '', response.text.strip())
        return domain if domain else "General Career Field"
    except:
        return "General Career Field"

def perform_detailed_analysis(resume_text, job_requirement, domain):
    """Updated analysis function with improved scoring"""
    
    scoring_result = calculate_improved_ats_score(resume_text, job_requirement, domain)
    
    # Check for errors
    if "error" in scoring_result:
        return scoring_result
    
    final_score = scoring_result["score"]
    
    recommendations = generate_recommendations(
        resume_text, 
        job_requirement, 
        final_score, 
        scoring_result["missing_keywords"], 
        domain
    )
    
    skill_gaps = generate_skill_gap_analysis(resume_text, job_requirement, domain)
    
    return {
        "score": final_score,
        "score_breakdown": {
            "skill_match": scoring_result["skill_match_score"],
            "semantic_similarity": scoring_result["semantic_score"],
            "keyword_density_bonus": scoring_result["density_bonus"]
        },
        "summary": summarize_text(resume_text),
        "ats_status": get_ats_status(final_score),
        "keyword_analysis": {
            "matching_keywords": scoring_result["matching_keywords"],
            "missing_keywords": scoring_result["missing_keywords"],
            "keyword_density": scoring_result["keyword_density"],
            "total_job_keywords": scoring_result["total_job_keywords"],
            "total_matched": len(scoring_result["matching_keywords"]),
            "match_percentage": round((len(scoring_result["matching_keywords"]) / 
                                      max(1, scoring_result["total_job_keywords"])) * 100, 1)
        },
        "recommendations": recommendations,
        "skill_gaps": skill_gaps,
        "debug_info": {
            "all_job_keywords": scoring_result.get("all_job_keywords", []),
            "all_resume_skills": scoring_result.get("all_resume_skills", [])
        }
    }

def generate_recommendations(resume_text, job_requirement, score, missing_keywords, domain):
    try:
        prompt = f"""
        As a {domain} resume expert, provide 4 actionable recommendations.
        
        Score: {score:.1f}%
        Missing Keywords: {', '.join(missing_keywords[:8])}
        Resume: {resume_text[:1500]}
        Job: {job_requirement[:1000]}
        
        Format:
        1. [Category]: [Specific advice under 120 chars]
        2. [Category]: [Specific advice under 120 chars]
        3. [Category]: [Specific advice under 120 chars]
        4. [Category]: [Specific advice under 120 chars]
        """
        response = gemini_model.generate_content(prompt)
        return [line.strip() for line in response.text.split('\n') 
                if line.strip() and re.match(r'^\d\.', line.strip())][:4]
    except:
        return ["Keywords: Add missing skills to resume", 
                "Quantify: Include metrics and numbers", 
                "Action Verbs: Use stronger action verbs", 
                "Format: Improve resume structure"]

def generate_skill_gap_analysis(resume_text, job_requirement, domain):
    try:
        prompt = f"""
        Analyze skill gaps for {domain}.
        Resume: {resume_text[:1000]}
        Job: {job_requirement[:800]}
        
        Return as valid JSON:
        {{
            "current_skills": ["skill1", "skill2", "skill3"],
            "skill_gaps": [
                {{"skill": "name", "importance": "high", "resources": ["resource1", "resource2"]}},
                {{"skill": "name", "importance": "medium", "resources": ["resource1"]}}
            ]
        }}
        """
        response = gemini_model.generate_content(prompt)
        cleaned = response.text.strip().replace('```json', '').replace('```', '').strip()
        return json.loads(cleaned)
    except:
        return {"current_skills": [], "skill_gaps": []}

def get_ats_status(score):
    if score >= 85:
        return {"level": "high", "label": "Excellent Match", "color": "green"}
    elif score >= 70:
        return {"level": "medium", "label": "Strong Match", "color": "yellow"}
    elif score >= 50:
        return {"level": "medium", "label": "Good Match", "color": "orange"}
    else:
        return {"level": "low", "label": "Needs Improvement", "color": "red"}

def summarize_text(text, num_sentences=3):
    doc = nlp(text)
    sentences = [sent.text for sent in doc.sents]
    return " ".join(sentences[:num_sentences])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_single_resume(text):
    if not text.strip():
        return None
    cleaned = re.sub(r'[\uf000-\uf8ff]', '', text)
    return re.sub(r'\s+', ' ', cleaned).strip()

def delete_all_files():
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting {file_path}: {e}")

# ==================== API ROUTES ====================

@app.route('/upload', methods=['POST'])
def upload_resume():
    global current_resume, cleaned_resume_text, detected_domain
    delete_all_files()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file in request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        try:
            file.save(file_path)
            reader = PdfReader(file_path)
            text = "".join(page.extract_text() for page in reader.pages)
            
            if not text.strip():
                return jsonify({"error": "Could not extract text from PDF"}), 400
            
            cleaned_resume_text = process_single_resume(text)
            current_resume = (unique_filename, text.strip())
            detected_domain = detect_resume_domain(cleaned_resume_text)
            metadata = extract_resume_metadata(cleaned_resume_text)
            
            initialize_conversation_chain(cleaned_resume_text, detected_domain)
            
            return jsonify({
                "message": "Resume processed successfully",
                "filename": original_filename,
                "detected_domain": detected_domain,
                "metadata": metadata,
                "text_length": len(cleaned_resume_text)
            }), 201
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"error": f"Processing error: {str(e)}"}), 500
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/delete', methods=['POST'])
def delete_resume():
    global current_resume, cleaned_resume_text, detected_domain, conversation_chain
    
    if current_resume is None:
        return jsonify({"message": "No resume to delete"}), 404
    
    filename = current_resume[0]
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    if os.path.exists(file_path):
        os.remove(file_path)
    
    current_resume = None
    cleaned_resume_text = None
    detected_domain = "General Career Field"
    conversation_chain = None
    
    return jsonify({"message": "Resume deleted"}), 200

@app.route('/career_roadmap', methods=['POST'])
def career_roadmap():
    if not conversation_chain:
        return jsonify({"error": "Upload resume first"}), 400
    
    data = request.get_json()
    user_query = data.get('query', '')
    
    if not user_query:
        return jsonify({"error": "Query cannot be empty"}), 400
    
    try:
        response = conversation_chain.invoke(user_query)
        ai_response = response.get('response', "Could not process request")
        
        return jsonify({
            "response": ai_response,
            "domain": detected_domain
        }), 200
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route('/rate_resumes', methods=['POST'])
def rate_resumes():
    if not cleaned_resume_text:
        return jsonify({"error": "No resume available"}), 400
    
    data = request.get_json()
    if not data or 'job_requirement' not in data:
        return jsonify({"error": "Missing job_requirement"}), 400
    
    job_requirement = data['job_requirement']
    if not job_requirement.strip():
        return jsonify({"error": "Job requirement empty"}), 400
    
    analysis_result = perform_detailed_analysis(cleaned_resume_text, job_requirement, detected_domain)
    
    # Check if there's an error from validation
    if "error" in analysis_result:
        return jsonify({
            "error": analysis_result["error"],
            "job_requirement": job_requirement,
            "detected_domain": detected_domain
        }), 400
    
    return jsonify({
        "job_requirement": job_requirement,
        "detected_domain": detected_domain,
        "results": [{
            "filename": current_resume[0].split('_', 1)[-1],
            **analysis_result
        }]
    }), 200

@app.route('/generate_cover_letter', methods=['POST'])
def generate_cover_letter_endpoint():
    if not cleaned_resume_text:
        return jsonify({"error": "Upload resume first"}), 400
    
    data = request.get_json()
    job_req = data.get('job_requirement', '')
    company = data.get('company_name', 'the company')
    
    cover_letter = generate_cover_letter(cleaned_resume_text, job_req, detected_domain, company)
    return jsonify({"cover_letter": cover_letter}), 200

@app.route('/generate_cold_email', methods=['POST'])
def generate_cold_email_endpoint():
    """Generate personalized cold emails for different purposes"""
    if not cleaned_resume_text:
        return jsonify({"error": "Upload resume first"}), 400
    
    data = request.get_json()
    email_type = data.get('email_type', 'direct')
    company_name = data.get('company_name', '')
    recipient_name = data.get('recipient_name', 'Hiring Manager')
    recipient_title = data.get('recipient_title', '')
    job_requirement = data.get('job_requirement', '')
    additional_context = data.get('additional_context', '')
    
    if not company_name.strip():
        return jsonify({"error": "Company name is required"}), 400
    
    # Validate email type
    valid_types = ['direct', 'networking', 'referral', 'followup']
    if email_type not in valid_types:
        return jsonify({"error": f"Invalid email type. Must be one of: {valid_types}"}), 400
    
    try:
        email_result = generate_cold_email(
            resume_text=cleaned_resume_text,
            email_type=email_type,
            company_name=company_name,
            recipient_name=recipient_name,
            recipient_title=recipient_title,
            job_requirement=job_requirement,
            additional_context=additional_context
        )
        
        return jsonify(email_result), 200
        
    except Exception as e:
        return jsonify({
            "error": f"Failed to generate email: {str(e)}",
            "subject_line": f"Regarding {company_name}",
            "email_body": "An error occurred while generating your email. Please try again.",
            "alternative_subjects": []
        }), 500

@app.route('/interview_prep', methods=['POST'])
def interview_prep_endpoint():
    if not cleaned_resume_text:
        return jsonify({"error": "Upload resume first"}), 400
    
    data = request.get_json()
    job_req = data.get('job_requirement', '')
    
    prep = get_interview_prep(cleaned_resume_text, job_req, detected_domain)
    return jsonify(prep), 200

@app.route('/salary_insights', methods=['GET'])
def salary_insights_endpoint():
    if not cleaned_resume_text:
        return jsonify({"error": "Upload resume first"}), 400
    
    metadata = extract_resume_metadata(cleaned_resume_text)
    insights = get_salary_insights(
        detected_domain, 
        metadata.get('years_experience', 'Unknown'),
        metadata.get('location', 'Global')
    )
    return jsonify(insights), 200


@app.route('/')
def index():
    return jsonify({"message": "Resume Analyzer API", "status": "running"})

# ADD THIS TO YOUR app.py FILE

@app.route('/generate_career_roadmap', methods=['POST'])
def generate_career_roadmap_endpoint():
    """Generate structured career roadmap for career transitions"""
    if not cleaned_resume_text:
        return jsonify({"error": "Upload resume first"}), 400
    
    data = request.get_json()
    target_role = data.get('target_role', '')
    current_experience = data.get('current_experience', '')
    
    if not target_role.strip():
        return jsonify({"error": "Target role is required"}), 400
    
    try:
        # Build the prompt for structured roadmap
        prompt = f"""
Generate a detailed career transition roadmap from {detected_domain} to {target_role}.
{f"Current experience: {current_experience}" if current_experience else ""}

Resume context: {cleaned_resume_text[:1000]}

Return ONLY valid JSON with this EXACT structure (no markdown, no extra text):
{{
  "current_position": "Their current role based on resume",
  "target_position": "{target_role}",
  "total_duration": "X-Y months/years estimate",
  "difficulty_level": "Beginner/Intermediate/Advanced",
  "phases": [
    {{
      "phase": 1,
      "title": "Foundation Building",
      "duration": "1-2 months",
      "description": "Brief description of this phase",
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "resources": ["Resource 1", "Resource 2"],
      "milestones": ["Milestone 1", "Milestone 2"]
    }},
    {{
      "phase": 2,
      "title": "Skill Development",
      "duration": "2-3 months",
      "description": "Brief description",
      "skills": ["Skill 1", "Skill 2"],
      "resources": ["Resource 1", "Resource 2"],
      "milestones": ["Milestone 1", "Milestone 2"]
    }}
  ],
  "certifications": ["Cert 1", "Cert 2", "Cert 3"],
  "networking_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "portfolio_projects": ["Project 1", "Project 2", "Project 3"]
}}

Rules:
- Include 4-6 phases
- Each phase must have a valid duration (e.g., "2-4 months")
- Be specific and actionable
- Focus on practical, achievable steps
- Return ONLY the JSON object, nothing else
"""
        
        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean up the response
        response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        # Try to parse as JSON
        try:
            roadmap_data = json.loads(response_text)
            return jsonify(roadmap_data), 200
        except json.JSONDecodeError as je:
            # If JSON parsing fails, return the raw text for frontend to handle
            return jsonify({
                "error": "Could not parse roadmap as JSON",
                "raw_response": response_text
            }), 500
            
    except Exception as e:
        return jsonify({"error": f"Failed to generate roadmap: {str(e)}"}), 500

if __name__ == '__main__':
    if not GEMINI_API_KEY:
        print("Set GEMINI_API_KEY environment variable")
    else:
        app.run(debug=True, host='0.0.0.0', port=5000)