/**
 * API endpoint per gestire la migrazione al sistema di fingerprinting robusto
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  migrateToRobustFingerprinting, 
  verifyMigration, 
  rollbackMigration 
} from '@/database/migrations/migrate-to-robust-fingerprinting';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    switch (action) {
      case 'migrate':
        return await executeMigration();
      
      case 'verify':
        return await executeVerification();
      
      case 'rollback':
        return await executeRollback();
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: ['migrate', 'verify', 'rollback']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error in migration API:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // GET request per verificare lo stato del sistema
    const verification = await verifyMigration();
    
    return NextResponse.json({
      success: true,
      status: verification,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function executeMigration() {
  try {
    const result = await migrateToRobustFingerprinting();
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function executeVerification() {
  try {
    const verification = await verifyMigration();
    
    return NextResponse.json({
      success: true,
      verification,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function executeRollback() {
  try {
    const result = await rollbackMigration();
    
    return NextResponse.json({
      success: true,
      message: 'Rollback completed successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Rollback failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
