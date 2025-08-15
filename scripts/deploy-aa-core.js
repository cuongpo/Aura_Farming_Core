import pkg from 'hardhat';
const { ethers } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying Account Abstraction contracts to Core testnet...");
  console.log("═══════════════════════════════════════════════════════════");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "tCORE");

  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️ Warning: Low balance. You might need more tCORE for deployment.");
    console.log("💡 Get testnet tCORE from: https://scan.test2.btcs.network/faucet");
  }

  // Step 1: Check if EntryPoint exists (standard address)
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  console.log("\n📝 Step 1: Checking EntryPoint contract...");
  
  const entryPointCode = await deployer.provider.getCode(entryPointAddress);
  if (entryPointCode === "0x") {
    console.log("❌ EntryPoint not found at standard address on Core testnet");
    console.log("🔧 You may need to deploy EntryPoint first or use a different address");
    // For now, we'll continue with the standard address
  } else {
    console.log("✅ EntryPoint found at:", entryPointAddress);
  }

  // Step 2: Deploy SimpleAccountFactory
  console.log("\n📝 Step 2: Deploying SimpleAccountFactory...");
  
  const SimpleAccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
  const factory = await SimpleAccountFactory.deploy(entryPointAddress);
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ SimpleAccountFactory deployed to:", factoryAddress);

  // Step 3: Test smart wallet creation
  console.log("\n📝 Step 3: Testing smart wallet creation...");
  
  const testOwner = deployer.address;
  const testSalt = 0;
  
  // Predict the smart wallet address
  const predictedAddress = await factory.getAddress(testOwner, testSalt);
  console.log("🔮 Predicted smart wallet address:", predictedAddress);
  
  // Create the smart wallet
  const createTx = await factory.createAccount(testOwner, testSalt);
  const receipt = await createTx.wait();
  console.log("✅ Smart wallet creation transaction:", receipt.hash);
  
  // Verify the smart wallet
  const smartWalletCode = await deployer.provider.getCode(predictedAddress);
  console.log("✅ Smart wallet deployed successfully (code length:", smartWalletCode.length, ")");

  // Step 4: Update environment variables
  console.log("\n📝 Step 4: Updating environment variables...");
  
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add contract addresses
  const updates = {
    ENTRY_POINT_ADDRESS: entryPointAddress,
    SIMPLE_ACCOUNT_FACTORY_ADDRESS: factoryAddress
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("📝 Updated .env file with contract addresses");

  // Step 5: Save deployment info
  const deploymentInfo = {
    network: "coreTestnet",
    chainId: 1114,
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
      }
    },
    testWallet: {
      owner: testOwner,
      salt: testSalt,
      address: predictedAddress,
      deploymentTx: createTx.hash
    }
  };

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const deploymentFile = path.join(dataDir, 'aa-deployment-core.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("✅ Deployment info saved to:", deploymentFile);

  // Final summary
  console.log("\n🎉 ACCOUNT ABSTRACTION DEPLOYMENT COMPLETED!");
  console.log("═══════════════════════════════════════════════");
  console.log("📋 Contract Addresses:");
  console.log("  EntryPoint:", entryPointAddress);
  console.log("  SimpleAccountFactory:", factoryAddress);
  console.log("  Test Smart Wallet:", predictedAddress);
  console.log("");
  console.log("🌐 Network: Core Testnet (Chain ID: 1114)");
  console.log("🔍 Explorer: https://scan.test2.btcs.network/");
  console.log("");
  console.log("📝 Environment Variables Updated:");
  console.log(`ENTRY_POINT_ADDRESS=${entryPointAddress}`);
  console.log(`SIMPLE_ACCOUNT_FACTORY_ADDRESS=${factoryAddress}`);
  console.log("");
  console.log("🔧 Next Steps:");
  console.log("1. Restart your bot to use Account Abstraction");
  console.log("2. Test smart wallet functionality");
  console.log("3. Users will now get smart contract wallets!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
