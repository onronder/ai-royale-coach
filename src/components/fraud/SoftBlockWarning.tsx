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
            {isSoftBlocked ? 'Limited Access' : 'Unusual Activity Detected'}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground mt-1">
            {isSoftBlocked ? (
              <>
                Your account has reduced feature limits due to detected suspicious activity.
                If you believe this is an error, please contact support.
              </>
            ) : (
              <>
                We detected some unusual patterns on your account. 
                Continue using the app normally to clear this warning.
              </>
            )}
          </AlertDescription>
          {isSoftBlocked && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/help')}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
