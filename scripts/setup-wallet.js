import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function setupWallet() {
    console.log('🔐 Setting up wallet for contract deployment...');
    
    // Check if private key already exists
    if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length > 0) {
        console.log('✅ Private key already configured');
        
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
            console.log('📍 Wallet Address:', wallet.address);
            
            // Check balance
            const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
            const balance = await provider.getBalance(wallet.address);
            console.log('💰 Current Balance:', ethers.formatEther(balance), 'tCORE');

            if (balance === 0n) {
                console.log('\n🚰 You need testnet tCORE! Visit:');
                console.log('🔗 https://scan.test2.btcs.network/faucet');
                console.log(`📍 Send testnet tCORE to: ${wallet.address}`);
            } else {
                console.log('✅ Wallet has sufficient balance for deployment');
            }
            
            return;
        } catch (error) {
            console.log('❌ Invalid private key, generating new one...');
        }
    }
    
    // Generate new wallet
    console.log('🎲 Generating new wallet...');
    const wallet = ethers.Wallet.createRandom();
    
    console.log('\n🔐 New Wallet Generated:');
    console.log('📍 Address:', wallet.address);
    console.log('🔑 Private Key:', wallet.privateKey);
    
    // Update .env file
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(/PRIVATE_KEY=.*/, `PRIVATE_KEY=${wallet.privateKey}`);
    fs.writeFileSync('.env', envContent);
    
    console.log('\n✅ Private key saved to .env file');
    console.log('\n🚰 Next steps:');
    console.log('1. Visit: https://scan.test2.btcs.network/faucet');
    console.log(`2. Send testnet tCORE to: ${wallet.address}`);
    console.log('3. Wait for confirmation (1-2 minutes)');
    console.log('4. Run: npm run deploy-all-core');
    
    console.log('\n⚠️  IMPORTANT: Keep your private key secure and never share it!');
}

setupWallet().catch(console.error);
