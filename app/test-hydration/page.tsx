import DateFormat from '@/app/components/DateFormat';
import NumberFormat from '@/app/components/NumberFormat';
import NoSSR from '@/app/components/NoSSR';

export default function TestPage() {
  const testDate = new Date().toISOString();
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Hydration Components</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>DateFormat Test:</h2>
        <NoSSR fallback="Loading date...">
          <DateFormat 
            date={testDate}
            options={{
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }}
          />
        </NoSSR>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>NumberFormat Test:</h2>
        <NoSSR fallback="Loading number...">
          <NumberFormat value={12345} />
        </NoSSR>
      </div>
      
      <div>
        <p>Se vedi questa pagina senza errori React #418 nella console, i componenti funzionano correttamente!</p>
      </div>
    </div>
  );
}
