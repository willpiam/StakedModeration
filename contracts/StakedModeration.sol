// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract StakedModeration is PullPayment, AccessControl {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    event ContestationCreated(uint256 indexed contestationId);
    event ContestationClosed(uint256 indexed contestationId, uint256 indexed yayVotes, uint256 indexed nayVotes);

    struct Settings {
        uint256 posterDeposit;
        uint256 moderationDeposit;
        uint256 contestationFee;
        address stakedAdaAddress;
    }

    struct Contestation {
        bytes certificate;
        address poster;
        address moderator;
        uint256 posterLock;
        uint256 moderatorLock;
        uint256 contestationFee;
        uint256 closureBlock;
    }

    struct Vote {
        bool didVote;
        bool vote;
    }

    uint256 constant BLOCKTIME = 2 seconds;

    mapping(address => uint256) public contentCreatorDeposits;
    mapping(address => uint256) public moderatorDeposits;

    mapping(address => bool) public contentCreatorDepositLocked;
    mapping(address => bool) public moderatorDepositLocked;

    mapping(uint256 => Contestation) public contestations;

    mapping(uint256 => mapping(address => Vote)) contestationToVote;

    mapping(uint256 => uint256) contestationIdToVoteCount;
    mapping(uint256 => mapping(uint256 => address)) contestationIdToVoteIndexToAddress;

    mapping(uint256 => bool) rewardsHaveBeenDistributed;

    Settings public settings;

    bytes32 private constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 private constant POSTER_ROLE = keccak256("POSTER_ROLE");

    Counters.Counter private _contestationIdCounter;

    address serverAddress; // address of keys used by server to sign post creation certificates

    constructor(address _serverAddress, address _stakedAdaAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(POSTER_ROLE, msg.sender);
        settings = Settings({
            posterDeposit: 1 ether,
            moderationDeposit: 1 ether,
            contestationFee: 0.1 ether,
            stakedAdaAddress: _stakedAdaAddress
        });
        serverAddress = _serverAddress;
    }

    function _adaBalance(address account) internal view returns (uint256) {
        IERC20 stmADA = IERC20(settings.stakedAdaAddress);
        return account.balance + stmADA.balanceOf(account);
    }

    function depositPosterStake(address poster) public payable {
        require(
            msg.value == settings.posterDeposit,
            "Incorrect deposit amount"
        );
        require(
            contentCreatorDepositLocked[poster] == false,
            "May not deposit during a contestation"
        );
        contentCreatorDeposits[poster] += msg.value;
        _grantRole(POSTER_ROLE, poster);
    }

    function depositModeratorStake(address moderator) public payable {
        require(
            msg.value == settings.moderationDeposit,
            "Incorrect deposit amount"
        );
        require(
            moderatorDepositLocked[moderator] == false,
            "May not deposit during a contestation"
        );
        moderatorDeposits[moderator] += msg.value;
        _grantRole(MODERATOR_ROLE, moderator);
    }

    function withdrawPosterStake() public {
        require(
            contentCreatorDeposits[msg.sender] > 0,
            "No deposit to withdraw"
        );
        require(
            contentCreatorDepositLocked[msg.sender] == false,
            "May not withdraw during a contestation"
        );
        _asyncTransfer(msg.sender, contentCreatorDeposits[msg.sender]);
        contentCreatorDeposits[msg.sender] = 0;
        _revokeRole(POSTER_ROLE, msg.sender);
    }

    function withdrawModeratorStake() public {
        require(moderatorDeposits[msg.sender] > 0, "No deposit to withdraw");
        require(
            moderatorDepositLocked[msg.sender] == false,
            "May not withdraw during a contestation"
        );
        _asyncTransfer(msg.sender, moderatorDeposits[msg.sender]);
        moderatorDeposits[msg.sender] = 0;
        _revokeRole(MODERATOR_ROLE, msg.sender);
    }

    function _isContestationOpen (uint256 _contestationID) internal view returns (bool) {
        if (_contestationIdCounter.current() <= _contestationID) {
            return false;
        }

        if (contestations[_contestationID].closureBlock < block.number) {
            return false;
        }

        return true;
    }

    function contestPost(
        address poster,
        bytes calldata certificate,
        bytes calldata serverSignature,
        bytes calldata posterSignature
    ) public payable onlyRole(MODERATOR_ROLE) {
        // 1. moderator must prove that the post exists (they do this by submitting a signature of the post creation certificate... this signature comes from the server.. it is used for a while and then )
        require(
            moderatorDepositLocked[msg.sender] == false,
            "May not contest during a contestation"
        );
        require(
            keccak256(certificate)
            .toEthSignedMessageHash()
            .recover(
                serverSignature
            ) == serverAddress,
            "Failed Server Signature Verification"
        );
        // 2. moderator must prove that the post was created by the poster (this is done with another signature of the same certificate... this signature is generated by the poster)
        require(
            keccak256(certificate)
            .toEthSignedMessageHash()
            .recover(
                posterSignature
            ) == poster,
            "Failed Poster Signature Verification"
        );
        // certificate is <address of poster>:<other data not yet specified>
        (address certificatePoster) = abi.decode(certificate, (address));
        require(
            certificatePoster == poster,
            "Poster address does not match certificate"
        );

        console.log("---Poster is mentioned in certificate------");

        // 3. moderator must pay the contestion fee (given to voters)
        require(
            msg.value == settings.contestationFee,
            "Incorrect contestation fee"
        );

        console.log("---Passed Contestation Fee Check------");

        uint256 contestationId = _contestationIdCounter.current();
        _contestationIdCounter.increment();

        console.log("---Contestation ID Incremented------");

        contestations[contestationId] = Contestation({
            certificate: certificate,
            poster: poster,
            moderator: msg.sender,
            posterLock: contentCreatorDeposits[poster],
            moderatorLock: moderatorDeposits[msg.sender],
            contestationFee: settings.contestationFee,
            closureBlock: block.number + ( 86400 seconds / BLOCKTIME)
        });

        console.log("---Contestation Created------");

        // lock the deposits of the poster and the moderator
        contentCreatorDepositLocked[poster] = true;
        moderatorDepositLocked[msg.sender] = true;

        console.log("---Deposits Locked------"); 

        emit ContestationCreated(contestationId);
    }

    function voteOnContestation(uint256 _contestationID, bool yayRemovePost) public {
        require(
            _isContestationOpen(_contestationID),
            "Contestation is over"
        );
        require(
            contestationToVote[_contestationID][msg.sender].didVote == false,
            "Already voted"
        );
        require(
            contestations[_contestationID].moderator != msg.sender,
            "Moderator cannot vote on their own contestation"
        );
        require(
            contestations[_contestationID].poster != msg.sender,
            "Poster cannot vote on their own contestation"
        );
        
        contestationToVote[_contestationID][msg.sender] = Vote({
            didVote: true,
            vote: yayRemovePost
        });

        uint256 voteCount = contestationIdToVoteCount[_contestationID];
        contestationIdToVoteIndexToAddress[_contestationID][voteCount] = msg.sender;
        contestationIdToVoteCount[_contestationID] = voteCount + 1;
    }

    function closeContestation(uint256 contestationId) public {
        // disable for testing
        // require(
        //     _isContestationOpen(contestationId) == false,
        //     "Contestation is still open"
        // );

        require(
            rewardsHaveBeenDistributed[contestationId] == false,
            "Rewards have already been distributed"
        );

        uint256 numberOfVotes = contestationIdToVoteCount[contestationId];
        uint256 yayVotes = 0; // count of votes confirming that the post should be removed
        uint256 nayVotes = 0; // count of votes confirming that the post should not be removed
        uint256[] memory voteShare = new uint256[](numberOfVotes);
        uint256 totalAdaParticipation = 0;

        for (uint256 i = 0; i < numberOfVotes; i++) {
            address voter = contestationIdToVoteIndexToAddress[contestationId][i];
            uint256 voterBalance = _adaBalance(voter);
            voteShare[i] = voterBalance;
            totalAdaParticipation += voterBalance;
            if (contestationToVote[contestationId][voter].vote == true) {
                yayVotes += voterBalance;
                continue;
            }
            nayVotes += voterBalance;
        }

        console.log("---Yay Votes: %s", yayVotes);
        console.log("---Nay Votes: %s", nayVotes);

        if (yayVotes > nayVotes) {
            _moderatorWins(contestationId);
        } else {
            _posterWins(contestationId);
        }

        _distributeVoterRewards(contestationId, voteShare, totalAdaParticipation);

        rewardsHaveBeenDistributed[contestationId] = true;
        emit ContestationClosed(contestationId, yayVotes, nayVotes);
    }

    function _distributeVoterRewards(uint256 contestationId, uint256[] memory voteShare, uint256 totalAdaParticipation) internal {
        uint256 contestationFee = contestations[contestationId].contestationFee;
        uint256 numberOfVotes = contestationIdToVoteCount[contestationId];
        console.log("---Contestation Fee: %s", contestationFee);
        console.log("---Number of Votes: %s", numberOfVotes);
        console.log("---Total Ada Participation: %s", totalAdaParticipation);

        for (uint256 i = 0; i < numberOfVotes; i++) {
            address voter = contestationIdToVoteIndexToAddress[contestationId][i];
            uint256 voterReward = ( ((voteShare[i] * 1 gwei) / totalAdaParticipation) * contestationFee) / 1 gwei;

            console.log("---Async Transfer of %s to %s (contract balance: %s)", voterReward, voter, address(this).balance);
            _asyncTransfer(voter, voterReward);
        }
    }

    function _posterWins(uint256 contestationId) internal {
        console.log("---Poster Wins");
        uint256 moderatorDeposit = contestations[contestationId].moderatorLock;
        address poster = contestations[contestationId].poster;
        address moderator = contestations[contestationId].moderator;

        moderatorDeposits[contestations[contestationId].moderator] -= moderatorDeposit;
        _asyncTransfer(poster, moderatorDeposit);

        if(  moderatorDeposits[contestations[contestationId].moderator] < settings.moderationDeposit) {
            _revokeRole(MODERATOR_ROLE, contestations[contestationId].moderator);
        }

        contentCreatorDepositLocked[poster] = false;
        moderatorDepositLocked[moderator] = false;
    }

    function _moderatorWins(uint256 contestationId) internal {
        console.log("---Moderator Wins");
        uint256 posterDeposit = contestations[contestationId].posterLock;
        address poster = contestations[contestationId].poster;
        address moderator = contestations[contestationId].moderator;

        contentCreatorDeposits[contestations[contestationId].poster] -= posterDeposit;
        _asyncTransfer(moderator, posterDeposit);

        if(  contentCreatorDeposits[contestations[contestationId].poster] < settings.posterDeposit) {
            _revokeRole(POSTER_ROLE, contestations[contestationId].poster);
        }

        contentCreatorDepositLocked[poster] = false;
        moderatorDepositLocked[msg.sender] = false;
    }
}
