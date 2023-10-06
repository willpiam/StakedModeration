import { ethers } from "hardhat";
import { Blockfrost, Lucid } from "lucid-cardano";
import WSCLib, { MilkomedaNetworkName } from 'milkomeda-wsc';

async function main() {
    console.log(`Wrapped Contract Interaction`)
    const signers = await Promise.all((await ethers.getSigners()).map(async (signer) => ({
        signerAddress: signer.address,
        balance: ethers.formatEther(await ethers.provider.getBalance(signer.address)),
        nonce: await signer.getNonce(),

    })));
    console.log("Signers:")
    console.table(signers);

    // const provider = await import("provider");
    // console.log(`Have a provider`)
    console.log(`Network Info:`)

    const network = MilkomedaNetworkName.C1Mainnet;
    console.log(`Network: ${network}`)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
