import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log('🪙 Deploying AURA Token (OpenZeppelin) to Core testnet...');
    
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');

    try {
        console.log('\n🚀 Deploying AuraTokenSimple...');
        
        const AuraTokenSimple = await ethers.getContractFactory('AuraTokenSimple');
        
        // Deploy with 10,000 AURA initial supply
        const initialSupply = 10000;
        console.log('📊 Initial Supply:', initialSupply.toLocaleString(), 'AURA');
        
        const auraToken = await AuraTokenSimple.deploy(initialSupply);
        
        console.log('⏳ Waiting for deployment...');
        console.log('📝 Transaction hash:', auraToken.deploymentTransaction().hash);
        
        await auraToken.waitForDeployment();
        
        const contractAddress = await auraToken.getAddress();
        console.log('✅ AURA Token deployed successfully!');
        console.log('📍 Contract Address:', contractAddress);
        
        // Verify deployment
        console.log('\n🔍 Verifying deployment...');
        const name = await auraToken.name();
        const symbol = await auraToken.symbol();
        const decimals = await auraToken.decimals();
        const totalSupply = await auraToken.totalSupply();
        const owner = await auraToken.owner();
        
        console.log('✅ Contract Details:');
        console.log('  Name:', name);
        console.log('  Symbol:', symbol);
        console.log('  Decimals:', decimals.toString());
        console.log('  Total Supply:', ethers.formatUnits(totalSupply, decimals), 'AURA');
        console.log('  Owner:', owner);
        
        // Test mint function
        console.log('\n🧪 Testing mint function...');
        try {
            const testAmount = ethers.parseUnits('1', decimals);
            const mintTx = await auraToken.mintQuestReward(deployer.address, testAmount, 'test');
            await mintTx.wait();
            
            const newBalance = await auraToken.balanceOf(deployer.address);
            console.log('✅ Mint test successful!');
            console.log('  New balance:', ethers.formatUnits(newBalance, decimals), 'AURA');
        } catch (mintError) {
            console.log('⚠️ Mint test failed:', mintError.message);
        }
        
        console.log('\n🎉 Deployment completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  Contract Address:', contractAddress);
        console.log('  Transaction Hash:', auraToken.deploymentTransaction().hash);
        console.log('  Network: Core Testnet');
        console.log('  Explorer: https://scan.test2.btcs.network/address/' + contractAddress);
        
        console.log('\n🔧 Next Steps:');
        console.log('1. Add this to your .env file:');
        console.log(`   AURA_TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
        console.log('2. Restart your bot to enable AURA rewards');
        console.log('3. Test quest functionality');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Get more testnet tCORE from: https://scan.test2.btcs.network/faucet');
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
