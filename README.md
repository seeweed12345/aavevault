<p align="center"><img src="http://etharemit.com/theme-assets/images/ETHA_Lend_prev.jpg" width="800" /></p>

<div align="center">
  <a href='https://t.me/ethalendcommunity' style="text-decoration:none;">
    <img src='https://img.shields.io/badge/chat-on%20telegram-9cf.svg?longCache=true' alt='Telegram' />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=ethalend">
        <img src="https://img.shields.io/twitter/follow/ethalend?style=social&logo=twitter"
            alt="follow on Twitter"></a>
   <a href='https://discord.com/invite/E9tqvR37Qs'>
    <img src='https://img.shields.io/badge/chat-on%20slack-brightgreen.svg?longCache=true' alt='Slack' />
  </a>
</div>

> Overview of the Ethereum Smart Contracts used for the ETHA Lend Protocol.

## Table of Contents

- [Contracts](#contracts)
- [Security](#security)
- [Development](#development)
- [Maintainers](#maintainers)
- [License](#license)

## Contracts

| Contract Name                                                                                                                        | Description                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [`SmartWallet`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/wallet/SmartWallet.sol)                      | Protocol wallets created and owned by each user.            |
| [`Registry`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/registry/EthaRegistry.sol)                                                             | Deploys and keeps track of all wallets inside the protocol. |
| [`Balances`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/adapters/Balances.sol)                          | Gets wallet balances.                                       |
| [`Investments`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/adapters/Investments.sol)                    | Gets invested balances in protocols.                        |
| [`ProtocolIsData`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/adapters/ProtocolsData.sol)               | Gets protocol Data.                                         |
| [`StakingRewards`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/staking/StakingRewards.sol)               | Gets Staking rewards.                                       |
| [`StakingRewardsFactory`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/staking/StakingRewardsFactory.sol) | Factory contract of StakingRewards.                         |
| [`StakingLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/StakingLogic.sol)                    | Enables users to provide liquidity for rewards.             |
| [`CompoundLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/CompoundLogic.sol)                  | Enables interaction with Compound Finance                   |
| [`CurveLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/CurveLogic.sol)                        | Enables interaction with CURVE Finance.                     |
| [`DyDxLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/DyDxLogic.sol)                          | Enables interaction with DyDx.                              |
| [`TransferLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/TransferLogic.sol)                  | Transfer Logic for the Staking contract.                    |
| [`UniswapLogic`](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/contracts/logics/UniswapLogic.sol)                    | Enables interaction with Uniswap.                           |

## Security

### Audit

The smart contracts were audited independently by
[Footprints Tech](https://www.linkedin.com/company/footprints-tech/)

**[Footprints Tech Audit Report](https://github.com/ethalend/ETHALend-v1-Contracts/blob/master/Audits/Etha_Lend_Audit_Final.pdf)**

### Code Coverage

All production smart contracts are tested and have 100% line and branch coverage.

### Vulnerability Disclosure Policy

The disclosure of security vulnerabilities helps us ensure the security of our users.

**How to report a security vulnerability?**

If you believe you’ve found a security vulnerability in one of our contracts
send it to us by emailing [security@etharemit.com](mailto:security@etharemit.com)
or get in touch with one of the [Maintainers](#maintainers).

Please include the following details with your report:

- A description of the location and potential impact of the vulnerability.

- A detailed description of the steps required to reproduce the vulnerability.

**Scope**

Any vulnerability not previously disclosed by us or our independent auditors in their reports.

**Guidelines**

We require that all reporters:

- Make every effort to avoid privacy violations, degradation of user experience,
  disruption to production systems, and destruction of data during security testing.

- Use the identified communication channels to report vulnerability information to us.

- Keep information about any vulnerabilities you’ve discovered confidential between yourself and ETHA Lend until we’ve had 30 days to resolve the issue.

If you follow these guidelines when reporting an issue to us, we commit to:

- Not pursue or support any legal action related to your findings.

- Work with you to understand and resolve the issue quickly
  (including an initial confirmation of your report within 72 hours of submission).

## Maintainers

- **Felipe Gomez**
  [@wafflemakr](https://t.me/wafflemakr)

- **Chester Bella**
  [@chesteretha](https://t.me/chesteretha)

- **Danny Boahen**
  [@dannyetha](https://t.me/dannyetha)

## License

[GPL-3.0 License](./blob/master/LICENSE)
