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

  });

  it("Staked Moderation", async function () {
    sm = await ethers.deployContract("StakedModeration", [server.signerAddress]);
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

    const postCertificate = `${posters[0].address}`

    console.log(`Post certificate: ${postCertificate}`)
    console.log(`Hashed once ${ethers.keccak256(postCertificate)}`)
    const serverSignature = await server.signer.signMessage(ethers.getBytes(ethers.keccak256(postCertificate)));
    console.log(`Server signature: ${serverSignature}`)

    const posterSignature = await posters[0].signMessage(ethers.getBytes(ethers.keccak256(postCertificate)));
    console.log(`Poster signature: ${posterSignature}`)

    console.log(`Posters Address ${posters[0].address}`)

    // contest the post
    await smModerator.contestPost(
      posters[0].address,
      postCertificate,
      serverSignature,
      posterSignature,
      {
        value: contestationFee,
      }
    )

  });



});
