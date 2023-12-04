const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TenantTrustToken", function () {
  async function deployContract() {
    const [owner] = await ethers.getSigners();

    const TenantTrustToken = await ethers.getContractFactory(
      "TenantTrustToken"
    );
    const tenantTrustToken = await TenantTrustToken.deploy();

    await tenantTrustToken.waitForDeployment();

    return { tenantTrustToken, owner };
  }

  describe("constructor", function () {
    it("should mint token for the owner", async function () {
      const { tenantTrustToken, owner } = await loadFixture(deployContract);
      const expectedBalance = 10_000_000n * 10n ** 18n;
      expect(await tenantTrustToken.balanceOf(owner)).to.equal(expectedBalance);
    });
  });
});
