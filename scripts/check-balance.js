import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkBalance() {
    if (!process.env.PRIVATE_KEY) {
        console.log('❌ No private key found. Run: npm run setup-wallet');
        return;
    }
    
    try {
        const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('📍 Wallet Address:', wallet.address);
        
        const balance = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balance);
        
        console.log('💰 Current Balance:', balanceEth, 'tCORE');

        if (balance === 0n) {
            console.log('❌ No tCORE found. Please request from faucet:');
            console.log('🔗 https://scan.test2.btcs.network/faucet');
        } else if (parseFloat(balanceEth) < 0.01) {
            console.log('⚠️  Low balance. You might need more tCORE for contract deployment.');
        } else {
            console.log('✅ Sufficient balance for contract deployment!');
            console.log('🚀 Ready to deploy! Run: npm run deploy-all-core');
        }
        
    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
    }
}

checkBalance();
