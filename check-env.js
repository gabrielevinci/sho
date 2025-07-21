require('dotenv').config({ path: '.env.local' });

console.log('🔍 Environment variables check:');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
console.log('SESSION_PASSWORD:', process.env.SESSION_PASSWORD ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.SESSION_PASSWORD) {
  console.log('❌ SESSION_PASSWORD is missing!');
  console.log('💡 Add SESSION_PASSWORD to your .env.local file');
}
