import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OracleScanner } from '@/components/oracle/OracleScanner';
import { FeatureGate } from '@/components/common/FeatureGate';
import { Navbar } from '@/components/layout/Navbar';

export default function Oracle() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerTag = searchParams.get('player') || '';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Eye className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold font-rajdhani uppercase tracking-wider">
              The Oracle
            </h1>
          </div>
          <p className="text-muted-foreground">
            Predict your opponent's deck before the match begins
          </p>
        </div>

        {/* Feature-Gated Scanner */}
        <FeatureGate
          feature="oracle"
          playerTag={playerTag}
          fallback={
            <div className="relative max-w-md mx-auto">
              {/* Blurred preview */}
              <div className="blur-md pointer-events-none opacity-50">
                <OracleScanner />
              </div>
              {/* Overlay with upgrade message */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
                <div className="text-center p-6">
                  <Lock className="w-12 h-12 text-gold mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">PRO Feature</h3>
                  <p className="text-muted-foreground text-sm">
                    Upgrade to PRO to unlock Live Match Predictions.
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <OracleScanner />
        </FeatureGate>
      </main>
    </div>
  );
}
