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
    startTime: rent[1],
    duration: rent[2],
    rentRate: rent[3],
    rentFees: rent[4],
    alreadyPaid: rent[5],
    rentalDeposit: rent[6],
    leaseUri: rent[7],
    landlordApproval: rent[8],
    tenantApproval: rent[9],
    creationTime: rent[10],
    landlordAddress,
    tenantAddress,
  };
};

const useTenantTrust = () => {
  const [workflowStatus, setWorkflowStatus] = useState(5);
  const [isOwner, setIsOwner] = useState(false);
  const { address, isConnected } = useAccount();

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
    } catch (error) {
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
      console.log("Contract successfully approved");
    } catch (error) {
      console.error("Error while creating a rent contract:", error);
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
    } catch (error) {
      console.error("Error while starting the rent contract:", error);
    }
  };

  const checkIfOwner = async () => {
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

  useEffect(() => {
    checkIfOwner();
  }, [address, isConnected]);

  return {
    createRentContract,
    approveRent,
    startRentContract,
    getRent,
    isOwner,
  };
};

export default useTenantTrust;
