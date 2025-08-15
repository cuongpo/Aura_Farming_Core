import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function waitForETH() {
    if (!process.env.PRIVATE_KEY) {
        console.log('❌ No private key found. Run: npm run setup-wallet');
        return;
    }
    
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('⏳ Waiting for testnet tCORE...');
    console.log('📍 Watching address:', wallet.address);
    console.log('🔗 Faucet: https://scan.test2.btcs.network/faucet');
    console.log('⏹️  Press Ctrl+C to stop\n');
    
    let lastBalance = 0n;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    while (attempts < maxAttempts) {
        try {
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.formatEther(balance);
            
            if (balance > lastBalance) {
                console.log(`💰 Balance updated: ${balanceEth} ETH`);
                
                if (balance > 0n) {
                    console.log('\n🎉 ETH received!');
                    console.log(`💰 Current balance: ${balanceEth} ETH`);
                    
                    if (parseFloat(balanceEth) >= 0.01) {
                        console.log('✅ Sufficient balance for deployment!');
                        console.log('🚀 Ready to deploy contracts!');
                        console.log('\n📋 Next steps:');
                        console.log('1. Run: npm run deploy-aa');
                        console.log('2. Wait for deployment to complete');
                        console.log('3. Restart bot: npm start');
                        return;
                    } else {
                        console.log('⚠️  Low balance. You might need more ETH for deployment.');
                    }
                }
                
                lastBalance = balance;
            } else if (attempts % 10 === 0) {
                console.log(`⏳ Still waiting... (${attempts}/60) - Balance: ${balanceEth} ETH`);
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
        } catch (error) {
            console.error('❌ Error checking balance:', error.message);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('\n⏰ Timeout reached. Please check the faucet manually.');
    console.log('🔗 Faucet: https://scan.test2.btcs.network/faucet');
    console.log('📍 Address:', wallet.address);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Stopping ETH monitor...');
    process.exit(0);
});

waitForETH();
