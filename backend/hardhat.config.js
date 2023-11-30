require("hardhat-watcher");
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomicfoundation/hardhat-verify");

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
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
