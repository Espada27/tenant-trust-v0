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
    event ContractApproved(address indexed tenant, address indexed landlord);
    event RentPaid(
        address indexed tenant,
        address indexed landlord,
        uint rentAmount,
        uint alreadyPaid
    );

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
            address(stakingToken),
            address(rewardToken),
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
            (_amount * 12) / 365 >= rent.rentRate + rent.rentFees * 2,
            "insuficient amount"
        );
        uint fees = percentage(_amount, interestBps);
        //Substract fees paid by the landlord and the tenant (hence the x2)
        uint rawRent = _amount - 2 * fees;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        balanceOf[_landlord] += rawRent;
        rent.alreadyPaid += rawRent;

        emit RentPaid(msg.sender, _landlord, rawRent, rent.alreadyPaid);
    }

    function withdraw(uint _amount) external {
        require(balanceOf[msg.sender] >= _amount, "insuficient funds");
        balanceOf[msg.sender] -= _amount;
        stakingToken.safeTransfer(msg.sender, _amount);
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
        if (msg.sender == _tenant) {
            rent.tenantApproval = true;
        } else if (msg.sender == _landlord) {
            rent.landlordApproval = true;
        } else {
            revert("not allowed");
        }
    }

    function startRent(address _tenant) external onlyLandlord(_tenant) {
        Rent storage rent = rents[msg.sender][_tenant];
        require(rent.stakingContract.isStakingFull(), "insuficient staking");
        require(rent.startTime > 0, "already started");
        require(rent.tenantApproval && rent.landlordApproval, "not approved");

        //Définir le nombre de récompenses à verser pour la durée du contrat
        rent.stakingContract.notifyRewardAmount(rent.rentaDeposit);
        rent.startTime = block.timestamp;

        uint rentRate = rent.rentRate + percentage(rent.rentRate, interestBps);
        emit RentStarted(_tenant, msg.sender, rentRate);
    }

    function stopRent(address _tenant) external onlyLandlord(_tenant) {
        Rent storage rent = rents[msg.sender][_tenant];
        rent.duration = block.timestamp - rent.startTime;
        emit RentStopped(_tenant, msg.sender);
    }

    modifier onlyLandlord(address _tenant) {
        require(rents[msg.sender][_tenant].creationTime > 0, "not landlord");
        _;
    }

    modifier onlyTenant(address _landlord) {
        require(rents[_landlord][msg.sender].creationTime > 0, "not landlord");
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
    ) private pure returns (uint256) {
        require(amount * bps >= 10_000, "incorrect value");
        return ((amount * bps) / 10_000);
    }
}
