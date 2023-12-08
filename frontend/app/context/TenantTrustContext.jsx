"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAccount, useContractEvent, usePublicClient } from "wagmi";
import {
  TENANT_TRUST_ABI,
  TENANT_TRUST_ADDRESS,
  TENANT_TRUST_DEPLOYMENT_BLOCK,
} from "../constants/constant";
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

  const initRents = async () => {
    const rentLogs = await viemPublicClient.getLogs({
      address: TENANT_TRUST_ADDRESS,
      event: parseAbiItem(
        "event ContractCreated(address indexed tenant, address indexed landlord)"
      ),
      fromBlock: TENANT_TRUST_DEPLOYMENT_BLOCK,
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

  useEffect(() => {
    if (!address) {
      setRentsAsLandlord([]);
      setRentsAsTenant([]);
      setRentsAsOther([]);
      return;
    }
    initRents();
  }, [address]);

  useContractEvent({
    address: TENANT_TRUST_ADDRESS,
    abi: TENANT_TRUST_ABI,
    eventName: "ContractCreated",
    listener: async (events) => {
      for (const event of events) {
        const tenantAddr = event.args.tenant;
        const landlordAddr = event.args.landlord;
        const freshRent = await getRent(event.args.landlord, event.args.tenant);
        if (tenantAddr == address) {
          if (!isAlreadyPresent(tenantAddr, landlordAddr, rentsAsTenant)) {
            setRentsAsTenant((prev) => prev.concat(freshRent));
          }
        } else if (landlordAddr == address) {
          if (!isAlreadyPresent(tenantAddr, landlordAddr, rentsAsLandlord)) {
            setRentsAsLandlord((prev) => prev.concat(freshRent));
          }
        } else {
          if (!isAlreadyPresent(tenantAddr, landlordAddr, rentsAsOther)) {
            setRentsAsLandlord((prev) => prev.concat(freshRent));
          }
        }
      }
    },
  });

  const isAlreadyPresent = (tenant, landlord, rentArray) => {
    return rentArray.some(
      (rent) => rent.landlordAddress == landlord && rent.tenantAddress == tenant
    );
  };

  return (
    <DataContext.Provider
      value={{ address, rentsAsLandlord, rentsAsTenant, rentsAsOther }}
    >
      {children}
    </DataContext.Provider>
  );
};
