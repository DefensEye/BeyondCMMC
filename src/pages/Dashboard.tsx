import React, { useState, useEffect } from 'react';
import ComplianceScoreCard from '../components/ComplianceScoreCard';
import SeverityDistributionCard from '../components/SeverityDistributionCard';
import FindingsTable from '../components/FindingsTable';
import { useSupabase } from '../contexts/SupabaseContext';
import { Shield, ArrowRight, Clock, RefreshCw, FileText, Download, X, Maximize2, Minimize2, Copy, CheckCircle } from 'lucide-react';
import { HfInference } from '@huggingface/inference';
import html2pdf from 'html2pdf.js';
import { ComplianceScore } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const { loading, findings, complianceScore } = useSupabase();
  const [animateIn, setAnimateIn] = useState(false);
  const [isGeneratingSSP, setIsGeneratingSSP] = useState(false);
  const [generatedSSP, setGeneratedSSP] = useState<string | null>(null);
  const [isGeneratingCMMC, setIsGeneratingCMMC] = useState(false);
  const [generatedCMMCPolicies, setGeneratedCMMCPolicies] = useState<string | null>(null);
  
  // New state for popup modals
  const [showSSPModal, setShowSSPModal] = useState(false);
  const [showCMMCModal, setShowCMMCModal] = useState(false);
  const [isSSPMaximized, setIsSSPMaximized] = useState(false);
  const [isCMMCMaximized, setIsCMMCMaximized] = useState(false);
  const [copiedSSP, setCopiedSSP] = useState(false);
  const [copiedCMMC, setCopiedCMMC] = useState(false);
  
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

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: 'SSP' | 'CMMC') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'SSP') {
        setCopiedSSP(true);
        setTimeout(() => setCopiedSSP(false), 2000);
      } else {
        setCopiedCMMC(true);
        setTimeout(() => setCopiedCMMC(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const generateSSP = async () => {
    setIsGeneratingSSP(true);
    setShowSSPModal(true);
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
      
      const criticalFindings = findingsContext.filter(f => f.severity === 'CRITICAL');
      const highFindings = findingsContext.filter(f => f.severity === 'HIGH');
      const mediumFindings = findingsContext.filter(f => f.severity === 'MEDIUM');
      const lowFindings = findingsContext.filter(f => f.severity === 'LOW');
      
      // Create a comprehensive prompt for SSP generation
      const prompt = `Generate a comprehensive System Security Plan (SSP) based on the following security findings analysis:
      
      Total Security Findings: ${findings.length}
      Critical Issues: ${criticalFindings.length}
      High Priority Issues: ${highFindings.length}
      Medium Priority Issues: ${mediumFindings.length}
      Low Priority Issues: ${lowFindings.length}
      
      Key Security Domains Affected: ${[...new Set(findingsContext.map(f => f.domain))].join(', ')}
      
      Please generate a professional SSP that includes:
      1. Executive Summary
      2. Current Security Posture Assessment
      3. Risk Analysis and Mitigation Strategies
      4. Implementation Timeline
      5. Resource Requirements
      6. Monitoring and Compliance Framework
      
      Focus on actionable recommendations and industry best practices.`;
      
      // Try multiple models for better reliability
      const models = [
        'microsoft/DialoGPT-large',
        'microsoft/DialoGPT-medium',
        'gpt2'
      ];
      
      let response: any = null;
      let modelUsed = '';
      let lastError: any = null;
      
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
    const domains = Object.keys(complianceScore?.category_scores || {});
    
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

RISK ANALYSIS AND MITIGATION STRATEGIES
======================================

CRITICAL RISK MITIGATION (Immediate Action Required)
- Implement emergency patches for critical vulnerabilities
- Establish incident response procedures
- Deploy additional monitoring and alerting systems
- Conduct immediate security assessments

HIGH PRIORITY REMEDIATION (Within 30 Days)
- Address configuration management issues
- Strengthen access control mechanisms
- Implement comprehensive audit logging
- Deploy security hardening measures

MEDIUM PRIORITY IMPROVEMENTS (Within 90 Days)
- Enhance security awareness training
- Implement automated compliance monitoring
- Establish regular vulnerability assessments
- Deploy advanced threat detection systems

LOW PRIORITY ENHANCEMENTS (Within 180 Days)
- Optimize security processes and procedures
- Implement additional security controls
- Enhance documentation and reporting
- Conduct comprehensive security reviews

IMPLEMENTATION TIMELINE
======================
Phase 1 (0-30 days): Critical and High Priority Issues
- Emergency response and critical patches
- Access control improvements
- Audit system implementation

Phase 2 (30-90 days): Medium Priority Issues
- Security training and awareness programs
- Automated monitoring deployment
- Process improvements

Phase 3 (90-180 days): Low Priority and Optimization
- Advanced security controls
- Comprehensive documentation
- Long-term security strategy

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
    setShowCMMCModal(true);
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
      // Update the cmmcPrompt to include all 14 domains
      const cmmcPrompt = `Based on the following security findings, generate CMMC Level 2 specific policies and controls that address the identified vulnerabilities. Focus on the 14 CMMC domains and provide actionable policy recommendations.
      
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
      5. Incident Response (IR) procedures
      6. Maintenance (MA) guidelines
      7. Media Protection (MP) controls
      8. Physical Protection (PE) measures
      9. Recovery (RE) procedures
      10. Risk Assessment (RA) protocols
      11. Security Assessment (CA) procedures
      12. System and Communications Protection (SC) measures
      13. System and Information Integrity (SI) safeguards
      14. Situational Awareness (SA) protocols
      
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
        
        setGeneratedCMMCPolicies(response.generated_text || generateTemplateCMMCPolicies(findingsContext, cmmcDomains, complianceScore));
      } catch (hfError) {
        console.warn('Hugging Face API failed, using template:', hfError);
        setGeneratedCMMCPolicies(generateTemplateCMMCPolicies(findingsContext, cmmcDomains, complianceScore));
      }
      
    } catch (error) {
      console.error('Error generating CMMC Level 2 policies:', error);
      alert('Failed to generate CMMC Level 2 policies. Please try again.');
    } finally {
      setIsGeneratingCMMC(false);
    }
  };

  const generateTemplateCMMCPolicies = (findingsContext: any[], cmmcDomains: string[], complianceScore: ComplianceScore | null) => {
    const currentDate = new Date().toLocaleDateString();
    
    return `
CMMC LEVEL 2 SECURITY POLICIES
Generated on: ${currentDate}

EXECUTIVE SUMMARY
================
This document outlines CMMC Level 2 security policies tailored to address ${findings.length} security findings across ${cmmcDomains.length} CMMC domains. These policies are designed to meet CMMC Level 2 requirements for protecting Controlled Unclassified Information (CUI).

CMMC DOMAINS COMPLIANCE STATUS
============================
${complianceScore ? Object.entries(complianceScore.category_scores)
    .sort((a, b) => a[1] - b[1]) // Sort by compliance score from low to high
    .map(([domain, score]) => `• ${domain}: ${score === 100 ? 'Not Applicable' : `${score}% compliant`}`)
    .join('\n') : 'Compliance data not available'}

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
• Network monitoring procedures
• Communication security controls
• Data transmission protection

SC.L2-3.13.2: Implement subnetworks for publicly accessible system components
• Network segmentation requirements
• DMZ configuration standards
• Public-facing system protection

13. SYSTEM AND INFORMATION INTEGRITY (SI) POLICIES
--------------------------------------------------
SI.L2-3.14.1: Identify, report, and correct information and information system flaws
• Flaw identification procedures
• Reporting requirements
• Correction timelines and procedures

SI.L2-3.14.2: Provide protection from malicious code
• Anti-malware solution requirements
• Malware detection and response
• System protection measures

14. SITUATIONAL AWARENESS (SA) POLICIES
---------------------------------------
SA.L2-3.11.1: Employ automated mechanisms to centrally apply configuration settings
• Centralized configuration management
• Automated deployment procedures
• Configuration compliance monitoring

SA.L2-3.11.2: Employ automated mechanisms to maintain an up-to-date, complete, accurate, and readily available inventory
• Automated asset discovery
• Inventory management systems
• Real-time asset tracking

IMPLEMENTATION TIMELINE
======================
Phase 1 (0-90 days): Foundation Controls
- Access Control implementation
- Audit and Accountability systems
- Basic Configuration Management

Phase 2 (90-180 days): Advanced Controls
- Incident Response capabilities
- Risk Assessment procedures
- Security Assessment programs

Phase 3 (180-365 days): Optimization
- Advanced monitoring and protection
- Comprehensive testing and validation
- Continuous improvement processes

COMPLIANCE MONITORING
====================
- Monthly compliance assessments
- Quarterly security reviews
- Annual CMMC readiness evaluations
- Continuous monitoring and reporting
- Regular third-party assessments

For questions regarding these CMMC Level 2 policies, please contact the Compliance Team.
    `.trim();
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

  // Modal Component for SSP
  const SSPModal = () => (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${showSSPModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowSSPModal(false)} />
      <div className={`absolute ${isSSPMaximized ? 'inset-4' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl h-5/6'} bg-white rounded-2xl shadow-2xl transition-all duration-300 ${showSSPModal ? 'scale-100' : 'scale-95'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">System Security Plan</h2>
              <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isGeneratingSSP && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-600">Generating...</span>
              </div>
            )}
            {generatedSSP && (
              <>
                <button
                  onClick={() => copyToClipboard(generatedSSP, 'SSP')}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedSSP ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                </button>
                <button
                  onClick={downloadSSP}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsSSPMaximized(!isSSPMaximized)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={isSSPMaximized ? 'Minimize' : 'Maximize'}
            >
              {isSSPMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowSSPModal(false)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isGeneratingSSP ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Security Plan</h3>
                <p className="text-gray-600">Please wait while we analyze your security findings and create a comprehensive SSP...</p>
              </div>
            </div>
          ) : generatedSSP ? (
            <div className="h-full p-6 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">{generatedSSP}</pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No SSP Generated Yet</h3>
                <p className="text-gray-600">Click the Generate SSP button to create your security plan.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Modal Component for CMMC Policies
  const CMMCModal = () => (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${showCMMCModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowCMMCModal(false)} />
      <div className={`absolute ${isCMMCMaximized ? 'inset-4' : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl h-5/6'} bg-white rounded-2xl shadow-2xl transition-all duration-300 ${showCMMCModal ? 'scale-100' : 'scale-95'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">CMMC Level 2 Security Policies</h2>
              <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isGeneratingCMMC && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                <RefreshCw className="h-4 w-4 text-green-600 animate-spin" />
                <span className="text-sm font-medium text-green-600">Generating...</span>
              </div>
            )}
            {generatedCMMCPolicies && (
              <>
                <button
                  onClick={() => copyToClipboard(generatedCMMCPolicies, 'CMMC')}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedCMMC ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                </button>
                <button
                  onClick={downloadCMMCPolicies}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsCMMCMaximized(!isCMMCMaximized)}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title={isCMMCMaximized ? 'Minimize' : 'Maximize'}
            >
              {isCMMCMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowCMMCModal(false)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {isGeneratingCMMC ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating CMMC Policies</h3>
                <p className="text-gray-600">Please wait while we create comprehensive CMMC Level 2 security policies...</p>
              </div>
            </div>
          ) : generatedCMMCPolicies ? (
            <div className="h-full p-6 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl p-6">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">{generatedCMMCPolicies}</pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No CMMC Policies Generated Yet</h3>
                <p className="text-gray-600">Click the CMMC Policies button to create your compliance policies.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105"
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
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:scale-105"
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

      {/* Modals */}
      <SSPModal />
      <CMMCModal />
    </div>
  );
};

export default Dashboard;