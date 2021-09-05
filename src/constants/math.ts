import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

export const TEN = new BN(10);
export const HALF_WAD = TEN.pow(new BN(18));
export const WAD = TEN.pow(new BN(18));
export const RAY = TEN.pow(new BN(27));
export const ZERO = new BN(0);
export const LAMPORTS_PER_SOL = 1000000000;
export const TOKEN_STREAM_PROGRAM_ID: PublicKey = new PublicKey(
    'AQ5Pyb28e6rLJLLVnUCJhFxNwMyAf9kFSZ5Dvg45QGev',
  );
// export const TOKEN_STREAM_PROGRAM_ID: PublicKey = new PublicKey(
//   '7FvKJFsrz7eVGd9r5S2PkYXqNhGLp4hEwpFLYhhedvqn',
// );