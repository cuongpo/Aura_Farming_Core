import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('💰 Deploying Mock USDT to Core testnet...');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'tCORE');
    
    if (balance < ethers.parseEther('0.001')) {
        console.log('⚠️ Warning: Low balance. You might need more tCORE for deployment.');
        console.log('💡 Get testnet tCORE from: https://scan.test2.btcs.network/faucet');
    }

    try {
        console.log('\n📝 Step 1: Compiling Mock USDT contract...');
        
        // Get contract factory
        const MockUSDT = await ethers.getContractFactory('MockUSDT');
        
        console.log('\n🚀 Step 2: Deploying Mock USDT...');
        
        // Deploy contract
        const mockUSDT = await MockUSDT.deploy();
        
        console.log('⏳ Waiting for deployment confirmation...');
        await mockUSDT.waitForDeployment();
        
        const contractAddress = await mockUSDT.getAddress();
        console.log('✅ Mock USDT deployed to:', contractAddress);
        
        // Verify deployment
        console.log('\n🔍 Step 3: Verifying deployment...');
        
        const deployedName = await mockUSDT.name();
        const deployedSymbol = await mockUSDT.symbol();
        const deployedDecimals = await mockUSDT.decimals();
        const deployedTotalSupply = await mockUSDT.totalSupply();
        const deployedOwner = await mockUSDT.owner();
        
        console.log('✅ Contract verification:');
        console.log('  Name:', deployedName);
        console.log('  Symbol:', deployedSymbol);
        console.log('  Decimals:', deployedDecimals.toString());
        console.log('  Total Supply:', ethers.formatUnits(deployedTotalSupply, deployedDecimals), 'USDT');
        console.log('  Owner:', deployedOwner);
        
        // Save deployment info
        console.log('\n💾 Step 4: Saving deployment information...');
        
        const deploymentInfo = {
            network: 'coreTestnet',
            contractName: 'MockUSDT',
            contractAddress: contractAddress,
            deployerAddress: deployer.address,
            deploymentBlock: mockUSDT.deploymentTransaction()?.blockNumber || 'pending',
            deploymentHash: mockUSDT.deploymentTransaction()?.hash || 'pending',
            tokenInfo: {
                name: deployedName,
                symbol: deployedSymbol,
                decimals: Number(deployedDecimals),
                totalSupply: ethers.formatUnits(deployedTotalSupply, deployedDecimals)
            },
            timestamp: new Date().toISOString(),
            gasUsed: 'pending'
        };
        
        // Save to data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const deploymentFile = path.join(dataDir, 'usdt-deployment-core.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('✅ Deployment info saved to:', deploymentFile);
        
        // Update .env template
        console.log('\n📝 Step 5: Environment configuration...');
        console.log('Add this to your .env file:');
        console.log(`USDT_CONTRACT_ADDRESS=${contractAddress}`);
        
        // Test basic functionality
        console.log('\n🧪 Step 6: Testing basic functionality...');
        
        try {
            // Test balance check
            const ownerBalance = await mockUSDT.balanceOf(deployer.address);
            console.log('✅ Owner balance:', ethers.formatUnits(ownerBalance, deployedDecimals), 'USDT');
            
            // Test mint function (small amount)
            console.log('🧪 Testing mint function...');
            const testAmount = ethers.parseUnits('100', deployedDecimals); // 100 USDT
            const mintTx = await mockUSDT.mint(deployer.address, testAmount);
            await mintTx.wait();
            
            const newBalance = await mockUSDT.balanceOf(deployer.address);
            console.log('✅ Mint test successful. New balance:', ethers.formatUnits(newBalance, deployedDecimals), 'USDT');
            
        } catch (testError) {
            console.log('⚠️ Basic functionality test failed:', testError.message);
        }
        
        console.log('\n🎉 Mock USDT deployment completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  Contract Address:', contractAddress);
        console.log('  Network: Core Testnet');
        console.log('  Chain ID: 1114');
        console.log('  Explorer: https://scan.test2.btcs.network/address/' + contractAddress);
        console.log('\n🔧 Next steps:');
        console.log('1. Add USDT_CONTRACT_ADDRESS to your .env file');
        console.log('2. Update your bot configuration');
        console.log('3. Test token functionality');
        
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
