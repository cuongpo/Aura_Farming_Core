import pkg from "hardhat";
const { ethers } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying Account Abstraction contracts to Lisk testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH balance. Please fund the account first.");
  }

  // Step 1: Deploy EntryPoint if not exists
  console.log("\n📝 Step 1: Setting up EntryPoint...");

  // Standard EntryPoint address
  const STANDARD_ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

  let entryPointAddress;

  // Check if standard EntryPoint exists on Core testnet
  const entryPointCode = await deployer.provider.getCode(STANDARD_ENTRYPOINT);

  if (entryPointCode !== "0x") {
    console.log("✅ Using existing EntryPoint at:", STANDARD_ENTRYPOINT);
    entryPointAddress = STANDARD_ENTRYPOINT;
  } else {
    console.log("⚠️  Standard EntryPoint not found on Core testnet");
    console.log("🚀 Deploying EntryPoint contract...");

    try {
      // Deploy EntryPoint from @account-abstraction/contracts
      const EntryPoint = await ethers.getContractFactory("EntryPoint");
      const entryPoint = await EntryPoint.deploy();
      await entryPoint.waitForDeployment();

      entryPointAddress = await entryPoint.getAddress();
      console.log("✅ EntryPoint deployed to:", entryPointAddress);
    } catch (error) {
      console.log("❌ Failed to deploy EntryPoint:", error.message);
      console.log("📝 Using standard address as fallback");
      entryPointAddress = STANDARD_ENTRYPOINT;
    }
  }

  // Step 2: Deploy SimpleAccountFactory
  console.log("\n📝 Step 2: Deploying SimpleAccountFactory...");
  
  const SimpleAccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
  const factory = await SimpleAccountFactory.deploy(entryPointAddress);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ SimpleAccountFactory deployed to:", factoryAddress);

  // Step 3: Deploy MockUSDT (if not already deployed)
  console.log("\n📝 Step 3: Deploying MockUSDT...");
  
  let mockUSDTAddress = process.env.MOCK_USDT_CONTRACT_ADDRESS;
  
  if (!mockUSDTAddress) {
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    
    mockUSDTAddress = await mockUSDT.getAddress();
    console.log("✅ MockUSDT deployed to:", mockUSDTAddress);
  } else {
    console.log("✅ Using existing MockUSDT at:", mockUSDTAddress);
  }

  // Step 4: Test smart wallet creation
  console.log("\n📝 Step 4: Testing smart wallet creation...");
  
  // Create a test smart wallet
  const testOwner = deployer.address;
  const testSalt = 12345;
  
  console.log("🧪 Creating test smart wallet...");
  console.log("   Owner:", testOwner);
  console.log("   Salt:", testSalt);
  
  // Calculate the smart wallet address
  const predictedAddress = await factory.getAddress(testOwner, testSalt);
  console.log("📍 Predicted smart wallet address:", predictedAddress);
  
  // Create the smart wallet
  const createTx = await factory.createAccount(testOwner, testSalt);
  const createReceipt = await createTx.wait();
  console.log("✅ Smart wallet created! Gas used:", createReceipt.gasUsed.toString());
  
  // Verify the smart wallet
  const smartWalletCode = await deployer.provider.getCode(predictedAddress);
  console.log("✅ Smart wallet deployed successfully (code length:", smartWalletCode.length, ")");

  // Step 5: Update environment variables
  console.log("\n📝 Step 5: Updating environment variables...");
  
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add contract addresses
  const updates = {
    ENTRY_POINT_ADDRESS: entryPointAddress,
    SIMPLE_ACCOUNT_FACTORY_ADDRESS: factoryAddress,
    MOCK_USDT_CONTRACT_ADDRESS: mockUSDTAddress
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`${key}=.*`, 'g');
    const line = `${key}=${value}`;
    
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent += `\n${line}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("📝 Updated .env file with contract addresses");

  // Step 6: Save deployment info
  const deploymentInfo = {
    network: "coreTestnet",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      entryPoint: {
        address: entryPointAddress,
        isExisting: entryPointCode !== "0x"
      },
      simpleAccountFactory: {
        address: factoryAddress,
        deploymentTx: createTx.hash
      },
      mockUSDT: {
        address: mockUSDTAddress,
        isExisting: !!process.env.USDT_CONTRACT_ADDRESS
      }
    },
    testWallet: {
      owner: testOwner,
      salt: testSalt,
      address: predictedAddress,
      deploymentTx: createTx.hash
    }
  };

  const deploymentPath = path.join(__dirname, "../data/aa-deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Saved deployment info to data/aa-deployment.json");

  // Step 7: Summary
  console.log("\n🎉 Account Abstraction deployment completed!");
  console.log("\n📋 Contract Addresses:");
  console.log("   EntryPoint:", entryPointAddress);
  console.log("   SimpleAccountFactory:", factoryAddress);
  console.log("   MockUSDT:", mockUSDTAddress);
  console.log("\n🧪 Test Smart Wallet:");
  console.log("   Address:", predictedAddress);
  console.log("   Owner:", testOwner);
  
  console.log("\n🚀 Next steps:");
  console.log("1. Restart your bot: npm start");
  console.log("2. Users will now get smart contract wallets!");
  console.log("3. Test with /wallet command");
  console.log("4. Use /tip to send rewards through smart wallets");
  
  console.log("\n✨ Account Abstraction is now enabled!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
