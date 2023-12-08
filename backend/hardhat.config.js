require("hardhat-watcher");
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomicfoundation/hardhat-verify");
require("dotenv/config");
require("hardhat-gas-reporter");
require("@nomicfoundation/hardhat-verify");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const POLYGON_MUMBAI_RPC_URL = process.env.POLYGON_MUMBAI_RPC_URL || "";
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || "";
const ALICE_PRIVATE_KEY = process.env.ALICE_PRIVATE_KEY || "";
const BOB_PRIVATE_KEY = process.env.BOB_PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [
        `0x${OWNER_PRIVATE_KEY}`,
        `0x${ALICE_PRIVATE_KEY}`,
        `0x${BOB_PRIVATE_KEY}`,
      ],
      chainId: 11155111,
    },
    polygon_mumbai: {
      url: POLYGON_MUMBAI_RPC_URL,
      accounts: [
        `0x${OWNER_PRIVATE_KEY}`,
        `0x${ALICE_PRIVATE_KEY}`,
        `0x${BOB_PRIVATE_KEY}`,
      ],
      chainId: 80001,
    },
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },

  gasReporter: {
    enabled: true,
  },

  solidity: {
    compilers: [
      {
        version: "0.8.23",
      },
    ],
  },
  watcher: {
    test: {
      tasks: ["test"],
      files: ["./test/**/*"],
    },
  },
};
