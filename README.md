# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

Wrapped Contract Demo
=====================
Milkomeda deployments:
1. 0xdce042ec646cada182dfc8CddD4A1c3565a6E8aE

## Contestation Period Explanation

This is the period of time during which a contestation can be voted on. The target is 1 day. The average block time of milkomeda is is about 2 seconds. So the contestion period is 43200 (seconds in a day divided by 2) blocks. 

## Vote Weight Explanation

When you cast your vote only HOW you will vote is recorded. The weight of your vote is determinded by looking at your balance AFTER the contestation period has ended. This is triggered by `distributeContestation`, which can be called by anyone after the contestation period has ended. This helps ensure a policy of "1 ada = 1 vote" is maintained.