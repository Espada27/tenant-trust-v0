"use client";

import RentCard from "./RentCard";

import { useTenantTrustContext } from "../context/TenantTrustContext";

export default function RentCardList() {
  const { rentsAsLandlord, rentsAsTenant } = useTenantTrustContext();
  return (
    <>
      {rentsAsLandlord.map((rent, key) => (
        <RentCard key={key} rent={rent} />
      ))}

      {rentsAsTenant.map((rent, key) => (
        <RentCard key={key} rent={rent} />
      ))}
    </>
  );
}
