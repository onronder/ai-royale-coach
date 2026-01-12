import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

interface DiscountResponse {
  discountId: string | null;
  code: string;
  discountPercent: number | null;
  isValid: boolean;
  error?: string;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!polarAccessToken) {
      logger.error('POLAR_ACCESS_TOKEN not configured');
      return errorResponse('Payment provider not configured', 500);
    }

    const { promoCode } = await req.json();
    
    if (!promoCode || typeof promoCode !== 'string') {
      return errorResponse('Missing or invalid promoCode parameter', 400);
    }

    const normalizedCode = promoCode.trim().toUpperCase();
    logger.info('Looking up discount', { promoCode: normalizedCode });

    // Query Polar API for discounts
    const response = await fetch('https://api.polar.sh/v1/discounts/', {
      headers: {
        'Authorization': `Bearer ${polarAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Polar API error', { status: response.status, error: errorText });
      return jsonResponse({
        discountId: null,
        code: normalizedCode,
        discountPercent: null,
        isValid: false,
        error: 'Failed to lookup discount',
      } as DiscountResponse);
    }

    const discountsData = await response.json();
    const discounts = discountsData.items || [];

    logger.info('Fetched discounts from Polar', { count: discounts.length });

    // Find discount matching the promo code (case-insensitive)
    const matchingDiscount = discounts.find(
      (d: { code?: string }) => d.code?.toUpperCase() === normalizedCode
    );

    if (!matchingDiscount) {
      logger.info('Discount not found', { promoCode: normalizedCode });
      return jsonResponse({
        discountId: null,
        code: normalizedCode,
        discountPercent: null,
        isValid: false,
        error: 'Discount code not found',
      } as DiscountResponse);
    }

    // Check if discount is still valid (not expired, not maxed out)
    const now = new Date();
    if (matchingDiscount.ends_at && new Date(matchingDiscount.ends_at) < now) {
      logger.info('Discount expired', { promoCode: normalizedCode, endsAt: matchingDiscount.ends_at });
      return jsonResponse({
        discountId: null,
        code: normalizedCode,
        discountPercent: null,
        isValid: false,
        error: 'Discount code has expired',
      } as DiscountResponse);
    }

    if (matchingDiscount.max_redemptions && 
        matchingDiscount.redemptions_count >= matchingDiscount.max_redemptions) {
      logger.info('Discount maxed out', { 
        promoCode: normalizedCode, 
        maxRedemptions: matchingDiscount.max_redemptions,
        currentRedemptions: matchingDiscount.redemptions_count
      });
      return jsonResponse({
        discountId: null,
        code: normalizedCode,
        discountPercent: null,
        isValid: false,
        error: 'Discount code is no longer available',
      } as DiscountResponse);
    }

    // Calculate discount percentage
    let discountPercent = 0;
    if (matchingDiscount.type === 'percentage') {
      // Polar stores percentage as basis points (e.g., 3000 = 30%)
      discountPercent = matchingDiscount.basis_points / 100;
    } else if (matchingDiscount.type === 'fixed') {
      // Fixed discounts can't easily be converted to percentage
      // We'll return 0 and let the checkout handle it
      discountPercent = 0;
    }

    logger.info('Discount found and valid', { 
      discountId: matchingDiscount.id, 
      discountPercent,
      type: matchingDiscount.type
    });

    return jsonResponse({
      discountId: matchingDiscount.id,
      code: matchingDiscount.code,
      discountPercent,
      isValid: true,
    } as DiscountResponse);

  } catch (error) {
    logger.error('Lookup error', { error: error instanceof Error ? error.message : 'Unknown' });
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
