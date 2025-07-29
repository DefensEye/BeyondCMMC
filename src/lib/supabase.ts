import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  }
});

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Finding {
  id: string;
  severity: Severity;
  category: string;
  description: string;
  resource_name: string;
  first_observed: string;
  last_observed: string;
  status: string;
  remediation_url?: string;
  domain?: string;
}

export interface ComplianceScore {
  overall_score: number;
  category_scores: {
    "Access Control (AC)": number;
    "Audit and Accountability (AU)": number;
    "Configuration Management (CM)": number;
    "Identification and Authentication (IA)": number;
    "Incident Response (IR)": number;
    "Maintenance (MA)": number;
    "Media Protection (MP)": number;
    "Physical Protection (PE)": number;
    "Recovery (RE)": number;
    "Risk Assessment (RA)": number;
    "Security Assessment (CA)": number;
    "System and Communications Protection (SC)": number;
    "System and Information Integrity (SI)": number;
    "Situational Awareness (SA)": number;
  };
  last_updated: string;
}

export interface SeverityCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export const fetchFindings = async (): Promise<Finding[]> => {
  try {
    const { data, error } = await supabase
      .from('security_findings')
      .select('*')
      .order('severity', { ascending: false });
    
    if (error) throw error;
    
    if (data) {
      data.forEach(finding => {
        if (!finding.domain) {
          finding.domain = getCategoryFromFinding(finding);
        }
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching findings:', error);
    return [];
  }
};

export const fetchComplianceScore = async (): Promise<ComplianceScore> => {
  try {
    // Try to fetch from compliance_scores table
    const { data, error } = await supabase
      .from('compliance_scores')
      .select('*')
      .single();
    
    // If table doesn't exist or there's any other error, calculate the score
    if (error) {
      console.log('Calculating compliance score from findings instead');
      const findings = await fetchFindings();
      return calculateComplianceScore(findings);
    }
    
    return data || getDefaultComplianceScore();
  } catch (error) {
    console.error('Error fetching compliance score:', error);
    // Always fall back to calculating from findings
    try {
      const findings = await fetchFindings();
      return calculateComplianceScore(findings);
    } catch (e) {
      console.error('Failed to calculate score from findings:', e);
      return getDefaultComplianceScore();
    }
  }
};

export const fetchFindingsBySeverity = async (): Promise<SeverityCounts> => {
  try {
    const findings = await fetchFindings();
    
    const counts: SeverityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    findings.forEach(finding => {
      if (finding.severity in counts) {
        counts[finding.severity as Severity]++;
      }
    });
    
    return counts;
  } catch (error) {
    console.error('Error fetching findings by severity:', error);
    return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  }
};

const calculateComplianceScore = (findings: Finding[]): ComplianceScore => {
  const totalFindings = findings.length;
  if (totalFindings === 0) return getDefaultComplianceScore();

  const severityWeights = {
    CRITICAL: 1.0,
    HIGH: 0.7,
    MEDIUM: 0.4,
    LOW: 0.2
  };

  const categoryScores = {
    "Access Control (AC)": { count: 0, weight: 0 },
    "Audit and Accountability (AU)": { count: 0, weight: 0 },
    "Configuration Management (CM)": { count: 0, weight: 0 },
    "Identification and Authentication (IA)": { count: 0, weight: 0 },
    "Incident Response (IR)": { count: 0, weight: 0 },
    "Maintenance (MA)": { count: 0, weight: 0 },
    "Media Protection (MP)": { count: 0, weight: 0 },
    "Physical Protection (PE)": { count: 0, weight: 0 },
    "Recovery (RE)": { count: 0, weight: 0 },
    "Risk Assessment (RA)": { count: 0, weight: 0 },
    "Security Assessment (CA)": { count: 0, weight: 0 },
    "System and Communications Protection (SC)": { count: 0, weight: 0 },
    "System and Information Integrity (SI)": { count: 0, weight: 0 },
    "Situational Awareness (SA)": { count: 0, weight: 0 }
  };

  findings.forEach(finding => {
    const weight = severityWeights[finding.severity as keyof typeof severityWeights];
    const category = getCategoryFromFinding(finding);
    categoryScores[category].count++;
    categoryScores[category].weight += weight;
  });

  const overallWeight = Object.values(categoryScores).reduce((sum, cat) => sum + cat.weight, 0);
  const maxPossibleWeight = totalFindings;
  const overallScore = Math.max(0, Math.min(100, 100 - (overallWeight / maxPossibleWeight * 100)));

  return {
    overall_score: parseFloat(overallScore.toFixed(1)),
    category_scores: {
      "Access Control (AC)": calculateCategoryScore(categoryScores["Access Control (AC)"]),
      "Audit and Accountability (AU)": calculateCategoryScore(categoryScores["Audit and Accountability (AU)"]),
      "Configuration Management (CM)": calculateCategoryScore(categoryScores["Configuration Management (CM)"]),
      "Identification and Authentication (IA)": calculateCategoryScore(categoryScores["Identification and Authentication (IA)"]),
      "Incident Response (IR)": calculateCategoryScore(categoryScores["Incident Response (IR)"]),
      "Maintenance (MA)": calculateCategoryScore(categoryScores["Maintenance (MA)"]),
      "Media Protection (MP)": calculateCategoryScore(categoryScores["Media Protection (MP)"]),
      "Physical Protection (PE)": calculateCategoryScore(categoryScores["Physical Protection (PE)"]),
      "Recovery (RE)": calculateCategoryScore(categoryScores["Recovery (RE)"]),
      "Risk Assessment (RA)": calculateCategoryScore(categoryScores["Risk Assessment (RA)"]),
      "Security Assessment (CA)": calculateCategoryScore(categoryScores["Security Assessment (CA)"]),
      "System and Communications Protection (SC)": calculateCategoryScore(categoryScores["System and Communications Protection (SC)"]),
      "System and Information Integrity (SI)": calculateCategoryScore(categoryScores["System and Information Integrity (SI)"]),
      "Situational Awareness (SA)": calculateCategoryScore(categoryScores["Situational Awareness (SA)"])
    },
    last_updated: new Date().toISOString()
  };
};

const calculateCategoryScore = (category: { count: number; weight: number }): number => {
  if (category.count === 0) return 100;
  const score = 100 - (category.weight / category.count * 100);
  return parseFloat(Math.max(0, Math.min(100, score)).toFixed(1));
};

const getCategoryFromFinding = (finding: Finding): keyof ComplianceScore['category_scores'] => {
  const category = finding.category.toLowerCase();
  const description = (finding.description || '').toLowerCase();
  
  // Map to CMMC domains based on finding category and description
  if (category.includes('iam') || 
      category.includes('identity') || 
      description.includes('permission') || 
      description.includes('access') || 
      description.includes('user') || 
      description.includes('role')) {
    return "Access Control (AC)";
  }
  
  if (category.includes('audit') || 
      description.includes('log') || 
      description.includes('monitoring') || 
      description.includes('trail')) {
    return "Audit and Accountability (AU)";
  }
  
  if (category.includes('config') || 
      description.includes('baseline') || 
      description.includes('change') || 
      description.includes('patch') || 
      description.includes('update')) {
    return "Configuration Management (CM)";
  }
  
  if (category.includes('auth') || 
      description.includes('identity') || 
      description.includes('credential') || 
      description.includes('password') || 
      description.includes('mfa')) {
    return "Identification and Authentication (IA)";
  }
  
  if (category.includes('network') || 
      category.includes('firewall') || 
      description.includes('communication') || 
      description.includes('encryption') || 
      description.includes('traffic')) {
    return "System and Communications Protection (SC)";
  }
  
  if (description.includes('integrity') || 
      description.includes('malware') || 
      description.includes('virus') || 
      description.includes('intrusion')) {
    return "System and Information Integrity (SI)";
  }
  
  if (description.includes('risk') || 
      description.includes('vulnerability') || 
      description.includes('threat') || 
      description.includes('assessment')) {
    return "Risk Assessment (RA)";
  }
  
  if (description.includes('security') || 
      description.includes('test') || 
      description.includes('scan') || 
      description.includes('compliance')) {
    return "Security Assessment (CA)";
  }
  
  // Default domain if no matches
  return "Risk Assessment (RA)";
};

const getDefaultComplianceScore = (): ComplianceScore => ({
  overall_score: 100,
  category_scores: {
    "Access Control (AC)": 100,
    "Audit and Accountability (AU)": 100,
    "Configuration Management (CM)": 100,
    "Identification and Authentication (IA)": 100,
    "System and Communications Protection (SC)": 100,
    "System and Information Integrity (SI)": 100,
    "Risk Assessment (RA)": 100,
    "Security Assessment (CA)": 100
  },
  last_updated: new Date().toISOString()
});