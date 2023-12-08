// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

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
  await seed(tenantTrustToken, stakingToken, tenantTrust);
}

const seed = async (tenantTrustToken, stakingToken, tenantTrust) => {
  const [owner, alice, bob, randomTenant1, randomTenant2, randomTenant3] =
    await ethers.getSigners();

  console.log("[Seed] Start seed contracts");

  await createRent(tenantTrustToken, stakingToken, tenantTrust, owner, alice);
  await createRent(tenantTrustToken, stakingToken, tenantTrust, bob, owner);
  await createRent(tenantTrustToken, stakingToken, tenantTrust, alice, bob);
  await createRent(
    tenantTrustToken,
    stakingToken,
    tenantTrust,
    owner,
    randomTenant1
  );
  await createRent(
    tenantTrustToken,
    stakingToken,
    tenantTrust,
    randomTenant2,
    randomTenant3
  );
  console.log("[Seed] End seed contracts");
  await mockTime();
};

const mockTime = async () => {
  console.log("Start the mock time, 1s = 12h");
  setInterval(async () => await time.increase(3600), 1000);
};

const createRent = async (
  tenantTrustToken,
  stakingToken,
  tenantTrust,
  landlord,
  tenant
) => {
  const monthlyRent = BigInt(Math.round(Math.random() * 1512)) * 10n ** 18n;
  const rentalDeposit = monthlyRent * 12n;
  const leaseUrl = "http://myServer.com/file";
  console.log("[Seed] Seeding Alice and Bob");

  //Seed other accounts
  const tx1 = await stakingToken.transfer(
    landlord,
    1_000_000_000n * 10n ** 18n
  );
  await tx1.wait();

  //const tx2 = await stakingToken.transfer(bob, 1_000_000_000n * 10n ** 18n);
  //await tx2.wait();
  console.log("[Seed] Creating the rent contract");
  await tenantTrust
    .connect(landlord)
    .createRentContract(tenant, monthlyRent, rentalDeposit, leaseUrl);
  console.log("[Seed] Fetching it from the blockchain");

  const rent = await tenantTrust.rents(landlord, tenant);

  console.log("[Seed] Fetching the staking contract");

  const stakingContract = await ethers.getContractAt(
    "Staking",
    rent.stakingContract
  );
  console.log("[Seed] Approving the deposit");

  const tx3 = await stakingToken
    .connect(landlord)
    .approve(stakingContract, rentalDeposit);
  await tx3.wait();
  const tx4 = await stakingContract.connect(landlord).stake(rentalDeposit);
  await tx4.wait();

  console.log("[Seed] Approving the contract as landlord");
  //approuver le contrat
  const tx5 = await tenantTrust
    .connect(landlord)
    .approveContract(tenant, landlord);
  await tx5.wait();
  console.log("[Seed] Approving the contract as tenant");
  const tx6 = await tenantTrust
    .connect(tenant)
    .approveContract(tenant, landlord);
  await tx6.wait();

  console.log("[Seed] Envoi des rewards sur le contrat de staking");

  const tx7 = await tenantTrustToken.transfer(stakingContract, monthlyRent);
  await tx7.wait();
  console.log("[Seed] Démarre le contrat");

  //Démarrer le contrat
  const tx8 = await tenantTrust.connect(landlord).startRent(tenant);
  await tx8.wait();
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
