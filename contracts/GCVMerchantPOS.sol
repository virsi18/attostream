// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PiGCVOracle.sol";

/**
 * @title GCVMerchantPOS
 * @notice Decentralized Point-of-Sale (POS) & Instant Settlement Checkout for Merchants.
 * Allows merchants worldwide to list goods in local fiat (USD/IDR/EUR), and settle automatically
 * in exact Atto-Pi fractions at the $314,159 GCV standard rate without floating decimal loss.
 */
contract GCVMerchantPOS {
    PiGCVOracle public immutable oracle;
    address public governance;

    struct Invoice {
        uint256 invoiceId;
        address merchant;
        address customer;
        uint256 fiatAmountUsd8; // Price in USD with 8 decimals (e.g. $4.50 = 450000000)
        uint256 requiredAttoPi; // Precise required Atto-Pi
        string itemMetadata;    // SKU or description (e.g. "Espresso + Croissant")
        bool isSettled;
        uint256 paidTimestamp;
    }

    uint256 public invoiceCounter = 5000;
    mapping(uint256 => Invoice) public invoices;
    mapping(address => uint256) public merchantAttoBalance;

    event InvoiceCreated(uint256 indexed invoiceId, address indexed merchant, uint256 fiatAmountUsd8, uint256 requiredAttoPi);
    event InvoicePaid(uint256 indexed invoiceId, address indexed customer, address indexed merchant, uint256 paidAtto);
    event MerchantWithdrawn(address indexed merchant, uint256 amountAtto);

    constructor(address _oracleAddress) {
        oracle = PiGCVOracle(_oracleAddress);
        governance = msg.sender;
    }

    /**
     * @notice Create a point-of-sale invoice priced in USD
     * Automatically queries PiGCVOracle for exact Atto-Pi conversion
     */
    function createInvoice(uint256 fiatAmountUsd8, string calldata metadata) external returns (uint256) {
        require(fiatAmountUsd8 > 0, "Price must be > 0");

        uint256 requiredAtto = oracle.usdToAttoPi(fiatAmountUsd8);
        uint256 invId = invoiceCounter++;

        invoices[invId] = Invoice({
            invoiceId: invId,
            merchant: msg.sender,
            customer: address(0),
            fiatAmountUsd8: fiatAmountUsd8,
            requiredAttoPi: requiredAtto,
            itemMetadata: metadata,
            isSettled: false,
            paidTimestamp: 0
        });

        emit InvoiceCreated(invId, msg.sender, fiatAmountUsd8, requiredAtto);
        return invId;
    }

    /**
     * @notice Pay an open invoice using Atto-Pi
     */
    function payInvoice(uint256 invoiceId) external payable returns (bool) {
        Invoice storage inv = invoices[invoiceId];
        require(!inv.isSettled, "Invoice already settled");
        require(inv.merchant != address(0), "Invoice does not exist");

        inv.isSettled = true;
        inv.customer = msg.sender;
        inv.paidTimestamp = block.timestamp;

        merchantAttoBalance[inv.merchant] += inv.requiredAttoPi;

        emit InvoicePaid(invoiceId, msg.sender, inv.merchant, inv.requiredAttoPi);
        return true;
    }

    /**
     * @notice Merchant withdraws accumulated Atto-Pi revenue
     */
    function merchantWithdraw(uint256 amountAtto) external returns (bool) {
        require(merchantAttoBalance[msg.sender] >= amountAtto && amountAtto > 0, "Insufficient balance");
        merchantAttoBalance[msg.sender] -= amountAtto;
        emit MerchantWithdrawn(msg.sender, amountAtto);
        return true;
    }
}
