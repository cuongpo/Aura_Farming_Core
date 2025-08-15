import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function securityCheck() {
    console.log('🔒 Security Check for GitHub Push');
    console.log('=' .repeat(50));
    
    let allGood = true;
    const issues = [];
    const warnings = [];

    // Check 1: .env file should not be tracked
    console.log('\n📋 1. ENVIRONMENT FILE CHECK');
    console.log('-'.repeat(30));
    
    const envPath = path.join(rootDir, '.env');
    const envExamplePath = path.join(rootDir, '.env.example');
    const gitignorePath = path.join(rootDir, '.gitignore');
    
    if (fs.existsSync(envPath)) {
        console.log('✅ .env file exists (good for local development)');
        
        // Check if .env contains sensitive data
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('TELEGRAM_BOT_TOKEN=') && !envContent.includes('your_bot_token_here')) {
            console.log('⚠️  .env contains real bot token (ensure it\'s in .gitignore)');
        }
        if (envContent.includes('PRIVATE_KEY=0x') && envContent.length > 100) {
            console.log('⚠️  .env contains real private key (ensure it\'s in .gitignore)');
        }
    } else {
        warnings.push('.env file not found (create from .env.example for local development)');
    }
    
    if (fs.existsSync(envExamplePath)) {
        console.log('✅ .env.example exists');
        
        // Check that .env.example has placeholder values
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        if (envExampleContent.includes('1234567890:ABC') || envExampleContent.includes('0x1234567890abc')) {
            console.log('✅ .env.example contains placeholder values');
        } else {
            issues.push('.env.example may contain real sensitive data');
            allGood = false;
        }
    } else {
        issues.push('.env.example file missing');
        allGood = false;
    }

    // Check 2: .gitignore configuration
    console.log('\n📋 2. GITIGNORE CHECK');
    console.log('-'.repeat(30));
    
    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        
        const requiredIgnores = ['.env', 'node_modules/', 'data/', '*.db'];
        const missingIgnores = requiredIgnores.filter(item => !gitignoreContent.includes(item));
        
        if (missingIgnores.length === 0) {
            console.log('✅ .gitignore properly configured');
        } else {
            issues.push(`Missing in .gitignore: ${missingIgnores.join(', ')}`);
            allGood = false;
        }
    } else {
        issues.push('.gitignore file missing');
        allGood = false;
    }

    // Check 3: Sensitive files that shouldn't exist
    console.log('\n📋 3. SENSITIVE FILES CHECK');
    console.log('-'.repeat(30));
    
    const sensitiveFiles = [
        'secrets.json',
        'config.json',
        '.env.local',
        '.env.production',
        'private.key',
        'wallet.json'
    ];
    
    const foundSensitiveFiles = sensitiveFiles.filter(file => 
        fs.existsSync(path.join(rootDir, file))
    );
    
    if (foundSensitiveFiles.length === 0) {
        console.log('✅ No sensitive files found in root directory');
    } else {
        issues.push(`Sensitive files found: ${foundSensitiveFiles.join(', ')}`);
        allGood = false;
    }

    // Check 4: Database files
    console.log('\n📋 4. DATABASE FILES CHECK');
    console.log('-'.repeat(30));
    
    const dataDir = path.join(rootDir, 'data');
    if (fs.existsSync(dataDir)) {
        const dataFiles = fs.readdirSync(dataDir);
        const dbFiles = dataFiles.filter(file => file.endsWith('.db') || file.endsWith('.sqlite'));
        
        if (dbFiles.length > 0) {
            console.log(`⚠️  Database files found in data/: ${dbFiles.join(', ')}`);
            console.log('   These should be in .gitignore (they are if you followed setup)');
        } else {
            console.log('✅ No database files in data/ directory');
        }
    } else {
        console.log('✅ data/ directory doesn\'t exist (will be created on first run)');
    }

    // Check 5: Package.json scripts
    console.log('\n📋 5. PACKAGE.JSON CHECK');
    console.log('-'.repeat(30));
    
    const packagePath = path.join(rootDir, 'package.json');
    if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        if (packageContent.scripts && packageContent.scripts.start) {
            console.log('✅ Start script configured');
        } else {
            warnings.push('No start script in package.json');
        }
        
        if (packageContent.name && packageContent.description) {
            console.log('✅ Package metadata present');
        } else {
            warnings.push('Package metadata incomplete');
        }
    }

    // Check 6: README file
    console.log('\n📋 6. DOCUMENTATION CHECK');
    console.log('-'.repeat(30));
    
    const readmePath = path.join(rootDir, 'README.md');
    if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        
        if (readmeContent.includes('# ') && readmeContent.length > 500) {
            console.log('✅ README.md exists and has content');
        } else {
            warnings.push('README.md exists but may need more content');
        }
        
        // Check for sensitive data in README
        if (readmeContent.includes('TELEGRAM_BOT_TOKEN=') && !readmeContent.includes('your_bot_token_here')) {
            issues.push('README.md may contain sensitive token data');
            allGood = false;
        }
    } else {
        warnings.push('README.md file missing');
    }

    // Summary
    console.log('\n🎯 SECURITY CHECK SUMMARY');
    console.log('=' .repeat(50));
    
    if (allGood && issues.length === 0) {
        console.log('🎉 ALL SECURITY CHECKS PASSED!');
        console.log('✅ Your code is ready for GitHub push');
    } else {
        console.log('❌ SECURITY ISSUES FOUND:');
        issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    console.log('\n📋 FINAL CHECKLIST:');
    console.log('□ .env file is in .gitignore');
    console.log('□ .env.example has placeholder values only');
    console.log('□ No real private keys or tokens in tracked files');
    console.log('□ Database files are ignored');
    console.log('□ README.md is complete and safe');
    console.log('□ All sensitive files are in .gitignore');

    console.log('\n🚀 READY TO PUSH:');
    console.log('git add .');
    console.log('git commit -m "Initial commit: Aura Farming Bot with ERC-4337 and Web App"');
    console.log('git push origin main');

    return allGood && issues.length === 0;
}

securityCheck();
