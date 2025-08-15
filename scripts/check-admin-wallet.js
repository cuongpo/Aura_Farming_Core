import AccountAbstractionService from '../src/services/AccountAbstractionService.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkAdminWallet() {
    console.log('👑 Checking admin wallet addresses...');
    
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const aaService = new AccountAbstractionService(
        provider,
        process.env.ENTRY_POINT_ADDRESS,
        process.env.SIMPLE_ACCOUNT_FACTORY_ADDRESS
    );

    // Admin user ID from env
    const adminUserId = process.env.ADMIN_USER_IDS.split(',')[0];
    console.log('👤 Admin User ID:', adminUserId);

    // Get admin wallet info
    const adminWallet = await aaService.getUserWallet(adminUserId);
    
    console.log('\n📋 Admin Wallet Info:');
    console.log('🔐 Smart Contract Address:', adminWallet.address);
    console.log('🔑 Signer Address:', adminWallet.signerAddress);
    console.log('🏷️  Type:', adminWallet.isSmartWallet ? 'Smart Contract' : 'EOA');
    console.log('📊 Deployed:', adminWallet.isDeployed);
    
    // Check balances
    console.log('\n💰 Balances:');
    
    // ETH balances
    const scEthBalance = await aaService.getWalletBalance(adminWallet.address);
    const signerEthBalance = await aaService.getWalletBalance(adminWallet.signerAddress);
    console.log('⚡ Smart Contract ETH:', scEthBalance, 'ETH');
    console.log('⚡ Signer ETH:', signerEthBalance, 'ETH');
    
    // Token balances
    if (process.env.MOCK_USDT_CONTRACT_ADDRESS) {
        const scTokenBalance = await aaService.getWalletBalance(adminWallet.address, process.env.MOCK_USDT_CONTRACT_ADDRESS);
        const signerTokenBalance = await aaService.getWalletBalance(adminWallet.signerAddress, process.env.MOCK_USDT_CONTRACT_ADDRESS);
        console.log('🪙 Smart Contract mUSDT:', scTokenBalance, 'mUSDT');
        console.log('🪙 Signer mUSDT:', signerTokenBalance, 'mUSDT');
        
        if (parseFloat(scTokenBalance) > 0 && parseFloat(signerTokenBalance) === 0) {
            console.log('\n⚠️  Tokens are in smart contract address but transfers use signer address!');
            console.log('💡 Need to transfer tokens from smart contract to signer address');
            console.log(`📝 Transfer ${scTokenBalance} mUSDT from ${adminWallet.address} to ${adminWallet.signerAddress}`);
        }
    }
    
    console.log('\n🔧 For tipping to work:');
    console.log('1. Tokens should be in signer address:', adminWallet.signerAddress);
    console.log('2. Or update transfer logic to use smart contract wallets properly');
}

checkAdminWallet().catch(console.error);
