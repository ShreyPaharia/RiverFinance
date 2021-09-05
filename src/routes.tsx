import { HashRouter, Link, Route, Switch } from "react-router-dom";
import React, { useMemo, useState } from "react";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { MarketProvider } from "./contexts/market";
import { AppLayout } from "./components/Layout";
import { FaucetView, HomeView, InitializeView, DepositView, WithdrawView, StreamView  } from "./views";
import {
  getLedgerWallet,
  getMathWallet,
  getPhantomWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolongWallet,
  getTorusWallet,
} from "@solana/wallet-adapter-wallets";
import { Layout, Menu, Breadcrumb, Row } from 'antd';
import { HomeTwoTone, PlusSquareTwoTone, MinusSquareTwoTone, SyncOutlined } from '@ant-design/icons';
import {  WalletView } from "./views/wallet"
import { fromLamports } from "./utils/utils";
import { Spin, Space } from 'antd';

const { SubMenu } = Menu;
const { Header, Content, Sider } = Layout;

export function Routes() {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getTorusWallet({
        options: {
          // TODO: Get your own tor.us wallet client Id
          clientId:
            "BOM5Cl7PXgE9Ylq1Z1tqzhpydY0RVr8k90QQ85N7AKI5QGSrr9iDC-3rvmy0K_hF0JfpLMiXoDhta68JwcxS1LQ",
        },
      }),
      getLedgerWallet(),
      getSolongWallet(),
      getMathWallet(),
      getSolletWallet(),
    ],
    []
  );
  const [isLoading, setLoading] = useState(false);
  return (
    <HashRouter basename={"/"}>
      <ConnectionProvider>
        <WalletProvider wallets={wallets} autoConnect>
          <AccountsProvider>
            <MarketProvider>
              <AppLayout>
              <Layout>
                <Layout>
                  <Layout>
                    <Sider width={200} className="site-layout-background">
                      <Menu
                        mode="inline"
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['sub1']}
                        style={{ height: '70%', borderRight: 0 }}
                      >
                          <Menu.Item key="1" icon={<HomeTwoTone />} > 
                              {/* <Link onClick={() => { setRoute("/");}} to="/"> */}
                              <Link to="/">
                              Home
                              </Link>
                          </Menu.Item>
                          <Menu.Item key="2" icon={<PlusSquareTwoTone />}  >
                              {/* <Link onClick={() => { setRoute("/deposit");}} to="/deposit"> */}
                              <Link to="/deposit">
                              Deposit
                              </Link>
                            </Menu.Item>
                          <Menu.Item key="3" icon={<MinusSquareTwoTone />} >
                            {/* <Link onClick={() => { setRoute("/withdraw");}} to="/withdraw"> */}
                            <Link to="/withdraw">
                            Withdraw
                            </Link>
                            </Menu.Item>
                          <Menu.Item key="3" icon={<SyncOutlined spin/>} >
                            {/* <Link onClick={() => { setRoute("/withdraw");}} to="/withdraw"> */}
                            <Link to="/stream">
                            Stream
                            </Link>
                          </Menu.Item>
                      </Menu>
                      <Menu
                        mode="inline"
                        defaultSelectedKeys={['1']}
                        defaultOpenKeys={['sub1']}
                        style={{ height: '30%', borderRight: 0, padding: 20}}>
                      <WalletView></WalletView>
                      </Menu>
                    </Sider>
                    <Layout style={{ padding: '0 24px 24px' }}>
                      <Breadcrumb style={{ margin: '16px 0' }}>
                        <Breadcrumb.Item>Home</Breadcrumb.Item>
                        <Breadcrumb.Item>List</Breadcrumb.Item>
                        <Breadcrumb.Item>App</Breadcrumb.Item>
                      </Breadcrumb>
                      <Layout style={{ padding: '0 24px 24px' }}>
                      <Content
                        className="site-layout-background2"
                        style={{
                          // align-items: center,
                          padding: 24,
                          margin: 0,
                          minHeight: 280,
                          display: "flex", justifyContent: "center"
                        }}
                      >
                         <Space size="large" align="center" >
                          <Spin size="small" spinning={isLoading}/>
                          <Spin spinning={isLoading}/>
                          <Spin size="large" spinning={isLoading}/>
                        </Space>
                <Switch>
                  <Route exact path="/" component={() => <HomeView />} />
                  <Route exact path="/faucet" children={<FaucetView />} />
                  <Route exact path="/initialize" children={<InitializeView />} />
                  <Route exact path="/deposit" children={<DepositView />} />
                  <Route exact path="/withdraw" children={<WithdrawView />} />
                  <Route exact path="/stream" children={<StreamView  />} />
                </Switch>
                      </Content>
                      </Layout>
                    </Layout>
                  </Layout>
                </Layout>,
                
              </Layout>
              </AppLayout>
            </MarketProvider>
          </AccountsProvider>
        </WalletProvider>
      </ConnectionProvider>
    </HashRouter>
  );
}
