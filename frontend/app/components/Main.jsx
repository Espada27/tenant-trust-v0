"use client";
import { Flex, VStack, StackDivider } from "@chakra-ui/react";
import Nav from "./Nav";
import { useAccount } from "wagmi";
import RentCardList from "./RentCardList";
import CreateRent from "./CreateRent";

export default function Main() {
  const { isConnected } = useAccount();

  return (
    <Flex direction="column" h="100vh">
      <Nav />
      <Flex
        flex="1"
        marginTop="5"
        marginBottom="5"
        marginRight="5"
        marginLeft="5"
      >
        <VStack
          divider={<StackDivider borderColor="gray.200" />}
          spacing={2}
          align="stretch"
          minW={"100%"}
        >
          <CreateRent />
          <RentCardList />
        </VStack>
      </Flex>
    </Flex>
  );
}
