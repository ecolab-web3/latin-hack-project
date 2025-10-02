# MetaMask Delegation Toolkit

The MetaMask Delegation Toolkit is built on top of [viem](https://viem.sh) which enables developers to create smart accounts and frictionless new experiences based on granular permission sharing and trust.

## Features
---
- **Smart Account Support**: Provides high-level API for deploying, and managing MetaMask smart account.
- **Delegation Framework Support**: Comprehensive support for [ERC-7710](https://eips.ethereum.org/EIPS/eip-7710) to create, manage, and redeem delegations.
- **Prebuilt Caveat Enforcers**: Prebuilt caveat enforcers for adding restrictions and conditions to delegations.
- **Modular and Extensible**: Enables configuration of custom bundlers, paymasters, signers, and specialized caveat enforcers.
- and many more...


## Installation
---

Yarn:
```
yarn add @metamask/delegation-toolkit
```

Npm:
```
npm install @metamask/delegation-toolkit
```

## Usage 
---

### Create a Smart Account

```ts
import { createPublicClient, http } from "viem";
import { lineaSepolia as chain } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  Implementation,
  toMetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";

const publicClient = createPublicClient({
  chain,
  transport: http(),
});

const delegatorAccount = privateKeyToAccount("0x...");

const delegatorSmartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [delegatorAccount.address, [], [], []],
  deploySalt: "0x",
  signatory: { account: delegatorAccount },
});
```

### Create a Delegation

```ts
import { createDelegation } from "@metamask/delegation-toolkit";

// Delegate account can either be a Smart Account or an EOA.
const delegateAccount = "0x1ac.."

const delegation = createDelegation({
  to: delegateAccount,
  from: delegatorSmartAccount.address,
  // Empty caveats array - we recommend adding appropriate restrictions.
  caveats: createCaveatBuilder({
   environment,
   allowEmptyCaveats: true,
  }),
});

// Sign the delegation using delegator's smart account.
const signature = await delegatorSmartAccount.signDelegation({
  delegation
});

const signedDelegation = {
  ...delegation,
  signature,
};
```

### Redeem a Delegation

```ts
import { createBundlerClient } from "viem/account-abstraction";
import {
  createExecution,
  DelegationFramework,
  SINGLE_DEFAULT_MODE,
} from "@metamask/delegation-toolkit";
import { zeroAddress } from "viem";

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://your-bundler-rpc.com"),
});

// Use the signed delegation
const delegations = [ signedDelegation ];

// Sends 0 ETH to zero address(0x0000000000000000000000000000000000000000)
const executions = [{
  target: zeroAddress,  
  value: 0n, 
  callData: "0x"
}];

const redeemDelegationCalldata = DelegationFramework.encode.redeemDelegations({
  delegations: [ delegations ],
  modes: [ SINGLE_DEFAULT_MODE ],
  executions: [ executions ]
});

// Assuming delegate account is a smart account. To learn how to redeem a 
// delegation with EOA, please head to the documentation.
// https://docs.gator.metamask.io/how-to/redeem-delegation#redeem-with-an-eoa
const userOperationHash = await bundlerClient.sendUserOperation({
  account: delegateSmartAccount,
  calls: [
    {
      to: delegateSmartAccount.address,
      data: redeemDelegationCalldata
    }
  ],
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
});
```

## Documentation
---
[Head to our documentation](https://docs.gator.metamask.io) to learn more about the Delegation Toolkit.

## Contributing
---

If you're interested in contributing, please see our full [contributing guide](/CONTRIBUTING.md).
