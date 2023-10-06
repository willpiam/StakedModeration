import { ethers } from "hardhat";

async function main() {
  const signers = await Promise.all((await ethers.getSigners()).map(async (signer) => ({
    signerAddress: signer.address,
    balance: ethers.formatEther(await ethers.provider.getBalance(signer.address)),
    nonce: await signer.getNonce(),

  })));
  console.log("Signers:")
  console.table(signers);

  return;
  const wrappedContractDemo = await ethers.deployContract("WrappedContractDemo", [], {});
  await wrappedContractDemo.waitForDeployment();

  const wrappedContractDemoAddress = await wrappedContractDemo.getAddress();

  console.log(`Wrapped Contract Demo deployed to: ${wrappedContractDemoAddress}`)

  await wrappedContractDemo.increment();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
