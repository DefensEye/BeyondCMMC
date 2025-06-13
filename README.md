# Security Findings Dashboard

This application provides a comprehensive dashboard for security findings from Google Cloud Platform, with analysis using HuggingFace transformer models and storage in Supabase.

## Features

- Security findings visualization by severity (Critical, High, Medium, Low)
- Compliance score calculation based on findings
- Direct remediation links to Google Cloud Platform
- HuggingFace transformer model integration for advanced analysis
- Real-time updates via Supabase

## Architecture

The application consists of two main components:

1. **Frontend**: React application with Tailwind CSS for styling
2. **Backend**: FastAPI server that connects to:
   - Google Cloud Security Command Center for findings data
   - HuggingFace for transformer model inference
   - Supabase for data storage

## Setup

### Prerequisites

- Node.js 16+
- Python 3.8+
- Supabase account
- Google Cloud account with Security Command Center enabled
- HuggingFace account (for API token)

### Environment Variables

Create a `.env` file with the following variables:

```
# Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
SUPABASE_KEY=your_supabase_service_key

# Google Cloud credentials
GOOGLE_ORGANIZATION_ID=your_organization_id
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_CREDENTIALS=your_service_account_json

# HuggingFace
HF_TOKEN=your_huggingface_token
MODEL_NAME=gpt2

# Optional settings
FINDINGS_LOOKBACK_DAYS=30
```

### Installation

1. Install frontend dependencies:
   ```
   npm install
   ```

2. Install backend dependencies:
   ```
   pip install -r backend/requirements.txt
   ```

### Running the Application

1. Start the backend server:
   ```
   npm run backend
   ```

2. Start the frontend development server:
   ```
   npm run dev
   ```

## Database Setup

The application requires a `security_findings` table in Supabase with the following schema:

```sql
create table public.security_findings (
    id text primary key,
    severity text not null,
    category text not null,
    description text,
    resource_name text,
    first_observed timestamptz,
    last_observed timestamptz,
    status text,
    remediation_url text
);
```

## Data Synchronization

To manually sync data from Google Cloud to Supabase:

```
python backend/sync_findings.py
```

This can also be set up as a scheduled task.