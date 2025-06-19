import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartEvent, ActiveElement } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Define types for the Chart.js plugin
interface ChartModel {
  startAngle: number;
  endAngle: number;
  outerRadius: number;
  x: number;
  y: number;
}

interface ChartDataLabel {
  x: number;
  y: number;
}

interface ChartMeta {
  data: any[];
}

interface ChartWithDatalabels extends ChartJS {
  $datalabels?: ChartDataLabel[];
  data: {
    datasets: {
      backgroundColor: string[];
      data: number[];
    }[];
  };
}

// Custom plugin for leader lines
const LeaderLinePlugin = {
  id: 'leaderLinePlugin',
  afterDatasetDraw(chart: ChartWithDatalabels, _args: any, _options: any) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0) as ChartMeta;
    if (!meta || !meta.data) return;
    ctx.save();
    meta.data.forEach((arc: any, i: number) => {
      // Only draw for visible arcs with value
      if (!arc || arc.hidden || chart.data.datasets[0].data[i] === 0) return;
      // Get arc center and angle
      const model = arc.getProps(['startAngle', 'endAngle', 'outerRadius', 'x', 'y'], true) as ChartModel;
      const angle = (model.startAngle + model.endAngle) / 2;
      const arcX = model.x + Math.cos(angle) * model.outerRadius;
      const arcY = model.y + Math.sin(angle) * model.outerRadius;
      // Get datalabel position from plugin
      const datalabels = chart.$datalabels || [];
      let labelX, labelY;
      if (datalabels[i] && datalabels[i].x !== undefined) {
        labelX = datalabels[i].x;
        labelY = datalabels[i].y;
      } else {
        // Estimate label position outside arc
        labelX = model.x + Math.cos(angle) * (model.outerRadius + 40);
        labelY = model.y + Math.sin(angle) * (model.outerRadius + 40);
      }
      // Draw line
      const backgroundColor = chart.data.datasets[0].backgroundColor as string[];
      ctx.strokeStyle = backgroundColor[i];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arcX, arcY);
      ctx.lineTo(labelX, labelY);
      ctx.stroke();
      // Draw arrowhead
      const arrowLength = 8, arrowWidth = 5;
      const dx = labelX - arcX, dy = labelY - arcY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const ux = dx / len, uy = dy / len;
        ctx.beginPath();
        ctx.moveTo(labelX, labelY);
        ctx.lineTo(labelX - ux * arrowLength + uy * arrowWidth / 2, labelY - uy * arrowLength - ux * arrowWidth / 2);
        ctx.lineTo(labelX - ux * arrowLength - uy * arrowWidth / 2, labelY - uy * arrowLength + ux * arrowWidth / 2);
        ctx.closePath();
        ctx.fillStyle = backgroundColor[i];
        ctx.fill();
      }
    });
    ctx.restore();
  }
};

ChartJS.register(LeaderLinePlugin);
import { Doughnut } from 'react-chartjs-2';
import { PieChart, AlertTriangle, ShieldAlert, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const SeverityDistributionCard: React.FC = () => {
  const { severityCounts, loading } = useSupabase();
  const [animateChart, setAnimateChart] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  
  // Trigger animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setAnimateChart(true), 400);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full">
        <div className="flex items-center mb-4">
          <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse mr-2"></div>
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center justify-center h-60">
          <div className="h-40 w-40 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mt-4 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-2">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mt-2 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const severities = Object.keys(severityCounts);
  const counts = Object.values(severityCounts);
  const total = counts.reduce((sum, count) => sum + count, 0);
  
  // Get the highest severity with at least one finding
  const highestSeverity = severities.find(severity => 
    severity in severityCounts && severityCounts[severity as keyof typeof severityCounts] > 0
  ) || null;
  
  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'CRITICAL':
        return <ShieldAlert className="h-5 w-5 text-danger-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-accent-500" />;
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5 text-warning-500" />;
      case 'LOW':
        return <Info className="h-5 w-5 text-primary-500" />;
      default:
        return <ShieldCheck className="h-5 w-5 text-success-500" />;
    }
  };
  
  // Get severity background color
  const getSeverityBackground = (severity: string) => {
    switch(severity) {
      case 'CRITICAL':
        return 'bg-danger-50';
      case 'HIGH':
        return 'bg-accent-50';
      case 'MEDIUM':
        return 'bg-warning-50';
      case 'LOW':
        return 'bg-primary-50';
      default:
        return 'bg-success-50';
    }
  };

  const data = {
    labels: severities,
    datasets: [
      {
        data: animateChart ? counts : counts.map(() => 0),
        backgroundColor: [
          '#ef4444', // Critical - Red
          '#f97316', // High - Orange
          '#f59e0b', // Medium - Amber
          '#0ea5e9', // Low - Blue
        ],
        borderColor: [
          '#ffffff', // White border for all
          '#ffffff',
          '#ffffff',
          '#ffffff',
        ],
        borderWidth: 3,
        borderRadius: 5,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    layout: {
      padding: {
        top: 99,
        bottom: 30,
        left: 50,
        right: 50
      }
    },
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 20,
          font: {
            size: 11,
            weight: 'bold' as const,
          },
          generateLabels: function(chart: any) {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => {
              const meta = chart.getDatasetMeta(0);
              return {
                text: label,
                fillStyle: datasets[0].backgroundColor[i],
                strokeStyle: datasets[0].borderColor[i],
                lineWidth: datasets[0].borderWidth,
                hidden: isNaN(datasets[0].data[i]) || meta.data[i].hidden,
                index: i,
                fontColor: selectedSeverity === label ? '#000000' : '#666666'
              };
            });
          },
          onClick: function(_e: any, legendItem: any, legend: any) {
            const index = legendItem.index;
            const label = legend.chart.data.labels[index];
            setSelectedSeverity(selectedSeverity === label ? null : label);
          }
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = total === 0 ? 0 : Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        offset: function(context: any) {
          const label = context.chart.data.labels[context.dataIndex];
          if (label === 'CRITICAL') return 50;
          if (label === 'HIGH') return 45;
          if (label === 'MEDIUM') return 30;
          if (label === 'LOW') return 25;
          return 20;
        },
        backgroundColor: function(context: any) {
          // Use the arc color for the label background with better opacity
          const color = context.dataset.backgroundColor[context.dataIndex];
          return color;
        },
        borderColor: '#ffffff',
        borderWidth: 2,
        borderRadius: 8,
        padding: {
          top: 8,
          bottom: 8,
          left: 10,
          right: 10
        },
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 13,
          family: 'Inter, system-ui, sans-serif'
        },
        textAlign: 'center' as const,
        anchor: 'end' as const,
        align: 'end' as const,
        clamp: false,
        shadowBlur: 6,
        shadowColor: 'rgba(0,0,0,0.25)',
        shadowOffsetX: 1,
        shadowOffsetY: 2,
        formatter: function(value: any, context: any) {
          const label = context.chart.data.labels[context.dataIndex];
          const percentage = total === 0 ? 0 : Math.round((value / total) * 100);
          // Improved formatting for better readability
          return value > 0 ? `${label}\n${value} (${percentage}%)` : '';
        },
        display: function(context: any) {
          return context.dataset.data[context.dataIndex] > 0;
        },
        listeners: {
          enter: function(context: any) {
            // Add hover effect
            context.element.style.transform = 'scale(1.05)';
          },
          leave: function(context: any) {
            context.element.style.transform = 'scale(1)';
          }
        }
      }
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <PieChart className="h-5 w-5 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Severity Distribution</h2>
        </div>
        {highestSeverity && (
          <div className="flex items-center">
            {getSeverityIcon(highestSeverity)}
            <span className="ml-1 text-xs font-medium">
              Highest: {highestSeverity}
            </span>
          </div>
        )}
      </div>
      
      {total > 0 ? (
        <div className="relative h-96"> {/* Increased from h-80 to h-96 for more vertical space */}
          <Doughnut data={data} options={options} plugins={[ChartDataLabels]} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center p-4 rounded-full ${selectedSeverity ? getSeverityBackground(selectedSeverity) : 'bg-gray-50'} transition-all duration-300 transform ${animateChart ? 'scale-100' : 'scale-0'}`}>
              <span className="block text-3xl font-bold text-gray-800">
                {selectedSeverity ? (selectedSeverity in severityCounts ? severityCounts[selectedSeverity as keyof typeof severityCounts] : 0) : total}
              </span>
              <span className="block text-xs text-gray-500">
                {selectedSeverity ? selectedSeverity : 'Total Findings'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-success-50 rounded-lg p-6">
          <div className="p-4 rounded-full bg-success-100 mb-4 animate-bounce">
            <ShieldCheck className="h-10 w-10 text-success-500" />
          </div>
          <p className="text-gray-700 font-medium text-center">No security findings detected</p>
          <p className="text-gray-500 text-sm text-center mt-2">Your environment is currently secure</p>
        </div>
      )}
      
      {total > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-6">
          {Object.entries(severityCounts).map(([severity, count]) => (
            <div 
              key={severity} 
              className={`rounded-lg p-3 transition-all duration-300 ${selectedSeverity === severity ? getSeverityBackground(severity) : 'hover:bg-gray-50'} cursor-pointer`}
              onClick={() => setSelectedSeverity(selectedSeverity === severity ? null : severity)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getSeverityIcon(severity)}
                  <p className="ml-2 text-sm font-medium">{severity}</p>
                </div>
                <div className={`text-lg font-bold ${severity === 'CRITICAL' ? 'text-danger-600' : severity === 'HIGH' ? 'text-accent-600' : severity === 'MEDIUM' ? 'text-warning-600' : 'text-primary-600'}`}>
                  {count}
                </div>
              </div>
              <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${severity === 'CRITICAL' ? 'bg-danger-500' : severity === 'HIGH' ? 'bg-accent-500' : severity === 'MEDIUM' ? 'bg-warning-500' : 'bg-primary-500'}`}
                  style={{ width: `${animateChart ? (count / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeverityDistributionCard;