// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const DEFAULT_BPS = 500n;

async function main() {
  console.log("[Deployment] Start deploying contracts");

  const tenantTrustToken = await hre.ethers.deployContract("TenantTrustToken");

  await tenantTrustToken.waitForDeployment();

  console.log(
    `[Deployment] TenantTrustToken (TTT) deployed to ${tenantTrustToken.target}`
  );

  const stakingToken = await hre.ethers.deployContract("StakingToken");
  await stakingToken.waitForDeployment();

  console.log(
    `[Deployment] StakingToken (Mock USDC) deployed to ${stakingToken.target}`
  );

  const tenantTrust = await hre.ethers.deployContract("TenantTrust", [
    DEFAULT_BPS,
    stakingToken.target,
    tenantTrustToken.target,
  ]);
  await tenantTrust.waitForDeployment();

  console.log(`[Deployment] TenantTrust deployed to ${tenantTrust.target}`);
  console.log("[Deployment] End deploying contracts");
}

const seed = async (tenantTrustToken, stakingToken, tenantTrust) => {
  console.log("[Seed] Start seed contracts");
  const monthlyRent = 500n * 10n ** 18n;
  const rentalDeposit = monthlyRent * 12n;
  const leaseUrl = "http://myServer.com/file";
  const [owner, alice, bob] = await ethers.getSigners();

  console.log("[Seed] Creating the rent contract");
  await tenantTrust.createRentContract(
    alice,
    monthlyRent,
    rentalDeposit,
    leaseUrl
  );
  console.log("[Seed] Fetching it from the blockchain");

  const rent = await tenantTrust.rents(owner, alice);

  console.log("[Seed] Seeding Alice and Bob");

  //Seed other accounts
  const tx1 = await stakingToken.transfer(alice, 1_000_000_000n * 10n ** 18n);
  await tx1.wait();

  const tx2 = await stakingToken.transfer(bob, 1_000_000_000n * 10n ** 18n);
  await tx2.wait();

  console.log("[Seed] Fetching the staking contract");

  const stakingContract = await ethers.getContractAt(
    "Staking",
    rent.stakingContract
  );
  console.log("[Seed] Approving the deposit");

  const tx3 = await stakingToken.approve(stakingContract, rentalDeposit);
  await tx3.wait();
  const tx4 = await stakingContract.stake(rentalDeposit);
  await tx4.wait();

  console.log("[Seed] Approving the contract as landlord");
  //approuver le contrat
  const tx5 = await tenantTrust.approveContract(alice, owner);
  await tx5.wait();
  console.log("[Seed] Approving the contract as tenant");
  const tx6 = await tenantTrust.connect(alice).approveContract(alice, owner);
  await tx6.wait();

  console.log("[Seed] Envoi des rewards sur le contrat de staking");

  const tx7 = await tenantTrustToken.transfer(
    stakingContract,
    1000n * 10n ** 18n
  );
  await tx7.wait();
  console.log("[Seed] Démarre le contrat");

  //Démarrer le contrat
  const tx8 = await tenantTrust.startRent(alice);
  await tx8.wait();
  console.log("[Seed] End seed contracts");
};

const mockTime = async () => {
  setInterval(async () => await time.increase(3600 * 12), 1000);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
