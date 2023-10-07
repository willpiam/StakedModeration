import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

class Server {
  signer: any;

  constructor() {
    this.signer = ethers.Wallet.createRandom();
  }

  get signerAddress() {
    return this.signer.address;
  }

  addPost(certificate: string, posterSignature: string) {
    // decode the certificate (first 32 bytes is the poster address)



  }


}

describe("StakedModeration", function () {
  let sm: any;
  let stAda: any;
  let server: Server;


  const posters: any[] = [];
  const moderators: any[] = [];

  before(async function () {
    server = new Server();
    console.log(`Server address: ${server.signerAddress}`)
    const wallets: any[] = await ethers.getSigners();

    for (let i = 1; i < wallets.length; i++) {
      if (i % 2 == 0) {
        posters.push(wallets[i]);
        continue;
      }
      moderators.push(wallets[i]);
    }

    stAda = await ethers.deployContract("StakedMADA");

    // mint a random amount into each wallet
    for (let i = 0; i < wallets.length; i++) {
      const amount = Math.floor(Math.random() * 1000);
      await stAda.mint(wallets[i].address, amount);
    }

  });

  it("Staked Moderation", async function () {
    sm = await ethers.deployContract("StakedModeration", [server.signerAddress, await stAda.getAddress()]);
    await sm.waitForDeployment();
    const settings = await sm.settings();
    console.log(settings)
  });

  it("Posters can stake and unstake", async function () {
    const poster = posters[0];
    const amount = (await sm.settings())[0];

    console.log(`Depositing ${amount} from ${poster.address}`)
    const contractAddress = await sm.getAddress();

    const contractbalance_t1 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t1).to.equal(0n);

    const smPoster = sm.connect(poster);
    await smPoster.depositPosterStake(poster.address, { value: amount });

    const contractbalance_t2 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t2).to.equal(amount);

    // At this moment the poster has the right to post on the forum

    // Now the poster wants to withdraw his stake
    await smPoster.withdrawPosterStake();

    const contractbalance_t3 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t3).to.equal(0n);
  });

  it("Moderators can stake and unstake", async function () {
    const moderator = moderators[0];
    const amount = (await sm.settings())[1];

    console.log(`Depositing ${amount} from ${moderator.address}`)
    const contractAddress = await sm.getAddress();

    const contractbalance_t1 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t1).to.equal(0n);

    const smModerator = sm.connect(moderator);
    await smModerator.depositModeratorStake(moderator.address, { value: amount });

    const contractbalance_t2 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t2).to.equal(amount);

    // At this moment the moderator has the right to moderate the forum

    // Now the moderator wants to withdraw his stake
    await smModerator.withdrawModeratorStake();

    const contractbalance_t3 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t3).to.equal(0n);
  })

  it("Poster and moderator restake", async function () {
    const poster = posters[0];
    const moderator = moderators[0];

    const settings = await sm.settings();
    const posterDeposit = settings[0];
    const moderatorDeposit = settings[1];

    const contractAddress = await sm.getAddress();
    const contractbalance_t1 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t1).to.equal(0n);

    const smPoster = sm.connect(poster);
    const smModerator = sm.connect(moderator);

    await smPoster.depositPosterStake(poster.address, { value: posterDeposit });
    await smModerator.depositModeratorStake(moderator.address, { value: moderatorDeposit });

    const contractbalance_t2 = await ethers.provider.getBalance(contractAddress);
    expect(contractbalance_t2).to.equal(posterDeposit + moderatorDeposit);
  });

  it("Create and contest a post", async function () {
    const smModerator = sm.connect(moderators[0]);

    const contestationFee = (await sm.settings())[2];
    console.log(`Contestation fee: ${contestationFee} or (${ethers.formatEther(contestationFee)} ETH)`)

    const postCertificate = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [posters[0].address]);
    console.log(`Post certificate: ${postCertificate}`)

    const serverSignature = await server.signer.signMessage(ethers.getBytes(ethers.keccak256(postCertificate)));
    const posterSignature = await posters[0].signMessage(ethers.getBytes(ethers.keccak256(postCertificate)));

    // contest the post
    const tx = await smModerator.contestPost(
      posters[0].address,
      postCertificate,
      serverSignature,
      posterSignature,
      {
        value: contestationFee,
      }
    )

    await tx.wait();

    // find contestation
    const contestation = await sm.contestations(0);
    console.log(contestation)

    expect(contestation[0]).to.equal(postCertificate);
    expect(contestation[1]).to.equal(posters[0].address);
    expect(contestation[2]).to.equal(moderators[0].address);
  });

  it("The poster and the moderator may not participate in this vote", async function () {
    const smModerator = sm.connect(moderators[0]);
    const smPoster = sm.connect(posters[0]);

    const expectFailure = async (sm: any) => {
      let failed = false;
      try {
        await sm.voteOnContestation(0, true)
      }
      catch (e) {
        failed = true;
      }
      expect(failed).to.equal(true);
    }

    await expectFailure(smModerator);
    await expectFailure(smPoster);
  })

  it("People can vote on a contestation", async function () {
    const wallets: any[] = await ethers.getSigners();

    // wallet 4 sends half its balance to wallet 3
    const wallet4 = wallets[4];
    const wallet3 = wallets[3];

    const wallet4Balance = await ethers.provider.getBalance(wallet4.address);
    console.log(`Wallet 4 balance: ${wallet4Balance} or (${ethers.formatEther(wallet4Balance)} ETH)`)

    const amountToSend = wallet4Balance / 2n;
    console.log(`Sending ${amountToSend} from ${wallet4.address} to ${wallet3.address}`)
    await wallet4.sendTransaction({
      to: wallet3.address,
      value: amountToSend,
    });
  
    const wallet4BalanceAfter = await ethers.provider.getBalance(wallet4.address);
    console.log(`Wallet 4 balance: ${wallet4BalanceAfter} or (${ethers.formatEther(wallet4BalanceAfter)} ETH)`)

    for (let i = 3; i < wallets.length; i++) {
      const vote : boolean = Math.random() > 0.5;
      console.log(`Voting ${vote ? 'Yay': 'Nay'} from ${wallets[i].address}`)

      const smConnected = await sm.connect(wallets[i])
      const tx = await smConnected.voteOnContestation(0, vote);
      await tx.wait()
    }
  });

  it("Once the contestation is over, the funds can be distributed", async function () {
    const smModerator = await sm.connect(moderators[0]);

    const tx = await smModerator.closeContestation(0);
    const receipt = await tx.wait();

    const events = receipt.logs.filter((log: any) =>  (log instanceof ethers.EventLog))
    console.log(events)
    expect(events[0].fragment.name).to.equal('RoleRevoked') // poster or moderator lost their role
    expect(events[1].fragment.name).to.equal('ContestationClosed') 
  })


});
