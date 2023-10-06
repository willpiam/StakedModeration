import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config'

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://ethereum-sepolia.blockpi.network/v1/rpc/public`,
      accounts: [`0x${process.env.SEPOLIA_PRIVATE_KEY}`],
    },
    milkomeda: {
      url: `https://rpc-mainnet-cardano-evm.c1.milkomeda.com`,
      accounts: {
        mnemonic: process.env.MILKOMEDA_MNEMONIC,
        path: `m/44'/60'/0'/0`,
        initialIndex: 0,
        count: 5,
        passphrase: "",
      },
    },
  }
};

export default config;
