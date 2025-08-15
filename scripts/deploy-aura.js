import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🪙 Deploying AURA Token to Core testnet...');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance < ethers.parseEther('0.001')) {
        console.log('⚠️ Warning: Low balance. You might need more ETH for deployment.');
    }

    try {
        console.log('\n📝 Step 1: Compiling AURA Token contract...');
        
        // Get contract factory
        const AuraToken = await ethers.getContractFactory('AuraToken');
        
        // Token parameters
        const tokenName = 'Aura Token';
        const tokenSymbol = 'AURA';
        const decimals = 18;
        const initialSupply = 1000000; // 1 million AURA tokens
        const owner = deployer.address;
        
        console.log('\n🚀 Step 2: Deploying AURA Token...');
        console.log('Token Name:', tokenName);
        console.log('Token Symbol:', tokenSymbol);
        console.log('Decimals:', decimals);
        console.log('Initial Supply:', initialSupply.toLocaleString(), 'AURA');
        console.log('Owner:', owner);
        
        // Deploy contract
        const auraToken = await AuraToken.deploy(
            tokenName,
            tokenSymbol,
            decimals,
            initialSupply,
            owner
        );
        
        console.log('⏳ Waiting for deployment confirmation...');
        await auraToken.waitForDeployment();
        
        const contractAddress = await auraToken.getAddress();
        console.log('✅ AURA Token deployed to:', contractAddress);
        
        // Verify deployment
        console.log('\n🔍 Step 3: Verifying deployment...');
        
        const deployedName = await auraToken.name();
        const deployedSymbol = await auraToken.symbol();
        const deployedDecimals = await auraToken.decimals();
        const deployedTotalSupply = await auraToken.totalSupply();
        const deployedOwner = await auraToken.owner();
        
        console.log('✅ Contract verification:');
        console.log('  Name:', deployedName);
        console.log('  Symbol:', deployedSymbol);
        console.log('  Decimals:', deployedDecimals.toString());
        console.log('  Total Supply:', ethers.formatUnits(deployedTotalSupply, deployedDecimals), 'AURA');
        console.log('  Owner:', deployedOwner);
        
        // Save deployment info
        console.log('\n💾 Step 4: Saving deployment information...');
        
        const deploymentInfo = {
            network: 'coreTestnet',
            contractName: 'AuraToken',
            contractAddress: contractAddress,
            deployerAddress: deployer.address,
            deploymentBlock: auraToken.deploymentTransaction()?.blockNumber || 'pending',
            deploymentHash: auraToken.deploymentTransaction()?.hash || 'pending',
            tokenInfo: {
                name: deployedName,
                symbol: deployedSymbol,
                decimals: Number(deployedDecimals),
                initialSupply: ethers.formatUnits(deployedTotalSupply, deployedDecimals)
            },
            timestamp: new Date().toISOString(),
            gasUsed: 'pending'
        };
        
        // Save to data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const deploymentFile = path.join(dataDir, 'aura-deployment.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('✅ Deployment info saved to:', deploymentFile);
        
        // Update .env template
        console.log('\n📝 Step 5: Environment configuration...');
        console.log('Add this to your .env file:');
        console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
        
        // Test basic functionality
        console.log('\n🧪 Step 6: Testing basic functionality...');
        
        try {
            // Test balance check
            const ownerBalance = await auraToken.balanceOf(owner);
            console.log('✅ Owner balance:', ethers.formatUnits(ownerBalance, decimals), 'AURA');
            
            // Test mint function (small amount)
            console.log('🧪 Testing mint function...');
            const testAmount = ethers.parseUnits('1', decimals); // 1 AURA
            const mintTx = await auraToken.mintQuestReward(owner, testAmount, 'test');
            await mintTx.wait();
            
            const newBalance = await auraToken.balanceOf(owner);
            console.log('✅ Mint test successful. New balance:', ethers.formatUnits(newBalance, decimals), 'AURA');
            
        } catch (testError) {
            console.log('⚠️ Basic functionality test failed:', testError.message);
        }
        
        console.log('\n🎉 AURA Token deployment completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  Contract Address:', contractAddress);
        console.log('  Network: Core Testnet');
        console.log('  Explorer: https://scan.test2.btcs.network/address/' + contractAddress);
        console.log('\n🔧 Next steps:');
        console.log('1. Add AURA_TOKEN_CONTRACT_ADDRESS to your .env file');
        console.log('2. Update your bot configuration');
        console.log('3. Test quest functionality');
        console.log('4. Deploy your bot to production');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Solution: Get more testnet tCORE from the Core faucet:');
            console.log('   https://scan.test2.btcs.network/faucet');
        }
        
        process.exit(1);
    }
}

// Handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment script failed:', error);
        process.exit(1);
    });
