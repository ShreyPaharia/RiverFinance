// @ts-nocheck
import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
} from '@solana/web3.js';
import {AccountLayout, Token, TOKEN_PROGRAM_ID} from '@solana/spl-token';

import {TokenSwap, CurveType, TOKEN_SWAP_PROGRAM_ID} from '../src';
import {sendAndConfirmTransaction} from '../src/util/send-and-confirm-transaction';
import {newAccountWithLamports} from '../src/util/new-account-with-lamports';
import {url} from '../src/util/url';
import {sleep} from '../src/util/sleep';
import {Numberu64} from '../dist';

// TokenStreamAggrement
// The following globals are created by `createTokenSwap` and used by subsequent tests
// Token swap
let tokenSwap: TokenSwap;
// authority of the token and accounts
let authority: PublicKey;
// nonce used to generate the authority public key
let nonce: number;
// owner of the user accounts
let owner: Account;
// Token pool
let tokenPool: Token;
let tokenAccountPool: PublicKey;
let feeAccount: PublicKey;
// Tokens swapped
let mintA: Token;
let mintB: Token;
let tokenAccountA: PublicKey;
let tokenAccountB: PublicKey;
let userAccountA: PublicKey;
let userAccountB: PublicKey;

// let tokenStreamAggrement: TokenStreamAggrement;

// Hard-coded fee address, for testing production mode
const SWAP_PROGRAM_OWNER_FEE_ADDRESS =
  process.env.SWAP_PROGRAM_OWNER_FEE_ADDRESS;

// Pool fees
const OWNER_WITHDRAW_FEE_NUMERATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 1;
const OWNER_WITHDRAW_FEE_DENOMINATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 6;
const HOST_FEE_NUMERATOR = 20;
const HOST_FEE_DENOMINATOR = 100;

// Initial amount in each swap token
let currentSwapTokenA = 1000000;

// Swap instruction constants
// Because there is no withdraw fee in the production version, these numbers
// need to get slightly tweaked in the two cases.
const SWAP_AMOUNT_IN = 100000;
const SWAP_AMOUNT_OUT = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 90661 : 90674;
const SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 22273 : 22277;
const HOST_SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS
  ? Math.floor((SWAP_FEE * HOST_FEE_NUMERATOR) / HOST_FEE_DENOMINATOR)
  : 0;
const OWNER_SWAP_FEE = SWAP_FEE - HOST_SWAP_FEE;

// Pool token amount minted on init
const DEFAULT_POOL_TOKEN_AMOUNT = 1000000000;
// Pool token amount to withdraw / deposit
const POOL_TOKEN_AMOUNT = 10000000;
const POOL_TOKEN_AMOUNT2 = 100000;
const FLOW_RATE = 1212438012090;

function assert(condition: boolean, message?: string) {
  if (!condition) {
    console.log(Error().stack + ':token-test.js');
    throw message || 'Assertion failed';
  }
}

let connection: Connection;
async function getConnection(): Promise<Connection> {
  if (connection) return connection;

  connection = new Connection(url, 'recent');
  const version = await connection.getVersion();

  console.log('Connection to cluster established:', url, version);
  return connection;
}

export async function createTokenSwap(): Promise<void> {
  const connection = await getConnection();
  owner = await newAccountWithLamports(connection, 1000000000);
  createTokenSwapUI(owner, ()=>{});
}

export async function createTokenSwapUI(senderAccount: Account, setLoading: Function): Promise<void> {
  const connection = await getConnection();
  const payer = await newAccountWithLamports(connection, 1000000000);
  owner = await newAccountWithLamports(connection, 1000000000);
  // const tokenSwapAccount = await newAccountWithLamports(connection, 1000000000);
  const tokenSwapAccount = new Account();

  [authority, nonce] = await PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  );

  console.log('creating pool mint');
  tokenPool = await Token.createMint(
    connection,
    payer,
    authority,
    null,
    2,
    TOKEN_PROGRAM_ID,
  );

  console.log('creating pool account');
  tokenAccountPool = await tokenPool.createAccount(owner.publicKey);
  const ownerKey = SWAP_PROGRAM_OWNER_FEE_ADDRESS || owner.publicKey.toString();
  feeAccount = await tokenPool.createAccount(new PublicKey(ownerKey));

  console.log('creating token A');
  mintA = await Token.createMint(
    connection,
    payer,
    owner.publicKey,
    null,
    2,
    TOKEN_PROGRAM_ID,
  );

  console.log('creating token A account');
  tokenAccountA = await mintA.createAccount(authority);
  console.log('minting token A to swap');
  await mintA.mintTo(tokenAccountA, owner, [], currentSwapTokenA);

  console.log('creating token swap');
  const swapPayer = await newAccountWithLamports(connection, 10000000000);
  tokenSwap = await TokenSwap.createTokenSwap(
    connection,
    swapPayer,
    tokenSwapAccount,
    authority,
    tokenAccountA,
    // null,
    tokenPool.publicKey,
    mintA.publicKey,
    // mintB.publicKey,
    // null,
    feeAccount,
    tokenAccountPool,
    TOKEN_SWAP_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    nonce,
  );

  if(setLoading){
    setLoading(false);
  }

  console.log('loading token swap');
  const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
    connection,
    tokenSwapAccount,
    tokenSwapAccount.publicKey,
    TOKEN_SWAP_PROGRAM_ID,
    swapPayer,
  );
  console.log('**************Complete***************');

}


export async function createTokenStreamAggrement(): Promise<void> {
  const reciverAccount = new Account();
  const senderAccount = new Account();
  createTokenStreamAggrementUI(senderAccount.publicKey, reciverAccount.publicKey, FLOW_RATE, ()=>{});
}

export async function createTokenStreamAggrementUI(senderPubKey: PublicKey, reciverPubKey: PublicKey, flowRate: number, setLoading: Function): Promise<void> {
  const connection = await getConnection();
  const payer = await newAccountWithLamports(connection, 1000000000);
  owner = await newAccountWithLamports(connection, 1000000000);

  const tokenStreamAggrementAccount = new Account();
  const tokenStreamAggrementA = new Account();
  const tokenStreamAggrementB = new Account();
  const userTransferAuthority = new Account();

  [authority, nonce] = await PublicKey.findProgramAddress(
    [tokenStreamAggrementAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  );

  console.log('creating token stream aggrement ***');
  const streamPayer = await newAccountWithLamports(connection, 10000000000);
   await tokenSwap.createTokenStreamAggrement(
    connection,
    // streamPayer,
    // tokenStreamAggrementAccount,
    tokenStreamAggrementA,
    tokenStreamAggrementB,
    userTransferAuthority,
    authority,
    userAccountA,
    userAccountB,
    TOKEN_SWAP_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
  );

  if(setLoading){
    setLoading(false);
  }
  console.log('**************Complete***************');

}

export async function depositAllTokenTypes(): Promise<void> {

  const senderAccount = new Account();
  depositAllTokenTypesUI(senderAccount.publicKey, POOL_TOKEN_AMOUNT, ()=>{});
}

export async function depositAllTokenTypesUI(senderAccount: PublicKey, POOL_TOKEN_AMOUNT2: number, setLoading: Function): Promise<void> {
  const poolMintInfo = await tokenPool.getMintInfo();
  const supply = poolMintInfo.supply.toNumber();
  const swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  const tokenA = Math.floor(
    (swapTokenA.amount.toNumber() * POOL_TOKEN_AMOUNT) / supply,
  );
  // const swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  // const tokenB = Math.floor(
  //   (swapTokenB.amount.toNumber() * POOL_TOKEN_AMOUNT) / supply,
  // );

  const userTransferAuthority = new Account();
  console.log('Creating depositor token a account');
  userAccountA = await mintA.createAccount(owner.publicKey);
  await mintA.mintTo(userAccountA, owner, [], tokenA);
  await mintA.approve(
    userAccountA,
    userTransferAuthority.publicKey,
    owner,
    [],
    tokenA,
  );
  console.log('Creating depositor token b account');
  // userAccountB = await mintB.createAccount(owner.publicKey);
  // await mintB.mintTo(userAccountB, owner, [], tokenB);
  // await mintB.approve(
  //   userAccountB,
  //   userTransferAuthority.publicKey,
  //   owner,
  //   [],
  //   tokenB,
  // );
  console.log('Creating depositor pool token account');
  const newAccountPool = await tokenPool.createAccount(owner.publicKey);

  console.log('Depositing into swap');

  await tokenSwap.depositAllTokenTypes(
    userAccountA,
    // userAccountB,
    newAccountPool,
    userTransferAuthority,
    POOL_TOKEN_AMOUNT2,
    // tokenA,
    // tokenB,
  );

  if(setLoading){
    setLoading(false);
  }

  console.log('**************Complete***************');

}


export async function withdrawAllTokenTypes(): Promise<void> {
  const reciverAccount = new Account();

  withdrawAllTokenTypesUI(reciverAccount.publicKey, POOL_TOKEN_AMOUNT, ()=>{});
}

export async function withdrawAllTokenTypesUI(reciverPubKey: PublicKey, POOL_TOKEN_AMOUNT2: number, setLoading: Function): Promise<void> {
  const poolMintInfo = await tokenPool.getMintInfo();
  // const supply = poolMintInfo.supply.toNumber();
  // let swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  // let swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  // let feeAmount = 0;
  // if (OWNER_WITHDRAW_FEE_NUMERATOR !== 0) {
  //   feeAmount = Math.floor(
  //     (POOL_TOKEN_AMOUNT * OWNER_WITHDRAW_FEE_NUMERATOR) /
  //       OWNER_WITHDRAW_FEE_DENOMINATOR,
  //   );
  // }
  // const poolTokenAmount = POOL_TOKEN_AMOUNT - feeAmount;
  // const tokenA = Math.floor(
  //   (swapTokenA.amount.toNumber() * poolTokenAmount) / supply,
  // );
  // const tokenB = Math.floor(
  //   (swapTokenB.amount.toNumber() * poolTokenAmount) / supply,
  // );

  console.log('Creating withdraw token A account');
  let userAccountA = await mintA.createAccount(owner.publicKey);
  // console.log('Creating withdraw token B account');
  // let userAccountB = await mintB.createAccount(owner.publicKey);

  const userTransferAuthority = new Account();
  console.log('Approving withdrawal from pool account');
  await tokenPool.approve(
    tokenAccountPool,
    userTransferAuthority.publicKey,
    owner,
    [],
    POOL_TOKEN_AMOUNT2,
  );

  console.log('Withdrawing pool tokens for A and B tokens');
  await tokenSwap.withdrawAllTokenTypes(
    userAccountA,
    // userAccountB,
    tokenAccountPool,
    userTransferAuthority,
    POOL_TOKEN_AMOUNT2,
    // tokenA,
    // tokenB,
  );

  if(setLoading){
    setLoading(false);
  }
  console.log('**************Complete***************');

}

