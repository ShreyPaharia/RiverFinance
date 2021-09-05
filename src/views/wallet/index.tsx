import { WalletMultiButton } from "@solana/wallet-adapter-ant-design";
import { Button, Col, Row } from "antd";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { TokenIcon } from "../../components/TokenIcon";
import { useConnectionConfig } from "../../contexts/connection";
import { useMarkets } from "../../contexts/market";
import { useUserBalance, useUserTotalBalance } from "../../hooks";
import { WRAPPED_SOL_MINT } from "../../utils/ids";
import { formatUSD } from "../../utils/utils";
import {
  createTokenSwap,
} from '../../spl/cli/tokenStreanFacade';

export const WalletView = () => {
  const { marketEmitter, midPriceInUSD } = useMarkets();
  const { tokenMap } = useConnectionConfig();
  const SRM_ADDRESS = "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt";
  const SRM = useUserBalance(SRM_ADDRESS);
  const SOL = useUserBalance(WRAPPED_SOL_MINT);
  const { balanceInUSD: totalBalanceInUSD } = useUserTotalBalance();

  useEffect(() => {
    const refreshTotal = () => {};

    const dispose = marketEmitter.onMarket(() => {
      refreshTotal();
    });

    refreshTotal();

    return () => {
      dispose();
    };
  }, [marketEmitter, midPriceInUSD, tokenMap]);

  const handleRequest = async () => {
    await createTokenSwap();
  };


  return (
    <Row gutter={[16, 16]} align="middle">
      <Col span={24}>
      <div style={{ margin: '24px 0' }} />
        <div>Your balances ({formatUSD.format(totalBalanceInUSD)}):</div>
      </Col>

      <Col span={24}>
      <div style={{ margin: '24px 0' }} />
      <div>
          SOL: {SOL.balance} ({formatUSD.format(SOL.balanceInUSD)})
        </div>
      </Col>
      <Col span={24}>
      <div style={{ margin: '24px 0' }} />
      <div style={{ display: "inline-flex", alignItems: "center" }}>
          <TokenIcon mintAddress={SRM_ADDRESS} /> SRM: {SRM?.balance} (
          {formatUSD.format(SRM?.balanceInUSD)})
        </div>
      </Col>
    </Row>
  );
};
