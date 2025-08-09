import os
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from transformers import pipeline
import json
from typing import List, Dict
import numpy as np
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")  # Changed from VITE_SUPABASE_KEY to SUPABASE_KEY
options = ClientOptions(schema="public")
supabase: Client = create_client(supabase_url, supabase_key, options=options)

# Initialize HuggingFace
hf_token = os.getenv("HF_TOKEN")

# Initialize sentence transformer model for embeddings
try:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Sentence transformer model loaded successfully")
except Exception as e:
    print(f"Error loading sentence transformer model: {e}")
    model = None

# CMMC Domain mapping based on security finding categories and descriptions
CMMC_DOMAINS = {
    "Access Control (AC)": [
        "iam", "permission", "access", "authentication", "authorization", 
        "identity", "user", "role", "policy", "privilege", "account", "credentials",
        "leaked credentials", "password leak", "account compromise"
    ],
    "Audit and Accountability (AU)": [
        "audit", "log", "logging", "monitoring", "trail", "event", 
        "record", "tracking", "accountability"
    ],
    "Configuration Management (CM)": [
        "configuration", "baseline", "change", "version", "patch", 
        "update", "settings", "hardening", "misconfiguration"
    ],
    "Identification and Authentication (IA)": [
        "authentication", "identity", "credential", "password", "mfa", 
        "multi-factor", "token", "certificate", "login", "sign-in", "account",
        "leaked credentials", "password leak", "account compromise"
    ],
    "Incident Response (IR)": [
        "incident", "response", "breach", "compromise", "alert", 
        "detection", "forensic", "leak", "data breach"
    ],
    "Maintenance (MA)": [
        "maintenance", "repair", "service", "support", "upgrade",
        "scheduled maintenance", "system maintenance"
    ],
    "Media Protection (MP)": [
        "media", "storage", "disk", "backup", "archive", "disposal", 
        "sanitization", "encryption", "data storage"
    ],
    "Physical Protection (PE)": [
        "physical", "facility", "access", "environmental", "power", 
        "climate", "location", "building", "premises"
    ],
    "Recovery (RE)": [
        "recovery", "backup", "restore", "disaster", "continuity", 
        "resilience", "availability", "failover"
    ],
    "Risk Assessment (RA)": [
        "risk", "assessment", "vulnerability", "threat", "analysis", 
        "evaluation", "impact", "exposure"
    ],
    "Security Assessment (CA)": [
        "security", "assessment", "test", "evaluation", "scan", 
        "penetration", "compliance", "audit", "review"
    ],
    "System and Communications Protection (SC)": [
        "network", "communication", "transmission", "encryption", "firewall", 
        "boundary", "protocol", "traffic", "connection", "vpn", "tls", "ssl"
    ],
    "System and Information Integrity (SI)": [
        "integrity", "malware", "virus", "intrusion", "anomaly", 
        "corruption", "validation", "data integrity", "information protection"
    ],
    "Situational Awareness (SA)": [
        "awareness", "situational", "threat", "intelligence", "monitoring", 
        "surveillance", "detection", "alerting", "notification"
    ]
}

# Enhanced descriptions for each CMMC domain for semantic matching
CMMC_DOMAIN_DESCRIPTIONS = {
    "Access Control (AC)": "Access control policies, procedures, and systems that limit information system access to authorized users, processes, or devices. Includes user accounts, permissions, roles, and leaked credentials.",
    "Audit and Accountability (AU)": "Audit and accountability policies, procedures, and systems that create, protect, and retain system audit records for monitoring, analysis, investigation, and reporting of unlawful, unauthorized, or inappropriate activity.",
    "Configuration Management (CM)": "Configuration management policies, procedures, and systems that establish and maintain consistency of a system's performance and functional attributes with its requirements, design, and operational information.",
    "Identification and Authentication (IA)": "Identification and authentication policies, procedures, and systems that uniquely identify and authenticate users, processes, or devices before allowing access to information systems. Includes password management and leaked credentials.",
    "Incident Response (IR)": "Incident response policies, procedures, and systems that establish operational capabilities for responding to security incidents, including detection, analysis, containment, eradication, and recovery.",
    "Maintenance (MA)": "Maintenance policies, procedures, and systems that perform periodic and timely maintenance of systems and provide effective controls on the tools, techniques, mechanisms, and personnel used to conduct system maintenance.",
    "Media Protection (MP)": "Media protection policies, procedures, and systems that protect system media, both paper and digital, limit access to information on system media to authorized users, and sanitize or destroy system media before disposal or release for reuse.",
    "Physical Protection (PE)": "Physical protection policies, procedures, and systems that limit physical access to systems, equipment, and operating environments to authorized individuals, protect the physical plant and support infrastructure, and provide supporting utilities.",
    "Recovery (RE)": "Recovery policies, procedures, and systems that ensure the availability of information systems and data through backup, restoration, and disaster recovery capabilities.",
    "Risk Assessment (RA)": "Risk assessment policies, procedures, and systems that periodically assess the risk to organizational operations, assets, and individuals resulting from the operation of information systems and the associated processing, storage, or transmission of information.",
    "Security Assessment (CA)": "Security assessment policies, procedures, and systems that assess the security controls in information systems and their operating environment to determine the effectiveness of the controls and identify vulnerabilities.",
    "System and Communications Protection (SC)": "System and communications protection policies, procedures, and systems that monitor, control, and protect organizational communications at the external boundaries and key internal boundaries of the information systems.",
    "System and Information Integrity (SI)": "System and information integrity policies, procedures, and systems that identify, report, and correct information and information system flaws in a timely manner and provide protection from malicious code and unauthorized use.",
    "Situational Awareness (SA)": "Situational awareness policies, procedures, and systems that provide monitoring capabilities, threat intelligence, and analysis to enhance the understanding of the operational environment and potential threats."
}

def classify_finding_to_cmmc_domain(description: str, category: str) -> str:
    """
    Classify a security finding to a CMMC domain based on description and category
    using both keyword matching and semantic similarity with embeddings
    """
    text_to_analyze = f"{category} {description}".lower()
    
    # Special case handling for leaked credentials
    if "credential" in text_to_analyze and ("leak" in text_to_analyze or "compromise" in text_to_analyze):
        return "Identification and Authentication (IA)"
    
    if "account_has_leaked_credentials" in text_to_analyze or "leaked credentials" in text_to_analyze:
        return "Identification and Authentication (IA)"
    
    # Score each domain based on keyword matches
    domain_scores = {}
    for domain, keywords in CMMC_DOMAINS.items():
        score = 0
        for keyword in keywords:
            if keyword in text_to_analyze:
                score += 1
        domain_scores[domain] = score
    
    # If we have a model for embeddings, use semantic similarity to enhance the scores
    if model is not None:
        try:
            # Get embedding for the finding text
            finding_embedding = model.encode(text_to_analyze)
            
            # Get embeddings for each domain description
            domain_embeddings = {domain: model.encode(desc) for domain, desc in CMMC_DOMAIN_DESCRIPTIONS.items()}
            
            # Calculate cosine similarity between finding and each domain
            for domain, domain_embedding in domain_embeddings.items():
                similarity = np.dot(finding_embedding, domain_embedding) / (
                    np.linalg.norm(finding_embedding) * np.linalg.norm(domain_embedding)
                )
                # Scale similarity to be comparable with keyword scores (0-5 range)
                semantic_score = similarity * 5
                # Add semantic score to keyword score
                domain_scores[domain] = domain_scores.get(domain, 0) + semantic_score
        except Exception as e:
            print(f"Error calculating semantic similarity: {e}")
    
    # Return the domain with the highest score
    if max(domain_scores.values()) > 0:
        return max(domain_scores, key=domain_scores.get)
    else:
        # Default fallback based on common patterns
        if any(word in text_to_analyze for word in ["iam", "permission", "access", "user", "account", "credential"]):
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