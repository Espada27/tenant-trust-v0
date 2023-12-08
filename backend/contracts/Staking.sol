// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Staking
 * @dev Contract for staking tokens and earning rewards.
 */
contract Staking is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    // Duration of rewards to be paid out (in seconds)
    uint public duration;
    // Timestamp of when the rewards finish
    uint public finishAt;
    // Minimum of last updated time and reward finish time
    uint public updatedAt;
    // Reward to be paid out per second
    uint public rewardRate;
    // Sum of (reward rate * dt * 1e18 / total supply)
    uint public rewardPerTokenStored;
    // User address => rewardPerTokenStored
    mapping(address => uint) public userRewardPerTokenPaid;
    // User address => rewards to be claimed
    mapping(address => uint) public rewards;

    // Total staked
    uint public totalSupply;
    uint public targetSupply;
    // User address => staked amount
    mapping(address => uint) public balanceOf;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event StakingStopped(address owner);

    /**
     * @dev Constructor for the Staking contract.
     * @param _stakingToken Address of the token to be staked.
     * @param _rewardToken Address of the reward token.
     * @param _targetSupply Target total amount for staking.
     */
    constructor(
        IERC20 _stakingToken,
        IERC20 _rewardToken,
        uint _targetSupply
    ) Ownable(msg.sender) {
        stakingToken = _stakingToken;
        rewardToken = _rewardToken;
        targetSupply = _targetSupply;
    }

    /**
     * @dev Modifier to update the reward information.
     * @param _account The address of the account to update rewards.
     */
    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _;
    }

    /**
     * @dev Get the last time when rewards are applicable.
     * @return Timestamp of the last applicable time.
     */
    function lastTimeRewardApplicable() public view returns (uint) {
        return _min(finishAt, block.timestamp);
    }

    /**
     * @dev Get the reward amount to be paid per token.
     * @return The reward amount per token.
     */
    function rewardPerToken() public view returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            (rewardRate * (lastTimeRewardApplicable() - updatedAt) * 1e18) /
            totalSupply;
    }

    /**
     * @dev Stake tokens to earn rewards.
     * @param _amount The amount of tokens to stake.
     */
    function stake(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");
        require(totalSupply + _amount <= targetSupply, "cannot stake more");
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Withdraw staked tokens.
     * @param _amount The amount of tokens to withdraw.
     */
    function withdraw(uint _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");
        require(
            finishAt == 0 || block.timestamp >= finishAt,
            "cannot withdraw yet"
        );
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev Compute the current rewards to be claimed
     * @param _account account to compute the rewards of
     */
    function earned(address _account) public view returns (uint) {
        return
            ((balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) / 1e18) +
            rewards[_account];
    }

    /**
     * @dev Claim earned rewards.
     */
    function claim() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        require(reward > 0, "no reward to claim");
        //TODO handle rate conversion between staking token and reward token
        rewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, reward);
        emit RewardPaid(msg.sender, reward);
    }

    /**
     * @dev Set the staking duration
     * @param _duration The duration in seconds
     */
    function setRewardsDuration(uint _duration) external onlyOwner {
        require(
            finishAt < block.timestamp,
            "current reward period not finished"
        );
        duration = _duration;
        emit RewardsDurationUpdated(_duration);
    }

    /**
     * @dev Notify the contract about the reward amount.
     * @param _amount The amount of rewards to be distributed.
     */
    function notifyRewardAmount(
        uint _amount
    ) external onlyOwner updateReward(address(0)) {
        require(isStakingFull(), "insuficient staking");

        if (block.timestamp >= finishAt) {
            rewardRate = _amount / duration;
        } else {
            uint remainingRewards = (finishAt - block.timestamp) * rewardRate;
            rewardRate = (_amount + remainingRewards) / duration;
        }

        require(rewardRate > 0, "reward rate = 0");
        require(
            rewardRate * duration <= rewardToken.balanceOf(address(this)),
            "reward amount > balance"
        );

        finishAt = block.timestamp + duration;
        updatedAt = block.timestamp;
        emit RewardAdded(_amount);
    }

    /**
     * @dev Check if the staking target is reached
     * @return true if the stacked amount is equal or greater than the total supply
     */
    function isStakingFull() public view returns (bool) {
        return totalSupply >= targetSupply;
    }

    /**
     * @dev Get the minimum value between two numbers.
     * @param x The first number.
     * @param y The second number.
     * @return The minimum value.
     */
    function _min(uint x, uint y) private pure returns (uint) {
        return x <= y ? x : y;
    }
}
