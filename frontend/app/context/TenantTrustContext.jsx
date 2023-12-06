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
  const [rentsAsOther, setRentsAsOther] = useState([]);

  useEffect(() => {
    if (!address) {
      setRentsAsLandlord([]);
      setRentsAsTenant([]);
      setRentsAsOther([]);
      return;
    }
    const getRents = async () => {
      const rentLogs = await viemPublicClient.getLogs({
        address: TENANT_TRUST_ADDRESS,
        event: parseAbiItem(
          "event ContractCreated(address indexed tenant, address indexed landlord)"
        ),
        fromBlock: 0n,
      });

      const landlordRents = [];
      const tenantRents = [];
      const otherRents = [];

      for (const log of rentLogs) {
        const realRent = await getRent(log.args.landlord, log.args.tenant);
        address == log.args.landlord
          ? landlordRents.push(realRent)
          : address == log.args.tenant
          ? tenantRents.push(realRent)
          : otherRents.push(realRent);
      }
      setRentsAsLandlord(landlordRents);
      setRentsAsTenant(tenantRents);
      setRentsAsOther(otherRents);
    };

    getRents();
  }, [address]);

  return (
    <DataContext.Provider
      value={{ address, rentsAsLandlord, rentsAsTenant, rentsAsOther }}
    >
      {children}
    </DataContext.Provider>
  );
};
