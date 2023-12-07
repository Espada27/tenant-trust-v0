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

const bigIntToNumber = (bigInt) => {
  return Number(bigInt / 10n ** 18n);
};

const useStakingToken = (stakingAddress) => {
  const [isOwner, setIsOwner] = useState(false);
  const { address, isConnected } = useAccount();

  const increaseAllowance = async (spender, amount) => {
    const bigIntAmount = BigInt(amount) * 10n ** 18n;
    console.log("Approve : ", stakingAddress, bigIntAmount);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "approve",
        args: [spender, bigIntAmount],
        account: walletClient.account,
      });
      const { hash } = await writeContract(request);
      await waitForTransaction({ hash });
    } catch (error) {
      console.error("Error while approving:", error);
    }
  };

  const checkIfOwner = async () => {
    if (!address) {
      setIsOwner(false);
      return;
    }
    try {
      const data = await readContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "owner",
      });
      setIsOwner(data === address);
    } catch (err) {
      console.error("Error in checkIfOwner:", err.message);
    }
  };

  const allowance = async (spender) => {
    try {
      const data = await readContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "allowance",
        args: [address, spender],
      });
      console.log("Get allowance : ", data);
      return bigIntToNumber(data);
    } catch (err) {
      console.error("Error while fetching the allowance:", err.message);
    }
  };

  const getBalance = async () => {
    try {
      const data = await readContract({
        address: STAKING_TOKEN_ADDRESS,
        abi: STAKING_TOKEN_ABI,
        functionName: "balanceOf",
        args: [address],
      });
      return bigIntToNumber(data);
    } catch (err) {
      console.error("Error while fetching the balance:", err.message);
    }
  };

  useEffect(() => {
    checkIfOwner();
  }, [address, isConnected]);

  return {
    increaseAllowance,
    allowance,
    isOwner,
    getBalance,
  };
};

export default useStakingToken;
