import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🪙 Deploying Simple AURA Token to Core testnet...');
    
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
        console.log('\n📝 Step 1: Compiling Simple AURA Token contract...');
        
        // Get contract factory
        const SimpleAuraToken = await ethers.getContractFactory('SimpleAuraToken');
        
        // Token parameters
        const initialSupply = 100000; // 100k AURA tokens (lower initial supply)
        
        console.log('\n🚀 Step 2: Deploying Simple AURA Token...');
        console.log('Initial Supply:', initialSupply.toLocaleString(), 'AURA');
        console.log('Owner:', deployer.address);
        
        // Deploy contract with lower gas limit
        const auraToken = await SimpleAuraToken.deploy(initialSupply, {
            gasLimit: 800000 // Set explicit gas limit
        });
        
        console.log('⏳ Waiting for deployment confirmation...');
        await auraToken.waitForDeployment();
        
        const contractAddress = await auraToken.getAddress();
        console.log('✅ Simple AURA Token deployed to:', contractAddress);
        
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
            network: 'liskTestnet',
            contractName: 'SimpleAuraToken',
            contractAddress: contractAddress,
            deployerAddress: deployer.address,
            tokenInfo: {
                name: deployedName,
                symbol: deployedSymbol,
                decimals: Number(deployedDecimals),
                initialSupply: ethers.formatUnits(deployedTotalSupply, deployedDecimals)
            },
            timestamp: new Date().toISOString()
        };
        
        // Save to data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const deploymentFile = path.join(dataDir, 'simple-aura-deployment.json');
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
            const ownerBalance = await auraToken.balanceOf(deployer.address);
            console.log('✅ Owner balance:', ethers.formatUnits(ownerBalance, deployedDecimals), 'AURA');
            
            // Test mint function (small amount)
            console.log('🧪 Testing mint function...');
            const testAmount = ethers.parseUnits('1', deployedDecimals); // 1 AURA
            const mintTx = await auraToken.mintQuestReward(deployer.address, testAmount, 'test');
            await mintTx.wait();
            
            const newBalance = await auraToken.balanceOf(deployer.address);
            console.log('✅ Mint test successful. New balance:', ethers.formatUnits(newBalance, deployedDecimals), 'AURA');
            
        } catch (testError) {
            console.log('⚠️ Basic functionality test failed:', testError.message);
        }
        
        console.log('\n🎉 Simple AURA Token deployment completed successfully!');
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
