"use client";
import { ChakraProvider } from "@chakra-ui/react";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { sepolia, hardhat } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { DataProvider } from "./context/TenantTrustContext";

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY;

const { chains, publicClient } = configureChains(
  [hardhat, sepolia],
  [
    //alchemyProvider({ apiKey: ALCHEMY_KEY }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: "TenantTrust",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider chains={chains}>
            <DataProvider>
              <ChakraProvider>{children}</ChakraProvider>
            </DataProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
