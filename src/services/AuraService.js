import { ethers } from 'ethers';

class AuraService {
    constructor(provider, contractAddress, privateKey) {
        this.provider = provider;
        this.contractAddress = contractAddress;
        
        // Create wallet from private key
        this.wallet = new ethers.Wallet(privateKey, provider);
        
        // AURA Token ABI (minimal for our needs)
        this.contractABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function mintQuestReward(address to, uint256 amount, string questType)",
            "function mintChestReward(address to, uint256 amount, uint256 day)",
            "function owner() view returns (address)",
            "event QuestReward(address indexed user, uint256 amount, string questType)",
            "event ChestOpened(address indexed user, uint256 reward, uint256 day)"
        ];
        
        // Create contract instance
        this.contract = new ethers.Contract(contractAddress, this.contractABI, this.wallet);
    }

    /**
     * Get AURA token information
     */
    async getTokenInfo() {
        try {
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                this.contract.name(),
                this.contract.symbol(),
                this.contract.decimals(),
                this.contract.totalSupply()
            ]);

            return {
                name,
                symbol,
                decimals: Number(decimals),
                totalSupply: ethers.formatUnits(totalSupply, decimals)
            };
        } catch (error) {
            console.error('Error getting token info:', error);
            throw error;
        }
    }

    /**
     * Get AURA balance for an address
     */
    async getBalance(address) {
        try {
            const balance = await this.contract.balanceOf(address);
            const decimals = await this.contract.decimals();
            return ethers.formatUnits(balance, decimals);
        } catch (error) {
            console.error('Error getting AURA balance:', error);
            return '0';
        }
    }

    /**
     * Mint AURA tokens for quest rewards
     */
    async mintQuestReward(toAddress, amount, questType = 'daily_chat') {
        try {
            console.log(`Minting ${amount} AURA for quest reward to ${toAddress}`);
            
            // Convert amount to wei (considering decimals)
            const decimals = await this.contract.decimals();
            const amountWei = ethers.parseUnits(amount.toString(), decimals);
            
            // Execute mint transaction
            const tx = await this.contract.mintQuestReward(toAddress, amountWei, questType);
            
            console.log(`Quest reward mint transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`Quest reward mint confirmed in block ${receipt.blockNumber}`);
            
            return tx.hash;
        } catch (error) {
            console.error('Error minting quest reward:', error);
            throw error;
        }
    }

    /**
     * Mint AURA tokens for chest rewards
     */
    async mintChestReward(toAddress, amount, day) {
        try {
            console.log(`Minting ${amount} AURA for chest reward to ${toAddress} (day ${day})`);
            
            if (amount === 0) {
                console.log('Amount is 0, skipping mint');
                return null;
            }
            
            // Convert amount to wei (considering decimals)
            const decimals = await this.contract.decimals();
            const amountWei = ethers.parseUnits(amount.toString(), decimals);
            
            // Execute mint transaction
            const tx = await this.contract.mintChestReward(toAddress, amountWei, day);
            
            console.log(`Chest reward mint transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`Chest reward mint confirmed in block ${receipt.blockNumber}`);
            
            return tx.hash;
        } catch (error) {
            console.error('Error minting chest reward:', error);
            throw error;
        }
    }

    /**
     * Transfer AURA tokens
     */
    async transfer(toAddress, amount) {
        try {
            console.log(`Transferring ${amount} AURA to ${toAddress}`);
            
            // Convert amount to wei
            const decimals = await this.contract.decimals();
            const amountWei = ethers.parseUnits(amount.toString(), decimals);
            
            // Execute transfer
            const tx = await this.contract.transfer(toAddress, amountWei);
            
            console.log(`AURA transfer transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`AURA transfer confirmed in block ${receipt.blockNumber}`);
            
            return tx.hash;
        } catch (error) {
            console.error('Error transferring AURA:', error);
            throw error;
        }
    }

    /**
     * Get transaction receipt
     */
    async getTransactionReceipt(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            console.error('Error getting transaction receipt:', error);
            return null;
        }
    }

    /**
     * Check if address is contract owner
     */
    async isOwner(address) {
        try {
            const owner = await this.contract.owner();
            return owner.toLowerCase() === address.toLowerCase();
        } catch (error) {
            console.error('Error checking owner:', error);
            return false;
        }
    }

    /**
     * Get recent quest reward events
     */
    async getQuestRewardEvents(fromBlock = 'latest', toBlock = 'latest') {
        try {
            const filter = this.contract.filters.QuestReward();
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
            
            return events.map(event => ({
                user: event.args.user,
                amount: ethers.formatUnits(event.args.amount, 18),
                questType: event.args.questType,
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            }));
        } catch (error) {
            console.error('Error getting quest reward events:', error);
            return [];
        }
    }

    /**
     * Get recent chest opened events
     */
    async getChestOpenedEvents(fromBlock = 'latest', toBlock = 'latest') {
        try {
            const filter = this.contract.filters.ChestOpened();
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
            
            return events.map(event => ({
                user: event.args.user,
                reward: ethers.formatUnits(event.args.reward, 18),
                day: Number(event.args.day),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash
            }));
        } catch (error) {
            console.error('Error getting chest opened events:', error);
            return [];
        }
    }

    /**
     * Validate address format
     */
    isValidAddress(address) {
        try {
            return ethers.isAddress(address);
        } catch {
            return false;
        }
    }

    /**
     * Format AURA amount for display
     */
    formatAmount(amount, decimals = 2) {
        const num = parseFloat(amount);
        return num.toFixed(decimals);
    }
}

export default AuraService;
