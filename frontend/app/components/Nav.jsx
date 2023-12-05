"use client";
import { Flex, Spacer } from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heading } from "@chakra-ui/react";
import useTenantTrust from "../hooks/useTenantTrust";

export default function Nav() {
  return (
    <Flex
      bg="purple.500"
      color="white"
      justifyContent="center"
      alignItems="center"
      p={6}
      height="100px"
    >
      <Heading>TENANT TRUST</Heading>
      <Spacer />
      <ConnectButton />
    </Flex>
  );
}
