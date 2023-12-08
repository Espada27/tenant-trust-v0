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
  StackDivider,
  VStack,
  UnorderedList,
  ListItem,
  Flex,
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
import { cropAddress } from "../utils/addressUtils";
import { TENANT_TRUST_ADDRESS } from "../constants/constant";

export default function RentCard({ rent }) {
  const { address } = useAccount();
  const {
    getTotalSupply,
    stake,
    isStakingFull,
    withdraw,
    earned,
    hasStaked,
    claimRewards,
    userStakedAmount,
  } = useStaking(rent.stakingContract);
  const { increaseAllowance, allowance } = useStakingToken(
    rent.stakingContract
  );
  const {
    approveRent,
    startRentContract,
    getInterestRate,
    payRent,
    getLandlordBalance,
    withdrawRent,
  } = useTenantTrust();
  const { transferTo, isRewardOwner } = useRewardToken();

  const isLandlord = address == rent.landlordAddress;
  const isTenant = address == rent.tenantAddress;
  const [currentDeposit, setCurrentDeposit] = useState(0);
  const [inputAmount, setInputAmount] = useState(100);
  const [stakingFull, setStakingFull] = useState(false);
  const [stakingPercentage, setStakingPercentage] = useState(0);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [userStaked, setUserStaked] = useState();
  const [rentInput, setRentInput] = useState();
  const [totalPaidRent, setTotalPaidRent] = useState();
  const [landlordBalance, setLandlordBalance] = useState(0);

  //Demo only
  const randomImageSrc = [img1.src, img2.src, img3.src, img4.src][
    (Number(rent.landlordAddress.match(/[0-9]/g).slice(-1)[0] + 1) %
      Number(rent.tenantAddress.match(/[0-9]/g).slice(-1)[0] + 1)) %
      4
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

    let interval;

    const initInterval = async () => {
      const stakedAmount = await userStakedAmount();
      setUserStaked(stakedAmount);
      if (!stakedAmount) {
        return;
      }
      setEarnedAmount(await earned());
      if (rent.startTime + rent.duration > Date.now()) {
        interval = setInterval(async () => {
          let newValue = await earned();
          setEarnedAmount(newValue);
        }, 1000);
      }
    };

    initInterval();
    setTotalPaidRent(rent.alreadyPaid);

    const initLandlordBalance = async () => {
      if (isLandlord) {
        setLandlordBalance(await getLandlordBalance());
      }
    };

    initLandlordBalance();
    return () => {
      clearInterval(interval);
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
      const stakingAllowance = await allowance(rent.stakingContract);
      console.log("Current allowance = ", stakingAllowance);
      if (stakingAllowance <= inputAmount) {
        console.log("Increase allowance needed");
        await increaseAllowance(rent.stakingContract, inputAmount);
      }
      await stake(inputAmount);
      updateCurrentStakingAmount(inputAmount);
      setUserStaked((prev) => prev + inputAmount);
    } catch (error) {
      console.log("Error while staking", error);
    }
  };

  const handleWithdraw = async () => {
    try {
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

  const handlePayRent = async () => {
    try {
      if ((await allowance(TENANT_TRUST_ADDRESS)) <= rentInput) {
        console.log("Increase allowance needed");
        await increaseAllowance(TENANT_TRUST_ADDRESS, rentInput);
      }
      console.log("Paying the rent", rentInput);
      await payRent(rent, rentInput);

      setTotalPaidRent((prev) => prev + rentInput);
    } catch (error) {
      console.log("Error while paying the rent", error);
    }
  };

  const claimRent = async () => {
    try {
      console.log("Withdrawing the rent");
      await withdrawRent();
      setLandlordBalance(0);
    } catch (error) {
      console.log("Error while withdrawing the rent", error);
    }
  };

  const handleClaimRewards = async () => {
    try {
      await claimRewards();
    } catch (error) {
      console.log("Error while claiming the reward", error);
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
          <HStack>
            <Box>
              <UnorderedList>
                <ListItem>
                  Addresse du contrat de caution :{" "}
                  <Link
                    color="teal.500"
                    href={
                      "https://sepolia.etherscan.io/address/" +
                      rent.stakingContract
                    }
                    isexternal="true"
                  >
                    {cropAddress(rent.stakingContract)}{" "}
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                </ListItem>
                <ListItem>
                  Date de création du contrat :{" "}
                  {new Date().toLocaleDateString()}
                </ListItem>
                <ListItem>
                  Caution : {currentDeposit} / {rent.rentalDeposit} USDC
                </ListItem>
                <ListItem>
                  Bailleur :{" "}
                  <Link
                    color="teal.500"
                    href={
                      "https://sepolia.etherscan.io/address/" +
                      rent.landlordAddress
                    }
                    isexternal="true"
                  >
                    {cropAddress(rent.landlordAddress)}{" "}
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                </ListItem>
                <ListItem>
                  Locataire :{" "}
                  <Link
                    color="teal.500"
                    href={
                      "https://sepolia.etherscan.io/address/" +
                      rent.tenantAddress
                    }
                    isexternal="true"
                  >
                    {cropAddress(rent.tenantAddress)}{" "}
                    <ExternalLinkIcon mx="2px" />
                  </Link>
                </ListItem>
                {rent.startTime > 0 ? (
                  <ListItem>
                    Contrat démarré le :{" "}
                    {new Date(rent.startTime).toLocaleDateString()}
                  </ListItem>
                ) : (
                  <></>
                )}
                <ListItem>
                  Montant du loyer payé : {totalPaidRent} USDC
                </ListItem>
              </UnorderedList>
            </Box>
            <Spacer />
            <Box>
              <VStack>
                <Flex>
                  <UnorderedList>
                    <ListItem>
                      Récompense de staking : {earnedAmount} TTT
                    </ListItem>
                    <ListItem>Votre contribution : {userStaked} USDC</ListItem>
                  </UnorderedList>
                </Flex>
                <Spacer />
              </VStack>
            </Box>
          </HStack>
        </CardBody>

        <CardFooter>
          <HStack w={"100%"}>
            <CircularProgress value={stakingPercentage} color="green.400">
              <CircularProgressLabel>
                {stakingPercentage}%
              </CircularProgressLabel>
            </CircularProgress>
            <Spacer />

            {(isLandlord && !rent.landlordApproval) ||
            (isTenant && !rent.tenantApproval) ? (
              <Button
                variant="solid"
                colorScheme="orange"
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
                  isDisabled={currentDeposit >= rent.rentalDeposit}
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
            {isLandlord && landlordBalance > 0 ? (
              <Button variant="solid" colorScheme="blue" onClick={claimRent}>
                Retirer le loyer
              </Button>
            ) : (
              <></>
            )}
            {userStaked && rent.startTime > 0 ? (
              <Button
                variant="solid"
                colorScheme="blue"
                isDisabled={earnedAmount == 0}
                onClick={handleClaimRewards}
              >
                Claim reward
              </Button>
            ) : (
              <></>
            )}
            {rent.tenantAddress == address && rent.startTime > 0 ? (
              <>
                <NumberInput
                  w={"15%"}
                  min={0}
                  value={rentInput}
                  onChange={(value) => setRentInput(Number(value))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Button
                  variant="solid"
                  colorScheme="blue"
                  onClick={handlePayRent}
                >
                  Payer le loyer
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
