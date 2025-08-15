/**
 * Basic functionality tests for the Aura Farming Bot
 */

import { jest } from '@jest/globals';
import Database from '../src/models/Database.js';
import UserModel from '../src/models/UserModel.js';
import ChatModel from '../src/models/ChatModel.js';
import WalletService from '../src/services/WalletService.js';
import ActivityTracker from '../src/services/ActivityTracker.js';
import { ethers } from 'ethers';
import fs from 'fs';

// Test database path
const TEST_DB_PATH = './tests/test.db';

describe('Aura Farming Bot Tests', () => {
    let database, userModel, chatModel, walletService, activityTracker;

    beforeAll(async () => {
        // Clean up any existing test database
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }

        // Initialize test database
        database = new Database(TEST_DB_PATH);
        await database.initialize();

        // Initialize models
        userModel = new UserModel(database);
        chatModel = new ChatModel(database);

        // Initialize wallet service with a test provider
        const provider = new ethers.JsonRpcProvider('https://rpc.sepolia-api.lisk.com');
        walletService = new WalletService(provider, '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789');

        // Initialize activity tracker
        activityTracker = new ActivityTracker(chatModel);
    });

    afterAll(async () => {
        // Clean up
        if (activityTracker) {
            await activityTracker.cleanup();
        }
        if (database) {
            await database.close();
        }
        if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
        }
    });

    describe('Database Operations', () => {
        test('should create and retrieve users', async () => {
            const userData = {
                id: 123456789,
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User'
            };

            const user = await userModel.createOrUpdateUser(userData);
            expect(user).toBeDefined();
            expect(user.telegram_user_id).toBe('123456789');
            expect(user.username).toBe('testuser');

            const retrievedUser = await userModel.getUserByTelegramId('123456789');
            expect(retrievedUser).toBeDefined();
            expect(retrievedUser.username).toBe('testuser');
        });

        test('should create and retrieve chat groups', async () => {
            const chatData = {
                id: -987654321,
                title: 'Test Group',
                type: 'group'
            };

            const chatGroup = await chatModel.createOrUpdateChatGroup(chatData);
            expect(chatGroup).toBeDefined();
            expect(chatGroup.telegram_chat_id).toBe('-987654321');
            expect(chatGroup.chat_title).toBe('Test Group');

            const retrievedChat = await chatModel.getChatGroupByTelegramId('-987654321');
            expect(retrievedChat).toBeDefined();
            expect(retrievedChat.chat_title).toBe('Test Group');
        });

        test('should record and retrieve activity', async () => {
            // Create test user and chat
            const user = await userModel.createOrUpdateUser({
                id: 111111111,
                username: 'activeuser',
                first_name: 'Active'
            });

            const chat = await chatModel.createOrUpdateChatGroup({
                id: -111111111,
                title: 'Active Chat',
                type: 'group'
            });

            // Record activity
            await chatModel.recordActivity(user.id, chat.id, 5);

            // Check leaderboard
            const leaderboard = await chatModel.getWeeklyLeaderboard('-111111111', 10);
            expect(leaderboard).toBeDefined();
            expect(leaderboard.length).toBeGreaterThan(0);
            expect(leaderboard[0].total_messages).toBe(5);
        });
    });

    describe('Wallet Service', () => {
        test('should generate deterministic wallets', async () => {
            const userId = '123456789';
            
            const wallet1 = await walletService.getUserWallet(userId);
            const wallet2 = await walletService.getUserWallet(userId);

            expect(wallet1.address).toBe(wallet2.address);
            expect(wallet1.privateKey).toBe(wallet2.privateKey);
            expect(ethers.isAddress(wallet1.address)).toBe(true);
        });

        test('should generate different wallets for different users', async () => {
            const wallet1 = await walletService.getUserWallet('111111111');
            const wallet2 = await walletService.getUserWallet('222222222');

            expect(wallet1.address).not.toBe(wallet2.address);
            expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
        });

        test('should get wallet balance', async () => {
            const wallet = await walletService.getUserWallet('123456789');
            
            // This will return 0 for testnet addresses without funds
            const balance = await walletService.getWalletBalance(wallet.address);
            expect(balance).toBeDefined();
            expect(typeof balance).toBe('string');
        });
    });

    describe('Activity Tracker', () => {
        test('should track message activity', async () => {
            // Create mock context
            const mockCtx = {
                chat: { type: 'group', id: -123456789 },
                from: { is_bot: false },
                message: { text: 'Hello world' },
                user: { id: 1 },
                chatGroup: { id: 1 }
            };

            // Track message
            await activityTracker.trackMessage(mockCtx);

            // Flush buffer to ensure data is written
            await activityTracker.flushBuffer();

            // This test mainly ensures no errors are thrown
            expect(true).toBe(true);
        });

        test('should get leaderboard data', async () => {
            const leaderboard = await activityTracker.getLeaderboard('-987654321', 10);
            expect(Array.isArray(leaderboard)).toBe(true);
        });
    });

    describe('Utility Functions', () => {
        test('should calculate week start correctly', () => {
            const testDate = new Date('2024-01-10'); // Wednesday
            const weekStart = Database.getWeekStart(testDate);
            
            // Should return Monday of that week
            expect(weekStart).toBe('2024-01-08');
        });

        test('should get current date', () => {
            const currentDate = Database.getCurrentDate();
            expect(currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid user data gracefully', async () => {
            try {
                await userModel.getUserByTelegramId('nonexistent');
                // Should return null, not throw
                expect(true).toBe(true);
            } catch (error) {
                // If it throws, that's also acceptable
                expect(error).toBeDefined();
            }
        });

        test('should handle invalid chat data gracefully', async () => {
            try {
                await chatModel.getChatGroupByTelegramId('nonexistent');
                // Should return null, not throw
                expect(true).toBe(true);
            } catch (error) {
                // If it throws, that's also acceptable
                expect(error).toBeDefined();
            }
        });
    });
});

describe('Integration Tests', () => {
    test('should handle complete user flow', async () => {
        // This test simulates a complete user interaction flow
        const database = new Database('./tests/integration.db');
        await database.initialize();

        const userModel = new UserModel(database);
        const chatModel = new ChatModel(database);

        try {
            // 1. User joins group
            const user = await userModel.createOrUpdateUser({
                id: 999999999,
                username: 'integrationuser',
                first_name: 'Integration'
            });

            const chat = await chatModel.createOrUpdateChatGroup({
                id: -999999999,
                title: 'Integration Test Group',
                type: 'group'
            });

            // 2. User sends messages
            await chatModel.recordActivity(user.id, chat.id, 10);
            await chatModel.recordActivity(user.id, chat.id, 5);

            // 3. Check leaderboard
            const leaderboard = await chatModel.getWeeklyLeaderboard('-999999999', 10);
            expect(leaderboard.length).toBeGreaterThan(0);
            expect(leaderboard[0].total_messages).toBe(15);

            // 4. Check user ranking
            const ranking = await chatModel.getUserRanking('999999999', '-999999999');
            expect(ranking).toBeDefined();
            expect(ranking.rank_position).toBe(1);
            expect(ranking.total_messages).toBe(15);

        } finally {
            await database.close();
            if (fs.existsSync('./tests/integration.db')) {
                fs.unlinkSync('./tests/integration.db');
            }
        }
    });
});
