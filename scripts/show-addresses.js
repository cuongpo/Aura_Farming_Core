import AccountAbstractionService from '../src/services/AccountAbstractionService.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function showAddresses() {
    console.log('📋 User Wallet Addresses for Testing Transfers');
    console.log('=' .repeat(60));
    
    const provider = new ethers.JsonRpcProvider(process.env.LISK_TESTNET_RPC_URL);
    const aaService = new AccountAbstractionService(
        provider,
        process.env.ENTRY_POINT_ADDRESS,
        process.env.SIMPLE_ACCOUNT_FACTORY_ADDRESS
    );

    // Known users
    const users = [
        { id: '1354543512', name: '@pmisme (Admin)' },
        { id: '1722410865', name: '@Jennie_1903' }
    ];

    console.log('\n🔗 Copy these addresses for testing transfers:\n');

    for (const user of users) {
        try {
            const walletInfo = await aaService.getUserWallet(user.id);
            
            // Get balances
            const ethBalance = await aaService.getWalletBalance(walletInfo.signerAddress);
            const usdtBalance = await aaService.getWalletBalance(
                walletInfo.signerAddress, 
                process.env.MOCK_USDT_CONTRACT_ADDRESS
            );
            
            console.log(`👤 ${user.name}`);
            console.log(`   Address: ${walletInfo.signerAddress}`);
            console.log(`   ETH: ${ethBalance} ETH`);
            console.log(`   mUSDT: ${usdtBalance} mUSDT`);
            console.log('');
            
        } catch (error) {
            console.log(`❌ Error for ${user.name}: ${error.message}`);
        }
    }
    
    console.log('📝 Transfer Command Examples:');
    console.log('');
    console.log('ETH Transfer:');
    console.log(`/transfer_eth ${users[1] ? '0xC8313Ed310456F11cd1cb79160F732ccb70772B4' : 'WALLET_ADDRESS'} 0.0001 Test message`);
    console.log('');
    console.log('mUSDT Transfer:');
    console.log(`/transfer_usdt ${users[0] ? '0x4E178e6a3aa2b4F9e9b462a6798e4d59B610202D' : 'WALLET_ADDRESS'} 50 Thanks for testing!`);
    console.log('');
    console.log('💡 Tips:');
    console.log('• Use /wallet command in bot to see your own address');
    console.log('• Copy the full address (0x...) for transfers');
    console.log('• You can transfer to any valid Ethereum address');
    console.log('• Transfers work between bot users and external wallets');
}

showAddresses().catch(console.error);
