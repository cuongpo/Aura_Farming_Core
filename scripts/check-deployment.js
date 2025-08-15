import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
    console.log('🔍 Checking AURA Token deployment status...');
    
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    
    // Transaction hash from the deployment
    const txHash = '0xcc1e755108470c4a63dcb3c1ff0842804ef5634e02a40fa73294a0b9d85340f9';
    
    try {
        console.log('📝 Transaction Hash:', txHash);
        console.log('🌐 Explorer:', `https://scan.test2.btcs.network/tx/${txHash}`);
        
        // Get transaction receipt
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (!receipt) {
            console.log('⏳ Transaction is still pending or not found');
            console.log('💡 Check the explorer link above for status');
            return;
        }
        
        if (receipt.status === 1) {
            console.log('✅ Transaction successful!');
            console.log('📦 Block Number:', receipt.blockNumber);
            console.log('⛽ Gas Used:', receipt.gasUsed.toString());
            
            // Get contract address
            const contractAddress = receipt.contractAddress;
            if (contractAddress) {
                console.log('🎉 Contract deployed to:', contractAddress);
                console.log('🌐 Contract Explorer:', `https://scan.test2.btcs.network/address/${contractAddress}`);
                
                // Test contract interaction
                const SimpleAuraToken = await ethers.getContractFactory('SimpleAuraToken');
                const auraToken = SimpleAuraToken.attach(contractAddress);
                
                try {
                    const name = await auraToken.name();
                    const symbol = await auraToken.symbol();
                    const totalSupply = await auraToken.totalSupply();
                    const decimals = await auraToken.decimals();
                    
                    console.log('\n✅ Contract verification:');
                    console.log('  Name:', name);
                    console.log('  Symbol:', symbol);
                    console.log('  Decimals:', decimals.toString());
                    console.log('  Total Supply:', ethers.formatUnits(totalSupply, decimals), 'AURA');
                    
                    console.log('\n🔧 Add this to your .env file:');
                    console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
                    
                } catch (contractError) {
                    console.log('⚠️ Contract deployed but verification failed:', contractError.message);
                    console.log('🔧 Add this to your .env file anyway:');
                    console.log(`AURA_TOKEN_CONTRACT_ADDRESS=${contractAddress}`);
                }
                
            } else {
                console.log('❌ No contract address found in receipt');
            }
            
        } else {
            console.log('❌ Transaction failed');
            console.log('📄 Receipt:', receipt);
        }
        
    } catch (error) {
        console.error('❌ Error checking deployment:', error);
        console.log('💡 The transaction might still be pending. Check the explorer:');
        console.log(`   https://scan.test2.btcs.network/tx/${txHash}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
