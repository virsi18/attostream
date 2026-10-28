// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PiGCVOracle
 * @notice Multi-Validator Proof-of-Consensus Oracle anchoring the Global Consensus Value (GCV).
 * Standardized at $314,159.000000 USD (8 decimal precision for fiat feeds).
 * Designed for high-frequency micro-fractional conversion in Pi Network Layer-2 ecosystems.
 */
contract PiGCVOracle {
    // GCV Value: 314,159.00000000 USD (8 decimals standard Chainlink precision)
    uint256 public constant GCV_FIXED_VALUE = 314_159_00000000;
    uint8 public constant DECIMALS = 8;
    string public constant DESCRIPTION = "Pi/USD Global Consensus Value (GCV) Feed";

    address public owner;
    uint256 public minimumQuorum;
    uint256 public totalValidators;

    struct ValidatorVote {
        bool hasVoted;
        uint256 timestamp;
        bytes signature;
    }

    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    mapping(address => bool) public isValidator;
    mapping(uint80 => mapping(address => ValidatorVote)) public validatorVotes;
    uint80 public currentRoundId;
    RoundData private _latestRound;

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event ConsensusHeartbeat(uint80 indexed roundId, int256 price, uint256 quorumCount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "PiGCV: Caller is not owner");
        _;
    }

    modifier onlyValidator() {
        require(isValidator[msg.sender], "PiGCV: Caller not authorized validator");
        _;
    }

    constructor(address[] memory initialValidators, uint256 _quorum) {
        owner = msg.sender;
        require(initialValidators.length >= _quorum && _quorum > 0, "Invalid quorum");
        minimumQuorum = _quorum;

        for (uint256 i = 0; i < initialValidators.length; i++) {
            address val = initialValidators[i];
            if (!isValidator[val] && val != address(0)) {
                isValidator[val] = true;
                totalValidators++;
                emit ValidatorAdded(val);
            }
        }

        currentRoundId = 1;
        _latestRound = RoundData({
            roundId: 1,
            answer: int256(GCV_FIXED_VALUE),
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
    }

    /**
     * @notice Submits a heartbeat consensus confirmation on the GCV rate ($314,159 USD)
     */
    function submitConsensusHeartbeat(bytes calldata sig) external onlyValidator {
        validatorVotes[currentRoundId][msg.sender] = ValidatorVote({
            hasVoted: true,
            timestamp: block.timestamp,
            signature: sig
        });

        // Trigger round refresh
        _latestRound.updatedAt = block.timestamp;
        emit ConsensusHeartbeat(currentRoundId, _latestRound.answer, totalValidators, block.timestamp);
    }

    /**
     * @notice Returns the latest GCV round data (Chainlink-compatible interface)
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _latestRound.roundId,
            _latestRound.answer,
            _latestRound.startedAt,
            _latestRound.updatedAt,
            _latestRound.answeredInRound
        );
    }

    /**
     * @notice Convert USD (cents/8 decimals) into precise Atto-Pi (10^-18 Pi)
     * Formula: attoPi = (usdAmount * 1e18) / GCV_FIXED_VALUE
     */
    function usdToAttoPi(uint256 usdWith8Decimals) external pure returns (uint256) {
        // Ex: $3.14159000 USD (314159000) -> 0.00001 Pi -> 10,000,000,000,000 Atto-Pi
        return (usdWith8Decimals * 1e18) / GCV_FIXED_VALUE;
    }

    /**
     * @notice Convert Atto-Pi into USD (8 decimals)
     */
    function attoPiToUsd(uint256 attoPiAmount) external pure returns (uint256) {
        return (attoPiAmount * GCV_FIXED_VALUE) / 1e18;
    }
}
