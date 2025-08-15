import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function fundUsers() {
    console.log('⛽ Funding users with tCORE for transfers...');
    
    if (!process.env.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not found in .env file');
        return;
    }
    
    // Setup provider and deployer wallet (has ETH)
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const deployerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // User addresses to fund
    const users = [
        { name: '@pmisme (Admin)', address: '0x4E178e6a3aa2b4F9e9b462a6798e4d59B610202D' },
        { name: '@Jennie_1903', address: '0xC8313Ed310456F11cd1cb79160F732ccb70772B4' }
    ];
    
    const amountPerUser = '0.002'; // 0.002 ETH per user
    
    console.log('📍 Deployer address:', deployerWallet.address);
    console.log('💰 Amount per user:', amountPerUser, 'ETH');
    
    // Check deployer balance
    const deployerBalance = await provider.getBalance(deployerWallet.address);
    console.log('💰 Deployer balance:', ethers.formatEther(deployerBalance), 'ETH');
    
    const totalNeeded = ethers.parseEther((parseFloat(amountPerUser) * users.length).toString());
    if (deployerBalance < totalNeeded) {
        console.log(`⚠️  Warning: Might not have enough ETH for all users`);
    }
    
    console.log('\n🚀 Starting funding process...');
    
    for (const user of users) {
        try {
            console.log(`\n👤 Funding ${user.name}...`);
            console.log(`   Address: ${user.address}`);
            
            // Check current balance
            const currentBalance = await provider.getBalance(user.address);
            console.log(`   Current balance: ${ethers.formatEther(currentBalance)} ETH`);
            
            // Send ETH
            const tx = await deployerWallet.sendTransaction({
                to: user.address,
                value: ethers.parseEther(amountPerUser)
            });
            
            console.log(`   📝 Transaction: ${tx.hash}`);
            console.log(`   ⏳ Waiting for confirmation...`);
            
            const receipt = await tx.wait();
            console.log(`   ✅ Confirmed! Gas used: ${receipt.gasUsed.toString()}`);
            
            // Check new balance
            const newBalance = await provider.getBalance(user.address);
            console.log(`   💰 New balance: ${ethers.formatEther(newBalance)} ETH`);
            
        } catch (error) {
            console.log(`   ❌ Failed to fund ${user.name}: ${error.message}`);
        }
    }
    
    console.log('\n🎉 Funding process completed!');
    console.log('\n📋 Users can now use:');
    console.log('   /transfer_eth @username 0.001 - Send ETH to other users');
    console.log('   /transfer_usdt @username 50 - Send mUSDT to other users');
}

fundUsers().catch(console.error);
