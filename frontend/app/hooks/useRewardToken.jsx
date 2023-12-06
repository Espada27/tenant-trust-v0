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
  TENANT_TRUST_TOKEN_ABI,
  TENANT_TRUST_TOKEN_ADDRESS,
} from "../constants/constant";
import { useAccount } from "wagmi";

const bigIntToNumber = (bigInt) => {
  return Number(bigInt / 10n ** 18n);
};

const useRewardToken = () => {
  const [isRewardOwner, setIsRewardOwner] = useState(false);
  const { address, isConnected } = useAccount();

  const transferTo = async (to, amount) => {
    const bigIntAmount = BigInt(amount) * 10n ** 18n;
    console.log("Transfer : ", to, bigIntAmount);
    const walletClient = await getWalletClient();
    try {
      const { request } = await prepareWriteContract({
        address: TENANT_TRUST_TOKEN_ADDRESS,
        abi: TENANT_TRUST_TOKEN_ABI,
        functionName: "transfer",
        args: [to, bigIntAmount],
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
      setIsRewardOwner(false);
      return;
    }
    try {
      const data = await readContract({
        address: TENANT_TRUST_TOKEN_ADDRESS,
        abi: TENANT_TRUST_TOKEN_ABI,
        functionName: "owner",
      });
      setIsRewardOwner(data === address);
    } catch (err) {
      console.error("Error in checkIfOwner:", err.message);
    }
  };

  const allowance = async (spender) => {
    try {
      const data = await readContract({
        address: TENANT_TRUST_TOKEN_ADDRESS,
        abi: TENANT_TRUST_TOKEN_ABI,
        functionName: "allowance",
        args: [address, spender],
      });
      console.log("Get allowance : ", data);
      return data;
    } catch (err) {
      console.error("Error while fetching the rent:", err.message);
    }
  };

  const getBalance = async () => {
    try {
      const data = await readContract({
        address: TENANT_TRUST_TOKEN_ADDRESS,
        abi: TENANT_TRUST_TOKEN_ABI,
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
    transferTo,
    isRewardOwner,
    getBalance,
  };
};

export default useRewardToken;
