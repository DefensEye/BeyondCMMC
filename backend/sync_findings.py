import os
import time
from supabase import create_client
from google_cloud import fetch_security_findings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def sync_findings_to_supabase():
    """Fetch findings from Google Cloud and store them in Supabase"""
    try:
        # Initialize Supabase client
        supabase_url = os.getenv("VITE_SUPABASE_URL")
        supabase_key = os.getenv("VITE_SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print("Supabase credentials not found")
            return False
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Fetch findings from Google Cloud
        findings = fetch_security_findings()
        
        if not findings:
            print("No findings fetched from Google Cloud")
            return False
        
        # Get existing findings from Supabase
        response = supabase.table("security_findings").select("id").execute()
        
        if hasattr(response, "error") and response.error is not None:
            print(f"Error fetching existing findings: {response.error}")
            
            # Try to create the table if it doesn't exist
            try:
                print("Attempting to create security_findings table")
                # Note: This is a simplified version. In a production environment,
                # you should use migrations or a more robust schema management approach
                supabase.table("security_findings").insert({"id": "dummy"}).execute()
                supabase.table("security_findings").delete().eq("id", "dummy").execute()
            except Exception as table_error:
                print(f"Failed to create table: {table_error}")
                return False
        else:
            existing_findings = {item["id"] for item in response.data}
            
            # Process findings
            for finding in findings:
                finding_id = finding["id"]
                
                if finding_id in existing_findings:
                    # Update existing finding
                    supabase.table("security_findings").update(finding).eq("id", finding_id).execute()
                else:
                    # Insert new finding
                    supabase.table("security_findings").insert(finding).execute()
            
            print(f"Synced {len(findings)} findings to Supabase")
            return True
    
    except Exception as e:
        print(f"Error syncing findings to Supabase: {e}")
        return False

if __name__ == "__main__":
    # Run initial sync
    sync_findings_to_supabase()
    
    # Schedule periodic sync (every hour)
    sync_interval = int(os.getenv("SYNC_INTERVAL_SECONDS", "3600"))
    
    while True:
        print(f"Waiting {sync_interval} seconds until next sync...")
        time.sleep(sync_interval)
        sync_findings_to_supabase()