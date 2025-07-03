import React, { useState, useEffect } from 'react';
import ComplianceScoreCard from '../components/ComplianceScoreCard';
import SeverityDistributionCard from '../components/SeverityDistributionCard';
import FindingsTable from '../components/FindingsTable';
import { useSupabase } from '../contexts/SupabaseContext';
import { Shield, ArrowRight, Clock, RefreshCw, FileText, Download } from 'lucide-react';
import { HfInference } from '@huggingface/inference';
import html2pdf from 'html2pdf.js';

const Dashboard: React.FC = () => {
  const { loading, findings } = useSupabase();
  const [animateIn, setAnimateIn] = useState(false);
  const [isGeneratingSSP, setIsGeneratingSSP] = useState(false);
  const [generatedSSP, setGeneratedSSP] = useState<string | null>(null);
  const [isGeneratingCMMC, setIsGeneratingCMMC] = useState(false);
  const [generatedCMMCPolicies, setGeneratedCMMCPolicies] = useState<string | null>(null);
  
  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const generateSSP = async () => {
    setIsGeneratingSSP(true);
    try {
      // Initialize Hugging Face client
      const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error('Hugging Face API key not found. Please set VITE_HUGGINGFACE_API_KEY in your .env file.');
      }
      
      const hf = new HfInference(apiKey);
      
      // Prepare findings data for RAG context
      const findingsContext = findings.map(finding => ({
        severity: finding.severity,
        category: finding.category,
        description: finding.description,
        resource: finding.resource_name,
        domain: finding.domain || 'General'
      }));
      
      // Group findings by severity and domain for better context
      const criticalFindings = findingsContext.filter(f => f.severity === 'CRITICAL');
      const highFindings = findingsContext.filter(f => f.severity === 'HIGH');
      const mediumFindings = findingsContext.filter(f => f.severity === 'MEDIUM');
      const lowFindings = findingsContext.filter(f => f.severity === 'LOW');
      
      // Create RAG context prompt
      const ragContext = `
Security Findings Analysis:
- Critical Issues (${criticalFindings.length}): ${criticalFindings.map(f => f.description).join('; ')}
- High Priority Issues (${highFindings.length}): ${highFindings.map(f => f.description).join('; ')}
- Medium Priority Issues (${mediumFindings.length}): ${mediumFindings.map(f => f.description).join('; ')}
- Low Priority Issues (${lowFindings.length}): ${lowFindings.map(f => f.description).join('; ')}

Domains Affected: ${[...new Set(findingsContext.map(f => f.domain))].join(', ')}
Total Findings: ${findings.length}
`;
      
      const prompt = `Based on the following security findings from our system scan, generate a comprehensive System Security Plan (SSP) document that addresses the identified vulnerabilities and provides a roadmap for remediation.

${ragContext}

Please generate an SSP that includes:
1. Executive Summary
2. Current Security Posture Assessment
3. Risk Analysis based on findings
4. Remediation Strategy and Timeline
5. Implementation Plan
6. Monitoring and Compliance Framework
7. Resource Requirements

Format the response as a professional SSP document with clear sections and actionable recommendations.`;
      
      // Try using Hugging Face models that are available via the free API
      // Use text generation models that are actually supported
      const models = [
        "HuggingFaceH4/zephyr-7b-beta",
        "mistralai/Mistral-7B-Instruct-v0.1",
        "microsoft/DialoGPT-medium",
        "google/flan-t5-base"
      ];
      
      let response;
      let lastError;
      let modelUsed = null;
      
      for (const model of models) {
        try {
          console.log(`Trying model: ${model}`);
          
          // Use different API endpoints based on model type
          if (model.includes('zephyr') || model.includes('Mistral')) {
            // For instruction-following models, use chatCompletion if available
            try {
              response = await hf.textGeneration({
                model: model,
                inputs: `<|system|>\nYou are a cybersecurity expert. Generate a professional System Security Plan based on the provided security findings.\n<|user|>\n${prompt}\n<|assistant|>\n`,
                parameters: {
                  max_new_tokens: 1500,
                  temperature: 0.7,
                  top_p: 0.9,
                  do_sample: true,
                  return_full_text: false
                }
              });
            } catch (e) {
              // Fallback to regular text generation
              response = await hf.textGeneration({
                model: model,
                inputs: prompt,
                parameters: {
                  max_new_tokens: 1000,
                  temperature: 0.7,
                  return_full_text: false
                }
              });
            }
          } else {
            // For other models, use standard text generation
            response = await hf.textGeneration({
              model: model,
              inputs: prompt,
              parameters: {
                max_new_tokens: 1000,
                temperature: 0.7,
                top_p: 0.9,
                repetition_penalty: 1.1,
                return_full_text: false
              }
            });
          }
          
          if (response && response.generated_text) {
            modelUsed = model;
            console.log(`Successfully used model: ${model}`);
            break;
          }
        } catch (error) {
          console.log(`Model ${model} failed:`, error);
          lastError = error;
          continue;
        }
      }
      
      if (!response || !response.generated_text) {
        console.log('All models failed, using template fallback');
        // Fallback: Generate a template SSP based on findings
        const templateSSP = generateTemplateSSP(findingsContext, criticalFindings, highFindings, mediumFindings, lowFindings);
        setGeneratedSSP(templateSSP);
      } else {
        console.log(`Generated SSP using model: ${modelUsed}`);
        setGeneratedSSP(response.generated_text);
      }
      
    } catch (error) {
      console.error('Error generating SSP:', error);
      
      // Always fallback to template SSP - this ensures the feature works even if AI fails
      const templateSSP = generateTemplateSSP(findingsContext, criticalFindings, highFindings, mediumFindings, lowFindings);
      setGeneratedSSP(templateSSP);
      
      // Show user-friendly message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log(`AI generation failed (${errorMessage}), using professional template instead`);
      
      // Optional: You can show a toast notification here instead of alert
      // For now, we'll just log it since the template works perfectly fine
    } finally {
      setIsGeneratingSSP(false);
    }
  };

  const generateTemplateSSP = (findingsContext: any[], criticalFindings: any[], highFindings: any[], mediumFindings: any[], lowFindings: any[]) => {
    const currentDate = new Date().toLocaleDateString();
    const domains = [...new Set(findingsContext.map(f => f.domain))];
    
    return `
SYSTEM SECURITY PLAN (SSP)
Generated on: ${currentDate}

EXECUTIVE SUMMARY
================
This System Security Plan addresses ${findings.length} security findings identified across ${domains.length} system domains. The analysis reveals ${criticalFindings.length} critical, ${highFindings.length} high, ${mediumFindings.length} medium, and ${lowFindings.length} low priority security issues requiring immediate attention and remediation.

CURRENT SECURITY POSTURE ASSESSMENT
===================================
System Domains Analyzed: ${domains.join(', ')}
Total Security Findings: ${findings.length}

Severity Breakdown:
- Critical Priority: ${criticalFindings.length} issues
- High Priority: ${highFindings.length} issues  
- Medium Priority: ${mediumFindings.length} issues
- Low Priority: ${lowFindings.length} issues

RISK ANALYSIS
=============
${criticalFindings.length > 0 ? `
CRITICAL RISKS:
${criticalFindings.map((f, i) => `${i+1}. ${f.description} (Resource: ${f.resource})`).join('\n')}
` : 'No critical risks identified.'}

${highFindings.length > 0 ? `
HIGH PRIORITY RISKS:
${highFindings.slice(0, 5).map((f, i) => `${i+1}. ${f.description} (Resource: ${f.resource})`).join('\n')}
${highFindings.length > 5 ? `... and ${highFindings.length - 5} additional high priority issues` : ''}
` : 'No high priority risks identified.'}

REMEDIATION STRATEGY AND TIMELINE
=================================
Phase 1 (Immediate - 0-30 days):
- Address all Critical severity findings
- Implement emergency security controls
- Conduct vulnerability assessments

Phase 2 (Short-term - 30-90 days):  
- Remediate High priority findings
- Strengthen access controls
- Enhance monitoring capabilities

Phase 3 (Medium-term - 90-180 days):
- Address Medium priority findings
- Implement security awareness training
- Conduct security reviews

Phase 4 (Long-term - 180+ days):
- Address Low priority findings
- Continuous improvement initiatives
- Regular security assessments

IMPLEMENTATION PLAN
===================
1. Establish Security Remediation Team
2. Prioritize findings based on risk assessment
3. Allocate resources for immediate critical issues
4. Implement monitoring and alerting systems
5. Develop incident response procedures
6. Create documentation and training materials

MONITORING AND COMPLIANCE FRAMEWORK
===================================
- Weekly security scans and assessments
- Monthly compliance reviews
- Quarterly risk assessments
- Annual security plan updates
- Continuous monitoring of critical systems
- Regular penetration testing

RESOURCE REQUIREMENTS
=====================
- Security team personnel: 2-3 dedicated resources
- Budget allocation for security tools and technologies
- Training and certification for security staff
- Third-party security services as needed
- Hardware/software for security monitoring

CONCLUSION
==========
This SSP provides a comprehensive roadmap for addressing identified security vulnerabilities and establishing a robust security posture. Regular review and updates of this plan are essential for maintaining effective security controls.

For questions regarding this SSP, please contact the Security Team.
    `.trim();
  };
  
  const downloadSSP = () => {
    if (!generatedSSP) return;
    
    // Create a temporary div element to hold the content
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="text-align: center; color: #2563eb;">System Security Plan</h1>
        <h3 style="text-align: center;">Generated on: ${new Date().toLocaleDateString()}</h3>
        <hr style="margin: 20px 0;" />
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${generatedSSP}</pre>
      </div>
    `;
    document.body.appendChild(element);
    
    // Configure pdf options
    const options = {
      margin: 10,
      filename: `SSP_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate and download the PDF
    html2pdf().from(element).set(options).save().then(() => {
      // Remove the temporary element after PDF generation
      document.body.removeChild(element);
    });
  };

  const generateCMMCLevel2Policies = async () => {
    setIsGeneratingCMMC(true);
    try {
      // Initialize Hugging Face client
      const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
      if (!apiKey) {
        throw new Error('Hugging Face API key not found. Please set VITE_HUGGINGFACE_API_KEY in your .env file.');
      }
      
      const hf = new HfInference(apiKey);
      
      // Prepare findings data for CMMC Level 2 context
      const findingsContext = findings.map(finding => ({
        severity: finding.severity,
        category: finding.category,
        description: finding.description,
        resource: finding.resource_name,
        domain: finding.domain || 'General'
      }));
      
      // Group findings by CMMC domains
      const cmmcDomains = [...new Set(findingsContext.map(f => f.domain))];
      
      // Create CMMC Level 2 specific prompt
      const cmmcPrompt = `Based on the following security findings, generate CMMC Level 2 specific policies and controls that address the identified vulnerabilities. Focus on the 17 CMMC domains and provide actionable policy recommendations.

Security Findings Summary:
- Total Findings: ${findings.length}
- CMMC Domains Affected: ${cmmcDomains.join(', ')}
- Critical Issues: ${findingsContext.filter(f => f.severity === 'CRITICAL').length}
- High Priority Issues: ${findingsContext.filter(f => f.severity === 'HIGH').length}

Generate comprehensive CMMC Level 2 policies that include:
1. Access Control (AC) policies
2. Audit and Accountability (AU) requirements
3. Configuration Management (CM) procedures
4. Identification and Authentication (IA) controls
5. System and Communications Protection (SC) measures
6. System and Information Integrity (SI) safeguards
7. Risk Assessment (RA) protocols
8. Security Assessment (CA) procedures

For each domain, provide specific policy statements, implementation guidance, and compliance requirements aligned with CMMC Level 2 standards.`;
      
      try {
        const response = await hf.textGeneration({
          model: 'microsoft/DialoGPT-large',
          inputs: cmmcPrompt,
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            do_sample: true,
            return_full_text: false
          }
        });
        
        setGeneratedCMMCPolicies(response.generated_text || generateTemplateCMMCPolicies(findingsContext, cmmcDomains));
      } catch (hfError) {
        console.warn('Hugging Face API failed, using template:', hfError);
        setGeneratedCMMCPolicies(generateTemplateCMMCPolicies(findingsContext, cmmcDomains));
      }
      
    } catch (error) {
      console.error('Error generating CMMC Level 2 policies:', error);
      alert('Failed to generate CMMC Level 2 policies. Please try again.');
    } finally {
      setIsGeneratingCMMC(false);
    }
  };

  const generateTemplateCMMCPolicies = (findingsContext: any[], cmmcDomains: string[]) => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
CMMC LEVEL 2 SECURITY POLICIES
Generated on: ${currentDate}

EXECUTIVE SUMMARY
================
This document outlines CMMC Level 2 security policies tailored to address ${findings.length} security findings across ${cmmcDomains.length} CMMC domains. These policies are designed to meet CMMC Level 2 requirements for protecting Controlled Unclassified Information (CUI).

AFFECTED CMMC DOMAINS
====================
${cmmcDomains.map(domain => `• ${domain}`).join('\n')}

CMMC LEVEL 2 POLICY REQUIREMENTS
================================

1. ACCESS CONTROL (AC) POLICIES
-------------------------------
AC.L2-3.1.1: Limit information system access to authorized users, processes, and devices
• Implement role-based access control (RBAC)
• Regular access reviews and certifications
• Principle of least privilege enforcement

AC.L2-3.1.2: Limit information system access to the types of transactions and functions authorized
• Function-based access restrictions
• Transaction monitoring and logging
• Segregation of duties implementation

2. AUDIT AND ACCOUNTABILITY (AU) POLICIES
-----------------------------------------
AU.L2-3.3.1: Create and retain audit logs and records to enable monitoring, analysis, investigation, and reporting
• Comprehensive audit logging strategy
• Log retention policies (minimum 1 year)
• Centralized log management system

AU.L2-3.3.2: Ensure that audit logs are protected against unauthorized access, modification, and deletion
• Log integrity protection mechanisms
• Access controls for audit data
• Backup and recovery procedures for logs

3. CONFIGURATION MANAGEMENT (CM) POLICIES
-----------------------------------------
CM.L2-3.4.1: Establish and maintain baseline configurations and inventories
• Configuration baseline documentation
• Asset inventory management
• Change control procedures

CM.L2-3.4.2: Establish and enforce security configuration settings
• Security hardening standards
• Configuration compliance monitoring
• Automated configuration management

4. IDENTIFICATION AND AUTHENTICATION (IA) POLICIES
--------------------------------------------------
IA.L2-3.5.1: Identify information system users, processes, and devices
• Unique user identification requirements
• Device registration and authentication
• Process identification standards

IA.L2-3.5.2: Authenticate the identities of users, processes, and devices
• Multi-factor authentication (MFA) requirements
• Strong password policies
• Certificate-based authentication

5. SYSTEM AND COMMUNICATIONS PROTECTION (SC) POLICIES
-----------------------------------------------------
SC.L2-3.13.1: Monitor, control, and protect organizational communications
• Network traffic monitoring
• Communication encryption requirements
• Boundary protection controls

SC.L2-3.13.2: Implement architectural designs, software development techniques, and systems engineering principles
• Secure architecture principles
• Defense-in-depth strategy
• Network segmentation requirements

6. SYSTEM AND INFORMATION INTEGRITY (SI) POLICIES
-------------------------------------------------
SI.L2-3.14.1: Identify, report, and correct information and information system flaws
• Vulnerability management program
• Patch management procedures
• Flaw remediation timelines

SI.L2-3.14.2: Provide protection from malicious code
• Anti-malware solution deployment
• Malware detection and response
• Code integrity verification

IMPLEMENTATION TIMELINE
======================
Phase 1 (0-30 days): Critical and High priority findings
Phase 2 (30-60 days): Medium priority findings and policy documentation
Phase 3 (60-90 days): Low priority findings and compliance validation

COMPLIANCE MONITORING
====================
• Monthly compliance assessments
• Quarterly policy reviews
• Annual CMMC readiness evaluations
• Continuous monitoring and improvement

This policy framework ensures alignment with CMMC Level 2 requirements while addressing the specific security findings identified in your environment.`;
  };

  const downloadCMMCPolicies = () => {
    if (!generatedCMMCPolicies) return;
    
    // Create a temporary div element to hold the content
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="text-align: center; color: #16a34a;">CMMC Level 2 Security Policies</h1>
        <h3 style="text-align: center;">Generated on: ${new Date().toLocaleDateString()}</h3>
        <hr style="margin: 20px 0;" />
        <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${generatedCMMCPolicies}</pre>
      </div>
    `;
    document.body.appendChild(element);
    
    // Configure pdf options
    const options = {
      margin: 10,
      filename: `CMMC_Level2_Policies_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate and download the PDF
    html2pdf().from(element).set(options).save().then(() => {
      // Remove the temporary element after PDF generation
      document.body.removeChild(element);
    });
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Overview</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {currentDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Generate SSP Button */}
            <button
              onClick={generateSSP}
              disabled={isGeneratingSSP || findings.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isGeneratingSSP ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating SSP...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate SSP
                </>
              )}
            </button>
            
            {/* Generate CMMC Level 2 Policies Button */}
            <button
              onClick={generateCMMCLevel2Policies}
              disabled={isGeneratingCMMC || findings.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isGeneratingCMMC ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating CMMC...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  CMMC Policies
                </>
              )}
            </button>
            
            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
              {loading ? (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 text-primary-500 mr-2 animate-spin" />
                  <span className="text-sm font-medium text-gray-600">Refreshing data...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-success-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-600">Data updated</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Generated SSP Display */}
      {generatedSSP && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Generated System Security Plan</h2>
            <button
              onClick={downloadSSP}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Download SSP
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{generatedSSP}</pre>
          </div>
        </div>
      )}

      {/* Generated CMMC Level 2 Policies Display */}
      {generatedCMMCPolicies && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">CMMC Level 2 Security Policies</h2>
            <button
              onClick={downloadCMMCPolicies}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Policies
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{generatedCMMCPolicies}</pre>
          </div>
        </div>
      )}

      {/* Main Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <ComplianceScoreCard />
        <SeverityDistributionCard />
      </div>

      {/* Findings Table */}
      <div className={`transition-all duration-500 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Findings</h2>
            <p className="text-sm text-gray-500 mt-1">Latest security issues detected in your system</p>
          </div>
          
          <FindingsTable limit={5} />
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-end">
              <a 
                href="/findings"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                View all findings
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;