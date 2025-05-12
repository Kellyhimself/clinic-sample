import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface UpgradePromptProps {
  children: ReactNode;
  requiredPlan: 'pro' | 'enterprise';
  features?: string[];
  className?: string;
  variant?: 'button' | 'link' | 'card' | 'tooltip';
  popoverPosition?: 'center' | 'top-right';
}

export function UpgradePrompt({ 
  children, 
  requiredPlan, 
  features = [], 
  className = '',
  variant = 'button',
  popoverPosition = 'center',
}: UpgradePromptProps) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleUpgrade = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/settings/billing');
  };

  const defaultFeatures = {
    pro: [
      'Advanced analytics and reporting',
      'Custom branding options',
      'Priority support'
    ],
    enterprise: [
      'All Pro features',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced security features'
    ]
  };

  const displayFeatures = features.length > 0 ? features : defaultFeatures[requiredPlan];

  const renderPrompt = () => {
    if (variant === 'tooltip') {
      return (
        <div 
          className={`
            absolute z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded
            transition-all duration-200 ease-in-out
            ${showPrompt ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            ${popoverPosition === 'top-right' ? 'top-0 right-0 -translate-y-full mt-1' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}
          `}
          onMouseLeave={() => setShowPrompt(false)}
        >
          Available on {requiredPlan} plan
        </div>
      );
    }

    return (
      <div 
        className={`
          absolute z-50 bg-white/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-4 transition-all duration-200 ease-in-out
          ${showPrompt ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          ${popoverPosition === 'top-right' ? 'top-2 right-2 left-auto bottom-auto w-72 shadow-lg' : 'inset-0'}
        `}
        onMouseLeave={() => setShowPrompt(false)}
      >
        <Lock className="h-5 w-5 text-indigo-600 mb-2" />
        <p className="text-sm font-medium text-indigo-900 mb-2">
          {requiredPlan === 'pro' ? 'Pro' : 'Enterprise'} Plan Required
        </p>
        {displayFeatures.length > 0 && (
          <div className="space-y-1 mb-3 w-full">
            {displayFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs text-indigo-800">{feature}</span>
              </div>
            ))}
          </div>
        )}
        <Button 
          onClick={handleUpgrade}
          size="sm"
          className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700"
        >
          Upgrade Now
        </Button>
      </div>
    );
  };

  const renderContent = () => {
    const commonProps = {
      className: `relative ${className}`,
      onMouseEnter: () => setShowPrompt(true),
      onMouseLeave: () => setShowPrompt(false)
    };

    switch (variant) {
      case 'button':
      case 'link':
        return (
          <div {...commonProps}>
            <div className="opacity-50 cursor-not-allowed">
              {children}
            </div>
            {renderPrompt()}
          </div>
        );
      
      case 'tooltip':
        return (
          <div {...commonProps}>
            <div className="opacity-50 cursor-not-allowed">
              {children}
            </div>
            {renderPrompt()}
          </div>
        );
      
      case 'card':
        return (
          <div {...commonProps}>
            <div className="opacity-50 cursor-not-allowed">
              {children}
            </div>
            {renderPrompt()}
          </div>
        );
      
      default:
        return null;
    }
  };

  return renderContent();
} 