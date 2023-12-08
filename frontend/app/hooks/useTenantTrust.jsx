"use client";
import { useState, useEffect } from "react";
import {
  readContract,
  prepareWriteContract,
  writeContract,
  getWalletClient,
  waitForTransaction,
} from "@wagmi/core";
import { TENANT_TRUST_ABI, TENANT_TRUST_ADDRESS } from "../constants/constant";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { useToast } from "@chakra-ui/react";
//import useToast from "./useToast";
const prepareRentDataWrite = (rent) => {
  return [
    rent.tenantPublicKey.toString(),
    BigInt(rent.monthlyRent) * 10n ** 18n,
    BigInt(rent.rentalDeposit) * 10n ** 18n,
    "https://notimplemented.com",
  ];
};

const rentArrayToObject = (rent, landlordAddress, tenantAddress) => {
  return {
    stakingContract: rent[0],
    startTime: Number(rent[1]) * 1000,
    duration: Number(rent[2]),
    rentRate: rent[3],
    rentFees: rent[4],
    alreadyPaid: bigIntToNumber(rent[5]),
    rentalDeposit: bigIntToNumber(rent[6]),
    leaseUri: rent[7],
    landlordApproval: rent[8],
    tenantApproval: rent[9],
    creationTime: Number(rent[10]),
    landlordAddress,
    tenantAddress,
  };
};

const bigIntToNumber = (bigInt) => {
  return Number(bigInt / 10n ** 18n);
};

const useTenantTrust = () => {
  const [workflowStatus, setWorkflowStatus] = useState(5);
  const [isOwner, setIsOwner] = useState(false);
  const [rentDuration, setRentDuration] = useState(0);
  const { address, isConnected } = useAccount();
  const toast = useToast();
  const successToast = (title, description) => {
    toast({
      title,
      description,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const errorToast = (title, description) => {
    toast({
      title,
      description,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  };

  const createRentContract = async (rent) => {
    console.log("Contract about to be created : ", rent);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "createRentContract",
        args: prepareRentDataWrite(rent),
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      successToast("Contrat créé");
    } catch (error) {
      errorToast("Erreur", "Erreur lors de la création du contrat");
      console.error("Error while creating a rent contract:", error);
    }
  };

  const approveRent = async (rent) => {
    console.log("Approving the contract : ", rent);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "approveContract",
        args: [rent.tenantAddress, rent.landlordAddress],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      successToast("Contrat approuvé");
    } catch (error) {
      errorToast("Erreur", "Erreur lors de l'approbation du contrat");
      console.error("Error while creating a rent contract:", error);
    }
  };

  const payRent = async (rent, amount) => {
    console.log("Paying the rent :", amount);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "payRent",
        args: [rent.landlordAddress, BigInt(amount) * 10n ** 18n],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      successToast("Loyer payé !", `Vous avez payé ${amount} USDC`);
    } catch (error) {
      errorToast("Erreur", "Erreur lors du paiement du loyer");
      console.error("Error while creating a rent contract:", error);
      throw error;
    }
  };

  const startRentContract = async (rent) => {
    console.log("Starting the contract : ", rent);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "startRent",
        args: [rent.tenantAddress],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      console.log("Contract successfully started");
      successToast("Contrat démarré");
    } catch (error) {
      errorToast("Erreur", "Erreur lors du démarrage du contrat");
      console.error("Error while starting the rent contract:", error);
    }
  };

  const checkIfOwner = async () => {
    if (!address) {
      setIsOwner(false);
      return;
    }
    try {
      const data = await readContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "owner",
      });
      setIsOwner(data === address);
    } catch (err) {
      console.error("Error in checkIfOwner:", err.message);
    }
  };

  const getRent = async (landlordAddress, tenantAddress) => {
    try {
      const data = await readContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "rents",
        args: [landlordAddress, tenantAddress],
      });
      return rentArrayToObject(data, landlordAddress, tenantAddress);
    } catch (err) {
      console.error("Error while fetching the rent:", err.message);
    }
  };

  const getInterestRate = async () => {
    try {
      const data = await readContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "interestBps",
      });
      console.log("Interest BPS = ", data);
      return Number(data);
    } catch (err) {
      console.error("Error while fetching the interest rate:", err.message);
    }
  };

  const getLandlordBalance = async () => {
    try {
      const data = await readContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      console.log("Tenant Trust, balance of landlord", data);
      return data;
    } catch (err) {
      console.error(
        "Tenant Trust, Error while fetching the balance of landlord:",
        err.message
      );
    }
  };

  const withdrawRent = async () => {
    console.log("Withdrawing the paid rend : ");
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_ADDRESS,
        abi: TENANT_TRUST_ABI,
        functionName: "withdraw",
        args: [await getLandlordBalance()],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      console.log("Rent withdrawn");
      successToast("Loyer prélevé !", "Vous avez prélevé le loyer");
    } catch (error) {
      errorToast("Erreur", "Erreur lors du prélèvemnt de loyer");
      console.error("Error while withdrawing the rent :", error);
    }
  };

  useEffect(() => {
    checkIfOwner();
  }, [address, isConnected]);

  return {
    createRentContract,
    approveRent,
    startRentContract,
    getInterestRate,
    getRent,
    payRent,
    isOwner,
    rentDuration,
    getLandlordBalance,
    withdrawRent,
  };
};

export default useTenantTrust;
