import os
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from transformers import pipeline
import json
from typing import List, Dict

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")  # Changed from VITE_SUPABASE_KEY to SUPABASE_KEY
options = ClientOptions(schema="public")
supabase: Client = create_client(supabase_url, supabase_key, options=options)

# Initialize HuggingFace
hf_token = os.getenv("HF_TOKEN")

# CMMC Domain mapping based on security finding categories and descriptions
CMMC_DOMAINS = {
    "Access Control (AC)": [
        "iam", "permission", "access", "authentication", "authorization", 
        "identity", "user", "role", "policy", "privilege"
    ],
    "Audit and Accountability (AU)": [
        "audit", "log", "logging", "monitoring", "trail", "event", 
        "record", "tracking", "accountability"
    ],
    "Configuration Management (CM)": [
        "configuration", "baseline", "change", "version", "patch", 
        "update", "settings", "hardening"
    ],
    "Identification and Authentication (IA)": [
        "authentication", "identity", "credential", "password", "mfa", 
        "multi-factor", "token", "certificate"
    ],
    "Incident Response (IR)": [
        "incident", "response", "breach", "compromise", "alert", 
        "detection", "forensic"
    ],
    "Maintenance (MA)": [
        "maintenance", "repair", "service", "support", "update", 
        "patch", "upgrade"
    ],
    "Media Protection (MP)": [
        "media", "storage", "disk", "backup", "archive", "disposal", 
        "sanitization", "encryption"
    ],
    "Physical Protection (PE)": [
        "physical", "facility", "access", "environmental", "power", 
        "climate", "location"
    ],
    "Recovery (RE)": [
        "recovery", "backup", "restore", "disaster", "continuity", 
        "resilience", "availability"
    ],
    "Risk Assessment (RA)": [
        "risk", "assessment", "vulnerability", "threat", "analysis", 
        "evaluation", "impact"
    ],
    "Security Assessment (CA)": [
        "security", "assessment", "test", "evaluation", "scan", 
        "penetration", "compliance"
    ],
    "System and Communications Protection (SC)": [
        "network", "communication", "transmission", "encryption", "firewall", 
        "boundary", "protocol", "traffic", "connection"
    ],
    "System and Information Integrity (SI)": [
        "integrity", "malware", "virus", "intrusion", "anomaly", 
        "corruption", "validation"
    ],
    "Situational Awareness (SA)": [
        "awareness", "situational", "threat", "intelligence", "monitoring", 
        "surveillance", "detection"
    ]
}

def classify_finding_to_cmmc_domain(description: str, category: str) -> str:
    """
    Classify a security finding to a CMMC domain based on description and category
    """
    text_to_analyze = f"{category} {description}".lower()
    
    # Score each domain based on keyword matches
    domain_scores = {}
    for domain, keywords in CMMC_DOMAINS.items():
        score = 0
        for keyword in keywords:
            if keyword in text_to_analyze:
                score += 1
        domain_scores[domain] = score
    
    # Return the domain with the highest score
    if max(domain_scores.values()) > 0:
        return max(domain_scores, key=domain_scores.get)
    else:
        # Default fallback based on common patterns
        if any(word in text_to_analyze for word in ["iam", "permission", "access", "user"]):
            return "Access Control (AC)"
        elif any(word in text_to_analyze for word in ["network", "firewall", "communication"]):
            return "System and Communications Protection (SC)"
        elif any(word in text_to_analyze for word in ["storage", "bucket", "disk"]):
            return "Media Protection (MP)"
        elif any(word in text_to_analyze for word in ["compute", "instance", "server"]):
            return "Configuration Management (CM)"
        else:
            return "Risk Assessment (RA)"  # Default domain

def update_findings_with_cmmc_domains():
    """
    Fetch all findings and update them with CMMC domain mappings
    """
    try:
        # Fetch all findings that don't have a domain assigned
        response = supabase.table("security_findings").select("*").is_("domain", "null").execute()
        
        if hasattr(response, "error") and response.error is not None:
            print(f"Error fetching findings: {response.error}")
            return
        
        findings = response.data
        print(f"Found {len(findings)} findings without domain mapping")
        
        # Debug: Print the structure of the first finding
        if findings and len(findings) > 0:
            print("Sample finding structure:")
            print(findings[0])
            print("Keys in first finding:", list(findings[0].keys()) if isinstance(findings[0], dict) else "Not a dictionary")
        
        updated_count = 0
        for finding in findings:
            try:
                # Check if finding is a dictionary and has required keys
                if not isinstance(finding, dict):
                    print(f"Error: Finding is not a dictionary: {finding}")
                    continue
                
                # Check for id field - this is the critical part
                finding_id = finding.get("finding_id")  # Use finding_id directly since we know it exists
                if not finding_id:
                    print(f"Error: No finding_id field found in finding: {finding}")
                    continue
                
                # Get the CMMC domain for this finding
                domain = classify_finding_to_cmmc_domain(
                    finding.get("description", ""),
                    finding.get("category", "")
                )
                
                # Update the finding with the domain - use finding_id instead of id
                update_response = supabase.table("security_findings").update({
                    "domain": domain
                }).eq("finding_id", finding_id).execute()  # Changed from id to finding_id
                
                if hasattr(update_response, "error") and update_response.error is not None:
                    print(f"Error updating finding {finding_id}: {update_response.error}")
                else:
                    updated_count += 1
                    print(f"Updated finding {finding_id} with domain: {domain}")
                    
            except Exception as e:
                print(f"Error processing finding: {e}")
                # Print the problematic finding
                print(f"Problematic finding: {finding}")
        
        print(f"Successfully updated {updated_count} findings with CMMC domains")
        
    except Exception as e:
        print(f"Error in update_findings_with_cmmc_domains: {e}")

if __name__ == "__main__":
    print("Starting CMMC domain mapping for security findings...")
    update_findings_with_cmmc_domains()
    print("CMMC domain mapping completed.")