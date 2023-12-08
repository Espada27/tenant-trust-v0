// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";

/**
 * @title TenantTrust
 * @dev Decentralized rental contract system with staking features.
 */
contract TenantTrust is Ownable {
    using SafeERC20 for IERC20;

    uint public interestBps;
    uint public rentDuration = 31536000; // one year

    IERC20 public stakingToken;
    IERC20 public rewardToken;

    struct Rent {
        //Contract handling the staking
        Staking stakingContract;
        //Time when the landlord declared the contract active
        uint startTime;
        //Duration of the contract in seconds
        uint duration;
        //Cost of the rent per day
        uint rentRate;
        //Cost of the fees per day
        uint rentFees;
        //Amount already paid by the tenant
        uint alreadyPaid;
        //Rental deposit required by the landlord
        uint rentalDeposit;
        //URI of the real world contract
        string leaseUri;
        //Landlord ok to start the contract
        bool landlordApproval;
        //Tenant ok to start the contract
        bool tenantApproval;
        //Creation time of the contract
        uint creationTime;
    }

    //1 landlord can have many tenants that lead to one contract for each
    mapping(address landlord => mapping(address tenant => Rent)) public rents;
    mapping(address landlord => uint balance) public balanceOf;

    event ContractCreated(address indexed tenant, address indexed landlord);
    event RentStarted(
        address indexed tenant,
        address indexed landlord,
        uint dailyRate
    );
    event RentStopped(address indexed tenant, address indexed landlord);
    event ContractApproved(
        address indexed tenant,
        address indexed landlord,
        address approvedAddress
    );
    event RentPaid(
        address indexed tenant,
        address indexed landlord,
        uint rentAmount,
        uint alreadyPaid
    );
    event Withdrawn(address indexed landlord, uint amount);

    /**
     * @dev Constructor for the TenantTrust contract.
     * @param _rate Interest rate in basis points (0.01%).
     * @param _stakingToken Address of the token to be staked.
     * @param _rewardToken Address of the reward token.
     */
    constructor(
        uint _rate,
        address _stakingToken,
        address _rewardToken
    ) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        interestBps = _rate;
    }

    /**
     * @dev Create a new rental contract.
     * @param _tenant Address of the tenant.
     * @param _monthlyRent Monthly rent amount.
     * @param _rentalDeposit Rental deposit required by the landlord.
     * @param leaseUri URI of the real-world contract.
     */
    function createRentContract(
        address _tenant,
        uint _monthlyRent,
        uint _rentalDeposit,
        string memory leaseUri
    ) external {
        require(
            address(rents[msg.sender][_tenant].stakingContract) == address(0),
            "There is already a contract"
        );

        Staking stakingContract = new Staking(
            stakingToken,
            rewardToken,
            _rentalDeposit
        );

        stakingContract.setRewardsDuration(rentDuration);

        uint dailyRent = (_monthlyRent * 12) / 365;
        Rent memory rental = Rent(
            stakingContract,
            0,
            rentDuration,
            dailyRent,
            percentage(dailyRent, interestBps),
            0,
            _rentalDeposit,
            leaseUri,
            false,
            false,
            block.timestamp
        );
        rents[msg.sender][_tenant] = rental;
        emit ContractCreated(_tenant, msg.sender);
    }

    /**
     * @dev Pay rent for the rental contract.
     * @param _landlord Address of the landlord.
     * @param _amount Amount to be paid as rent.
     */
    function payRent(
        address _landlord,
        uint _amount
    ) external onlyTenant(_landlord) {
        Rent storage rent = rents[_landlord][msg.sender];
        require(
            _amount / (rent.rentRate + rent.rentFees) > 0,
            "insuficient amount"
        );

        uint netRent = getRawRent(_amount, interestBps);
        uint fees = _amount - netRent;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        balanceOf[_landlord] += netRent - fees;
        rent.alreadyPaid += netRent;

        emit RentPaid(msg.sender, _landlord, netRent, rent.alreadyPaid);
    }

    /**
     * @dev Get the net rent amount after subtracting interest.
     * @param _amount Total amount paid.
     * @param _interestBps Interest in basis points (0.01%). (See https://en.wikipedia.org/wiki/Basis_point)
     * @return Net rent amount after interest deduction.
     */
    function getRawRent(
        uint _amount,
        uint _interestBps
    ) public pure returns (uint) {
        return (_amount * 10 ** 18) / (10 ** 18 + _interestBps * 10 ** 14);
    }

    /**
     * @dev Withdraw available funds by the landlord.
     * @param _amount Amount of funds to be withdrawn.
     */
    function withdraw(uint _amount) external {
        require(balanceOf[msg.sender] >= _amount, "insuficient funds");
        balanceOf[msg.sender] -= _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev Approve the rental contract
     * @param _tenant Address of the tenant.
     * @param _landlord Address of the landlord.
     */
    function approveContract(
        address _tenant,
        address _landlord
    ) external rentExists(_tenant, _landlord) {
        require(
            msg.sender == _tenant || msg.sender == _landlord,
            "not allowed"
        );
        Rent storage rent = rents[_landlord][_tenant];
        address approvedAddress;
        if (msg.sender == _tenant) {
            rent.tenantApproval = true;
            approvedAddress = _tenant;
        } else {
            rent.landlordApproval = true;
            approvedAddress = _landlord;
        }
        emit ContractApproved(_tenant, _landlord, approvedAddress);
    }

    /**
     * @dev Start the rental contract after approval.
     * @param _tenant Address of the tenant.
     */
    function startRent(address _tenant) external onlyLandlord(_tenant) {
        Rent storage rent = rents[msg.sender][_tenant];
        require(rent.stakingContract.isStakingFull(), "insuficient staking");
        require(rent.startTime == 0, "already started");
        require(rent.tenantApproval && rent.landlordApproval, "not approved");

        uint rewardAmount = percentage(rent.rentalDeposit, interestBps);
        rent.stakingContract.notifyRewardAmount(rewardAmount);
        rent.startTime = block.timestamp;

        uint rentRate = rent.rentRate + percentage(rent.rentRate, interestBps);
        emit RentStarted(_tenant, msg.sender, rentRate);
    }

    /**
     * @dev Modifier to restrict a function to the landlord only.
     * @param _tenant Address of the tenant.
     */
    modifier onlyLandlord(address _tenant) {
        require(rents[msg.sender][_tenant].creationTime > 0, "not landlord");
        _;
    }

    /**
     * @dev Modifier to restrict a function to the tenant only.
     * @param _landlord Address of the landlord.
     */
    modifier onlyTenant(address _landlord) {
        require(rents[_landlord][msg.sender].creationTime > 0, "not tenant");
        _;
    }

    /**
     * @dev Modifier to check the existence of a rental contract.
     * @param _tenant Address of the tenant.
     * @param _landlord Address of the landlord.
     */
    modifier rentExists(address _tenant, address _landlord) {
        require(
            rents[_landlord][_tenant].creationTime > 0,
            "no contract found"
        );
        _;
    }

    /**
     * @dev Calculate the percentage of a value using basis points.
     * @param _amount The original value.
     * @param _bps Basis points (0.01%).
     * @return The calculated percentage.
     */
    function percentage(
        uint256 _amount,
        uint256 _bps
    ) public pure returns (uint256) {
        require(_amount * _bps >= 10_000, "incorrect value");
        return ((_amount * _bps) / 10_000);
    }
}
