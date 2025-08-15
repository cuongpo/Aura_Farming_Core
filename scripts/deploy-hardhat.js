import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying MockUSDT contract to Lisk testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("❌ Deployer has no ETH balance. Please fund the account first.");
  }

  // Deploy the MockUSDT contract
  console.log("📝 Deploying MockUSDT contract...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();

  await mockUSDT.waitForDeployment();
  const contractAddress = await mockUSDT.getAddress();

  console.log("✅ MockUSDT deployed to:", contractAddress);

  // Verify contract details
  const name = await mockUSDT.name();
  const symbol = await mockUSDT.symbol();
  const decimals = await mockUSDT.decimals();
  const totalSupply = await mockUSDT.totalSupply();
  const owner = await mockUSDT.owner();

  console.log("📋 Contract Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, decimals));
  console.log("   Owner:", owner);

  // Update .env file with contract address
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add the contract address
  const contractAddressLine = `MOCK_USDT_CONTRACT_ADDRESS=${contractAddress}`;
  
  if (envContent.includes("MOCK_USDT_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /MOCK_USDT_CONTRACT_ADDRESS=.*/,
      contractAddressLine
    );
  } else {
    envContent += `\n${contractAddressLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("📝 Updated .env file with contract address");

  // Save deployment info
  const deploymentInfo = {
    network: "coreTestnet",
    contractAddress: contractAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contractDetails: {
      name,
      symbol,
      decimals: decimals.toString(),
      totalSupply: totalSupply.toString(),
      owner
    }
  };

  const deploymentPath = path.join(__dirname, "../data/deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Saved deployment info to data/deployment.json");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("🔗 You can now use this contract address in your bot configuration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
