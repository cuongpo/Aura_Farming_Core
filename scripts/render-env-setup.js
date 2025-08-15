// Script to help set up Render environment variables
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔧 Render Environment Variables Setup');
console.log('=' .repeat(50));

// Read .env file
const envPath = path.join(rootDir, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please create it first.');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n').filter(line => 
    line.trim() && !line.startsWith('#') && line.includes('=')
);

console.log('\n📋 Copy these environment variables to Render:');
console.log('-'.repeat(50));

const renderEnvVars = {};

envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    
    // Skip local-only variables
    if (key === 'WEB_APP_URL' && value.includes('localhost')) {
        console.log(`${key}=https://your-app-name.onrender.com (UPDATE AFTER DEPLOYMENT)`);
        return;
    }
    
    if (key === 'WEB_PORT') {
        console.log(`${key}=10000 (Render uses port 10000)`);
        return;
    }
    
    if (key === 'DATABASE_PATH') {
        console.log(`${key}=./data/bot.db (will be created automatically)`);
        return;
    }
    
    console.log(`${key}=${value}`);
    renderEnvVars[key] = value;
});

console.log('\n🌟 Additional Render-specific variables:');
console.log('-'.repeat(50));
console.log('NODE_ENV=production');
console.log('WEB_PORT=10000');

console.log('\n📝 Instructions:');
console.log('1. Go to your Render service dashboard');
console.log('2. Click "Environment" tab');
console.log('3. Add each variable above');
console.log('4. After deployment, update WEB_APP_URL with your actual Render URL');
console.log('5. This will trigger a redeploy with web app buttons enabled');

console.log('\n🚀 Your Render URL will be:');
console.log('https://your-service-name.onrender.com');

console.log('\n✅ Ready for deployment!');
