import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log('🔍 Checking all AURA Token deployment transactions...');
    
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    
    // All transaction hashes from deployment attempts
    const transactions = [
        {
            name: 'First AURA deployment',
            hash: '0xcc1e755108470c4a63dcb3c1ff0842804ef5634e02a40fa73294a0b9d85340f9'
        },
        {
            name: 'Minimal AURA deployment',
            hash: '0x7ae4d3eef862694abf97c158ea5d97b451de04879c0f7ce71a398be88e8150a5'
        },
        {
            name: 'OpenZeppelin AURA deployment',
            hash: '0xbc4edebe2834dafc483bfc6f2d0667c1797366b65e1164a08fbcc4dee85fe6f5'
        }
    ];
    
    console.log('\n📋 Checking transaction status...\n');
    
    let successfulDeployment = null;
    
    for (const tx of transactions) {
        console.log(`🔍 ${tx.name}:`);
        console.log(`   Hash: ${tx.hash}`);
        console.log(`   Explorer: https://scan.test2.btcs.network/tx/${tx.hash}`);
        
        try {
            const receipt = await provider.getTransactionReceipt(tx.hash);
            
            if (!receipt) {
                console.log('   Status: ⏳ Pending or not found\n');
                continue;
            }
            
            if (receipt.status === 1) {
                console.log('   Status: ✅ Success');
                console.log(`   Block: ${receipt.blockNumber}`);
                console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
                
                if (receipt.contractAddress) {
                    console.log(`   Contract: ${receipt.contractAddress}`);
                    console.log(`   Contract Explorer: https://scan.test2.btcs.network/address/${receipt.contractAddress}`);
                    
                    successfulDeployment = {
                        name: tx.name,
                        address: receipt.contractAddress,
                        hash: tx.hash
                    };
                }
                console.log('');
            } else {
                console.log('   Status: ❌ Failed\n');
            }
            
        } catch (error) {
            console.log(`   Status: ❌ Error checking: ${error.message}\n`);
        }
    }
    
    if (successfulDeployment) {
        console.log('🎉 Found successful deployment!');
        console.log(`   Name: ${successfulDeployment.name}`);
        console.log(`   Address: ${successfulDeployment.address}`);
        console.log(`   Transaction: ${successfulDeployment.hash}`);
        
        console.log('\n🔧 Add this to your .env file:');
        console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${successfulDeployment.address}`);
        
        // Try to verify the contract
        console.log('\n🧪 Testing contract interaction...');
        try {
            // Try different contract types
            const contractTypes = ['AuraTokenSimple', 'MinimalAuraToken', 'SimpleAuraToken'];
            
            for (const contractType of contractTypes) {
                try {
                    const ContractFactory = await ethers.getContractFactory(contractType);
                    const contract = ContractFactory.attach(successfulDeployment.address);
                    
                    const name = await contract.name();
                    const symbol = await contract.symbol();
                    const totalSupply = await contract.totalSupply();
                    
                    console.log('✅ Contract verified successfully!');
                    console.log(`   Type: ${contractType}`);
                    console.log(`   Name: ${name}`);
                    console.log(`   Symbol: ${symbol}`);
                    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 18)} AURA`);
                    break;
                    
                } catch (contractError) {
                    // Try next contract type
                    continue;
                }
            }
        } catch (verifyError) {
            console.log('⚠️ Contract verification failed, but deployment was successful');
            console.log('   You can still use the contract address above');
        }
        
    } else {
        console.log('⏳ No successful deployments found yet.');
        console.log('💡 Transactions might still be pending. Check the explorer links above.');
        console.log('\n🔄 You can also try deploying again with:');
        console.log('   npm run deploy-aura-simple');
    }
    
    console.log('\n📊 Current account status:');
    const [deployer] = await ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`   Address: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} tCORE`);

    if (balance < ethers.parseEther('0.001')) {
        console.log('\n💡 Low balance detected. Get more tCORE from:');
        console.log('   https://scan.test2.btcs.network/faucet');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
