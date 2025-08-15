import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function fundSigner() {
    console.log('⛽ Funding signer address with ETH for gas fees...');
    
    if (!process.env.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not found in .env file');
        return;
    }
    
    // Setup provider and deployer wallet (has ETH)
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const deployerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Target signer address (from command line or default admin)
    const args = process.argv.slice(2);
    const targetAddress = args[0] || '0x4E178e6a3aa2b4F9e9b462a6798e4d59B610202D'; // Admin signer
    const amount = args[1] || '0.002'; // Default 0.002 ETH
    
    console.log('📍 Deployer address:', deployerWallet.address);
    console.log('🎯 Target address:', targetAddress);
    console.log('💰 Amount to send:', amount, 'ETH');
    
    // Check deployer balance
    const deployerBalance = await provider.getBalance(deployerWallet.address);
    console.log('💰 Deployer balance:', ethers.formatEther(deployerBalance), 'ETH');
    
    if (deployerBalance === 0n) {
        throw new Error('❌ Deployer has no ETH balance');
    }
    
    const amountWei = ethers.parseEther(amount);
    if (deployerBalance < amountWei) {
        throw new Error(`❌ Insufficient balance. Has: ${ethers.formatEther(deployerBalance)} ETH, Needs: ${amount} ETH`);
    }
    
    // Check target current balance
    const targetBalance = await provider.getBalance(targetAddress);
    console.log('🎯 Target current balance:', ethers.formatEther(targetBalance), 'ETH');
    
    try {
        console.log('\n⏳ Sending ETH...');
        const tx = await deployerWallet.sendTransaction({
            to: targetAddress,
            value: amountWei
        });
        
        console.log('📝 Transaction hash:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log('⛽ Gas used:', receipt.gasUsed.toString());
        
        // Check new balance
        const newBalance = await provider.getBalance(targetAddress);
        console.log('\n💰 New balance:', ethers.formatEther(newBalance), 'ETH');
        
        console.log('\n🎉 Funding completed successfully!');
        console.log('🔗 View on explorer: https://sepolia-blockscout.lisk.com/tx/' + tx.hash);
        
        return {
            success: true,
            txHash: tx.hash,
            newBalance: ethers.formatEther(newBalance)
        };
        
    } catch (error) {
        console.error('❌ Funding failed:', error.message);
        throw error;
    }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
    fundSigner().catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

export default fundSigner;
