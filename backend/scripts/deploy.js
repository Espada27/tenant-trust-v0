// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
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
  await seed(tenantTrustToken, stakingToken, tenantTrust);
}

const seed = async (tenantTrustToken, stakingToken, tenantTrust) => {
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

  const rent = await tenantTrust.rents(owner, alice);

  //Seed other accounts
  await stakingToken.transfer(alice, 1_000_000_000n * 10n ** 18n);
  await stakingToken.transfer(bob, 1_000_000_000n * 10n ** 18n);

  const stakingContract = await ethers.getContractAt(
    "Staking",
    rent.stakingContract
  );
  console.log("Approving the deposit");

  await stakingToken.approve(stakingContract, rentalDeposit);
  await stakingContract.stake(rentalDeposit);

  console.log("Approving the contract");
  //approuver le contrat
  await tenantTrust.approveContract(alice, owner);
  await tenantTrust.connect(alice).approveContract(alice, owner);

  console.log("Démarre le contrat");
  await tenantTrustToken.transfer(stakingContract, 1000n * 10n ** 18n);

  //Démarrer le contrat
  await tenantTrust.startRent(alice);

  //earned info
  //console.log("earned after 180days= ", await stakingContract.earned(owner));
  mockTime();
};

const mockTime = async () => {
  setInterval(async () => await time.increase(86400), 1000);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
