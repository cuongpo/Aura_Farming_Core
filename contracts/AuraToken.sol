// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuraToken
 * @dev AURA token for quest rewards in Aura Farming Bot
 * Simplified version for easy deployment
 */
contract AuraToken is ERC20, Ownable {

    // Events for quest system
    event QuestReward(address indexed user, uint256 amount, string questType);
    event ChestOpened(address indexed user, uint256 reward, uint256 day);

    /**
     * @dev Constructor - creates AURA token with initial supply
     * @param initialSupply Initial token supply (will be multiplied by 10^18)
     */
    constructor(uint256 initialSupply) ERC20("Aura Token", "AURA") Ownable() {
        // Mint initial supply to deployer (18 decimals by default)
        _mint(msg.sender, initialSupply * 10**18);
    }

    /**
     * @dev Mint tokens for quest rewards
     * Only owner (bot) can mint
     */
    function mintQuestReward(address to, uint256 amount, string memory questType) external onlyOwner {
        _mint(to, amount);
        emit QuestReward(to, amount, questType);
    }

    /**
     * @dev Mint tokens for chest rewards
     * Only owner (bot) can mint
     */
    function mintChestReward(address to, uint256 amount, uint256 day) external onlyOwner {
        _mint(to, amount);
        emit ChestOpened(to, amount, day);
    }

    /**
     * @dev Batch mint for multiple users (gas efficient)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Burn tokens from sender
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Transfer ownership to bot wallet
     * Call this after deployment to give minting rights to the bot
     */
    function transferOwnershipToBot(address botWallet) external onlyOwner {
        transferOwnership(botWallet);
    }
}
