// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// there are some questions about StakedModeration.sol which can be answered by 
// creating and deploying a simple "proof of concept" contract. This contract
// will be deployed on Milkomeda C1 and will be used to test the User Experience
// and Developer Experience of wrapped smart contracts. I am also currious about
// what Mainnet specific data can be made available to the contract. For example,
// can the contract on Milkomeda access the stake balance of the account that 
// called it? Can it query the stake balance of any L1 account? Can we get the pool
// an account is delegated to? 

contract WrappedContractDemo {
    uint256 public counter;

    event CounterIncremented(address caller, uint256 callerbalance);

    constructor() {
        counter = 0;
    }

    function increment() public {
        counter++;
        emit CounterIncremented(msg.sender, msg.sender.balance);
    }


}