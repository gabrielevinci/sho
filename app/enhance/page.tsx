import { NextRequest } from 'next/server';
import AutoEnhancePage from '@/app/components/AutoEnhancePage';

interface EnhancePageProps {
  params: Promise<{}>;
  searchParams: Promise<{
    lid?: string;
    fph?: string;
    target?: string;
  }>;
}

export default async function EnhancePage({ searchParams }: EnhancePageProps) {
  const params = await searchParams;
  const linkId = params.lid;
  const fingerprintHash = params.fph;
  const targetUrl = params.target;

  // Se mancano parametri, redirect alla home
  if (!linkId || !fingerprintHash || !targetUrl) {
    return (
      <script dangerouslySetInnerHTML={{
        __html: `window.location.replace('/')`
      }} />
    );
  }

  // Decodifica l'URL target
  const decodedTargetUrl = decodeURIComponent(targetUrl);

  return (
    <AutoEnhancePage 
      linkId={linkId}
      fingerprintHash={fingerprintHash}
      targetUrl={decodedTargetUrl}
    />
  );
}
