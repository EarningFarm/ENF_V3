const { ethers, waffle, network, upgrades } = require("hardhat");
const { expect, util } = require("chai");
const colors = require("colors")
const { utils } = require("ethers");

const { usdcContract, uniV2RouterContract, uniV2FactoryContract } = require("./externalContracts")

const { usdc, weth, convexBooster, compoundPid, compoundLP, curveCompound } = require("../constants/constants")

let vault, controller, compound, depositApprover

function toEth(num) {
    return utils.formatEther(num)
}

function toUSDC(num) {
    return utils.formatUnits(num, 6)
}

function fromEth(num) {
    return utils.parseEther(num.toScompoundng())
}

function fromUSDC(num) {
    return utils.parseUnits(num.toScompoundng(), 6)
}

async function swapUSDC(caller) {

    await uniV2RouterContract(caller).swapExactETHForTokens(
        0,
        [
            weth, usdc
        ],
        caller.address,
        100000000000,
        { value: fromEth(1) }
    )
}

describe("ENF Vault test", async () => {
    before(async () => {
        [deployer, alice, bob, carol, david, evan, fiona, treasury] = await ethers.getSigners();

        // Deploy DepositApprover
        console.log("Deploying DepositApprover".green)
        const DepositApprover = await ethers.getContractFactory("DepositApprover")
        depositApprover = await DepositApprover.deploy(usdc)
        console.log(`DepositApprover deployed at: ${depositApprover.address}\n`)

        // Deploy Vault
        console.log("Deploying Vault".green)
        const Vault = await ethers.getContractFactory("EFVault")
        vault = await Vault.deploy(usdc, "ENF LP", "ENF")
        console.log(`Vault deployed at: ${vault.address}\n`)

        // Deploy Controller
        console.log("Deploying Controller".green)
        const Controller = await ethers.getContractFactory("Controller")
        controller = await Controller.deploy(vault.address, usdc, treasury.address)
        console.log(`Controller deployed at: ${controller.address}\n`)

        // Deploy Compound
        console.log("Deploying COMPOUND".green)
        const Compound = await ethers.getContractFactory("Compound")
        compound = await Compound.deploy(curveCompound, compoundLP, controller.address, usdc, convexBooster, compoundPid)
        console.log(`Compound deployed at: ${compound.address}\n`)

        /**
         * Wiring Contracts with each other 
         */

        // Set Vault on deposit approver
        await depositApprover.setVault(vault.address)
        console.log("Deposit Approver set Vault")

        // Set deposit approver to vault
        await vault.setDepositApprover(depositApprover.address)
        console.log("Vault set deposit approver")

        // Set Controller to vault
        await vault.setController(controller.address)
        console.log("Controller set Vault")

        /**
         * Set configuration
         */

        // Set DepositSlippage on COMPOUND
        await compound.setDepositSlippage(100)
        console.log("Deposit slippage set")

        // Set WithdrawSlippage on COMPOUND
        await compound.setWithdrawSlippage(100)
        console.log("Withdraw slippage set")
    })

    it("Vault Deployed", async () => {
        const name = await vault.name()
        const symbol = await vault.symbol()
        const asset = await vault.asset()
        console.log("\tVault info: ", name, symbol, asset)
    })

    // Prepare USDC before
    it("Swap Ether to usdc in uniswap V2", async () => {
        // USDC current amt
        const curUSDC = await usdcContract(deployer).balanceOf(alice.address)
        console.log(`\tUSDC of Alice: ${toUSDC(curUSDC)}`)

        const pair = await uniV2FactoryContract(deployer).getPair(usdc, weth)
        console.log(`\tUSDC-ETH pair address: ${pair}`)

        await swapUSDC(alice)

        const newUSDC = await usdcContract(deployer).balanceOf(alice.address)
        console.log(`\tUSDC of Alice: ${toUSDC(newUSDC)}`)
    })

    // Register Compound SS
    it("Register Compound with non-owner will be reverted", async () => {
        await expect(controller.connect(alice).registerSubStrategy(compound.address, 100)).to.revertedWith("Ownable: caller is not the owner")
    })

    it("Register Compound as 100 alloc point, check total alloc to be 100, ss length to be 1", async () => {
        await controller.connect(deployer).registerSubStrategy(compound.address, 100)
        const totalAlloc = await controller.totalAllocPoint()
        const ssLength = await controller.subStrategyLength()

        console.log(`\tTotal Alloc: ${totalAlloc.toNumber()}, ssLength: ${ssLength.toNumber()}`)
        expect(totalAlloc).to.equal(100)
        expect(ssLength).to.equal(1)
    })

    it("Register Compound will be reverted for duplication", async () => {
        await expect(controller.connect(deployer).registerSubStrategy(compound.address, 100)).to.revertedWith("ALREADY_REGISTERED")
    })

    ///////////////////////////////////////////////////
    //                 DEPOSIT                       //
    ///////////////////////////////////////////////////
    it("Deposit 100 USDC", async () => {
        // Approve to deposit approver
        await usdcContract(alice).approve(depositApprover.address, fromUSDC(100))

        // Deposit
        await depositApprover.connect(alice).deposit(fromUSDC(100))

        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)

        // Read ENF token Mint
        const enf = await vault.balanceOf(alice.address)
        console.log(`\tAlice ENF Balance: ${toEth(enf)}`)
    })

    ///////////////////////////////////////////////////
    //                WITHDRAW                       //
    ///////////////////////////////////////////////////
    it("Withdraw 90 USDC", async () => {
        await vault.connect(alice).withdraw(fromUSDC(90), alice.address);
        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)

        // Read ENF token Mint
        const enf = await vault.balanceOf(alice.address)
        console.log(`\tAlice ENF Balance: ${toEth(enf)}`)
    })

    it("Withdraw 10 USDC will be reverted", async () => {
        await expect(vault.connect(alice).withdraw(fromUSDC(10), alice.address)).to.revertedWith("INVALID_WITHDRAWN_SHARES")
    })

    it("Deposit 1000 USDC", async () => {
        // Approve to deposit approver
        await usdcContract(alice).approve(depositApprover.address, fromUSDC(1000))

        // Deposit
        await depositApprover.connect(alice).deposit(fromUSDC(1000))

        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)

        // Read ENF token Mint
        const enf = await vault.balanceOf(alice.address)
        console.log(`\tAlice ENF Balance: ${toEth(enf)}`)
    })

    //////////////////////////////////////////////////
    //                  HARVEST                     //
    //////////////////////////////////////////////////
    it("Harvest from COMPOUND", async () => {
        await controller.connect(deployer).harvest()

        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)
    })

    //////////////////////////////////////////////////
    //                 EMERGENCY WITHDRW            //
    //////////////////////////////////////////////////
    it("Emergency Withdraw from Compound", async () => {
        await compound.connect(deployer).emergencyWithdraw()

        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)

        // Read LP Amount
        const lp = await compoundLP.balanceOf(deployer.address)
        console.log(`\tLP Balance: ${toEth(lp)}`)
    })

    ///////////////////////////////////////////////////
    //               Owner Deposit                   //
    ///////////////////////////////////////////////////
    it("Owner Deposit to Compound", async () => {
        // Approve to deposit approver
        await usdcContract(deployer).approve(compound.address, fromUSDC(1000))

        await compound.connect(deployer).ownerDeposit(fromUSDC(1000))

        // Read Total Assets
        const total = await vault.totalAssets()
        console.log(`\tTotal USDC Balance: ${toUSDC(total)}`)
    })
})