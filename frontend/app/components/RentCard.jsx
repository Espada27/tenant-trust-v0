"use client";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Card,
  Image,
  Stack,
  CardBody,
  CardFooter,
  Button,
  Text,
  Tag,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import useStaking from "../hooks/useStaking";
import useStakingToken from "../hooks/useStakingToken";
import useTenantTrust from "../hooks/useTenantTrust";
export default function RentCard({ rent }) {
  const { address, isConnected } = useAccount();
  const { getTotalSupply, stake } = useStaking(rent.stakingContract);
  const { increaseAllowance, allowance } = useStakingToken(
    rent.stakingContract
  );
  const { approveRent, startRentContract } = useTenantTrust();

  const isLandlord = address == rent.landlordAddress;
  const isTenant = address == rent.tenantAddress;
  const [currentDeposit, setCurrentDeposit] = useState(0);
  const [stakingAmount, setStakingAmount] = useState(0);

  useEffect(() => {
    const getCurrentDeposit = async () => {
      try {
        const data = await getTotalSupply();
        console.log("caution convertie = ", data, data / 10n ** 18n);
        setCurrentDeposit(Number(data / 10n ** 18n));
      } catch (error) {
        console.log("Error while getting the total supplu", error);
      }
    };
    getCurrentDeposit();
  }, []);

  const handleStake = async () => {
    try {
      console.log(await allowance(), stakingAmount);
      if ((await allowance()) <= stakingAmount) {
        console.log("Increase allowance needed");
        await increaseAllowance(stakingAmount);
      }
      await stake(stakingAmount);
    } catch (error) {
      console.log("Error while staking", error);
    }
  };

  const handleStakingAmount = (amount) => {
    setStakingAmount(Math.floor(amount));
  };

  //TODO DELETE
  const getStakingDetails = async () => {
    try {
      console.log("Target supply : ", rent.rentalDeposit);
      console.log("Current supply : ", await getTotalSupply());
      await allowance(stakingAmount);
    } catch (error) {
      console.log("Error while staking", error);
    }
  };

  const startContract = async () => {
    try {
      await startRentContract(rent);
    } catch (error) {
      console.log("Error while starting the contract", error);
    }
  };

  const approveContract = async () => {
    try {
      await approveRent(rent);
    } catch (error) {
      console.log("Error while approving the contract", error);
    }
  };

  return (
    <Card
      direction={{ base: "column", sm: "row" }}
      overflow="hidden"
      variant="outline"
      size="sm"
      justify=""
      w={"100%"}
    >
      <Image
        objectFit="cover"
        maxW={{ base: "100%", sm: "200px" }}
        src="https://images.unsplash.com/photo-1667489022797-ab608913feeb?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxlZGl0b3JpYWwtZmVlZHw5fHx8ZW58MHx8fHw%3D&auto=format&fit=crop&w=800&q=60"
        alt="Caffe Latte"
      />

      <Stack w={"100%"}>
        <CardBody>
          <Text>
            Addresse du contrat de caution :{" "}
            <Link
              color="teal.500"
              href={
                "https://sepolia.etherscan.io/address/" + rent.stakingContract
              }
              isExternal
            >
              {rent.stakingContract} <ExternalLinkIcon mx="2px" />
            </Link>
          </Text>
          <Text>
            Date de création du contrat : {new Date().toLocaleDateString()}
          </Text>
          <Text>
            Caution requise : {Number(rent.rentalDeposit) * 10 ** -18}
          </Text>
          <Text>Caution actuelle : {currentDeposit}</Text>

          <Text>
            Bailleur :{" "}
            <Link
              color="teal.500"
              href={
                "https://sepolia.etherscan.io/address/" + rent.landlordAddress
              }
              isExternal
            >
              {rent.landlordAddress} <ExternalLinkIcon mx="2px" />
            </Link>
          </Text>
          <Text>
            Locataire :{" "}
            <Link
              color="teal.500"
              href={
                "https://sepolia.etherscan.io/address/" + rent.tenantAddress
              }
              isExternal
            >
              {rent.tenantAddress} <ExternalLinkIcon mx="2px" />
            </Link>
          </Text>
        </CardBody>

        <CardFooter justify="space-between">
          {isLandlord || isTenant ? (
            <Tag size="sm">
              {isLandlord ? "Vous êtes le bailleur" : "Vous êtes le locataire"}
            </Tag>
          ) : (
            <></>
          )}

          {isLandlord || isTenant ? (
            <Button
              variant="solid"
              colorScheme="orange"
              isDisabled={
                isLandlord ? rent.landlordApproval : rent.tenantApproval
              }
              onClick={approveContract}
            >
              Approuver le contrat
            </Button>
          ) : (
            <></>
          )}
          {isLandlord &&
          rent.landlordApproval &&
          rent.tenantApproval &&
          rent.startTime == 0 ? (
            <Button
              variant="solid"
              colorScheme="orange"
              onClick={startContract}
            >
              Démarrer le contrat
            </Button>
          ) : (
            <></>
          )}
          <NumberInput
            min={0}
            value={stakingAmount}
            onChange={(value) => handleStakingAmount(value)}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Button
            variant="solid"
            colorScheme="orange"
            isDisabled={stakingAmount < 1}
            onClick={handleStake}
          >
            Stake
          </Button>
        </CardFooter>
      </Stack>
    </Card>
  );
}
