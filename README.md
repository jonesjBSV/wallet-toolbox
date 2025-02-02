# BSV WALLET TOOLBOX

BSV BLOCKCHAIN | BRC100 Conforming Wallet, Wallet Storage and Wallet Signer Components

The BSV Wallet Toolbox builds on the [SDK](https://bitcoin-sv.github.io/ts-sdk) to add support for:

    - Persistent UTXO and transaction history management
    - Standardized key derivation protocols.

# Table of Contents

- [Objective](#objective)
- [Getting Started](#getting-started)
- [Features \& Deliverables](#features--deliverables)
- [Documentation](#documentation)
- [Contribution Guidelines](#contribution-guidelines)
- [Support \& Contacts](#support--contacts)
- [License](#license)

## Objective

The BSV Wallet Toolbox Project aims to support building sophisticated applications and services on the BSV Blockchain technology stack.

By providing interlocking building blocks for persistent storage and protocol based key derivation, it serves as an essential toolbox for developers looking to build on the BSV Blockchain.

## Getting Started

### Installation

To install the toolbox, run:

```bash
npm install @bsv/wallet-toolbox
```

### Basic Usage

Here's a simple example of using the toolbox to create and fund a testnet wallet using SQLite for persistent storage:

```ts
import { InternalizeActionArgs, PrivateKey, Utils } from '@bsv/sdk'
import { Setup } from '@bsv/wallet-toolbox'

const rootKeyHex = PrivateKey.fromRandom().toString()
console.log(`MAKE A SECURE COPY OF YOUR WALLET PRIVATE ROOT KEY: ${rootKeyHex}`)

const { wallet } = await Setup.createSQLiteWallet({
    filePath: './myTestWallet.sqlite',
    databaseName: 'myTestWallet',
    chain: 'test',
    rootKeyHex
})

// Obtain a Wallet Payment for your new wallet from a testnet funding faucet.
// Update or replace the values in the following example object with your actual funding payment.
// Note that the values below will not be accepted as they are not intended for your new wallet.
const r = {
    senderIdentityKey: '03ac2d10bdb0023f4145cc2eba2fcd2ad3070cb2107b0b48170c46a9440e4cc3fe',
    vout: 0,
    txid: '942f094cee517276182e5857369ea53d64763a327d433489312a9606db188dfb',
    derivationPrefix: 'jSlU588BWkw=',
    derivationSuffix: 'l37vv/Bn4Lw=',
    atomicBEEF: '01010101942f094cee517...a914b29d56273f6c1df90cd8f383c8117680f2bdd05188ac00000000'
}

const args: InternalizeActionArgs = {
    tx: Utils.toArray(r.atomicBEEF, 'hex'),
    outputs: [
        {
            outputIndex: r.vout,
            protocol: 'wallet payment',
            paymentRemittance: {
                derivationPrefix: r.derivationPrefix,
                derivationSuffix: r.derivationSuffix,
                senderIdentityKey: r.senderIdentityKey
            }
        }
    ],
    description: 'from faucet'
}

const rw = await wallet.internalizeAction(args)
console.log(rw.accepted)
```

For a more detailed tutorial and advanced examples, check our [Documentation](#documentation).

## Features & Deliverables

- **Feature1**: Summary of feature1.

## Documentation

[The Docs](https://bitcoin-sv.github.io/wallet-toolbox) are available here on Github pages.  
[Example code](https://docs.bsvblockchain.org/guides/sdks/ts/examples) is available over on our gitbook.  

The Toolbox is richly documented with code-level annotations. This should show up well within editors like VSCode.  

## Contribution Guidelines

We're always looking for contributors to help us improve the SDK. Whether it's bug reports, feature requests, or pull requests - all contributions are welcome.

1. **Fork & Clone**: Fork this repository and clone it to your local machine.
2. **Set Up**: Run `npm install` to install all dependencies.
3. **Make Changes**: Create a new branch and make your changes.
4. **Test**: Ensure all tests pass by running `npm test`.
5. **Commit**: Commit your changes and push to your fork.
6. **Pull Request**: Open a pull request from your fork to this repository.
For more details, check the [contribution guidelines](./CONTRIBUTING.md).

## Support & Contacts

Project Owners: Thomas Giacomo and Darren Kellenschwiler

Development Team Lead: Ty Everett

For questions, bug reports, or feature requests, please open an issue on GitHub or contact us directly.

## License

The license for the code in this repository is the Open BSV License. Refer to [LICENSE.txt](./LICENSE.txt) for the license text.

Thank you for being a part of the BSV Blockchain Libraries Project. Let's build the future of BSV Blockchain together!
