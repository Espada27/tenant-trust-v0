"use client";
import {
  Box,
  Flex,
  Spacer,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Heading } from "@chakra-ui/react";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { STAKING_TOKEN_ADDRESS } from "../constants/constant";
import { useEffect, useState } from "react";
import useRewardToken from "../hooks/useRewardToken";
import { numberWithSpaces } from "../utils/numberUtils";

export default function Nav() {
  const { address, isConnected } = useAccount();
  const [TTTBalance, setTTTBalance] = useState(0);
  const { getBalance } = useRewardToken();

  //Fixes hydration issue
  const [isClient, setIsClient] = useState(false);

  const { data } = useBalance({
    address: address,
    token: STAKING_TOKEN_ADDRESS,
    watch: true,
  });

  useEffect(() => {
    setIsClient(true);

    if (!isConnected) {
      setTTTBalance(0);
      return;
    }
    const getTTTBalance = async () => {
      const balance = await getBalance();
      if (balance) {
        setTTTBalance(numberWithSpaces(balance));
      }
    };

    const interval = setInterval(getTTTBalance, 5000);
    getTTTBalance();

    return () => {
      clearInterval(interval);
    };
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
      {isClient && isConnected && data ? (
        <VStack pr={5}>
          <Text fontSize={"lg"}>{TTTBalance} TTT</Text>
          <Text fontSize={"lg"}>
            {numberWithSpaces(data.formatted)} {data.symbol}
          </Text>
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
