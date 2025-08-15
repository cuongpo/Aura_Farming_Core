import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🪙 Deploying AURA Token (Fast) to Core testnet...');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');

    try {
        console.log('\n📝 Step 1: Compiling Simple AURA Token contract...');
        
        // Get contract factory
        const SimpleAuraToken = await ethers.getContractFactory('SimpleAuraToken');
        
        // Token parameters
        const initialSupply = 10000; // Even smaller initial supply
        
        console.log('\n🚀 Step 2: Deploying Simple AURA Token with higher gas...');
        console.log('Initial Supply:', initialSupply.toLocaleString(), 'AURA');
        console.log('Owner:', deployer.address);
        
        // Get current gas price and increase it
        const feeData = await deployer.provider.getFeeData();
        const gasPrice = feeData.gasPrice * 2n; // Double the gas price
        
        console.log('💨 Using gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
        
        // Deploy contract with higher gas price
        const auraToken = await SimpleAuraToken.deploy(initialSupply, {
            gasLimit: 600000, // Lower gas limit
            gasPrice: gasPrice // Higher gas price
        });
        
        console.log('⏳ Waiting for deployment confirmation...');
        console.log('📝 Transaction hash:', auraToken.deploymentTransaction().hash);
        
        // Wait for deployment with timeout
        const deploymentReceipt = await Promise.race([
            auraToken.waitForDeployment(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Deployment timeout')), 60000)
            )
        ]);
        
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
            network: 'coreTestnet',
            contractName: 'SimpleAuraToken',
            contractAddress: contractAddress,
            deployerAddress: deployer.address,
            transactionHash: auraToken.deploymentTransaction().hash,
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
        
        const deploymentFile = path.join(dataDir, 'aura-deployment.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('✅ Deployment info saved to:', deploymentFile);
        
        // Update .env template
        console.log('\n📝 Step 5: Environment configuration...');
        console.log('🔥 Add this to your .env file:');
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
            const mintTx = await auraToken.mintQuestReward(deployer.address, testAmount, 'test', {
                gasPrice: gasPrice
            });
            await mintTx.wait();
            
            const newBalance = await auraToken.balanceOf(deployer.address);
            console.log('✅ Mint test successful. New balance:', ethers.formatUnits(newBalance, deployedDecimals), 'AURA');
            
        } catch (testError) {
            console.log('⚠️ Basic functionality test failed:', testError.message);
        }
        
        console.log('\n🎉 AURA Token deployment completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  Contract Address:', contractAddress);
        console.log('  Transaction Hash:', auraToken.deploymentTransaction().hash);
        console.log('  Network: Core Testnet');
        console.log('  Explorer: https://scan.test2.btcs.network/address/' + contractAddress);
        console.log('\n🔧 Next steps:');
        console.log('1. Add AURA_TOKEN_CONTRACT_ADDRESS to your .env file');
        console.log('2. Restart your bot to enable AURA rewards');
        console.log('3. Test quest functionality with real AURA tokens');
        console.log('4. Deploy your bot to production');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Solution: Get more testnet tCORE from the Core faucet:');
            console.log('   https://scan.test2.btcs.network/faucet');
        } else if (error.message.includes('underpriced')) {
            console.log('\n💡 Solution: Wait a few minutes and try again, or increase gas price further');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 The transaction might still be pending. Check the explorer:');
            console.log('   https://scan.test2.btcs.network/');
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
