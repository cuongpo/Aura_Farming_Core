import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🚀 Deploying all contracts to Core testnet...');
    console.log('═══════════════════════════════════════════════');
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(balance), 'tCORE');
    
    if (balance < ethers.parseEther('0.01')) {
        console.log('⚠️ Warning: Low balance. You might need more tCORE for deployment.');
        console.log('💡 Get testnet tCORE from: https://scan.test2.btcs.network/faucet');
        console.log('');
    }

    const deployedContracts = {};

    try {
        // Deploy Mock USDT first
        console.log('\n💰 DEPLOYING MOCK USDT');
        console.log('═══════════════════════');
        
        const MockUSDT = await ethers.getContractFactory('MockUSDT');
        console.log('📝 Compiling Mock USDT contract...');
        
        const mockUSDT = await MockUSDT.deploy();
        console.log('⏳ Waiting for Mock USDT deployment...');
        await mockUSDT.waitForDeployment();
        
        const usdtAddress = await mockUSDT.getAddress();
        deployedContracts.mockUSDT = {
            address: usdtAddress,
            contract: mockUSDT
        };
        
        console.log('✅ Mock USDT deployed to:', usdtAddress);
        
        // Deploy AURA Token
        console.log('\n🪙 DEPLOYING AURA TOKEN');
        console.log('═══════════════════════');
        
        const AuraToken = await ethers.getContractFactory('AuraToken');
        console.log('📝 Compiling AURA Token contract...');

        // Token parameters
        const initialSupply = 1000000; // 1 million AURA tokens
        const owner = deployer.address;

        const auraToken = await AuraToken.deploy(initialSupply);
        
        console.log('⏳ Waiting for AURA Token deployment...');
        await auraToken.waitForDeployment();
        
        const auraAddress = await auraToken.getAddress();
        deployedContracts.auraToken = {
            address: auraAddress,
            contract: auraToken
        };
        
        console.log('✅ AURA Token deployed to:', auraAddress);
        
        // Verify all deployments
        console.log('\n🔍 VERIFYING DEPLOYMENTS');
        console.log('═══════════════════════');
        
        // Verify Mock USDT
        const usdtName = await mockUSDT.name();
        const usdtSymbol = await mockUSDT.symbol();
        const usdtDecimals = await mockUSDT.decimals();
        
        console.log('💰 Mock USDT:');
        console.log('  Name:', usdtName);
        console.log('  Symbol:', usdtSymbol);
        console.log('  Decimals:', usdtDecimals.toString());
        console.log('  Address:', usdtAddress);
        
        // Verify AURA Token
        const auraName = await auraToken.name();
        const auraSymbolResult = await auraToken.symbol();
        const auraDecimalsResult = await auraToken.decimals();
        const auraTotalSupply = await auraToken.totalSupply();
        
        console.log('🪙 AURA Token:');
        console.log('  Name:', auraName);
        console.log('  Symbol:', auraSymbolResult);
        console.log('  Decimals:', auraDecimalsResult.toString());
        console.log('  Total Supply:', ethers.formatUnits(auraTotalSupply, auraDecimalsResult), 'AURA');
        console.log('  Address:', auraAddress);
        
        // Save deployment info
        console.log('\n💾 SAVING DEPLOYMENT INFO');
        console.log('═══════════════════════');
        
        const deploymentInfo = {
            network: 'coreTestnet',
            chainId: 1114,
            deployerAddress: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                mockUSDT: {
                    name: 'MockUSDT',
                    address: usdtAddress,
                    deploymentHash: mockUSDT.deploymentTransaction()?.hash || 'pending',
                    tokenInfo: {
                        name: usdtName,
                        symbol: usdtSymbol,
                        decimals: Number(usdtDecimals)
                    }
                },
                auraToken: {
                    name: 'AuraToken',
                    address: auraAddress,
                    deploymentHash: auraToken.deploymentTransaction()?.hash || 'pending',
                    tokenInfo: {
                        name: auraName,
                        symbol: auraSymbolResult,
                        decimals: Number(auraDecimalsResult),
                        initialSupply: ethers.formatUnits(auraTotalSupply, auraDecimalsResult)
                    }
                }
            }
        };
        
        // Save to data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const deploymentFile = path.join(dataDir, 'core-deployment.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log('✅ Deployment info saved to:', deploymentFile);
        
        // Test basic functionality
        console.log('\n🧪 TESTING FUNCTIONALITY');
        console.log('═══════════════════════');
        
        try {
            // Test USDT mint
            console.log('🧪 Testing USDT mint...');
            const usdtMintAmount = ethers.parseUnits('1000', usdtDecimals); // 1000 USDT
            const usdtMintTx = await mockUSDT.mint(deployer.address, usdtMintAmount);
            await usdtMintTx.wait();
            
            const usdtBalance = await mockUSDT.balanceOf(deployer.address);
            console.log('✅ USDT mint successful. Balance:', ethers.formatUnits(usdtBalance, usdtDecimals), 'USDT');
            
            // Test AURA mint
            console.log('🧪 Testing AURA mint...');
            const auraMintAmount = ethers.parseUnits('10', auraDecimalsResult); // 10 AURA
            const auraMintTx = await auraToken.mintQuestReward(deployer.address, auraMintAmount, 'deployment-test');
            await auraMintTx.wait();
            
            const auraBalance = await auraToken.balanceOf(deployer.address);
            console.log('✅ AURA mint successful. Balance:', ethers.formatUnits(auraBalance, auraDecimalsResult), 'AURA');
            
        } catch (testError) {
            console.log('⚠️ Functionality test failed:', testError.message);
        }
        
        // Final summary
        console.log('\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════');
        console.log('📋 Contract Addresses:');
        console.log('  Mock USDT:', usdtAddress);
        console.log('  AURA Token:', auraAddress);
        console.log('');
        console.log('🌐 Network: Core Testnet (Chain ID: 1114)');
        console.log('🔍 Explorer: https://scan.test2.btcs.network/');
        console.log('');
        console.log('📝 Environment Variables:');
        console.log(`USDT_CONTRACT_ADDRESS=${usdtAddress}`);
        console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${auraAddress}`);
        console.log('');
        console.log('🔧 Next Steps:');
        console.log('1. Update your .env file with the contract addresses above');
        console.log('2. Update your bot configuration');
        console.log('3. Test the full application functionality');
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
