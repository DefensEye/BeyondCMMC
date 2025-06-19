import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Shield, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';

// Add after existing imports
import { Brain, Zap } from 'lucide-react';

const ComplianceScoreCard: React.FC = () => {
  const { complianceScore, loading } = useSupabase();
  const [animateScore, setAnimateScore] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);
  
  // Trigger animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setAnimateScore(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !complianceScore) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full">
        <div className="flex items-center mb-4">
          <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse mr-2"></div>
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center justify-center h-40 w-40 relative mb-4 md:mb-0">
            <div className="h-40 w-40 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="w-full md:w-1/2 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                <div className="w-36 h-2 bg-gray-200 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { overall_score, category_scores, last_updated } = complianceScore;
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-warning-600';
    if (score >= 40) return 'text-accent-600';
    return 'text-danger-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-success-100';
    if (score >= 60) return 'bg-warning-100';
    if (score >= 40) return 'bg-accent-100';
    return 'bg-danger-100';
  };
  
  const getScoreStrokeColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // success-500
    if (score >= 60) return '#f59e0b'; // warning-500
    if (score >= 40) return '#f97316'; // accent-500
    return '#ef4444'; // danger-500
  };
  
  const getScoreEmoji = (score: number) => {
    if (score >= 80) return '🎉';
    if (score >= 60) return '👍';
    if (score >= 40) return '⚠️';
    return '🚨';
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const scoreColor = getScoreColor(overall_score);
  const scoreBackground = getScoreBackground(overall_score);
  const scoreStrokeColor = getScoreStrokeColor(overall_score);
  const scoreEmoji = getScoreEmoji(overall_score);
  const scoreLabel = getScoreLabel(overall_score);
  
  // Calculate if score is improved or not (this would normally come from your data)
  const isImproved = overall_score > 50; // Just a placeholder, replace with actual logic

  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Compliance Score</h2>
          {/* Add AI indicator */}
          <div className="ml-2 flex items-center bg-gradient-to-r from-purple-100 to-blue-100 px-2 py-1 rounded-full">
            <Brain className="h-3 w-3 text-purple-600 mr-1" />
            <span className="text-xs font-medium text-purple-700">AI Enhanced</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAIInsights(!showAIInsights)}
            className="flex items-center text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-full transition-colors"
          >
            <Zap className="h-3 w-3 mr-1" />
            AI Insights
          </button>
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-500 text-xs">
              {format(new Date(last_updated), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
      
      {/* AI Insights Panel */}
      {showAIInsights && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center mb-2">
            <Brain className="h-4 w-4 text-blue-600 mr-2" />
            <h3 className="text-sm font-semibold text-blue-800">AI-Powered Analysis</h3>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• Security findings analyzed using advanced NLP models</p>
            <p>• Severity assessment enhanced with sentiment analysis</p>
            <p>• Risk categorization improved with AI classification</p>
            <p>• Compliance scores calculated with ML-driven insights</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between">
        <div className="relative mb-6 md:mb-0">
          <div className={`relative h-44 w-44 ${scoreBackground} rounded-full flex items-center justify-center transition-all duration-500 ease-out transform hover:scale-105`}>
            <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={scoreStrokeColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${animateScore ? overall_score : 0}, 100`}
                className="transition-all duration-1500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor} transition-all duration-500`}>
                {overall_score.toFixed(0)}%
              </span>
              <span className="text-sm font-medium text-gray-600 mt-1">{scoreLabel}</span>
              <span className="text-2xl mt-1">{scoreEmoji}</span>
            </div>
          </div>
          
          
        </div>
        
        <div className="w-full md:w-1/2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">CMMC Domains</h3>
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-success-500 mr-1"></div>
              <span className="mr-3">Good</span>
              <div className="w-3 h-3 rounded-full bg-warning-500 mr-1"></div>
              <span className="mr-3">Fair</span>
              <div className="w-3 h-3 rounded-full bg-danger-500 mr-1"></div>
              <span>Poor</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {Object.entries(category_scores)
              .sort(([, scoreA], [, scoreB]) => scoreA - scoreB) // Sort by score (lowest to highest)
              .map(([domain, score], index) => (
              <div 
                key={domain} 
                className="relative"
                onMouseEnter={() => setShowTooltip(domain)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{domain}</span>
                  <span className={`text-xs font-bold ${getScoreColor(score)}`}>
                    {score.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${animateScore ? score : 0}%`,
                      backgroundColor: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444',
                      transitionDelay: `${index * 0.1}s`
                    }}
                  ></div>
                </div>
                
                {showTooltip === domain && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap">
                    {score < 60 && (
                      <div className="flex items-center">
                        <AlertTriangle className="h-3 w-3 text-warning-400 mr-1" />
                        <span>Needs improvement</span>
                      </div>
                    )}
                    {score >= 60 && (
                      <div>Score: {score.toFixed(1)}% - {getScoreLabel(score)}</div>
                    )}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                
              </div>
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceScoreCard;