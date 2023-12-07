"use client";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormLabel,
  Input,
  InputLeftAddon,
  InputRightAddon,
  Select,
  Stack,
  Textarea,
  useDisclosure,
  InputGroup,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useRef, useState } from "react";
import { useAccount } from "wagmi";
import useTenantTrust from "../hooks/useTenantTrust";

export default function CreateRent() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const rentField = useRef();
  const { address, isConnected } = useAccount();
  const { createRentContract } = useTenantTrust();
  //TODO TEST ONLY, REMOVE VALUES
  const [rent, setRent] = useState({
    tenantPublicKey: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    monthlyRent: 500,
    rentalDeposit: 6000,
    leaseUri: "http://testurl.com",
  });

  const createRent = async () => {
    try {
      await createRentContract(rent);

      onClose();
    } catch (error) {
      console.log("Error while creating a rent", error);
    }
  };

  const handleUpdate = (key, value) => {
    const newRent = {
      ...rent,
      [key]: value,
    };
    setRent(newRent);
  };

  return (
    <>
      <Button
        leftIcon={<AddIcon />}
        isDisabled={!isConnected}
        colorScheme="teal"
        onClick={onOpen}
        w={"100%"}
      >
        Créer un contrat de location
      </Button>
      <Drawer
        size={"lg"}
        isOpen={isOpen}
        placement="right"
        initialFocusRef={rentField}
        onClose={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            Créer un contrat de location
          </DrawerHeader>

          <DrawerBody>
            <Stack spacing="12px">
              <Box>
                <FormLabel htmlFor="landlordPublicKey">
                  Adresse publique du bailleur
                </FormLabel>
                <Input
                  value={address}
                  isDisabled={true}
                  id="landlordPublicKey"
                  placeholder="Addresse publique du bailleur"
                />
              </Box>

              <Box>
                <FormLabel htmlFor="monthlyRent">Loyer mensuel</FormLabel>
                <Input
                  value={rent.monthlyRent}
                  ref={rentField}
                  id="monthlyRent"
                  placeholder="Indiquez un montant"
                  type="number"
                  onChange={(e) => handleUpdate(e.target.id, e.target.value)}
                />
              </Box>

              <Box>
                <FormLabel htmlFor="rentalDeposit">
                  Montant attendu de cautionnement
                </FormLabel>
                <Input
                  value={rent.rentalDeposit}
                  id="rentalDeposit"
                  placeholder="Indiquez un montant"
                  type="number"
                  onChange={(e) => handleUpdate(e.target.id, e.target.value)}
                />
              </Box>

              <Box>
                <FormLabel htmlFor="tenantPublicKey">
                  Adresse publique du locataire
                </FormLabel>
                <Input
                  value={rent.tenantPublicKey}
                  id="tenantPublicKey"
                  placeholder="Addresse publique (0x123456...)"
                  onChange={(e) => handleUpdate(e.target.id, e.target.value)}
                />
              </Box>
            </Stack>
          </DrawerBody>

          <DrawerFooter borderTopWidth="1px">
            <Button variant="outline" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="orange" onClick={createRent}>
              Créer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
