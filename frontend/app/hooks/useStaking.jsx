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

const bigIntToNumber = (bigInt) => {
  return Number(bigInt / 10n ** 18n);
};

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
      throw error;
    }
  };

  const withdraw = async (withdrawAmount) => {
    console.log(withdrawAmount);
    const walletClient = await getWalletClient();
    try {
      const bigIntAmount = BigInt(withdrawAmount) * 10n ** 18n;
      console.log("Withdraw... ", withdrawAmount, bigIntAmount);
      const { request } = await prepareWriteContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "withdraw",
        args: [bigIntAmount],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
      console.log("Successfully withdrawn");
    } catch (error) {
      console.error("Error while withdrawing:", error);
      throw error;
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

  const earned = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "earned",
        args: [address],
      });
      //get 4 decimals precision
      return Number(data / 10n ** 14n);
    } catch (err) {
      console.error("Error in earned:", err.message);
    }
  };

  const userStakedAmount = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return Number(data / 10n ** 18n);
    } catch (err) {
      console.error("Error in earned:", err.message);
    }
  };

  const hasStaked = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return data > 0n;
    } catch (err) {
      console.error("Error in earned:", err.message);
    }
  };

  const getTotalSupply = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "totalSupply",
      });
      return bigIntToNumber(data);
    } catch (err) {
      console.error("Error while fetching the total supply:", err.message);
    }
  };

  const isStakingFull = async () => {
    try {
      const data = await readContract({
        address: stakingAddress,
        abi: STAKING_ABI,
        functionName: "isStakingFull",
      });
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
    withdraw,
    earned,
    getTotalSupply,
    isStakingFull,
    hasStaked,
    userStakedAmount,
    isOwner,
  };
};

export default useStaking;
