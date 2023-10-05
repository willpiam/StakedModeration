import { ethers } from "hardhat";

async function main() {

  const wrappedContractDemo = await ethers.deployContract("WrappedContractDemo", [], {});
  await wrappedContractDemo.waitForDeployment();

  const wrappedContractDemoAddress = await wrappedContractDemo.getAddress();

  console.log(`Wrapped Contract Demo deployed to: ${wrappedContractDemoAddress}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
