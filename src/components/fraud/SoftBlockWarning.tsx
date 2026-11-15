import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Shield, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FraudStatus } from '@/hooks/useFraudStatus';

interface SoftBlockWarningProps {
  status: FraudStatus;
  className?: string;
}

/**
 * Non-blocking warning banner for users with fraud warnings or soft-blocks.
 */
export function SoftBlockWarning({ status, className }: SoftBlockWarningProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  if (status === 'clean') {
    return null;
  }

  const isSoftBlocked = status === 'soft_blocked';

  return (
    <Alert 
      variant="destructive" 
      className={`border-warning/50 bg-warning/10 ${className}`}
    >
      <div className="flex items-start gap-3">
        {isSoftBlocked ? (
          <Shield className="h-5 w-5 text-warning" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-warning" />
        )}
        <div className="flex-1">
          <AlertTitle className="text-warning">
            {t(isSoftBlocked ? 'accountWarning.limited' : 'accountWarning.detected')}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground mt-1">
            {t(isSoftBlocked ? 'accountWarning.limitedDescription' : 'accountWarning.description')}
          </AlertDescription>
          {isSoftBlocked && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/help')}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {t('accountWarning.help')}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
