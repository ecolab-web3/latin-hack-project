# Polkadot Development Agent Guide

_Comprehensive instructions for AI agents helping developers build on Polkadot_

## CRITICAL: Project Initialization

**ALWAYS start new projects with kitdot:**

```bash
npm install -g kitdot
kitdot init project-name
cd project-name
```

**Existing projects:** Recommend starting fresh with kitdot and copying files over to avoid configuration conflicts.

**Why kitdot?** Ensures proper network settings, correct dependencies, and battle-tested configurations. Eliminates setup headaches.

## Build & Commands

### Essential Commands

```bash
# Project setup (RECOMMENDED)
kitdot init project-name

# Manual setup (if kitdot unavailable)
npm install --save-dev @parity/hardhat-polkadot solc@0.8.28
npm install --force @nomicfoundation/hardhat-toolbox
npx hardhat-polkadot init

# Development workflow
npx hardhat compile                    # Compile contracts
npx hardhat test                       # Run tests
npx hardhat ignition deploy ./ignition/modules/Module.js --network passetHub

# Private key setup
npx hardhat vars set PRIVATE_KEY       # No 0x prefix

# Get testnet tokens
# Visit: https://faucet.polkadot.io/?parachain=1111

# Debugging commands
npx hardhat clean                      # Clean build artifacts
rm -rf ignition/deployments/          # Reset deployment state
npx hardhat console --network passetHub
```

## Network Configuration

### Paseo TestNet (Primary)

- **Chain ID:** 420420422 (0x1911f0a6)
- **RPC:** https://testnet-passet-hub-eth-rpc.polkadot.io
- **Explorer:** https://blockscout-passet-hub.parity-testnet.parity.io
- **Faucet:** https://faucet.polkadot.io/?parachain=1111
- **Currency:** PAS

### Required Hardhat Configuration

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@parity/hardhat-polkadot");
const { vars } = require("hardhat/config");

module.exports = {
  solidity: "0.8.28",
  resolc: { version: "0.3.0", compilerSource: "npm" },
  networks: {
    passetHub: {
      polkavm: true,
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: [vars.get("PRIVATE_KEY")],
    },
  },
};
```

## Code Style & Conventions

### Contract Development

- **Solidity Version:** ^0.8.28 (REQUIRED)
- **Contract Size:** Maximum ~100KB bytecode
- **Dependencies:** Avoid OpenZeppelin (causes size issues)
- **Optimization:** Use minimal custom implementations

### Writing Style (For Documentation)

**Core Principles (Zinsser Method):**

- **Active voice:** "Deploy the contract" not "The contract should be deployed"
- **Lead with results:** State what happens, then explain how
- **Brevity:** Cut qualifiers like "very", "quite", "rather"
- **Simple words:** Use "use" not "utilize", "do" not "implement"
- **Commands over descriptions:** Provide exact CLI commands
- **Examples over abstractions:** Point to real files

**Clutter Elimination:**

- Cut qualifiers: "very", "quite", "rather", "somewhat", "pretty much"
- Remove redundant pairs: "each and every", "first and foremost"
- Eliminate throat-clearing: "It is important to note that", "The fact that"
- Avoid inflated phrases: Use "now" not "at this point in time"
- Delete meaningless jargon: "utilize" → "use", "implement" → "do"

**Technical Documentation Rules:**

- Start with what it does, not how it works
- Use concrete examples over abstract descriptions
- Write instructions as commands: "Run tests" not "You should run tests"
- Test your writing: Can someone follow it without you there?
- Assume intelligence but not knowledge

**The Zinsser Test:**

1. Can I cut this sentence in half?
2. Is there a simpler word?
3. Does the reader need to know this?
4. Am I saying this twice?

## Common Errors & Solutions

### "CodeRejected" Error

- **Cause:** Missing PolkaVM configuration
- **Solution:** Ensure `polkavm: true` in network config and include resolc block

### "initcode is too big" Error

- **Cause:** Contract exceeds 100KB limit
- **Solution:** Remove OpenZeppelin dependencies, use minimal implementations

### Configuration Errors

- **Cause:** Incorrect Solidity version format
- **Solution:** Use string format: `solidity: "0.8.28"`

### Dependency Issues

- **Solution:** Install with `--force` flag, clear node_modules if needed

## Testing

### Test Frameworks

- **Primary:** Hardhat's built-in testing
- **Network:** Local hardhat network for development
- **Staging:** Paseo testnet for integration testing

### Test Commands

```bash
npx hardhat test                       # Run all tests
npx hardhat test test/specific.js      # Run specific test
npx hardhat test --network NETWORK_NAME   # Test on Paseo
```

## Architecture

### Technology Stack

- **Smart Contracts:** Solidity ^0.8.28
- **Development:** Hardhat + @parity/hardhat-polkadot
- **Client Libraries:** PAPI (recommended), Dedot, or Ethers.js
- **Frontend:** ReactiveDOT for React/Vue, standard Web3 libraries
- **Testing:** Chopsticks for network forking, Zombienet for multi-node

### Project Structure

```
project/
├── contracts/           # Solidity contracts
├── ignition/modules/    # Deployment scripts
├── test/               # Test files
├── frontend/           # Frontend application
└── hardhat.config.js   # Network configuration
```

### Development Environments

- **Remix IDE:** Browser-based, good for beginners
- **Hardhat:** Local development, recommended for complex projects
- **kitdot:** Automated setup with templates

## Security

### Private Key Management

- **NEVER commit private keys**
- **Use:** `npx hardhat vars set PRIVATE_KEY`
- **Format:** No 0x prefix in vars
- **Testnet only:** Paseo is for testing, not production value

### Contract Security

- **Access controls:** Implement proper ownership patterns
- **Reentrancy:** Use simple guards instead of OpenZeppelin
- **Input validation:** Validate all external inputs
- **Code verification:** Verify contracts on block explorer

### Simple Security Patterns

```solidity
// Minimal Ownable
contract SimpleOwnable {
    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    constructor() { owner = msg.sender; }
}

// Minimal Reentrancy Guard
contract SimpleReentrancyGuard {
    bool private locked;
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true; _; locked = false;
    }
}
```

## Workflows

### Deployment Process

1. **Compile:** `npx hardhat compile`
2. **Test locally:** `npx hardhat test`
3. **Deploy to testnet:** `npx hardhat ignition deploy ./ignition/modules/Module.js --network passetHub`
4. **Verify:** Check on block explorer
5. **Test integration:** Verify frontend connection

## Troubleshooting Checklist

When deployment fails:

- [ ] **Used kitdot init** for setup (recommended first step)
- [ ] Hardhat config matches exact format above
- [ ] Private key set via `npx hardhat vars set PRIVATE_KEY`
- [ ] Account has sufficient PAS tokens
- [ ] Contract compiles without errors
- [ ] Contract size under 100KB
- [ ] Network connectivity to RPC endpoint
- [ ] No OpenZeppelin dependencies causing size issues
- [ ] Clean deployment state: `rm -rf ignition/deployments/`

## Development Tools Reference

### Core Development Stack (2025)

| Tool            | Type             | Description                                                   | Use Case                         | Link                                                                  |
| --------------- | ---------------- | ------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| **PAPI**        | Client Library   | TypeScript client, light client first, strongly typed         | Frontend & Node dApps            | [papi.how](https://papi.how)                                          |
| **Dedot**       | Client Library   | Lightweight, tree-shakable JS client with multi-chain support | Lean multi-chain dApps           | [dedotdev/dedot](https://github.com/dedotdev/dedot)                   |
| **ReactiveDOT** | Frontend Layer   | Reactive bindings over PAPI for smooth UI data flows          | React/Vue applications           | [reactivedot.dev](https://reactivedot.dev/)                           |
| **POP CLI**     | Development Tool | Scaffolds chains and contracts, automates local networks      | Project scaffolding & deployment | [onpop.io](https://onpop.io/)                                         |
| **Paraspell**   | XCM SDK          | Unified XCM interface supporting PAPI and polkadot.js         | Cross-chain transfers            | [paraspell/xcm-tools](https://github.com/paraspell/xcm-tools)         |
| **Chopsticks**  | Testing Tool     | Fork live networks locally for safe testing                   | Pre-mainnet validation           | [AcalaNetwork/chopsticks](https://github.com/AcalaNetwork/chopsticks) |

### Development Environments

| Tool          | Type                  | Description                                | Best For             | Link                                           |
| ------------- | --------------------- | ------------------------------------------ | -------------------- | ---------------------------------------------- |
| **Remix IDE** | Browser IDE           | Web-based smart contract development       | Quick prototyping    | [remix.polkadot.io](https://remix.polkadot.io) |
| **Hardhat**   | Development Framework | Local development environment with testing | Complex projects     | [hardhat.org](https://hardhat.org/)            |
| **Foundry**   | Development Toolchain | Smart contract development and testing     | Advanced development | [getfoundry.sh](https://getfoundry.sh/)        |

### Wallets & Connectivity

| Wallet          | Type              | Description                                | Features                  | Link                                        |
| --------------- | ----------------- | ------------------------------------------ | ------------------------- | ------------------------------------------- |
| **Talisman**    | Browser/Mobile    | Multi-chain wallet for Polkadot & Ethereum | Substrate + EVM support   | [talisman.xyz](https://talisman.xyz/)       |
| **Nova Wallet** | Mobile            | Next-gen iOS & Android wallet              | Advanced staking features | [novawallet.io](https://novawallet.io/)     |
| **SubWallet**   | Browser/Mobile    | Comprehensive Polkadot ecosystem wallet    | Multi-chain support       | [subwallet.app](https://www.subwallet.app/) |
| **MetaMask**    | Browser Extension | Standard Ethereum wallet                   | EVM compatibility         | [metamask.io](https://metamask.io/)         |
| **Polkagate**   | Browser Extension | Easy-to-use Polkadot extension             | Simple interface          | [polkagate.xyz](https://polkagate.xyz/)     |

### Frontend Libraries

| Library       | Language   | Description                  | Use Case              | Link                                        |
| ------------- | ---------- | ---------------------------- | --------------------- | ------------------------------------------- |
| **Ethers.js** | JavaScript | Contract interaction library | Standard Web3 apps    | [docs.ethers.org](https://docs.ethers.org/) |
| **Web3.js**   | JavaScript | Web3 interaction library     | Legacy Web3 apps      | [web3js.org](https://web3js.org/)           |
| **Viem**      | TypeScript | Modern Web3 library          | Type-safe development | [viem.sh](https://viem.sh/)                 |
| **Wagmi**     | React      | React hooks for Web3         | React applications    | [wagmi.sh](https://wagmi.sh/)               |

### Smart Contract Development

| Tool                        | Language | Description                     | Use Case                   | Link                                                                                                          |
| --------------------------- | -------- | ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **ink!**                    | Rust     | Rust smart contract language    | Native Polkadot contracts  | [use.ink](https://use.ink/)                                                                                   |
| **Solidity**                | Solidity | Ethereum-compatible contracts   | EVM-compatible development | [soliditylang.org](https://soliditylang.org/)                                                                 |
| **OpenZeppelin (Polkadot)** | Solidity | Size-optimized contract library | Standard implementations   | [papermoonio/openzeppelin-contracts-polkadot](https://github.com/papermoonio/openzeppelin-contracts-polkadot) |

### Testing & Simulation

| Tool           | Type              | Description                    | Use Case                 | Link                                                                  |
| -------------- | ----------------- | ------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| **Chopsticks** | Network Fork      | Fork live networks for testing | Safe testing environment | [AcalaNetwork/chopsticks](https://github.com/AcalaNetwork/chopsticks) |
| **Zombienet**  | Network Simulator | Ephemeral test networks        | Multi-node testing       | [paritytech/zombienet](https://github.com/paritytech/zombienet)       |

### Monitoring & Analytics

| Tool          | Type           | Description                       | Use Case               | Link                                      |
| ------------- | -------------- | --------------------------------- | ---------------------- | ----------------------------------------- |
| **Subscan**   | Block Explorer | Comprehensive blockchain explorer | Transaction monitoring | [subscan.io](https://subscan.io/)         |
| **Statescan** | Block Explorer | Alternative blockchain explorer   | Block exploration      | [statescan.io](https://www.statescan.io/) |

### Cross-Chain & Interoperability

| Tool           | Type            | Description                         | Use Case             | Link                                                          |
| -------------- | --------------- | ----------------------------------- | -------------------- | ------------------------------------------------------------- |
| **Snowbridge** | Bridge          | Ethereum <> Polkadot bridge         | ETH interoperability | [Snowfork/snowbridge](https://github.com/Snowfork/snowbridge) |
| **Bagpipes**   | No-Code Builder | Drag-and-drop cross-chain workflows | Demos & operations   | [bagpipes.io](https://bagpipes.io/)                           |

### Template Projects

- **kitdot init:** Multiple configured templates (RECOMMENDED)
- **create-polkadot-dapp:** React + Hardhat template
- **hardhat-polkadot-example:** Contract examples

### Recommended Development Stack

**For Beginners:**

- **IDE:** Remix IDE (browser-based)
- **Wallet:** Talisman or MetaMask
- **Testing:** Built-in Remix tools
- **Resources:** Official tutorials and documentation

**For Experienced Developers:**

- **Framework:** Hardhat + @parity/hardhat-polkadot
- **Client Library:** PAPI or Dedot
- **Frontend:** ReactiveDOT for React/Vue
- **Testing:** Chopsticks for network forking
- **Deployment:** POP CLI → Polkadot Deployment Portal
- **Cross-chain:** Paraspell XCM SDK

**For Production Applications:**

- **Infrastructure:** Polkadot Cloud
- **Monitoring:** Subscan + custom analytics
- **Security:** Multi-signature wallets
- **Cross-chain:** Battle-tested bridges (Snowbridge)
- **User Experience:** Light client integration

## Quick Start Paths

### Path 1: kitdot (Recommended)

1. `npm install -g kitdot`
2. `kitdot init my-project`
3. Choose template
4. Start building

### Path 2: Manual Hardhat (Advanced)

1. Manual dependency installation
2. Custom configuration
3. More control, more setup complexity

### Remix IDE (Beginners)

1. Open [Polkadot Remix IDE](https://remix.polkadot.io)
2. Get testnet tokens from [faucet](https://faucet.polkadot.io/?parachain=1111)
3. Start coding in browser

## Project Ideas for Hackathons

**Proven Simple Ideas:**

- **Custom Token:** ERC-20 implementation
- **NFT Collection:** Minimal ERC-721
- **Simple DeFi:** Basic AMM or lending
- **Cross-chain:** XCM message passing

**Success Strategy:**

1. Start with kitdot template
2. Focus on core functionality
3. Deploy early and often
4. Test on Paseo thoroughly
5. Build simple, working demo

## Limitations & Workarounds

### Current Limitations

- **Contract Size:** 100KB bytecode limit
- **OpenZeppelin:** Most libraries too large
- **Network Stability:** Preview release status
- **Documentation:** Community-driven solutions

### Recommended Workarounds

- **Size Issues:** Custom minimal implementations
- **Complex Logic:** Split across multiple contracts
- **Testing:** Extensive local testing before deployment
- **User Experience:** Clear error messages and fallbacks

---

**Remember:** Use kitdot for project initialization. It handles network configuration, dependency management, and provides battle-tested templates. Alternative tools available but kitdot ensures proper setup.
