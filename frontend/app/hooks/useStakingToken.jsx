"use client";
import { useState, useEffect } from "react";
import {
  readContract,
  prepareWriteContract,
  writeContract,
  getWalletClient,
  waitForTransaction,
} from "@wagmi/core";
import {
  STAKING_TOKEN_ABI,
  STAKING_TOKEN_ADDRESS,
} from "../constants/constant";
import { useAccount } from "wagmi";

const useStakingToken = (stakingAddress) => {
  const [isOwner, setIsOwner] = useState(false);
  const { address, isConnected } = useAccount();

  const increaseAllowance = async (amount) => {
    const bigIntAmount = BigInt(amount) * 10n ** 18n;
    console.log("Approve : ", stakingAddress, bigIntAmount);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "approve",
        args: [stakingAddress, bigIntAmount],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
    } catch (error) {
      console.error("Error while approving:", error);
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

  const allowance = async () => {
    try {
      const data = await readContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "allowance",
        args: [address, stakingAddress],
      });
      console.log("Get allowance : ", data);
      return data;
    } catch (err) {
      console.error("Error while fetching the rent:", err.message);
    }
  };

  useEffect(() => {
    checkIfOwner();
  }, [address, isConnected]);

  return {
    increaseAllowance,
    allowance,
    isOwner,
  };
};

export default useStakingToken;
