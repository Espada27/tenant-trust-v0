// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const DEFAULT_BPS = 500n;

async function main() {
  const tenantTrustToken = await hre.ethers.deployContract("TenantTrustToken");

  await tenantTrustToken.waitForDeployment();

  console.log(`TenantTrustToken deployed to ${tenantTrustToken.target}`);

  const stakingToken = await hre.ethers.deployContract("StakingToken");
  await stakingToken.waitForDeployment();

  console.log(`StakingToken deployed to ${stakingToken.target}`);

  const tenantTrust = await hre.ethers.deployContract("TenantTrust", [
    DEFAULT_BPS,
    stakingToken.target,
    tenantTrustToken.target,
  ]);
  await tenantTrust.waitForDeployment();

  console.log(`TenantTrust deployed to ${tenantTrust.target}`);

  const monthlyRent = 500n * 10n ** 18n;
  const rentalDeposit = monthlyRent * 12n;
  const leaseUrl = "http://myServer.com/file";
  const [owner, alice, bob] = await ethers.getSigners();

  await tenantTrust.createRentContract(
    alice,
    monthlyRent,
    rentalDeposit,
    leaseUrl
  );

  await tenantTrust
    .connect(bob)
    .createRentContract(owner, monthlyRent * 2n, rentalDeposit * 2n, leaseUrl);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
