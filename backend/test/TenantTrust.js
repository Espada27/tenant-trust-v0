const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const RATE_BPS = 500n;
const RENT_DURATION = 31536000; //one year
const MONTHLY_RENT = 500n * 10n ** 18n;
const MONTHLY_FEES = (MONTHLY_RENT * RATE_BPS) / 10_000n;
const RENTAL_DEPOSIT = MONTHLY_RENT * 12n;

describe("TenantTrust", function () {
  async function deployContract() {
    const [owner, alice, bob] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("TenantTrustTokenTest");
    const stakingToken = await ERC20.deploy();
    const rewardToken = await ERC20.deploy();

    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    const TenantTrust = await ethers.getContractFactory("TenantTrust");
    const tenantTrust = await TenantTrust.deploy(
      RATE_BPS,
      stakingToken.getAddress(),
      rewardToken.getAddress()
    );
    await tenantTrust.waitForDeployment();

    return { tenantTrust, stakingToken, rewardToken, owner, alice, bob };
  }

  async function createRentContract() {
    const { tenantTrust, stakingToken, rewardToken, owner, alice, bob } =
      await loadFixture(deployContract);

    const monthlyRent = 500n * 10n ** 18n;
    const rentalDeposit = monthlyRent * 12n;
    const leaseUrl = "http://myServer.com/file";

    await tenantTrust.createRentContract(
      alice,
      monthlyRent,
      rentalDeposit,
      leaseUrl
    );
    return { tenantTrust, stakingToken, rewardToken, owner, alice, bob };
  }

  async function startRentContract() {
    const { tenantTrust, stakingToken, rewardToken, owner, alice, bob } =
      await loadFixture(createRentContract);

    const rent = await tenantTrust.rents(owner, alice);
    const stakingContract = await ethers.getContractAt(
      "Staking",
      rent.stakingContract
    );

    await stakingToken.mint(bob, RENTAL_DEPOSIT);
    await stakingToken.mint(alice, RENTAL_DEPOSIT);
    await rewardToken.mint(stakingContract, RENTAL_DEPOSIT);
    //Allow tenant contract to transfer the rent
    await stakingToken.connect(alice).approve(tenantTrust, RENTAL_DEPOSIT);
    //Allow staking contract to stake the deposit
    await stakingToken.connect(bob).approve(stakingContract, RENTAL_DEPOSIT);
    await stakingContract.connect(bob).stake(RENTAL_DEPOSIT);
    await tenantTrust.approveContract(alice, owner);
    await tenantTrust.connect(alice).approveContract(alice, owner);
    await tenantTrust.startRent(alice);

    return { tenantTrust, stakingToken, rewardToken, owner, alice, bob };
  }

  describe("constructor", function () {
    it("should set the right staking token address", async function () {
      const { tenantTrust, stakingToken } = await loadFixture(deployContract);

      expect(await tenantTrust.stakingToken()).to.equal(
        await stakingToken.getAddress()
      );
    });

    it("should set the right reward token address", async function () {
      const { tenantTrust, stakingToken, rewardToken } = await loadFixture(
        deployContract
      );

      expect(await tenantTrust.rewardToken()).to.equal(
        await rewardToken.getAddress()
      );
    });

    it("should set the right interest bps", async function () {
      const { tenantTrust } = await loadFixture(deployContract);

      expect(await tenantTrust.interestBps()).to.equal(RATE_BPS);
    });
  });

  describe("createRentContract", function () {
    it("should create a rent contract", async function () {
      const { tenantTrust, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);

      const monthlyRent = 500n * 10n ** 18n;
      const rentalDeposit = monthlyRent * 12n;
      const leaseUrl = "http://myServer.com/file";

      expect(
        await tenantTrust.createRentContract(
          alice,
          monthlyRent,
          rentalDeposit,
          leaseUrl
        )
      )
        .to.emit(tenantTrust, "ContractCreated")
        .withArgs(alice, owner);

      const expectedDailyRent = (monthlyRent * 12n) / 365n;
      const expectedDailyFees = (expectedDailyRent * RATE_BPS) / 10_000n;

      const lastBlockTime = await time.latest();

      const rentContract = await tenantTrust.rents(owner, alice);
      const expectedRentContract = {
        stakingContract: rentContract.stakingContract,
        startTime: 0,
        duration: RENT_DURATION,
        rentRate: expectedDailyRent,
        rentFees: expectedDailyFees,
        alreadyPaid: 0,
        rentalDeposit,
        leaseUrl,
        landlordApproval: false,
        tenantApproval: false,
        creationTime: lastBlockTime,
      };
      expect(rentContract).to.deep.equal(Object.values(expectedRentContract));
    });

    context(
      "There is already a contract for the same landlord/tenant",
      async function () {
        it("should revert", async function () {
          const { tenantTrust, stakingToken, rewardToken, owner, alice } =
            await loadFixture(createRentContract);

          const monthlyRent = 500n * 10n ** 18n;
          const rentalDeposit = monthlyRent * 12n;
          const leaseUrl = "http://myServer.com/file";

          await expect(
            tenantTrust.createRentContract(
              alice,
              monthlyRent,
              rentalDeposit,
              leaseUrl
            )
          ).to.be.revertedWith("There is already a contract");
        });
      }
    );
  });

  describe("approveContract", function () {
    context("The rent does not exist", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        await expect(
          tenantTrust.approveContract(alice, owner)
        ).to.be.revertedWith("no contract found");
      });
    });

    context("Caller is neither the landlord nor the tenant", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice, bob } =
          await loadFixture(createRentContract);

        await expect(
          tenantTrust.connect(bob).approveContract(alice, owner)
        ).to.be.revertedWith("not allowed");
      });
    });
    context("Caller is the landlord", async function () {
      it("should approve the contract", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(createRentContract);

        expect(await tenantTrust.approveContract(alice, owner))
          .to.emit(tenantTrust, "ContractApproved")
          .withArgs(alice, owner, owner);

        const rentContract = await tenantTrust.rents(owner, alice);
        expect(rentContract.tenantApproval).to.be.false;
        expect(rentContract.landlordApproval).to.be.true;
      });
    });

    context("Caller is the tenant", async function () {
      it("should approve the contract", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(createRentContract);

        expect(await tenantTrust.connect(alice).approveContract(alice, owner))
          .to.emit(tenantTrust, "ContractApproved")
          .withArgs(alice, owner, alice);

        const rentContract = await tenantTrust.rents(owner, alice);

        expect(rentContract.tenantApproval).to.be.true;
        expect(rentContract.landlordApproval).to.be.false;
      });
    });

    context("Both tenant and landlord approve the contract", async function () {
      it("should approve the contract for both", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(createRentContract);

        expect(await tenantTrust.approveContract(alice, owner))
          .to.emit(tenantTrust, "ContractApproved")
          .withArgs(alice, owner, owner);

        expect(await tenantTrust.connect(alice).approveContract(alice, owner))
          .to.emit(tenantTrust, "ContractApproved")
          .withArgs(alice, owner, alice);

        const rentContract = await tenantTrust.rents(owner, alice);

        expect(rentContract.tenantApproval).to.be.true;
        expect(rentContract.landlordApproval).to.be.true;
      });
    });
  });

  describe("startRent", function () {
    context("Caller is not the landlord", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(createRentContract);

        await expect(
          tenantTrust.connect(alice).startRent(alice)
        ).to.be.revertedWith("not landlord");
      });
    });

    context("The staked amount is not enough", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(createRentContract);

        await expect(tenantTrust.startRent(alice)).to.be.revertedWith(
          "insuficient staking"
        );
      });
    });

    context("The contract has already started", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(startRentContract);

        await expect(tenantTrust.startRent(alice)).to.be.revertedWith(
          "already started"
        );
      });
    });

    context("The contract is not approved", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice, bob } =
          await loadFixture(createRentContract);

        const rent = await tenantTrust.rents(owner, alice);
        const stakingContract = await ethers.getContractAt(
          "Staking",
          rent.stakingContract
        );
        await stakingToken.mint(bob, RENTAL_DEPOSIT);
        await stakingToken
          .connect(bob)
          .approve(stakingContract, RENTAL_DEPOSIT);
        await stakingContract.connect(bob).stake(RENTAL_DEPOSIT);

        await expect(tenantTrust.startRent(alice)).to.be.revertedWith(
          "not approved"
        );
      });
    });
  });

  describe("payRent", function () {
    context("Caller is not the tenant", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice, bob } =
          await loadFixture(startRentContract);

        await expect(
          tenantTrust.connect(bob).payRent(owner, MONTHLY_RENT)
        ).to.be.revertedWith("not tenant");
      });
    });

    context("Given amount cannot cover one day of rent", async function () {
      it("should revert", async function () {
        const { tenantTrust, stakingToken, rewardToken, owner, alice } =
          await loadFixture(startRentContract);
        const rent = await tenantTrust.rents(owner, alice);
        const expectedDailyCost = rent.rentRate + rent.rentFees;

        await expect(
          tenantTrust.connect(alice).payRent(owner, expectedDailyCost - 1n)
        ).to.be.revertedWith("insuficient amount");
      });
    });

    it("transfers the money", async function () {
      const { tenantTrust, stakingToken, rewardToken, owner, alice } =
        await loadFixture(startRentContract);
      const rentToPay = MONTHLY_RENT + MONTHLY_FEES;
      const expectedBalanceOfAlice =
        (await stakingToken.balanceOf(alice)) - rentToPay;

      await expect(tenantTrust.connect(alice).payRent(owner, rentToPay))
        .to.emit(tenantTrust, "RentPaid")
        .withArgs(alice.address, owner.address, MONTHLY_RENT, MONTHLY_RENT);

      expect(await stakingToken.balanceOf(alice)).to.equal(
        expectedBalanceOfAlice
      );

      expect(await tenantTrust.balanceOf(owner)).to.equal(
        MONTHLY_RENT - MONTHLY_FEES
      );
    });
  });

  describe("withdraw", function () {
    context(
      "Caller wants to withdraw more funds than available",
      async function () {
        it("should revert", async function () {
          const { tenantTrust } = await loadFixture(startRentContract);

          await expect(tenantTrust.withdraw(MONTHLY_RENT)).to.be.revertedWith(
            "insuficient funds"
          );
        });
      }
    );

    it("should withdraw", async function () {
      const { tenantTrust, stakingToken, rewardToken, owner, alice } =
        await loadFixture(startRentContract);

      const rentToPay = MONTHLY_RENT + MONTHLY_FEES;
      const amountToWithdraw = MONTHLY_RENT - MONTHLY_FEES;
      await tenantTrust.connect(alice).payRent(owner, rentToPay);
      await expect(tenantTrust.withdraw(amountToWithdraw))
        .to.emit(tenantTrust, "Withdrawn")
        .withArgs(owner.address, amountToWithdraw);
    });
  });

  describe("percentage", function () {
    context("Given value is too low", async function () {
      it("should revert", async function () {
        const { tenantTrust } = await loadFixture(createRentContract);
        expect(
          await tenantTrust.percentage(MONTHLY_FEES, RATE_BPS)
        ).to.be.revertedWith("incorrect value");
      });
    });

    it("should return the result", async function () {
      const { tenantTrust } = await loadFixture(createRentContract);
      expect(await tenantTrust.percentage(MONTHLY_RENT, RATE_BPS)).to.equal(
        MONTHLY_FEES
      );
    });
  });
});
