// A past-due account always returns to the existing customer's billing portal,
// including from older tabs which still request an ordinary checkout.
export async function routeBillingRequest(
  status: string | null,
  recoveryRequested: boolean,
  customer: { external_customer_id: string } | { customer_id: string },
  accessToken: string,
  request: typeof fetch = fetch,
): Promise<{ checkoutUrl: string } | { error: string; status: number } | null> {
  if (status !== 'past_due') {
    return recoveryRequested ? { error: 'Payment recovery is no longer needed', status: 409 } : null;
  }
  const response = await request('https://api.polar.sh/v1/customer-sessions/', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  if (!response.ok) return { error: 'Billing portal unavailable', status: 502 };
  const { customer_portal_url: url } = await response.json();
  if (typeof url !== 'string' || !URL.canParse(url) || new URL(url).origin !== 'https://polar.sh') {
    return { error: 'Invalid billing portal response', status: 502 };
  }
  return { checkoutUrl: url };
}
