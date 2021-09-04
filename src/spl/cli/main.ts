import {
  createAccountAndSwapAtomic,
  createTokenStreamAggrement,
  createTokenSwap,
  startStreaming,
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  depositSingleTokenTypeExactAmountIn,
  withdrawSingleTokenTypeExactAmountOut,
} from './token-swap-test';
import {CurveType, Numberu64} from '../dist';

async function main() {
  // These test cases are designed to run sequentially and in the following order
  // console.log('****************************************');
  // console.log('Run test: createTokenSwap (constant price)');
  // console.log('****************************************');
  // await createTokenSwap(CurveType.ConstantPrice, new Numberu64(1));
  
  // console.log('****************************************');
  console.log(
    'Run test: createTokenStreamAggrement ',
  );
  console.log(
    'Run test: createTokenSwap (constant product, used further in tests)',
  );
  await createTokenSwap();
  console.log('****************************************');

  console.log('****************************************');
  console.log('Run test: deposit all token types');
  console.log('****************************************');
  await depositAllTokenTypes();
  console.log('****************************************');
  console.log('Run test: withdraw all token types');
  console.log('****************************************');
  await withdrawAllTokenTypes();
  console.log('****************************************');
  await createTokenStreamAggrement();
  console.log('Run test: Start & Stop Streaming');
  console.log('****************************************');
  // await startStreaming();
  // console.log('****************************************');
  // console.log('Run test: create account, approve, swap all at once');
  // console.log('****************************************');
  // await createAccountAndSwapAtomic();
  // console.log('****************************************');
  // console.log('Run test: deposit one exact amount in');
  // console.log('****************************************');
  // await depositSingleTokenTypeExactAmountIn();
  // console.log('****************************************');
  // console.log('Run test: withrdaw one exact amount out');
  // console.log('****************************************');
  // await withdrawSingleTokenTypeExactAmountOut();
  // console.log('Success\n');
  // console.log('****************************************');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(-1);
  })
  .then(() => process.exit());
