import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from transformers import pipeline
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Security Findings Dashboard API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
options = ClientOptions(schema="public")
supabase: Client = create_client(supabase_url, supabase_key, options=options)

# Initialize HuggingFace transformer
model_name = os.getenv("MODEL_NAME", "gpt2")
hf_token = os.getenv("HF_TOKEN")

# Add after the existing imports
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np

# Enhanced model initialization
try:
    # Use a security-specific model for better analysis
    model_name = os.getenv("MODEL_NAME", "microsoft/DialoGPT-medium")
    
    # Initialize both classification and severity assessment models
    classifier = pipeline("text-classification", 
                         model="unitary/toxic-bert",  # Better for security content
                         token=hf_token)
    
    # Add severity assessment model
    severity_model = pipeline("text-classification",
                             model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                             token=hf_token)
    
    print("HuggingFace models loaded successfully")
except Exception as e:
    print(f"Error loading HuggingFace models: {e}")
    classifier = None
    severity_model = None

class Finding(BaseModel):
    id: str
    severity: str
    category: str
    description: str
    resource_name: str
    first_observed: str
    last_observed: str
    status: str
    remediation_url: Optional[str] = None

class ComplianceScore(BaseModel):
    overall_score: float
    category_scores: Dict[str, float]
    last_updated: str

@app.get("/")
async def root():
    return {"message": "Security Findings Dashboard API"}

@app.get("/findings", response_model=List[Finding])
async def get_findings():
    try:
        # Get findings from Supabase
        response = supabase.table("security_findings").select("*").execute()
        
        if hasattr(response, "error") and response.error is not None:
            raise HTTPException(status_code=500, detail=f"Supabase error: {response.error}")
        
        findings = response.data
        
        # Process findings with HuggingFace model if available
        if classifier and findings:
            for finding in findings:
                if "description" in finding:
                    # Use the model to enrich the finding
                    try:
                        result = classifier(finding["description"])
                        finding["ai_classification"] = result[0] if result else None
                    except Exception as e:
                        print(f"Error classifying finding: {e}")
        
        # Add remediation URLs
        for finding in findings:
            if "resource_name" in finding and finding["resource_name"]:
                project_id = os.getenv("GOOGLE_PROJECT_ID")
                resource = finding.get("resource_name", "")
                
                # Construct GCP Console URL based on resource type
                if "compute.googleapis.com" in resource:
                    finding["remediation_url"] = f"https://console.cloud.google.com/compute/instances?project={project_id}"
                elif "storage.googleapis.com" in resource:
                    finding["remediation_url"] = f"https://console.cloud.google.com/storage/browser?project={project_id}"
                elif "iam" in resource.lower():
                    finding["remediation_url"] = f"https://console.cloud.google.com/iam-admin/iam?project={project_id}"
                else:
                    finding["remediation_url"] = f"https://console.cloud.google.com/security/command-center/findings?project={project_id}"
        
        return findings
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/compliance-score", response_model=ComplianceScore)
async def get_compliance_score():
    try:
        # Get findings from Supabase
        response = supabase.table("security_findings").select("*").execute()
        
        if hasattr(response, "error") and response.error is not None:
            raise HTTPException(status_code=500, detail=f"Supabase error: {response.error}")
        
        findings = response.data
        
        # Enhanced AI-powered analysis
        if classifier and findings:
            for finding in findings:
                if "description" in finding:
                    try:
                        # Analyze security risk level using AI
                        classification_result = classifier(finding["description"])
                        
                        # Assess severity using sentiment analysis
                        if severity_model:
                            severity_result = severity_model(finding["description"])
                            
                            # Map sentiment to security severity
                            sentiment_score = severity_result[0]['score']
                            if sentiment_score > 0.8:
                                ai_severity = "CRITICAL"
                            elif sentiment_score > 0.6:
                                ai_severity = "HIGH"
                            elif sentiment_score > 0.4:
                                ai_severity = "MEDIUM"
                            else:
                                ai_severity = "LOW"
                            
                            # Update finding with AI assessment
                            finding["ai_severity"] = ai_severity
                            finding["ai_confidence"] = sentiment_score
                        
                        finding["ai_classification"] = classification_result[0] if classification_result else None
                    except Exception as e:
                        print(f"Error in AI analysis: {e}")
        
        # Calculate compliance score with AI enhancements
        total_findings = len(findings)
        if total_findings == 0:
            return ComplianceScore(
                overall_score=100.0,
                category_scores={
                    "identity": 100.0,
                    "network": 100.0,
                    "compute": 100.0,
                    "storage": 100.0,
                    "other": 100.0
                },
                last_updated=datetime.now().isoformat()
            )
        
        # Enhanced severity weights with AI input
        severity_weights = {
            "CRITICAL": 1.0,
            "HIGH": 0.7,
            "MEDIUM": 0.4,
            "LOW": 0.2
        }
        
        # Initialize category scores
        categories = {
            "identity": {"count": 0, "weighted_sum": 0, "ai_weighted_sum": 0},
            "network": {"count": 0, "weighted_sum": 0, "ai_weighted_sum": 0},
            "compute": {"count": 0, "weighted_sum": 0, "ai_weighted_sum": 0},
            "storage": {"count": 0, "weighted_sum": 0, "ai_weighted_sum": 0},
            "other": {"count": 0, "weighted_sum": 0, "ai_weighted_sum": 0}
        }
        
        # Calculate weighted scores by category with AI enhancement
        total_weighted = 0
        total_ai_weighted = 0
        
        for finding in findings:
            severity = finding.get("severity", "MEDIUM").upper()
            ai_severity = finding.get("ai_severity", severity)
            category = finding.get("category", "other").lower()
            ai_confidence = finding.get("ai_confidence", 0.5)
            
            # Original weight
            weight = severity_weights.get(severity, 0.4)
            
            # AI-enhanced weight (blend original and AI assessment)
            ai_weight = severity_weights.get(ai_severity, 0.4)
            blended_weight = (weight * (1 - ai_confidence)) + (ai_weight * ai_confidence)
            
            # Categorize finding
            if category.startswith("iam") or "permission" in category:
                cat = "identity"
            elif "network" in category or "firewall" in category:
                cat = "network"
            elif "compute" in category or "instance" in category:
                cat = "compute"
            elif "storage" in category or "bucket" in category:
                cat = "storage"
            else:
                cat = "other"
            
            categories[cat]["count"] += 1
            categories[cat]["weighted_sum"] += weight
            categories[cat]["ai_weighted_sum"] += blended_weight
            total_weighted += weight
            total_ai_weighted += blended_weight
        
        # Calculate scores using AI-enhanced weights
        max_possible_score = total_findings
        overall_score = 100 - (total_ai_weighted / max_possible_score * 100)
        
        category_scores = {}
        for cat, data in categories.items():
            if data["count"] == 0:
                category_scores[cat] = 100.0
            else:
                # Use AI-enhanced calculation
                category_score = 100 - (data["ai_weighted_sum"] / data["count"] * 100)
                category_scores[cat] = round(max(0, min(100, category_score)), 1)
        
        return ComplianceScore(
            overall_score=round(max(0, min(100, overall_score)), 1),
            category_scores=category_scores,
            last_updated=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/findings/by-severity")
async def get_findings_by_severity():
    try:
        # Get findings from Supabase
        response = supabase.table("security_findings").select("*").execute()
        
        if hasattr(response, "error") and response.error is not None:
            raise HTTPException(status_code=500, detail=f"Supabase error: {response.error}")
        
        findings = response.data
        
        # Count findings by severity
        severity_counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0
        }
        
        for finding in findings:
            severity = finding.get("severity", "").upper()
            if severity in severity_counts:
                severity_counts[severity] += 1
        
        return severity_counts
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)