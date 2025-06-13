import os
import json
from google.cloud import securitycenter
from google.cloud.securitycenter_v1 import Finding
from datetime import datetime, timedelta

def authenticate_google_cloud():
    """Set up Google Cloud authentication"""
    try:
        # Check if credentials exist in environment
        if os.getenv("GOOGLE_CREDENTIALS"):
            # Write credentials to a temporary file
            credentials_path = "/tmp/google-credentials.json"
            with open(credentials_path, "w") as f:
                f.write(os.getenv("GOOGLE_CREDENTIALS"))
            
            # Set environment variable to point to credentials file
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            return True
        elif os.getenv("GOOGLE_PRIVATE_KEY") and os.getenv("GOOGLE_CLIENT_EMAIL"):
            # Create credentials JSON from individual components
            credentials = {
                "type": "service_account",
                "project_id": os.getenv("GOOGLE_PROJECT_ID"),
                "private_key": os.getenv("GOOGLE_PRIVATE_KEY").replace("\\n", "\n"),
                "client_email": os.getenv("GOOGLE_CLIENT_EMAIL"),
                "token_uri": "https://oauth2.googleapis.com/token"
            }
            
            # Write credentials to a temporary file
            credentials_path = "/tmp/google-credentials.json"
            with open(credentials_path, "w") as f:
                json.dump(credentials, f)
            
            # Set environment variable to point to credentials file
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
            return True
        else:
            print("No Google credentials found in environment variables")
            return False
    except Exception as e:
        print(f"Error setting up Google Cloud authentication: {e}")
        return False

def fetch_security_findings():
    """Fetch security findings from Google Cloud Security Command Center"""
    try:
        # Authenticate with Google Cloud
        if not authenticate_google_cloud():
            return []
        
        # Initialize Security Command Center client
        client = securitycenter.SecurityCenterClient()
        
        # Get organization ID from environment variables
        org_id = os.getenv("GOOGLE_ORGANIZATION_ID")
        if not org_id:
            print("No organization ID found in environment variables")
            return []
        
        # Format the organization resource name
        org_name = f"organizations/{org_id}"
        
        # Calculate the time range for findings
        lookback_days = int(os.getenv("FINDINGS_LOOKBACK_DAYS", "30"))
        start_time = datetime.now() - timedelta(days=lookback_days)
        
        # Create filter for active findings
        filter_str = f"state=\"ACTIVE\" AND createTime>=\"{start_time.isoformat()}Z\""
        
        # List findings
        findings_iterator = client.list_findings(
            request={
                "parent": org_name,
                "filter": filter_str,
            }
        )
        
        # Process findings
        processed_findings = []
        for finding_result in findings_iterator:
            finding = finding_result.finding
            
            # Extract relevant information
            processed_finding = {
                "id": finding.name.split("/")[-1],
                "category": finding.category,
                "severity": finding.severity,
                "description": finding.description or "",
                "resource_name": finding.resource_name,
                "first_observed": finding.create_time.isoformat(),
                "last_observed": finding.event_time.isoformat(),
                "status": "ACTIVE"
            }
            
            processed_findings.append(processed_finding)
        
        return processed_findings
    
    except Exception as e:
        print(f"Error fetching security findings: {e}")
        return []