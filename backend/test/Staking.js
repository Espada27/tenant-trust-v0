const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const TARGET_SUPPLY = ethers.parseUnits("10000", 18);
const STAKING_AMOUNT = 100n * 10n ** 18n;
const ONE_HOUR_REWARD = ethers.parseUnits("1000", 18);

describe("Staking", function () {
  async function deployContract() {
    const [owner, alice] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("TenantTrustToken");
    const stakingToken = await ERC20.deploy();
    const rewardToken = await ERC20.deploy();

    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(
      stakingToken.getAddress(),
      rewardToken.getAddress(),
      TARGET_SUPPLY
    );
    await staking.waitForDeployment();

    return { staking, stakingToken, rewardToken, owner, alice };
  }

  async function initStaking() {
    const { staking, stakingToken, rewardToken, owner, alice } =
      await loadFixture(deployContract);

    await stakingToken.approve(staking, STAKING_AMOUNT);
    await staking.stake(STAKING_AMOUNT);

    //Init balance of Alice
    await stakingToken.transfer(alice, TARGET_SUPPLY - STAKING_AMOUNT);

    await stakingToken
      .connect(alice)
      .approve(staking, TARGET_SUPPLY - STAKING_AMOUNT);
    //Stake enough tokens to be able to start the staking phase
    await staking.connect(alice).stake(TARGET_SUPPLY - STAKING_AMOUNT);

    return { staking, stakingToken, rewardToken, owner, alice };
  }

  async function startStaking() {
    const { staking, stakingToken, rewardToken, owner, alice } =
      await loadFixture(initStaking);

    await rewardToken.transfer(staking, ONE_HOUR_REWARD);
    await staking.setRewardsDuration(3600);
    await staking.notifyRewardAmount(ONE_HOUR_REWARD);

    return { staking, stakingToken, rewardToken, owner, alice };
  }

  describe("constructor", function () {
    it("Should set the right unlockTime", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);

      expect(await staking.owner()).to.equal(owner.address);
    });

    it("Should set the right staking token address", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);

      expect(await staking.stakingToken()).to.equal(
        await stakingToken.getAddress()
      );
    });

    it("Should set the right reward token address", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);

      expect(await staking.rewardToken()).to.equal(
        await rewardToken.getAddress()
      );
    });

    it("Should set the right target supply", async function () {
      const { staking } = await loadFixture(deployContract);

      expect(await staking.targetSupply()).to.equal(TARGET_SUPPLY);
    });
  });

  describe("stake", function () {
    it("Should update the balance of sender with the given amount", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);
      const initialBalanceOfOwner = 10000000n * 10n ** 18n;
      const expectedEvent = "Staked";

      expect(await stakingToken.balanceOf(owner)).to.equal(
        initialBalanceOfOwner
      );

      await stakingToken.approve(staking, STAKING_AMOUNT);
      await expect(staking.stake(STAKING_AMOUNT))
        .to.emit(staking, expectedEvent)
        .withArgs(owner.address, STAKING_AMOUNT);

      expect(await stakingToken.balanceOf(owner)).to.equal(
        initialBalanceOfOwner - STAKING_AMOUNT
      );
    });

    context("Given amount is equal to 0", async function () {
      it("Should revert", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        await expect(staking.stake(0)).to.be.revertedWith("amount = 0");
      });
    });

    context("Given amount is greater than 0", async function () {
      context(
        "Total supply + given amount is greater than the target supply",
        async function () {
          it("Should revert", async function () {
            const { staking } = await loadFixture(deployContract);
            const amount = TARGET_SUPPLY + 10n;

            await expect(staking.stake(amount)).to.be.revertedWith(
              "cannot stake more"
            );
          });
        }
      );
    });
  });

  describe("withdraw", function () {
    it("Should withdraw the given amount", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(initStaking);
      const balanceBefore = await staking.balanceOf(owner);
      await staking.withdraw(balanceBefore);

      expect(await staking.balanceOf(owner)).to.equal(0);
    });

    context("Amount to withdraw is 0", async function () {
      it("Should revert", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);
        await expect(staking.withdraw(0)).to.be.revertedWith("amount = 0");
      });
    });

    context(
      "Staking period is active (there is a finish time)",
      async function () {
        it("Should revert", async function () {
          const { staking, stakingToken, rewardToken, owner, alice } =
            await loadFixture(initStaking);

          await rewardToken.transfer(staking, ethers.parseUnits("1000", 18));
          await staking.setRewardsDuration(3600);
          await staking.notifyRewardAmount(ethers.parseUnits("1000", 18));
          await expect(staking.withdraw(STAKING_AMOUNT)).to.be.revertedWith(
            "cannot withdraw yet"
          );
        });
      }
    );
  });

  describe("earned", function () {
    context("Caller hasn't stacked anything", async function () {
      it("returns 0", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        expect(await staking.earned(owner)).to.equal(0);
      });
    });
    context("There is just one staker", async function () {
      it("returns the staking amount as reward at the end of the staking period", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        await stakingToken.approve(staking, TARGET_SUPPLY);
        await staking.stake(TARGET_SUPPLY);

        await rewardToken.transfer(staking, TARGET_SUPPLY);
        await staking.setRewardsDuration(10);
        await staking.notifyRewardAmount(TARGET_SUPPLY);
        await time.increase(10);

        expect(await staking.earned(owner)).to.equal(TARGET_SUPPLY);
      });
    });
  });

  describe("claim", function () {
    it("transfers the earned reward from the contract to the caller", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(startStaking);
      const rewardBalanceOfOwner = await rewardToken.balanceOf(owner);
      const stakingBalanceOfOwner = await staking.balanceOf(owner);

      await staking.claim();
      expect(await staking.earned(owner)).to.equal(0);
    });

    context("The reward to claim equals 0", async function () {
      it("does not send the RewardPaid event", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        await expect(await staking.claim()).to.not.emit(staking, "RewardPaid");
      });
    });
  });

  describe("setRewardsDuration", function () {
    it("sets the finish time and emits an event", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(deployContract);

      const rewardsDuration = 3600;

      expect(await staking.duration()).to.equal(0);
      await staking.setRewardsDuration(rewardsDuration);
      expect(await staking.duration()).to.equal(rewardsDuration);
    });

    context("Staking period is active (there is a finish time)", async () => {
      it("does not send the RewardPaid event", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(startStaking);

        const rewardsDuration = 3600;
        await expect(
          staking.setRewardsDuration(rewardsDuration)
        ).to.be.revertedWith("current reward period not finished");
      });
    });

    context("Caller is not the owner", async () => {
      it("reverts", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        const rewardsDuration = 3600;
        await expect(staking.connect(alice).setRewardsDuration(rewardsDuration))
          .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
          .withArgs("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      });
    });
  });

  describe("notifyRewardAmount", function () {
    context("Caller is not the owner", async () => {
      it("reverts", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        await expect(staking.connect(alice).notifyRewardAmount(ONE_HOUR_REWARD))
          .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
          .withArgs("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      });
    });
    context("Staking period is not started yet", async () => {
      it("sets the reward rate according to the whole staking duration", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        await staking.setRewardsDuration(3600);
        await rewardToken.transfer(staking, ONE_HOUR_REWARD);
        expect(await staking.rewardRate()).to.equal(0);
        await staking.notifyRewardAmount(ONE_HOUR_REWARD);
        expect(await staking.rewardRate()).to.equal(ONE_HOUR_REWARD / 3600n);
      });
    });

    context("Staking period is ongoing", async () => {
      it("sets the reward rate with the remaining reward and the whole staking duration", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        const firstRewardRate = ONE_HOUR_REWARD / 3600n;

        await staking.setRewardsDuration(3600);
        await rewardToken.transfer(staking, ONE_HOUR_REWARD * 2n);

        expect(await staking.rewardRate()).to.equal(0);

        await staking.notifyRewardAmount(ONE_HOUR_REWARD);
        const finishAt = BigInt(await time.latest()) + 3600n;

        expect(await staking.rewardRate()).to.equal(firstRewardRate);

        await staking.notifyRewardAmount(ONE_HOUR_REWARD);
        const latestBlock = BigInt(await time.latest());

        const previousReward =
          (finishAt - latestBlock) * (ONE_HOUR_REWARD / 3600n);
        const expectedRewardRate = (ONE_HOUR_REWARD + previousReward) / 3600n;
        expect(await staking.rewardRate()).to.equal(expectedRewardRate);
      });
    });

    context("Target supply is not reached", async () => {
      it("reverts", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(deployContract);

        await expect(
          staking.notifyRewardAmount(ONE_HOUR_REWARD)
        ).to.be.revertedWith("insuficient staking");
      });
    });

    context("Reward rate equals 0", async () => {
      it("reverts", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        await staking.setRewardsDuration(2000);

        await expect(staking.notifyRewardAmount(1000)).to.be.revertedWith(
          "reward rate = 0"
        );
      });
    });

    context("Contract doesn't have enough reward tokens", async () => {
      it("reverts", async function () {
        const { staking, stakingToken, rewardToken, owner, alice } =
          await loadFixture(initStaking);

        await staking.setRewardsDuration(2000);

        await expect(staking.notifyRewardAmount(4000)).to.be.revertedWith(
          "reward amount > balance"
        );
      });
    });

    it("sends an event", async function () {
      const { staking, stakingToken, rewardToken, owner, alice } =
        await loadFixture(initStaking);

      await staking.setRewardsDuration(2000);
      await rewardToken.transfer(staking, ONE_HOUR_REWARD);

      await expect(staking.notifyRewardAmount(ONE_HOUR_REWARD))
        .to.emit(staking, "RewardAdded")
        .withArgs(ONE_HOUR_REWARD);
    });
  });
});
