require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function updateFolderIdToUUID() {
  try {
    console.log('🔄 Updating folder_id column to UUID...');
    
    // Drop existing tables per sicurezza
    await sql`DROP TABLE IF EXISTS clicks CASCADE`;
    await sql`DROP TABLE IF EXISTS links CASCADE`;
    
    console.log('✅ Tables dropped successfully');
    
    console.log('🔄 Creating new tables with UUID folder_id...');
    
    // Create links table con folder_id UUID
    await sql`
      CREATE TABLE links (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(255) NOT NULL UNIQUE,
        original_url TEXT NOT NULL,
        title VARCHAR(500),
        description TEXT,
        user_id UUID,
        workspace_id UUID,
        folder_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        utm_campaign VARCHAR(255),
        utm_source VARCHAR(255),
        utm_content VARCHAR(255),
        utm_medium VARCHAR(255),
        utm_term VARCHAR(255)
      )
    `;
    
    // Indexes for better performance
    await sql`CREATE INDEX idx_links_short_code ON links(short_code)`;
    await sql`CREATE INDEX idx_links_user_id ON links(user_id)`;
    await sql`CREATE INDEX idx_links_workspace_id ON links(workspace_id)`;
    await sql`CREATE INDEX idx_links_folder_id ON links(folder_id)`;
    
    // Create clicks table
    await sql`
      CREATE TABLE clicks (
        id SERIAL PRIMARY KEY,
        link_id INTEGER NOT NULL,
        clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        clicked_at_rome TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome'),
        country VARCHAR(100),
        region VARCHAR(100),
        city VARCHAR(100),
        referrer TEXT,
        browser_name VARCHAR(50),
        language_device VARCHAR(10),
        device_type VARCHAR(20),
        os_name VARCHAR(50),
        ip_address INET,
        user_agent TEXT,
        timezone_device VARCHAR(50),
        click_fingerprint_hash VARCHAR(64),
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
      )
    `;
    
    // Indexes for clicks table
    await sql`CREATE INDEX idx_clicks_link_id ON clicks(link_id)`;
    await sql`CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at)`;
    await sql`CREATE INDEX idx_clicks_fingerprint ON clicks(click_fingerprint_hash)`;
    await sql`CREATE INDEX idx_clicks_country ON clicks(country)`;
    
    console.log('✅ Tables created successfully with UUID folder_id');
    console.log('🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateFolderIdToUUID();
