import AccountAbstractionService from '../src/services/AccountAbstractionService.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function debugWallets() {
    console.log('🔍 Debugging wallet generation...');
    
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const aaService = new AccountAbstractionService(
        provider,
        process.env.ENTRY_POINT_ADDRESS,
        process.env.SIMPLE_ACCOUNT_FACTORY_ADDRESS
    );

    // Test users
    const users = [
        { id: '1354543512', name: '@pmisme (Admin)' },
        { id: '1722410865', name: '@Jennie_1903' },
        { id: '123456789', name: 'Test User 1' },
        { id: '987654321', name: 'Test User 2' }
    ];

    console.log('\n📋 Wallet Generation Test:');
    console.log('=' .repeat(80));

    for (const user of users) {
        console.log(`\n👤 ${user.name} (ID: ${user.id})`);
        
        try {
            // Generate signer
            const signer = aaService.generateUserSigner(user.id);
            console.log(`   🔑 Signer Address: ${signer.address}`);
            
            // Generate salt
            const salt = aaService.generateSalt(user.id);
            console.log(`   🧂 Salt: ${salt.toString()}`);
            
            // Get full wallet info
            const walletInfo = await aaService.getUserWallet(user.id);
            console.log(`   💼 Smart Wallet: ${walletInfo.address}`);
            console.log(`   🏷️  Type: ${walletInfo.isSmartWallet ? 'Smart Contract' : 'EOA'}`);
            console.log(`   📊 Deployed: ${walletInfo.isDeployed}`);
            
            // Check if addresses are unique
            if (user.id !== users[0].id) {
                const firstUserWallet = await aaService.getUserWallet(users[0].id);
                const isUnique = walletInfo.address !== firstUserWallet.address;
                console.log(`   ✅ Unique from ${users[0].name}: ${isUnique ? 'YES' : 'NO ❌'}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\n🔍 Checking for duplicates...');
    const addresses = [];
    const signerAddresses = [];
    
    for (const user of users) {
        try {
            const walletInfo = await aaService.getUserWallet(user.id);
            addresses.push({ user: user.name, address: walletInfo.address });
            signerAddresses.push({ user: user.name, address: walletInfo.signerAddress });
        } catch (error) {
            console.log(`❌ Error for ${user.name}: ${error.message}`);
        }
    }
    
    console.log('\n📊 Smart Contract Addresses:');
    addresses.forEach(item => {
        const duplicates = addresses.filter(a => a.address === item.address);
        const isDuplicate = duplicates.length > 1;
        console.log(`   ${isDuplicate ? '❌' : '✅'} ${item.user}: ${item.address}`);
    });
    
    console.log('\n📊 Signer Addresses:');
    signerAddresses.forEach(item => {
        const duplicates = signerAddresses.filter(a => a.address === item.address);
        const isDuplicate = duplicates.length > 1;
        console.log(`   ${isDuplicate ? '❌' : '✅'} ${item.user}: ${item.address}`);
    });
    
    // Check if the issue is in the factory calculation
    console.log('\n🏭 Factory Contract Test:');
    if (aaService.factoryContract) {
        console.log('✅ Factory contract is available');
        
        // Test with different owners and salts
        const testOwner1 = '0x1234567890123456789012345678901234567890';
        const testOwner2 = '0x0987654321098765432109876543210987654321';
        const testSalt1 = 12345;
        const testSalt2 = 67890;
        
        try {
            const addr1 = await aaService.factoryContract.getAddress(testOwner1, testSalt1);
            const addr2 = await aaService.factoryContract.getAddress(testOwner2, testSalt2);
            const addr3 = await aaService.factoryContract.getAddress(testOwner1, testSalt2); // Same owner, different salt
            
            console.log(`   Test 1 (Owner1, Salt1): ${addr1}`);
            console.log(`   Test 2 (Owner2, Salt2): ${addr2}`);
            console.log(`   Test 3 (Owner1, Salt2): ${addr3}`);
            console.log(`   ✅ All different: ${addr1 !== addr2 && addr2 !== addr3 && addr1 !== addr3}`);
        } catch (error) {
            console.log(`   ❌ Factory test error: ${error.message}`);
        }
    } else {
        console.log('❌ Factory contract not available');
    }
}

debugWallets().catch(console.error);
