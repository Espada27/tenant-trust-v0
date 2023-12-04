// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Staking.sol";

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
        uint rentaDeposit;
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

    constructor(
        uint _rate,
        address _stakingToken,
        address _rewardToken
    ) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        interestBps = _rate;
    }

    function createRentContract(
        address _tenant,
        uint _monthlyRent,
        uint _rentalDeposit,
        string memory leasetUri
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
            leasetUri,
            false,
            false,
            block.timestamp
        );
        rents[msg.sender][_tenant] = rental;
        emit ContractCreated(_tenant, msg.sender);
    }

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

    function getRawRent(
        uint _amount,
        uint _interestBps
    ) public pure returns (uint) {
        return (_amount * 10 ** 18) / (10 ** 18 + _interestBps * 10 ** 14);
    }

    function withdraw(uint _amount) external {
        require(balanceOf[msg.sender] >= _amount, "insuficient funds");
        balanceOf[msg.sender] -= _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

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

    function startRent(address _tenant) external onlyLandlord(_tenant) {
        Rent storage rent = rents[msg.sender][_tenant];
        require(rent.stakingContract.isStakingFull(), "insuficient staking");
        require(rent.startTime == 0, "already started");
        require(rent.tenantApproval && rent.landlordApproval, "not approved");

        uint rewardAmount = percentage(rent.rentaDeposit, interestBps);
        rent.stakingContract.notifyRewardAmount(rewardAmount);
        rent.startTime = block.timestamp;

        uint rentRate = rent.rentRate + percentage(rent.rentRate, interestBps);
        emit RentStarted(_tenant, msg.sender, rentRate);
    }

    modifier onlyLandlord(address _tenant) {
        require(rents[msg.sender][_tenant].creationTime > 0, "not landlord");
        _;
    }

    modifier onlyTenant(address _landlord) {
        require(rents[_landlord][msg.sender].creationTime > 0, "not tenant");
        _;
    }

    modifier rentExists(address _tenant, address _landlord) {
        require(
            rents[_landlord][_tenant].creationTime > 0,
            "no contract found"
        );
        _;
    }

    function percentage(
        uint256 amount,
        uint256 bps
    ) public pure returns (uint256) {
        require(amount * bps >= 10_000, "incorrect value");
        return ((amount * bps) / 10_000);
    }
}
