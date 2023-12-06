"use client";
import {
  Box,
  Flex,
  Spacer,
  Stat,
  StatLabel,
  StatNumber,
  VStack,
} from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heading } from "@chakra-ui/react";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { STAKING_TOKEN_ADDRESS } from "../constants/constant";
import { useEffect, useState } from "react";
import useRewardToken from "../hooks/useRewardToken";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const [TTTBalance, setTTTBalance] = useState(0);
  const { getBalance } = useRewardToken();

  const { data } = useBalance({
    address: address,
    token: STAKING_TOKEN_ADDRESS,
    watch: true,
  });

  useEffect(() => {
    if (!isConnected) {
      setTTTBalance(0);
      return;
    }
    const getTTTBalance = async () => {
      const balance = await getBalance();
      setTTTBalance(Number(balance));
    };
    getTTTBalance();
  }, [isConnected]);

  return (
    <Flex
      bg="purple.500"
      color="white"
      justifyContent="center"
      alignItems="center"
      p={6}
      height="100px"
    >
      <Box>
        <Heading>TENANT TRUST</Heading>
      </Box>

      <Spacer />
      {isConnected ? (
        <VStack py={5}>
          <Stat p={5}>
            <StatLabel p={0} m={0}>
              Balance
            </StatLabel>
            <StatNumber>{TTTBalance} TTT</StatNumber>
            <StatNumber>
              {data?.formatted} {data?.symbol}
            </StatNumber>
          </Stat>

          <Box pr={"10px"}></Box>
          <Box pr={"10px"}></Box>
        </VStack>
      ) : (
        <></>
      )}

      <Box>
        <ConnectButton />
      </Box>
    </Flex>
  );
}
