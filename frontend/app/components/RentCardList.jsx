"use client";

import RentCard from "./RentCard";

import { useTenantTrustContext } from "../context/TenantTrustContext";
import { Box, Heading, Spacer, StackDivider, VStack } from "@chakra-ui/react";

export default function RentCardList() {
  const { rentsAsLandlord, rentsAsTenant, rentsAsOther } =
    useTenantTrustContext();
  return (
    <>
      <VStack
        w={"100%"}
        divider={
          <StackDivider borderColor="gray.200" align="stretch" w={"100%"} />
        }
      >
        <Box p={0} w={"100%"}>
          <Heading size="lg" textAlign={"center"}>
            Bailleur
          </Heading>
          {rentsAsLandlord.map((rent, key) => (
            <RentCard key={key} rent={rent} />
          ))}
        </Box>
        <Box p={0} w={"100%"}>
          <Heading size="lg" textAlign={"center"}>
            Locataire
          </Heading>
          {rentsAsTenant.map((rent, key) => (
            <RentCard key={key} rent={rent} />
          ))}
        </Box>
        <Box p={0} w={"100%"}>
          <Heading size="lg" textAlign={"center"}>
            Autres contrats
          </Heading>
          {rentsAsOther.map((rent, key) => (
            <RentCard key={key} rent={rent} />
          ))}
        </Box>
      </VStack>
    </>
  );
}
