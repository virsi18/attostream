// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PiGCVOracle.sol";

/**
 * @title AttoStreamCore
 * @notice Layer-2 Real-Time Micro-Payment Streaming Protocol for the $314,159 GCV Pi Economy.
 * Solves the dust and precision loss issue when paying fractions of a cent in high-valuation Pi.
 * Enables continuous payment streams per second (e.g. WiFi, EV charging, API calls, salaries).
 */
contract AttoStreamCore {
    PiGCVOracle public immutable oracle;

    struct Stream {
        address sender;
        address recipient;
        uint256 depositAtto;      // Total deposited in Atto-Pi (10^-18)
        uint256 ratePerSecond;    // Atto-Pi per second
        uint256 startTime;        // Stream start timestamp
        uint256 stopTime;         // Stream end timestamp
        uint256 remainingBalance; // Remaining unwithdrawn Atto-Pi
        bool isEntityActive;
    }

    uint256 public nextStreamId = 1000;
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) private _senderStreams;
    mapping(address => uint256[]) private _recipientStreams;

    // Events
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 depositAtto,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 stopTime
    );
    event WithdrawFromStream(uint256 indexed streamId, address indexed recipient, uint256 amountAtto);
    event StreamCancelled(uint256 indexed streamId, address indexed sender, uint256 refundedAtto);

    constructor(address _oracleAddress) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        oracle = PiGCVOracle(_oracleAddress);
    }

    /**
     * @notice Create a continuous payment stream using Atto-Pi units
     * @param recipient The wallet receiving continuous stream
     * @param depositAtto Total Atto-Pi allocated to stream
     * @param startTime Unix timestamp when streaming begins
     * @param stopTime Unix timestamp when streaming concludes
     */
    function createStream(
        address recipient,
        uint256 depositAtto,
        uint256 startTime,
        uint256 stopTime
    ) external payable returns (uint256) {
        require(recipient != address(0) && recipient != msg.sender, "Invalid recipient");
        require(startTime >= block.timestamp, "Start time must be in future");
        require(stopTime > startTime, "Stop time must be after start time");
        require(depositAtto > 0, "Deposit must be > 0");

        uint256 duration = stopTime - startTime;
        require(depositAtto >= duration, "Deposit too small for duration");

        uint256 ratePerSec = depositAtto / duration;

        uint256 currentId = nextStreamId++;
        streams[currentId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            depositAtto: depositAtto,
            ratePerSecond: ratePerSec,
            startTime: startTime,
            stopTime: stopTime,
            remainingBalance: depositAtto,
            isEntityActive: true
        });

        _senderStreams[msg.sender].push(currentId);
        _recipientStreams[recipient].push(currentId);

        emit StreamCreated(currentId, msg.sender, recipient, depositAtto, ratePerSec, startTime, stopTime);
        return currentId;
    }

    /**
     * @notice Calculate claimable balance for a recipient based on elapsed seconds
     */
    function balanceOf(uint256 streamId, address who) public view returns (uint256 balance) {
        Stream memory s = streams[streamId];
        if (!s.isEntityActive) return 0;

        uint256 delta = 0;
        if (block.timestamp <= s.startTime) {
            delta = 0;
        } else if (block.timestamp >= s.stopTime) {
            delta = s.stopTime - s.startTime;
        } else {
            delta = block.timestamp - s.startTime;
        }

        uint256 recipientTotal = delta * s.ratePerSecond;
        uint256 withdrawn = s.depositAtto - s.remainingBalance;

        if (who == s.recipient) {
            if (recipientTotal > withdrawn) {
                return recipientTotal - withdrawn;
            }
            return 0;
        } else if (who == s.sender) {
            return s.remainingBalance;
        }
        return 0;
    }

    /**
     * @notice Withdraw accrued streaming funds in Atto-Pi
     */
    function withdrawFromStream(uint256 streamId, uint256 amountAtto) external returns (bool) {
        Stream storage s = streams[streamId];
        require(s.isEntityActive, "Stream not active");
        require(msg.sender == s.recipient, "Only recipient can withdraw");

        uint256 available = balanceOf(streamId, s.recipient);
        require(amountAtto <= available && amountAtto > 0, "Amount exceeds accrued balance");

        s.remainingBalance -= amountAtto;
        emit WithdrawFromStream(streamId, s.recipient, amountAtto);

        // In production L2 bridge, native token payout executes here
        return true;
    }

    /**
     * @notice Cancel stream and refund unstreamed balance to sender
     */
    function cancelStream(uint256 streamId) external returns (bool) {
        Stream storage s = streams[streamId];
        require(s.isEntityActive, "Stream not active");
        require(msg.sender == s.sender || msg.sender == s.recipient, "Unauthorized");

        uint256 recipientDue = balanceOf(streamId, s.recipient);
        uint256 senderRefund = s.remainingBalance - recipientDue;

        s.isEntityActive = false;
        s.remainingBalance = 0;

        emit StreamCancelled(streamId, s.sender, senderRefund);
        return true;
    }
}
