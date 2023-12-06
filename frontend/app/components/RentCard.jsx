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
  HStack,
  Box,
  CircularProgress,
  CircularProgressLabel,
  Spacer,
} from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import useStaking from "../hooks/useStaking";
import useStakingToken from "../hooks/useStakingToken";
import useTenantTrust from "../hooks/useTenantTrust";
import useRewardToken from "../hooks/useRewardToken";
import img1 from "../../public/images/img1.jpeg";
import img2 from "../../public/images/img2.jpeg";
import img3 from "../../public/images/img3.jpeg";
import img4 from "../../public/images/img4.jpeg";

export default function RentCard({ rent }) {
  const { address } = useAccount();
  const { getTotalSupply, stake, isStakingFull, withdraw, earned, hasStaked } =
    useStaking(rent.stakingContract);
  const { increaseAllowance, allowance } = useStakingToken(
    rent.stakingContract
  );
  const { approveRent, startRentContract, getInterestRate, rentDuration } =
    useTenantTrust();
  const { transferTo, isRewardOwner } = useRewardToken();

  const isLandlord = address == rent.landlordAddress;
  const isTenant = address == rent.tenantAddress;
  const [currentDeposit, setCurrentDeposit] = useState(0);
  const [inputAmount, setInputAmount] = useState(0);
  const [stakingFull, setStakingFull] = useState(false);
  const [stakingPercentage, setStakingPercentage] = useState(0);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [earnAmountInterval, setEarnedAmountInterval] = useState();
  const [userStaked, setUserStaked] = useState();

  //Demo only
  const randomImageSrc = [img1.src, img2.src, img3.src, img4.src][
    rent.creationTime % 4
  ];

  useEffect(() => {
    const getCurrentDeposit = async () => {
      try {
        const totalSupply = await getTotalSupply();

        setCurrentDeposit(totalSupply);
        setStakingPercentage(
          Math.floor((totalSupply / rent.rentalDeposit) * 100)
        );
      } catch (error) {
        console.log("Error while getting the total supply", error);
      }
    };

    const getStakingFull = async () => {
      setStakingFull(await isStakingFull());
    };
    getStakingFull();
    getCurrentDeposit();

    const initInterval = async () => {
      const hasUserStaked = await hasStaked();
      setUserStaked(hasUserStaked);
      if (!hasUserStaked) {
        return;
      }
      const intervalId = setInterval(async () => {
        let newValue = await earned();
        newValue = newValue.toString().split("");
        newValue.splice(2, 0, ".");
        setEarnedAmount(newValue.join(""));
      }, 5000);
      setEarnedAmountInterval(intervalId);
    };

    initInterval();

    return () => {
      clearInterval(earnAmountInterval);
      setEarnedAmountInterval(null);
    };
  }, []);

  const updateCurrentStakingAmount = async (inputAmount) => {
    setStakingPercentage(
      Math.floor(((currentDeposit + inputAmount) / rent.rentalDeposit) * 100)
    );

    setCurrentDeposit((prev) => prev + inputAmount);
  };

  const handleStake = async () => {
    try {
      console.log(await allowance(), inputAmount);
      if ((await allowance()) <= inputAmount) {
        console.log("Increase allowance needed");
        await increaseAllowance(inputAmount);
      }
      await stake(inputAmount);
      updateCurrentStakingAmount(inputAmount);
    } catch (error) {
      console.log("Error while staking", error);
    }
  };

  const handleWithdraw = async () => {
    try {
      console.log("Amount =", inputAmount);
      await withdraw(inputAmount);
      updateCurrentStakingAmount(-inputAmount);
    } catch (error) {
      console.log("Error while staking", error);
    }
  };

  const handleInputAmount = (amount) => {
    setInputAmount(Math.floor(amount));
  };

  //Owner function DEMO ONLY
  const prepareRewards = async () => {
    await transferTo(
      rent.stakingContract,
      rent.rentalDeposit * ((await getInterestRate()) / 10000)
    );
  };

  const startContract = async () => {
    try {
      await startRentContract(rent);
    } catch (error) {
      console.log("Error while starting the contract", error);
    }
  };

  const approveContract = async (approver) => {
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
      bg={"gray.100"}
      m={1}
    >
      <Image
        objectFit="cover"
        maxW={{ base: "100%", sm: "200px" }}
        src={randomImageSrc}
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
          <Text>Caution requise : {rent.rentalDeposit} USDC</Text>
          <Text>Caution actuelle : {currentDeposit} USDC</Text>
          {earnedAmount > 0 ? (
            <Text>Récompense de staking : {earnedAmount} TTT</Text>
          ) : (
            <></>
          )}

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

        <CardFooter>
          <HStack w={"100%"}>
            <CircularProgress value={stakingPercentage} color="green.400">
              <CircularProgressLabel>
                {stakingPercentage}%
              </CircularProgressLabel>
            </CircularProgress>
            <Spacer />

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
            {rent.startTime == 0 && isRewardOwner ? (
              <Button
                variant="solid"
                colorScheme="orange"
                onClick={prepareRewards}
              >
                Init rewards
              </Button>
            ) : (
              <></>
            )}
            {rent.startTime == 0 ? (
              <>
                <NumberInput
                  w={"15%"}
                  min={0}
                  value={inputAmount}
                  onChange={(value) => handleInputAmount(value)}
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
                  isDisabled={inputAmount < 1}
                  onClick={handleStake}
                >
                  Stake
                </Button>
                <Button
                  variant="solid"
                  colorScheme="orange"
                  isDisabled={inputAmount < 1}
                  onClick={handleWithdraw}
                >
                  Withdraw
                </Button>
              </>
            ) : (
              <></>
            )}
          </HStack>
        </CardFooter>
      </Stack>
    </Card>
  );
}
