import React from "react";
import "./../../App.less";
import { Layout } from "antd";
import { Link } from "react-router-dom";
import { WalletModalProvider } from "@solana/wallet-adapter-ant-design";

import { LABELS } from "../../constants";
import { AppBar } from "../AppBar";

const { Header, Content } = Layout;

export const AppLayout = React.memo(({ children }) => {
  return (
    <WalletModalProvider>
            <AppBar />
    </WalletModalProvider>
  );
});
