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
  }
};

export default config;
