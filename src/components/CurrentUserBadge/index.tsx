import React from "react";
import { formatNumber, shortenAddress } from "../../utils/utils";
import { Identicon } from "../Identicon";
import { useNativeAccount } from "../../contexts/accounts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

export const CurrentUserBadge = () => {
  const { publicKey } = useWallet();
  const { account } = useNativeAccount();

  if (!publicKey) {
    return null;
  }

  // should use SOL ◎ ?

  return (
    <div className="wallet-wrapper">
        <Identicon
          address={publicKey.toBase58()}
          style={{ display: "flex" }}
        />
      <span>
        {formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL)} SOL
      </span>
      <div className="wallet-key">
        {shortenAddress(`${publicKey}`)}
      </div>
    </div>
  );
};
