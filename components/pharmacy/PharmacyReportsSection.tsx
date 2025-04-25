'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

// Import responsive CSS
import './pharmacyAnalytics.css';

// Pharmacy-specific reports component
export default function PharmacyReportsSection() {
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [isMediumMobile, setIsMediumMobile] = useState(false);

  // Check screen size on component mount and resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsNarrowMobile(width <= 358);
      setIsMediumMobile(width > 358 && width <= 480);
    };
    
    // Set initial state
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // This would be connected to real data in a production environment
  return (
    <div className="pharmacy-analytics-container pharmacy-space-y">
      <Card className="pharmacy-card">
        <CardHeader className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
          <CardTitle className={isNarrowMobile ? 'xs-heading' : isMediumMobile ? 'sm-heading' : ''}>
            Pharmacy Sales Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
          <div className={`pharmacy-chart-placeholder flex items-center justify-center bg-gray-50 rounded-md ${isNarrowMobile ? 'xs-margin' : isMediumMobile ? 'sm-margin' : ''}`}>
            {/* Placeholder for sales chart */}
            <div className="text-center">
              <BarChart className={`${isNarrowMobile ? 'xs-icon h-10 w-10' : isMediumMobile ? 'sm-icon h-12 w-12' : 'h-16 w-16'} text-gray-300 mx-auto`} />
              <p className={`${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : ''} text-muted-foreground mt-2`}>
                Sales trend chart will be displayed here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pharmacy-reports-grid pharmacy-grid">
        <Card className="pharmacy-card">
          <CardHeader className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
            <CardTitle className={isNarrowMobile ? 'xs-heading' : isMediumMobile ? 'sm-heading' : ''}>
              Top Selling Medications
            </CardTitle>
          </CardHeader>
          <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
            <ul className={`space-y-1 ${isNarrowMobile ? 'xs-margin' : ''}`}>
              {['Paracetamol', 'Amoxicillin', 'Metformin', 'Lisinopril', 'Atorvastatin'].map((med, i) => (
                <li key={i} className={`pharmacy-list-item hover:bg-gray-50 rounded-md ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'p-2'}`}>
                  <span>{med}</span>
                  <span className={`text-muted-foreground ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                    {324 - i * 42} units
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="pharmacy-card">
          <CardHeader className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
            <CardTitle className={isNarrowMobile ? 'xs-heading' : isMediumMobile ? 'sm-heading' : ''}>
              Sales by Category
            </CardTitle>
          </CardHeader>
          <CardContent className={isNarrowMobile ? 'xs-padding' : isMediumMobile ? 'sm-padding' : ''}>
            <ul className={`space-y-1 ${isNarrowMobile ? 'xs-margin' : ''}`}>
              {['Antibiotics', 'Painkillers', 'Cardiovascular', 'Diabetes', 'Vitamins'].map((cat, i) => (
                <li key={i} className={`pharmacy-list-item hover:bg-gray-50 rounded-md ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'p-2'}`}>
                  <span>{cat}</span>
                  <span className={`text-muted-foreground ${isNarrowMobile ? 'xs-text' : isMediumMobile ? 'sm-text' : 'text-sm'}`}>
                    KSh {(Math.floor(Math.random() * 50) + 30) * 1000}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 