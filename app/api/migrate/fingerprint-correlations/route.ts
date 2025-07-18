import { createFingerprintCorrelationsTable } from '@/database/migrations/create-fingerprint-correlations-table';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Starting fingerprint correlations table migration...');
    
    await createFingerprintCorrelationsTable();

    return NextResponse.json({
      status: 'success',
      message: 'Tabella fingerprint_correlations creata con successo',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Migration failed:', errorMessage);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
