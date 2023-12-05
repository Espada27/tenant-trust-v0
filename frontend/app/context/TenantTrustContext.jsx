"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useContractEvent, usePublicClient } from "wagmi";
import { TENANT_TRUST_ABI, TENANT_TRUST_ADDRESS } from "../constants/constant";
import { parseAbiItem } from "viem";
import useTenantTrust from "../hooks/useTenantTrust";

const DataContext = createContext();

export const useTenantTrustContext = () => {
  return useContext(DataContext);
};

export const DataProvider = ({ children }) => {
  const viemPublicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const { getRent } = useTenantTrust();
  const [rentsAsLandlord, setRentsAsLandlord] = useState([]);
  const [rentsAsTenant, setRentsAsTenant] = useState([]);

  /*useContractEvent({
    address: TENANT_TRUST_ADDRESS,
    abi: TENANT_TRUST_ABI,
    eventName: "Voted",
    listener: () => {
      setVoteUpdateTrigger((prev) => !prev);
    },
  });

  useEffect(() => {
    const fetchUpdatedProposals = async () => {
      try {
        const updatedProposals = await getProposals(proposalIds);
        setProposals(updatedProposals);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des propositions:",
          error
        );
      }
    };

    if (proposalIds.length > 0) {
      fetchUpdatedProposals();
    }
  }, [voteUpdateTrigger, proposalIds]);

  //Get past proposals with the received Ids
  useEffect(() => {
    const getPastProposals = async () => {
      if (isRegistered) {
        setProposals(await getProposals(proposalIds));
      } else {
        setProposals([]);
      }
    };
    getPastProposals();
  }, [isRegistered]);
*/
  //Get rent contract where the connected address is the landlord
  useEffect(() => {
    if (!address) {
      setRentsAsLandlord([]);
      return;
    }
    const getLandlordRents = async () => {
      const rentLogs = await viemPublicClient.getLogs({
        address: TENANT_TRUST_ADDRESS,
        event: parseAbiItem(
          "event ContractCreated(address indexed tenant, address indexed landlord)"
        ),
        fromBlock: 0n,
        args: {
          landlord: address,
        },
      });

      const realRents = [];
      for (const log of rentLogs) {
        const realRent = await getRent(log.args.landlord, log.args.tenant);
        realRents.push(realRent);
      }
      setRentsAsLandlord(realRents);
    };

    getLandlordRents();
  }, [address]);

  //Get rent contract where the connected address is the tenant
  useEffect(() => {
    if (!address) {
      setRentsAsTenant([]);
      return;
    }
    const getTenantRents = async () => {
      const rentLogs = await viemPublicClient.getLogs({
        address: TENANT_TRUST_ADDRESS,
        event: parseAbiItem(
          "event ContractCreated(address indexed tenant, address indexed landlord)"
        ),
        fromBlock: 0n,
        args: {
          tenant: address,
        },
      });

      const realRents = [];
      for (const log of rentLogs) {
        const realRent = await getRent(log.args.landlord, log.args.tenant);
        realRents.push(realRent);
      }
      setRentsAsTenant(realRents);
    };

    getTenantRents();
  }, [address]);

  return (
    <DataContext.Provider value={{ address, rentsAsLandlord, rentsAsTenant }}>
      {children}
    </DataContext.Provider>
  );
};
