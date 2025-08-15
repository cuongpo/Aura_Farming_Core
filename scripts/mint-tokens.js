import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function mintTokens() {
    console.log('🪙 Minting MockUSDT tokens...');
    
    if (!process.env.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not found in .env file');
        return;
    }
    
    if (!process.env.MOCK_USDT_CONTRACT_ADDRESS) {
        console.error('❌ MOCK_USDT_CONTRACT_ADDRESS not found in .env file');
        return;
    }
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.CORE_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('📍 Minter address:', wallet.address);
    console.log('🏭 MockUSDT contract:', process.env.MOCK_USDT_CONTRACT_ADDRESS);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Minter ETH balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
        throw new Error('❌ Minter has no ETH balance for gas fees');
    }
    
    // MockUSDT contract ABI
    const mockUSDTABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function mint(address to, uint256 value) returns (bool)",
        "function owner() view returns (address)"
    ];
    
    // Create contract instance
    const mockUSDT = new ethers.Contract(
        process.env.MOCK_USDT_CONTRACT_ADDRESS,
        mockUSDTABI,
        wallet
    );
    
    try {
        // Get contract info
        const name = await mockUSDT.name();
        const symbol = await mockUSDT.symbol();
        const decimals = await mockUSDT.decimals();
        const owner = await mockUSDT.owner();
        
        console.log('\n📋 Contract Info:');
        console.log('   Name:', name);
        console.log('   Symbol:', symbol);
        console.log('   Decimals:', decimals);
        console.log('   Owner:', owner);
        
        // Check if wallet is owner
        if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
            throw new Error(`❌ Only contract owner can mint. Owner: ${owner}, Your address: ${wallet.address}`);
        }
        
        // Parse command line arguments
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.log('\n📝 Usage: npm run mint-tokens <recipient_address> <amount>');
            console.log('📝 Example: npm run mint-tokens 0x7e698e6C153343C80b6e20c84e35Dd638f5BA9d0 100000');
            return;
        }
        
        const recipientAddress = args[0];
        const amount = args[1];
        
        // Validate recipient address
        if (!ethers.isAddress(recipientAddress)) {
            throw new Error(`❌ Invalid recipient address: ${recipientAddress}`);
        }
        
        // Validate amount
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error(`❌ Invalid amount: ${amount}`);
        }
        
        // Convert amount to wei (considering decimals)
        const amountWei = ethers.parseUnits(amount, decimals);
        
        console.log('\n🎯 Minting Details:');
        console.log('   Recipient:', recipientAddress);
        console.log('   Amount:', amount, symbol);
        console.log('   Amount (wei):', amountWei.toString());
        
        // Check current balance of recipient
        const currentBalance = await mockUSDT.balanceOf(recipientAddress);
        console.log('   Current balance:', ethers.formatUnits(currentBalance, decimals), symbol);
        
        // Execute mint
        console.log('\n⏳ Executing mint transaction...');
        const tx = await mockUSDT.mint(recipientAddress, amountWei);
        console.log('📝 Transaction hash:', tx.hash);
        
        // Wait for confirmation
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log('⛽ Gas used:', receipt.gasUsed.toString());
        
        // Check new balance
        const newBalance = await mockUSDT.balanceOf(recipientAddress);
        console.log('\n💰 New balance:', ethers.formatUnits(newBalance, decimals), symbol);
        
        // Check total supply
        const totalSupply = await mockUSDT.totalSupply();
        console.log('📊 Total supply:', ethers.formatUnits(totalSupply, decimals), symbol);
        
        console.log('\n🎉 Minting completed successfully!');
        console.log('🔗 View on explorer: https://sepolia-blockscout.lisk.com/tx/' + tx.hash);
        
    } catch (error) {
        console.error('❌ Minting failed:', error.message);
        throw error;
    }
}

// Handle command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
    mintTokens().catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

export default mintTokens;
