import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log('🪙 Deploying Minimal AURA Token to Lisk testnet...');
    
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');

    try {
        const MinimalAuraToken = await ethers.getContractFactory('MinimalAuraToken');
        
        console.log('🚀 Deploying Minimal AURA Token...');
        
        // Deploy with very low gas limit
        const auraToken = await MinimalAuraToken.deploy({
            gasLimit: 400000
        });
        
        console.log('⏳ Waiting for deployment...');
        console.log('📝 Transaction hash:', auraToken.deploymentTransaction().hash);
        
        await auraToken.waitForDeployment();
        
        const contractAddress = await auraToken.getAddress();
        console.log('✅ Minimal AURA Token deployed to:', contractAddress);
        
        // Quick verification
        const name = await auraToken.name();
        const symbol = await auraToken.symbol();
        const totalSupply = await auraToken.totalSupply();
        
        console.log('✅ Contract verification:');
        console.log('  Name:', name);
        console.log('  Symbol:', symbol);
        console.log('  Total Supply:', ethers.formatUnits(totalSupply, 18), 'AURA');
        
        console.log('\n🔧 Add this to your .env file:');
        console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
        
        console.log('\n🌐 Explorer:');
        console.log(`https://scan.test2.btcs.network/address/${contractAddress}`);
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
