import Link from 'next/link';
import AdvancedCreateForm from './advanced-create-form'; // Importiamo il nostro nuovo componente

export default function CreateLinkPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 py-12">
      <div className="w-full max-w-4xl p-4 md:p-8 space-y-8">
        
        <header>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Torna alla Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            Crea un nuovo Link
          </h1>
        </header>

        <main className="p-8 bg-white rounded-lg shadow-md">
          {/* Sostituiamo il placeholder con il nostro form avanzato */}
          <AdvancedCreateForm />
        </main>
        
      </div>
    </div>
  );
}