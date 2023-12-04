const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StakingToken", function () {
  async function deployContract() {
    const [owner] = await ethers.getSigners();

    const StakingToken = await ethers.getContractFactory("StakingToken");
    const stakingToken = await StakingToken.deploy();

    await stakingToken.waitForDeployment();

    return { stakingToken, owner };
  }

  describe("constructor", function () {
    it("should mint token for the owner", async function () {
      const { stakingToken, owner } = await loadFixture(deployContract);
      const expectedBalance = 10_000_000_000n * 10n ** 18n;
      expect(await stakingToken.balanceOf(owner)).to.equal(expectedBalance);
    });
  });
});
