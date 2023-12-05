"use client";
import { useState, useEffect } from "react";
import {
  readContract,
  prepareWriteContract,
  writeContract,
  getWalletClient,
  waitForTransaction,
} from "@wagmi/core";
import { STAKING_ABI } from "../constants/constant";
import { useAccount } from "wagmi";

const useStaking = (stakingAddress) => {
  const [isOwner, setIsOwner] = useState(false);
  const { address, isConnected } = useAccount();
  //const toast = useToast();

  const stake = async (stakingAmount) => {
    const walletClient = await getWalletClient();
    try {
      const bigIntAmount = BigInt(stakingAmount) * 10n ** 18n;
      console.log("Stake... ", stakingAmount, bigIntAmount);
      const { request } = await prepareWriteContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "stake",
        args: [bigIntAmount],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      console.log("Successfully staked");
    } catch (error) {
      console.error("Error while staking:", error);
    }
  };

  const checkIfOwner = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "owner",
      });
      setIsOwner(data === address);
    } catch (err) {
      console.error("Error in checkIfOwner:", err.message);
    }
  };

  const getTotalSupply = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "totalSupply",
      });
      console.log("Caution actuelle = ", data);
      return data;
    } catch (err) {
      console.error("Error while fetching the rent:", err.message);
    }
  };

  useEffect(() => {
    checkIfOwner();
  }, [address, isConnected]);

  return {
    stake,
    getTotalSupply,
    isOwner,
  };
};

export default useStaking;
