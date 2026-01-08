import { useState, useEffect } from 'react';

export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

/**
 * Generate a stable device fingerprint from browser attributes.
 * No external libraries needed - uses native crypto API.
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const userAgent = navigator.userAgent;
        const screenResolution = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;
        
        // Collect stable browser attributes
        const components = [
          userAgent,
          screenResolution,
          timezone,
          language,
          navigator.hardwareConcurrency?.toString() || 'unknown',
          new Date().getTimezoneOffset().toString(),
          screen.colorDepth?.toString() || 'unknown',
          navigator.maxTouchPoints?.toString() || '0',
        ];

        // Generate SHA-256 hash
        const data = new TextEncoder().encode(components.join('|'));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        setFingerprint({
          hash,
          userAgent,
          screenResolution,
          timezone,
          language,
        });
      } catch (error) {
        console.error('Failed to generate device fingerprint:', error);
        // Fallback to random ID if crypto fails
        setFingerprint({
          hash: `fallback-${Date.now()}-${Math.random().toString(36)}`,
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: 'unknown',
          language: navigator.language,
        });
      } finally {
        setIsLoading(false);
      }
    };

    generateFingerprint();
  }, []);

  return { fingerprint, isLoading };
}
